/**
 * Results section — fused card, verified chips, TTS playback.
 */
import { useState, useRef, useEffect } from 'react'
import {
  SealCheckIcon, WarningIcon, QuestionIcon,
  SpeakerHighIcon, ArrowCounterClockwiseIcon, TrainIcon,
} from '@phosphor-icons/react'
import { synthesise } from '../../lib/api'
import { submitScore } from '../../lib/api'
import type { PipelineState, FusedField, FieldStatus } from '../../types'

interface Props {
  state: PipelineState
  onReset: () => void
}

export default function Results({ state, onReset }: Props) {
  const { result, lanes } = state
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [rated, setRated] = useState(false)
  const [rateMsg, setRateMsg] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src)
    }
  }, [])

  const handlePlay = async () => {
    if (!result?.ttsSentence) return
    setTtsLoading(true)
    const audio = await synthesise(result.ttsSentence, 'en-IN')
    setTtsLoading(false)

    if (!('error' in audio)) {
      const url = URL.createObjectURL(audio)
      const el = new Audio(url)
      audioRef.current = el
      el.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url) }
      el.play()
      setTtsPlaying(true)
    }
  }

  const handleRate = async () => {
    if (!result) return
    const res = await submitScore('SBC', result.clarityScore)
    setRated(true)
    setRateMsg(res.ok ? 'Score submitted!' : (res.message ?? 'Could not submit'))
  }

  if (state.phase !== 'result' || !result) {
    return null
  }

  return (
    <section
      id="results"
      className="py-16 px-6 max-w-3xl mx-auto"
      aria-labelledby="results-heading"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          id="results-heading"
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
        >
          Decoded Announcement
        </h2>
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ color: 'var(--color-steel-400)', border: '1px solid var(--color-night-700)' }}
        >
          <ArrowCounterClockwiseIcon size={16} />
          Try again
        </button>
      </div>

      {/* Transcript lanes */}
      <div className="mb-6 space-y-2">
        {lanes.map((lane) => (
          <div
            key={lane.lang}
            className="p-3 rounded-xl text-sm flex items-center justify-between"
            style={{ background: 'var(--color-night-800)', border: '1px solid var(--color-night-700)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="font-mono text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--color-night-900)', border: '1px solid var(--color-night-700)', color: 'var(--color-steel-400)' }}
              >
                {lane.lang}
              </span>
              <span
                lang={lane.lang.split('-')[0]}
                className="text-indic truncate"
                style={{ color: lane.transcript ? 'var(--color-chalk-100)' : 'var(--color-steel-400)', fontStyle: lane.transcript ? 'normal' : 'italic' }}
              >
                {lane.transcript || (lane.status === 'failed' ? (lane.error ?? 'No speech detected') : 'No speech detected in this pass')}
              </span>
            </div>
            <span
              className="text-xs shrink-0 ml-3"
              style={{
                color: lane.transcript ? 'var(--color-go-400)' : 'var(--color-steel-400)',
              }}
            >
              {lane.transcript ? 'Captured' : 'Silent / No match'}
            </span>
          </div>
        ))}
      </div>

      {/* Passes decoded notice */}
      {result.passesDecoded < 3 && (
        <p className="mb-4 text-sm" style={{ color: 'var(--color-diya-400)' }}>
          <WarningIcon className="inline mr-1" size={14} weight="fill" />
          {result.passesDecoded} of 3 passes decoded. Result may be less reliable.
        </p>
      )}

      {/* Result card — departure board style */}
      <div
        className="rounded-2xl border p-6 mb-6 space-y-4"
        style={{ background: 'var(--color-night-800)', borderColor: 'var(--color-night-700)' }}
      >
        <FieldRow label="Train" icon={<TrainIcon size={16} weight="fill" />} field={result.trainNo} />
        <FieldRow label="Name" field={result.trainName} />
        <FieldRow label="Platform" field={result.platform} />
        {result.delayMin && (
          <FieldRow
            label="Delay"
            field={{
              value: result.delayMin.value !== undefined ? `${result.delayMin.value} min` : undefined,
              status: result.delayMin.status,
              votes: result.delayMin.votes,
            }}
          />
        )}

        {/* Clarity score */}
        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-night-700)' }}>
          <span className="text-sm" style={{ color: 'var(--color-steel-400)' }}>Clarity score</span>
          <span
            className="text-2xl font-bold font-mono"
            style={{ color: result.clarityScore >= 70 ? 'var(--color-go-400)' : result.clarityScore >= 40 ? 'var(--color-lamp-400)' : 'var(--color-stop-400)' }}
          >
            {result.clarityScore}
            <span className="text-sm font-normal ml-1" style={{ color: 'var(--color-steel-400)' }}>/100</span>
          </span>
        </div>
      </div>

      {/* Disclaimer — required per USER_WORKFLOW.md */}
      <p className="text-xs mb-6" style={{ color: 'var(--color-steel-400)' }}>
        Verify on the station display. This is an aid, not an official source.
      </p>

      {/* TTS playback */}
      {result.ttsSentence && (
        <div
          className="p-4 rounded-xl mb-4 flex items-center gap-4"
          style={{ background: 'var(--color-night-800)', border: '1px solid var(--color-wave-400)' }}
        >
          <button
            onClick={handlePlay}
            disabled={ttsLoading || ttsPlaying}
            aria-label="Play verified announcement"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: ttsPlaying ? 'var(--color-wave-400)' : 'var(--color-night-700)',
              color: ttsPlaying ? 'var(--color-night-950)' : 'var(--color-wave-400)',
            }}
          >
            <SpeakerHighIcon size={18} weight="fill" />
            {ttsLoading ? 'Loading…' : ttsPlaying ? 'Playing…' : 'Hear it clearly'}
          </button>
          {/* Caption — always shown alongside audio */}
          <p
            className="text-sm flex-1"
            aria-live="polite"
            style={{ color: 'var(--color-chalk-100)' }}
          >
            {result.ttsSentence}
          </p>
        </div>
      )}

      {/* Rate this station */}
      {!rated ? (
        <button
          onClick={handleRate}
          className="text-sm px-5 py-2.5 rounded-xl font-medium"
          style={{ background: 'var(--color-night-700)', color: 'var(--color-chalk-100)', border: '1px solid var(--color-night-700)' }}
        >
          Rate this station's clarity
        </button>
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-go-400)' }}>{rateMsg}</p>
      )}
    </section>
  )
}

