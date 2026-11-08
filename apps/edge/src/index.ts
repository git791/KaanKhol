import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sttRoute } from './routes/stt'
import { ttsRoute } from './routes/tts'
import { extractRoute } from './routes/extract'
import { leaderboardRoute } from './routes/leaderboard'

// ---------------------------------------------------------------------------
// Environment bindings — secrets set via `wrangler secret put <NAME>`
//   GNANI_API_KEY_ID  → never logged, never forwarded to client
//   GEMINI_API_KEY    → secondary LLM only (20 RPD — use sparingly)
//   DB                → Cloudflare D1 (leaderboard + STT rate-limit)
//   AI                → Workers AI (primary LLM, 10k Neurons/day)
// ---------------------------------------------------------------------------
type Env = {
  Bindings: {
    GNANI_API_KEY_ID: string
    GEMINI_API_KEY: string
    DB: D1Database
    AI: Ai
  }
}

const app = new Hono<Env>()

// ---------------------------------------------------------------------------
// CORS — strict allow-list; never wildcard
// ---------------------------------------------------------------------------
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return false
  if (origin === 'https://kaankhol.pages.dev') return true
  if (origin.endsWith('.kaankhol.pages.dev')) return true
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:4173') return true
  return false
}

app.use(
  '/api/*',
  cors({
    origin: (origin) => isAllowedOrigin(origin) ? origin : null,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86_400,
  }),
)

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.route('/api/stt', sttRoute)
app.route('/api/tts', ttsRoute)
app.route('/api/extract', extractRoute)
app.route('/api/leaderboard', leaderboardRoute)

// Health check (no auth required)
app.get('/', (c) => c.json({ ok: true, service: 'kaankhol-edge' }))

// 404 fallback — consistent error shape
app.notFound((c) =>
  c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404),
)

export default app
