import { Hono } from 'hono'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Env = { Bindings: { GNANI_API_KEY_ID: string; DB: D1Database } }

const app = new Hono<Env>()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Gnani Prisma v2.5 STT endpoint.
 * Verify at https://docs.gnani.ai on day 1 — URL may be versioned differently.
 */
const GNANI_STT_URL = 'https://api.vachana.ai/stt/v3'

/**
 * ~3 MB ≈ 60 s of 16 kHz mono WAV (Gnani REST limit).
 * Workers free plan enforces a 100 MB request body cap; we enforce tighter here.
 */
const MAX_FILE_BYTES = 3_000_000

/** Daily STT calls allowed per hashed IP. */
const DAILY_STT_LIMIT = 50

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

// ---------------------------------------------------------------------------
// POST /api/stt
// Accepts: multipart/form-data { audio_file: File, language_code: string }
// Returns: Gnani Prisma v2.5 JSON transcript (shape proxied as-is after validation)
// ---------------------------------------------------------------------------
app.post('/', async (c) => {
  // --- Parse multipart body ---
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return c.json(
      { error: { code: 'bad_request', message: 'Expected multipart/form-data' } },
      400,
    )
  }

  // --- Validate language_code ---
  const langParse = LangSchema.safeParse(form.get('language_code'))
  if (!langParse.success) {
    return c.json(
      {
        error: {
          code: 'bad_request',
          message: `language_code must be one of: ${LangSchema.options.join(', ')}`,
        },
      },
      400,
    )
  }

  // --- Validate audio_file ---
  const rawFile = form.get('audio_file')
  if (!rawFile || typeof rawFile === 'string' || typeof (rawFile as unknown as { size?: unknown }).size !== 'number') {
    return c.json(
      { error: { code: 'bad_request', message: 'audio_file is required (multipart File)' } },
      400,
    )
  }
  const file = rawFile as unknown as { size: number }
  if (file.size === 0) {
    return c.json(
      { error: { code: 'bad_request', message: 'audio_file is empty' } },
      400,
    )
  }
  if (file.size > MAX_FILE_BYTES) {
    return c.json(
      {
        error: {
          code: 'too_large',
          message: 'Audio file exceeds the ~60 s / ~3 MB limit.',
        },
      },
      413,
    )
  }

  const lang = langParse.data

  // --- Rate limit: 50 STT calls per hashed IP per UTC day ---
  const rawIP =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown'
  const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  const ipHash = await hashIP(rawIP, today)

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM stt_calls WHERE ip_hash = ? AND call_date = ?`,
  )
    .bind(ipHash, today)
    .first<{ cnt: number }>()

  if ((countRow?.cnt ?? 0) >= DAILY_STT_LIMIT) {
    return c.json(
      {
        error: {
          code: 'rate_limited',
          message: 'Daily STT limit reached. Try again tomorrow.',
        },
      },
      429,
    )
  }

  // --- Forward to Gnani Prisma v2.5 with automatic retry on 429 ---
  // IMPORTANT: audio bytes are forwarded in-memory and never persisted.
  let res: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const upstream = new FormData()
    upstream.set('audio_file', rawFile as any)
    upstream.set('language_code', lang)
    upstream.set('preferred_language', lang)
    upstream.set('format', 'transcribe')
    upstream.set('itn_native_numerals', 'false')

    try {
      res = await fetch(GNANI_STT_URL, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': c.env.GNANI_API_KEY_ID,
        },
        body: upstream,
      })

      // If Gnani returns 429 (rate-limited / concurrency limit), wait and retry
      if (res.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
        continue
      }
      break
    } catch {
      if (attempt === 2) {
        return c.json(
          { error: { code: 'upstream_unavailable', message: 'STT service unreachable' } },
          503,
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (!res || !res.ok) {
    // Never forward the upstream error body — it may contain key hints or PII
    return c.json(
      { error: { code: 'upstream_error', message: `STT returned HTTP ${res?.status ?? 502}` } },
      502,
    )
  }

  // --- Record call for rate-limiting (best-effort, non-blocking) ---
  c.executionCtx.waitUntil(
    c.env.DB.prepare(`INSERT INTO stt_calls (ip_hash, call_date) VALUES (?, ?)`)
      .bind(ipHash, today)
      .run(),
  )

  const data: unknown = await res.json()
  return c.json(data)
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * SHA-256 of "<ip>:<daily-salt>", hex-encoded, truncated to 16 chars.
 * Never store raw IPs — this is irreversible within a day and rotates daily.
 */
async function hashIP(ip: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${ip}:${salt}`))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export { app as sttRoute }
