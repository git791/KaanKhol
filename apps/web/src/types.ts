/**
 * Shared TypeScript types for KaanKhol web app.
 * Keep in sync with packages/core types.
 */

// ── Language codes ────────────────────────────────────────────────────────────

export const SUPPORTED_LANGS = ['kn-IN', 'hi-IN', 'en-IN', 'ta-IN', 'te-IN', 'ml-IN', 'bn-IN', 'mr-IN', 'gu-IN', 'pa-IN'] as const
export type LangCode = typeof SUPPORTED_LANGS[number]

export const LANG_LABELS: Record<LangCode, { native: string; english: string }> = {
  'kn-IN': { native: 'ಕನ್ನಡ',      english: 'Kannada' },
  'hi-IN': { native: 'हिन्दी',    english: 'Hindi' },
  'en-IN': { native: 'English',   english: 'English' },
  'ta-IN': { native: 'தமிழ்',     english: 'Tamil' },
  'te-IN': { native: 'తెలుగు',    english: 'Telugu' },
  'ml-IN': { native: 'മലയാളം',   english: 'Malayalam' },
  'bn-IN': { native: 'বাংলা',     english: 'Bengali' },
  'mr-IN': { native: 'मराठी',     english: 'Marathi' },
  'gu-IN': { native: 'ગુજરાતી',   english: 'Gujarati' },
  'pa-IN': { native: 'ਪੰਜਾਬੀ',   english: 'Punjabi' },
}

// Default three languages: regional (kn-IN), Hindi, English
export const DEFAULT_LANGS: [LangCode, LangCode, LangCode] = ['kn-IN', 'hi-IN', 'en-IN']

// ── Pipeline state machine ────────────────────────────────────────────────────

export type PipelinePhase =
  | 'idle'
  | 'recording'
  | 'processing-audio'
  | 'transcribing'
  | 'extracting'
  | 'fusing'
  | 'result'
  | 'speaking'
  | 'error'

export type LaneStatus = 'waiting' | 'transcribing' | 'done' | 'failed' | 'timeout'

export interface LaneState {
  lang: LangCode
  status: LaneStatus
  transcript?: string
  error?: string
}

export interface PipelineState {
  phase: PipelinePhase
  lanes: LaneState[]
  result?: FusedResult
  ttsAudioUrl?: string
  errorMessage?: string
}

// ── Fused result ──────────────────────────────────────────────────────────────

export type FieldStatus = 'verified' | 'conflict' | 'unverified'

export interface FusedField<T> {
  value?: T | undefined
  status: FieldStatus
  votes: Record<string, string[]>  // { "12345": ["kn-IN", "hi-IN"] }
}

export interface FusedResult {
  trainNo: FusedField<string>
  trainName: FusedField<string>
  platform: FusedField<string>
  delayMin?: FusedField<number> | undefined
  clarityScore: number          // 0–100
  passesDecoded: number         // 1–3
  ttsSentence?: string | undefined          // canonical verified sentence for TTS
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface StationScore {
  station_code: string
  avg_score: number
  submission_count: number
  has_sample: 0 | 1
}

export interface LeaderboardResponse {
  stations: StationScore[]
}

// ── API error shape ───────────────────────────────────────────────────────────

export interface ApiError {
  error: { code: string; message: string }
}

export function isApiError(v: unknown): v is ApiError {
  return (
    typeof v === 'object' && v !== null &&
    'error' in v &&
    typeof (v as ApiError).error?.code === 'string'
  )
}

// ── Benchmark ─────────────────────────────────────────────────────────────────

export interface BenchmarkRow {
  snr_db: number | 'telephony'
  single_best: number    // best single-language fact recovery %
  fused: number          // fused fact recovery %
  sample_count: number
}

export interface BenchmarkData {
  generated_at: string
  rows: BenchmarkRow[]
}
