import { Hono } from 'hono'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Env = { Bindings: { GNANI_API_KEY_ID: string } }

const app = new Hono<Env>()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * TODO (day 1): Confirm the exact Gnani Timbre v2.5 TTS endpoint from
 * https://docs.gnani.ai — the path and version below are best-effort.
 * Update this constant before the first TTS call.
 */
const GNANI_TTS_URL = 'https://api.vachana.ai/tts/v1' // VERIFY THIS URL

/** Reasonable cap: a full trilingual announcement should be under 500 chars per language. */
const MAX_TEXT_CHARS = 500

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const LangSchema = z.enum([
  'hi-IN',
  'en-IN',
  'kn-IN',
  'ta-IN',
  'te-IN',
  'ml-IN',
  'bn-IN',
  'mr-IN',
  'gu-IN',
  'pa-IN',
])

const TTSRequestSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_CHARS),
  language_code: LangSchema,
  /**
   * TODO (day 1): Verify available voice_id values from docs.gnani.ai.
   * Gnani Timbre v2.5 may expose gender/speaker variants.
   */
  voice_id: z.string().max(64).optional(),
})

// ---------------------------------------------------------------------------
// POST /api/tts
// Accepts: JSON { text, language_code, voice_id? }
// Returns: audio/wav (or audio/mpeg) bytes — never cached
// ---------------------------------------------------------------------------
app.post('/', async (c) => {
  // --- Parse JSON body ---
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(
      { error: { code: 'bad_request', message: 'Expected JSON body' } },
      400,
    )
  }

  const parse = TTSRequestSchema.safeParse(body)
  if (!parse.success) {
    const issue = parse.error.issues[0]
    return c.json(
      {
        error: {
          code: 'bad_request',
          message: issue?.message ?? 'Invalid request body',
        },
      },
      400,
    )
  }

  const { text, language_code, voice_id } = parse.data

  // --- Build Gnani Timbre v2.5 payload ---
  // TODO (day 1): Verify the exact field names from docs.gnani.ai.
  //   - Is the audio format field called "format", "output_format", or "encoding"?
  //   - Supported values: "wav", "mp3", "ogg"?
  //   - Is voice selection via "voice_id", "speaker_id", or "voice"?
  const payload: Record<string, string> = {
    text,
    language_code,
    format: 'wav', // TODO: verify format field name and accepted values
  }
  if (voice_id) {
    payload['voice_id'] = voice_id // TODO: verify field name from docs
  }

  // --- Forward to Gnani Timbre v2.5 ---
  // Audio is processed in-memory only — never persisted.
  let res: Response
  try {
    res = await fetch(GNANI_TTS_URL, {
      method: 'POST',
      headers: {
        // Key is NEVER logged, NEVER forwarded to client, NEVER in URLs
        'X-API-Key-ID': c.env.GNANI_API_KEY_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return c.json(
      { error: { code: 'upstream_unavailable', message: 'TTS service unreachable' } },
      503,
    )
  }

  if (!res.ok) {
    // Never forward the upstream error body — may contain key hints
    return c.json(
      { error: { code: 'upstream_error', message: `TTS returned HTTP ${res.status}` } },
      502,
    )
  }

  // --- Stream audio bytes back to client ---
  const contentType = res.headers.get('content-type') ?? 'audio/wav'
  const audioBytes = await res.arrayBuffer()

  return new Response(audioBytes, {
    headers: {
      'Content-Type': contentType,
      // Audio is generated per-request; must never be cached by CDN or browser
      'Cache-Control': 'no-store',
    },
  })
})

export { app as ttsRoute }
