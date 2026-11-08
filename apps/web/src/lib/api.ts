/**
 * api.ts — Typed fetch wrappers for the KaanKhol Cloudflare Worker.
 * All calls go through /api/* on the Worker URL.
 */

import type { LangCode, BenchmarkData } from '../types'

const WORKER_URL = import.meta.env['VITE_WORKER_URL'] ?? 'http://localhost:8787'

// ── STT ───────────────────────────────────────────────────────────────────────

export interface STTSuccess {
  transcript: string
  words?: Array<{ word: string; start: number; end: number; confidence?: number }>
}

export interface STTError {
  error: { code: string; message: string }
}

export type STTResult = STTSuccess | STTError

/**
 * Transcribe an audio blob in a given language via Gnani Prisma v2.5.
 * Returns the STT response or an error object.
 */
export async function transcribe(
  audioBlob: Blob,
  lang: LangCode,
  signal?: AbortSignal,
): Promise<STTResult> {
  const form = new FormData()
  form.set('audio_file', audioBlob, 'audio.wav')
  form.set('language_code', lang)

  try {
    const res = await fetch(`${WORKER_URL}/api/stt`, {
      method: 'POST',
      body: form,
      signal: signal ?? null,
    })
    const data: unknown = await res.json()
    return data as STTResult
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: { code: 'aborted', message: 'Request cancelled' } }
    }
    return { error: { code: 'network_error', message: 'Could not reach the server' } }
  }
}

// ── TTS ───────────────────────────────────────────────────────────────────────

/**
 * Synthesise speech via Gnani Timbre v2.5.
 * Returns an audio Blob on success, or an error object.
 */
export async function synthesise(
  text: string,
  lang: LangCode,
  signal?: AbortSignal,
): Promise<Blob | { error: { code: string; message: string } }> {
  try {
    const res = await fetch(`${WORKER_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: lang }),
      signal: signal ?? null,
    })
    if (!res.ok) {
      const data: unknown = await res.json()
      return data as { error: { code: string; message: string } }
    }
    return await res.blob()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: { code: 'aborted', message: 'Request cancelled' } }
    }
    return { error: { code: 'network_error', message: 'Could not reach the server' } }
  }
}

// ── LLM Field Extraction ──────────────────────────────────────────────────────

export interface ExtractResult {
  fields: {
    trainNo?: string
    trainName?: string
    platform?: string
    delayMin?: number
  }
  source: 'workers-ai' | 'gemini' | 'none'
}

/**
 * Ask the Worker to extract structured fields from transcripts via Workers AI or Gemini.
 * This is a fallback; regex extraction in the core package is always tried first.
 */
export async function extractFields(
  transcripts: string[],
  signal?: AbortSignal,
): Promise<ExtractResult> {
  try {
    const res = await fetch(`${WORKER_URL}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcripts }),
      signal: signal ?? null,
    })
    if (!res.ok) return { fields: {}, source: 'none' }
    return (await res.json()) as ExtractResult
  } catch {
    return { fields: {}, source: 'none' }
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardStation {
  station_code: string
  avg_score: number
  submission_count: number
  has_sample: 0 | 1
}

export async function fetchLeaderboard(): Promise<LeaderboardStation[]> {
  try {
    const res = await fetch(`${WORKER_URL}/api/leaderboard`)
    if (!res.ok) return []
    const data = (await res.json()) as { stations: LeaderboardStation[] }
    return data.stations ?? []
  } catch {
    return []
  }
}

export async function submitScore(
  stationCode: string,
  score: number,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${WORKER_URL}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_code: stationCode, score }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: { message: string } }
    if (res.ok && data.ok) return { ok: true }
    return { ok: false, message: data.error?.message ?? 'Could not submit score' }
  } catch {
    return { ok: false, message: 'Network error' }
  }
}

// ── Benchmark data (static JSON — zero API calls) ─────────────────────────────

export async function fetchBenchmark(): Promise<BenchmarkData | null> {
  try {
    const res = await fetch('/benchmark.json')
    if (!res.ok) return null
    return (await res.json()) as BenchmarkData
  } catch {
    return null
  }
}
