import { Hono } from 'hono'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Env = { Bindings: { GEMINI_API_KEY: string; AI: Ai } }

const app = new Hono<Env>()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const ExtractRequestSchema = z.object({
  /**
   * 1–3 raw transcripts (one per language).
   * Capped at 2000 chars each; trimmed combined text is what goes to LLM.
   * Never send actual passenger audio or PII — only text.
   */
  transcripts: z.array(z.string().max(2_000)).min(1).max(3),
})

/** Zod schema that validates the structured fields we extract. */
const FieldsSchema = z.object({
  /** 5-digit Indian train number, e.g. "12650" */
  trainNo: z.string().regex(/^\d{5}$/).optional(),
  /** Human-readable train name, e.g. "Karnataka Express" */
  trainName: z.string().max(60).optional(),
  /** Platform number at the station, 1–2 digits */
  platform: z.string().regex(/^\d{1,2}$/).optional(),
  /** Delay in whole minutes (0–1440). Absent if on time. */
  delayMin: z.number().int().min(0).max(1_440).optional(),
})

type ExtractedFields = z.infer<typeof FieldsSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the extraction prompt sent to the LLM.
 * Uses synthetic/merged transcript text — never raw audio or PII.
 */
function buildPrompt(text: string): string {
  return (
    'You are extracting structured data from Indian railway announcements. ' +
    'Return ONLY valid JSON. Extract only what is literally stated. ' +
    'Do not guess or infer. Omit fields that are not mentioned.\n\n' +
    `Text:\n${text}\n\n` +
    'Return a JSON object with these optional fields only:\n' +
    '- trainNo: 5-digit string (e.g. "12650")\n' +
    '- trainName: train name string (max 60 chars)\n' +
    '- platform: 1-2 digit string (e.g. "3")\n' +
    '- delayMin: integer minutes of delay\n\n' +
    'JSON only, no explanation, no markdown fences:'
  )
}

/**
 * Extract the first JSON object found in an LLM response string.
 * Returns null if no valid JSON object is present.
 */
function extractJSON(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// POST /api/extract
// Accepts: JSON { transcripts: string[] }  (1–3 items, max 2000 chars each)
// Returns: { fields: ExtractedFields, source: 'workers-ai' | 'gemini' | 'none' }
//
// LLM priority:
//   1. Workers AI @cf/meta/llama-3.1-8b-instruct (10,000 Neurons/day — PRIMARY)
//   2. Gemini 2.5 Flash Lite (20 RPD — SECONDARY, use sparingly)
//   3. Empty fields (regex extraction in browser is the primary path anyway)
// ---------------------------------------------------------------------------
app.post('/', async (c) => {
  // --- Parse body ---
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(
      { error: { code: 'bad_request', message: 'Expected JSON body' } },
      400,
    )
  }

  const parse = ExtractRequestSchema.safeParse(body)
  if (!parse.success) {
    return c.json(
      {
        error: {
          code: 'bad_request',
          message: 'transcripts must be an array of 1–3 strings (max 2000 chars each)',
        },
      },
      400,
    )
  }

  // Merge transcripts; separator makes tri-lingual boundaries visible to LLM
  const combinedText = parse.data.transcripts.join('\n\n---\n\n')
  const prompt = buildPrompt(combinedText)

  // ---------------------------------------------------------------------------
  // PRIMARY: Workers AI — Llama 3.1 8B
  // 10,000 Neurons/day on free plan; always try this first.
  // ---------------------------------------------------------------------------
  try {
    const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    })

    if (
      typeof aiResponse === 'object' &&
      aiResponse !== null &&
      'response' in aiResponse
    ) {
      const rawText = (aiResponse as { response: string }).response.trim()
      const json = extractJSON(rawText)
      if (json) {
        const validated = FieldsSchema.safeParse(json)
        if (validated.success) {
          return c.json({ fields: validated.data, source: 'workers-ai' })
        }
      }
    }
  } catch (err) {
    console.error('Workers AI error:', err)
    // Workers AI failed or returned malformed output; fall through to Gemini
  }

  // ---------------------------------------------------------------------------
  // SECONDARY: Gemini 2.5 Flash Lite
  // HARD LIMIT: ~20 RPD on free tier — only hit as a last resort.
  // Send only synthetic merged transcript text; never raw audio or PII.
  // ---------------------------------------------------------------------------
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0,
          },
        }),
      },
    )

    if (geminiRes.ok) {
      type GeminiResponse = {
        candidates?: Array<{
          content: { parts: Array<{ text: string }> }
        }>
      }
      const data = (await geminiRes.json()) as GeminiResponse
      const rawText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
      const json = extractJSON(rawText)
      if (json) {
        const validated = FieldsSchema.safeParse(json)
        if (validated.success) {
          return c.json({ fields: validated.data, source: 'gemini' })
        }
      }
    } else {
      console.error('Gemini HTTP status:', geminiRes.status)
    }
  } catch (err) {
    console.error('Gemini error:', err)
    // Gemini also failed; fall through to empty-fields response
  }

  // ---------------------------------------------------------------------------
  // FALLBACK: Return empty fields — browser regex extraction is the primary path
  // ---------------------------------------------------------------------------
  return c.json({ fields: {} as ExtractedFields, source: 'none' })
})

export { app as extractRoute }
