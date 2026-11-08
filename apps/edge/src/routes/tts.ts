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
 * Gnani Timbre v2.5 Synchronous REST TTS endpoint.
 * Verified against official Gnani / Vachana AI documentation.
 */
const GNANI_TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference'

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
  voice_id: z.string().max(64).optional(),
})

// ---------------------------------------------------------------------------
// POST /api/tts
// Accepts: JSON { text, language_code, voice_id? }
// Returns: raw binary audio/wav bytes — never cached
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
  // Nalini is the standard high-clarity female Indian English/Hindi voice
  const payload: Record<string, unknown> = {
    text,
    voice: voice_id ?? 'Nalini',
    model: 'timbre-v2.5',
    language: language_code,
    speed: 1,
    audio_config: {
      encoding: 'linear_pcm',
      container: 'wav',
      num_channels: 1,
      sample_rate: 24000,
      sample_width: 2,
    },
  }

  // --- Forward to Gnani Timbre v2.5 ---
  let res: Response
  try {
    res = await fetch(GNANI_TTS_URL, {
      method: 'POST',
      headers: {
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
    const errText = await res.text().catch(() => '')
    console.error('Gnani TTS upstream error:', res.status, errText)
    return c.json(
      { error: { code: 'upstream_error', message: `TTS returned HTTP ${res.status}: ${errText}` } },
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
