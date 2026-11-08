import { Hono } from 'hono'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Env = { Bindings: { DB: D1Database } }

const app = new Hono<Env>()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const SubmitSchema = z.object({
  /**
   * Indian railway station code — 2 to 5 uppercase ASCII letters.
   * Examples: "SBC", "NDLS", "MAS", "BCT".
   */
  station_code: z
    .string()
    .regex(/^[A-Z]{2,5}$/, 'station_code must be 2–5 uppercase letters')
    .or(
      z
        .string()
        .regex(/^[a-z]{2,5}$/)
        .transform((s) => s.toUpperCase()),
    ),
  /** Clarity score 0–100 as rated by the user for this station announcement. */
  score: z.number().int().min(0).max(100),
})

// ---------------------------------------------------------------------------
// GET /api/leaderboard
// Returns top 50 stations ordered by average clarity score.
// ---------------------------------------------------------------------------
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        station_code,
        ROUND(AVG(score))                               AS avg_score,
        COUNT(*)                                        AS submission_count,
        MAX(CASE WHEN is_sample = 1 THEN 1 ELSE 0 END) AS has_sample
      FROM station_scores
      GROUP BY station_code
      HAVING submission_count >= 1
      ORDER BY avg_score DESC
      LIMIT 50
    `).all()

    return c.json({ stations: results })
  } catch {
    return c.json(
      { error: { code: 'db_error', message: 'Could not load leaderboard' } },
      500,
    )
  }
})

// ---------------------------------------------------------------------------
// POST /api/leaderboard
// Submit a station clarity score (0–100). One submission per station per IP per day.
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

  const parse = SubmitSchema.safeParse(body)
  if (!parse.success) {
    return c.json(
      {
        error: {
          code: 'bad_request',
          message:
            'station_code (2–5 uppercase letters) and score (integer 0–100) are required',
        },
      },
      400,
    )
  }

  const { station_code, score } = parse.data

  // --- Hash IP with daily salt — raw IP is never stored ---
  const rawIP =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown'
  const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  const ipHash = await hashIP(rawIP, today)

  // --- Idempotency: one real submission per station per hashed IP per day ---
  const existing = await c.env.DB.prepare(`
    SELECT id FROM station_scores
    WHERE station_code = ?
      AND ip_hash = ?
      AND is_sample = 0
      AND DATE(created_at) = ?
    LIMIT 1
  `)
    .bind(station_code, ipHash, today)
    .first()

  if (existing) {
    return c.json(
      {
        error: {
          code: 'already_submitted',
          message: 'You already rated this station today',
        },
      },
      409,
    )
  }

  // --- Insert ---
  try {
    await c.env.DB.prepare(`
      INSERT INTO station_scores (station_code, score, ip_hash, is_sample)
      VALUES (?, ?, ?, 0)
    `)
      .bind(station_code, score, ipHash)
      .run()

    return c.json({ ok: true, station_code, score })
  } catch {
    return c.json(
      { error: { code: 'db_error', message: 'Could not save score' } },
      500,
    )
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * SHA-256 of "<ip>:<daily-salt>", hex-encoded, truncated to 16 chars.
 * Irreversible within a day; salt rotates daily so long-term tracking is impossible.
 */
async function hashIP(ip: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${ip}:${salt}`))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export { app as leaderboardRoute }
