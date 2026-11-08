/**
 * pipeline.ts — Full pipeline orchestration hook.
 * Manages state machine: idle → recording → transcribing → extracting → fusing → result
 */

import { useState, useCallback, useRef } from 'react'
import { regexExtract } from '@kaankhol/core'
import { vote } from '@kaankhol/core'
import { verifyTrain, verifyPlatform } from '@kaankhol/core'
import { clarityScore } from '@kaankhol/core'
import { buildTTSSentence } from '@kaankhol/core'
import type { Fields, Pass } from '@kaankhol/core'
import { transcribe, extractFields, synthesise } from './api'
import { toWav16kMono, startRecording } from './audio'
import type { PipelineState, LangCode, FusedResult, FieldStatus, LaneState } from '../types'

// Trimmed timetable — imported as static JSON
import trainData from '../data/trains.json'

type Train = { number: string; name: string }
const trainDB = new Map<string, Train>(
  (trainData as Train[]).map((t) => [t.number, t])
)

const DEFAULT_LANGS: [LangCode, LangCode, LangCode] = ['kn-IN', 'hi-IN', 'en-IN']
const LANE_TIMEOUT_MS = 30_000

/** Main pipeline hook. Returns state + control functions. */
export function usePipeline() {
  const [state, setState] = useState<PipelineState>({
    phase: 'idle',
    lanes: DEFAULT_LANGS.map((lang) => ({ lang, status: 'waiting' })),
  })

  const abortRef = useRef<AbortController | null>(null)
  const recorderRef = useRef<{ stop: () => Promise<Blob> } | null>(null)
  const [micLevel, setMicLevel] = useState(0)

  // ── Start recording ───────────────────────────────────────────────────────

  const startRecordingSession = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'recording', lanes: DEFAULT_LANGS.map((lang) => ({ lang, status: 'waiting' })) }))
    try {
      recorderRef.current = await startRecording(60, setMicLevel)
    } catch (err) {
      const msg = err instanceof Error && err.message.includes('denied')
        ? 'Microphone is blocked. Upload a recording instead.'
        : 'Could not access microphone.'
      setState((s) => ({ ...s, phase: 'error', errorMessage: msg }))
    }
  }, [])

  // ── Stop recording and start pipeline ─────────────────────────────────────

  const stopRecordingAndProcess = useCallback(async () => {
    if (!recorderRef.current) return
    setMicLevel(0)
    setState((s) => ({ ...s, phase: 'processing-audio' }))

    const rawBlob = await recorderRef.current.stop()
    recorderRef.current = null

    let wavBlob: Blob
    try {
      wavBlob = await toWav16kMono(rawBlob)
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Audio processing failed.',
      }))
      return
    }

    await runPipeline(wavBlob)
  }, [])

  // ── Upload file ───────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setState((s) => ({ ...s, phase: 'processing-audio', lanes: DEFAULT_LANGS.map((lang) => ({ lang, status: 'waiting' })) }))
    let wavBlob: Blob
    try {
      wavBlob = await toWav16kMono(file)
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Could not process audio file.',
      }))
      return
    }
    await runPipeline(wavBlob)
  }, [])

  // ── Core pipeline ─────────────────────────────────────────────────────────

  const runPipeline = useCallback(async (wavBlob: Blob) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    // Phase: transcribing — decode lanes sequentially with backoff to respect Gnani concurrency & rate limits
    setState((s) => ({
      ...s,
      phase: 'transcribing',
      lanes: DEFAULT_LANGS.map((lang, i) => ({ lang, status: i === 0 ? 'transcribing' : 'waiting' })),
    }))

    const successfulLanes: { lang: LangCode; transcript: string }[] = []

    for (const [idx, lang] of DEFAULT_LANGS.entries()) {
      updateLane(idx, { status: 'transcribing' })

      const timeoutId = setTimeout(() => abort.abort(), LANE_TIMEOUT_MS)
      try {
        const result = await transcribe(wavBlob, lang, abort.signal)
        clearTimeout(timeoutId)

        if ('error' in result) {
          updateLane(idx, { status: 'failed', error: result.error.message })
        } else {
          updateLane(idx, { status: 'done', transcript: result.transcript })
          successfulLanes.push({ lang, transcript: result.transcript })
        }
      } catch {
        clearTimeout(timeoutId)
        updateLane(idx, { status: 'timeout', error: 'No response within 30 s. Try again.' })
      }

      // Brief delay between passes to guarantee Gnani free-tier rate limits are never exceeded
      if (idx < DEFAULT_LANGS.length - 1) {
        await new Promise((r) => setTimeout(r, 350))
      }
    }

    if (successfulLanes.length === 0) {
      setState((s) => ({ ...s, phase: 'error', errorMessage: 'All three transcription lanes failed. Check your connection and try again.' }))
      return
    }

    // Phase: extracting — regex first, LLM fallback for gaps
    setState((s) => ({ ...s, phase: 'extracting' }))

    const passes: Pass[] = []
    for (const { lang, transcript } of successfulLanes) {
      let fields: Fields = regexExtract(transcript)

      // LLM fallback only when regex missed key fields
      const needsLLM = !fields.trainNo && !fields.platform
      if (needsLLM) {
        const llmResult = await extractFields([transcript], abort.signal)
        fields = {
          ...fields,
          trainNo: fields.trainNo ?? llmResult.fields.trainNo,
          trainName: fields.trainName ?? llmResult.fields.trainName,
          platform: fields.platform ?? llmResult.fields.platform,
          delayMin: fields.delayMin ?? llmResult.fields.delayMin,
        }
      }

      passes.push({ lang, fields })
    }

    // Phase: fusing
    setState((s) => ({ ...s, phase: 'fusing' }))

    const trainNoVote = vote(passes, (f) => f.trainNo)
    const trainNameVote = vote(passes, (f) => f.trainName)
    const platformVote = vote(passes, (f) => f.platform)
    const delayVote = vote(passes, (f) => f.delayMin)

    // Verify train number against timetable
    const trainVerify = verifyTrain(trainNoVote.winner, trainNameVote.winner, trainDB)

    // Platform verified by cross-language agreement only
    const platformStatus: FieldStatus = verifyPlatform(
      platformVote.winner,
      platformVote.winner ? (platformVote.votes[platformVote.winner]?.length ?? 0) : 0,
      successfulLanes.length,
    )

    const result: FusedResult = {
      trainNo: {
        value: trainNoVote.winner,
        status: trainVerify.status,
        votes: trainNoVote.votes,
      },
      trainName: {
        value: trainVerify.name ?? trainNameVote.winner,
        status: trainVerify.status === 'verified' ? 'verified' : trainNameVote.winner ? 'unverified' : 'unverified',
        votes: trainNameVote.votes,
      },
      platform: {
        value: platformVote.winner,
        status: platformStatus,
        votes: platformVote.votes,
      },
      delayMin: delayVote.winner !== undefined ? {
        value: delayVote.winner,
        status: delayVote.winner !== undefined && (delayVote.votes[String(delayVote.winner)]?.length ?? 0) >= 2 ? 'verified' : 'unverified',
        votes: delayVote.votes,
      } : undefined,
      clarityScore: 0,
      passesDecoded: successfulLanes.length,
    }

    // Calculate clarity score
    result.clarityScore = clarityScore({
      trainNo: result.trainNo,
      trainName: result.trainName,
      platform: result.platform,
      delayMin: result.delayMin,
    })

    // Build TTS sentence from verified fields only
    const verifiedFields = {
      trainNo: result.trainNo.status === 'verified' ? result.trainNo.value : undefined,
      trainName: result.trainName.status === 'verified' ? result.trainName.value : undefined,
      platform: result.platform.status === 'verified' ? result.platform.value : undefined,
      delayMin: result.delayMin?.status === 'verified' ? result.delayMin.value : undefined,
    }

    if (verifiedFields.trainNo && verifiedFields.trainName && verifiedFields.platform) {
      result.ttsSentence = buildTTSSentence('en-IN', {
        trainNo: verifiedFields.trainNo,
        trainName: verifiedFields.trainName,
        platform: verifiedFields.platform,
        delayMin: verifiedFields.delayMin,
      })
    }

    setState((s) => ({ ...s, phase: 'result', result }))
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateLane = (idx: number, patch: Partial<LaneState>) => {
    setState((s) => ({
      ...s,
      lanes: s.lanes.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }))
  }

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ phase: 'idle', lanes: DEFAULT_LANGS.map((lang) => ({ lang, status: 'waiting' })) })
  }, [])

  return {
    state,
    micLevel,
    startRecording: startRecordingSession,
    stopRecording: stopRecordingAndProcess,
    processFile,
    reset,
  }
}