function StatusChip({ status }: { status: FieldStatus }) {
  const cfg = {
    verified:   { icon: <SealCheckIcon size={13} weight="fill" />, label: 'verified',   cls: 'chip-verified' },
    conflict:   { icon: <WarningIcon size={13} weight="fill" />,   label: 'conflict',   cls: 'chip-conflict' },
    unverified: { icon: <QuestionIcon size={13} weight="fill" />,  label: 'unverified', cls: 'chip-unverified' },
  }[status]

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border chip-stamp ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function FieldRow({ label, field, icon }: { label: string; field: FusedField<string>; icon?: React.ReactNode }) {
  const voteCount = Object.values(field.votes).flat().length
  return (
    <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-[var(--color-night-900)]/40 border border-[var(--color-night-700)]/40 hover:border-[var(--color-night-700)] transition-colors">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: 'var(--color-lamp-400)' }}>{icon}</span>}
        <span className="text-sm font-medium" style={{ color: 'var(--color-steel-400)' }}>{label}</span>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap justify-end">
        {field.value ? (
          <span className="font-mono font-bold text-base px-2 py-0.5 rounded bg-[var(--color-night-950)] border border-[var(--color-night-700)] text-[var(--color-chalk-100)] flap-cell">
            {field.value}
          </span>
        ) : (
          <span className="text-sm italic" style={{ color: 'var(--color-steel-400)' }}>not found</span>
        )}
        <StatusChip status={field.status} />
        {voteCount > 0 && (
          <span className="text-xs font-mono" style={{ color: 'var(--color-steel-400)' }}>
            {voteCount}/3 passes
          </span>
        )}
      </div>
    </div>
  )
}
