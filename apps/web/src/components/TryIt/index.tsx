/**
 * TryIt section — record, upload, or pick a sample.
 */
import { useRef } from 'react'
import { MicrophoneIcon, UploadSimpleIcon, PlayIcon, StopIcon, WaveformIcon } from '@phosphor-icons/react'
import type { PipelineState } from '../../types'

interface Props {
  state: PipelineState
  micLevel: number
  onStartRecording: () => void
  onStopRecording: () => void
  onFileUpload: (file: File) => void
}

const SAMPLES = [
  { label: 'Bengaluru Platform 4', file: '/samples/sbc-platform4-kn-hi-en.wav' },
  { label: 'Delhi Express', file: '/samples/ndls-rajdhani-kn-hi-en.wav' },
]

export default function TryIt({ state, micLevel, onStartRecording, onStopRecording, onFileUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isRecording = state.phase === 'recording'
  const isBusy = ['processing-audio', 'transcribing', 'extracting', 'fusing'].includes(state.phase)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileUpload(file)
    e.target.value = ''
  }

  const handleSample = async (sampleUrl: string) => {
    const res = await fetch(sampleUrl)
    const blob = await res.blob()
    onFileUpload(new File([blob], 'sample.wav', { type: 'audio/wav' }))
  }

  return (
    <section
      id="try-it"
      className="py-20 px-6 max-w-3xl mx-auto"
      aria-labelledby="tryit-heading"
    >
      <h2
        id="tryit-heading"
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
      >
        Decode an Announcement
      </h2>
      <p className="mb-10" style={{ color: 'var(--color-steel-400)' }}>
        <span lang="hi" className="text-indic">घोषणा डिकोड करें</span>
        {' · '}
        <span lang="kn" className="text-indic">ಪ್ರಕಟನೆ ಅರ್ಥೈಸಿ</span>
      </p>

      {/* Error state */}
      {state.phase === 'error' && (
        <div
          className="mb-6 px-4 py-3 rounded-xl border text-sm"
          role="alert"
          style={{ background: 'rgba(255,92,92,0.1)', borderColor: 'var(--color-stop-400)', color: 'var(--color-stop-400)' }}
        >
          {state.errorMessage}
        </div>
      )}

      {/* Record button */}
      <div className="flex flex-col items-center gap-6 mb-10">
        <div className="relative">
          {/* Pulse ring driven by mic level */}
          {isRecording && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                transform: `scale(${1 + micLevel * 0.5})`,
                background: 'var(--color-lamp-400)',
                opacity: micLevel * 0.4,
                transition: 'transform 50ms linear, opacity 50ms linear',
              }}
              aria-hidden="true"
            />
          )}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isBusy}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: isRecording ? 'var(--color-stop-400)' : 'var(--color-lamp-400)',
              color: 'var(--color-night-950)',
              opacity: isBusy ? 0.5 : 1,
              cursor: isBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {isRecording
              ? <StopIcon size={32} weight="fill" />
              : <MicrophoneIcon size={32} weight="fill" />
            }
          </button>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-steel-400)' }}>
          {isRecording ? 'Recording… tap to stop (max 60 s)' : 'Tap to record'}
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px" style={{ background: 'var(--color-night-700)' }} />
        <span className="text-sm" style={{ color: 'var(--color-steel-400)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-night-700)' }} />
      </div>

      {/* Upload + Sample */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy || isRecording}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: 'var(--color-night-800)',
            color: 'var(--color-chalk-100)',
            border: '1px solid var(--color-night-700)',
          }}
        >
          <UploadSimpleIcon size={18} />
          Upload audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload audio file"
        />

        {SAMPLES.map((s) => (
          <button
            key={s.file}
            onClick={() => handleSample(s.file)}
            disabled={isBusy || isRecording}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'var(--color-night-800)',
              color: 'var(--color-lamp-400)',
              border: '1px solid var(--color-lamp-400)',
            }}
          >
            <PlayIcon size={18} weight="fill" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Processing states */}
      {isBusy && (
        <div className="mt-10 space-y-3" aria-live="polite" aria-label="Processing transcripts">
          {state.lanes.map((lane) => (
            <div
              key={lane.lang}
              className="flex items-center gap-3 p-4 rounded-xl border"
              style={{ background: 'var(--color-night-800)', borderColor: 'var(--color-night-700)' }}
            >
              <WaveformIcon
                size={20}
                weight="bold"
                style={{
                  color: lane.status === 'done' ? 'var(--color-go-400)'
                    : lane.status === 'failed' ? 'var(--color-stop-400)'
                    : 'var(--color-lamp-400)',
                  animation: lane.status === 'transcribing' ? 'pulse 1s infinite' : 'none',
                }}
              />
              <span className="text-sm font-mono" style={{ color: 'var(--color-steel-400)' }}>
                {lane.lang}
              </span>
              <span className="text-sm ml-auto" style={{ color: 'var(--color-chalk-100)' }}>
                {lane.status === 'transcribing' ? 'Decoding…'
                  : lane.status === 'done' ? 'Done'
                  : lane.status === 'failed' ? (lane.error ?? 'Failed')
                  : lane.status === 'timeout' ? 'Timed out'
                  : 'Waiting'}
              </span>
            </div>
          ))}
          {state.phase === 'fusing' && (
            <p className="text-center text-sm mt-4" style={{ color: 'var(--color-wave-400)' }}>
              Fusing transcripts…
            </p>
          )}
        </div>
      )}
    </section>
  )
}
