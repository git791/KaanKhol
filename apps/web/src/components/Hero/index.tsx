import { useState, useEffect, useRef } from 'react'
import { SpeakerHighIcon, MicrophoneIcon, ArrowDownIcon } from '@phosphor-icons/react'
import { prefersReducedMotion } from '../../lib/motion'
import AcousticCanvas from './AcousticCanvas'

export default function Hero() {
  const [reduced, setReduced] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReduced(prefersReducedMotion())
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePos({ x, y })
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[92vh] flex flex-col justify-between items-center text-center px-6 pt-24 pb-12 overflow-hidden"
      style={{
        background: 'radial-gradient(120% 80% at 50% 10%, #15324c 0%, #0C1D2D 55%, #08141F 100%)',
      }}
    >
      {/* Dynamic 60fps Acoustic Ripple & Converging Waveform Engine */}
      <AcousticCanvas mousePos={mousePos} reduced={reduced} />

      {/* Main Hero Header */}
      <div className="relative z-10 max-w-3xl mx-auto my-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--color-night-700)] bg-[var(--color-night-800)]/80 backdrop-blur-sm text-xs font-mono text-[var(--color-lamp-400)]">
          <SpeakerHighIcon size={14} weight="fill" />
          <span>Diwali Festival Rush · Platform Clarity Engine</span>
        </div>

        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[var(--color-chalk-100)] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          KaanKhol
          <span className="block text-2xl sm:text-3xl md:text-4xl mt-3 font-normal text-[var(--color-lamp-400)]">
            <span lang="kn" className="text-indic">ಕಿವಿ ತೆರೆಯಿರಿ</span> · <span lang="hi" className="text-indic">कान खोल</span>
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--color-steel-400)] max-w-2xl mx-auto leading-relaxed">
          Indian railway platform announcements are repeated thrice in three languages.
          Over reverberant PA systems and crowd roar, KaanKhol listens to all three with{' '}
          <strong className="text-[var(--color-chalk-100)]">Gnani Prisma v2.5</strong>, cross-checks facts against the national timetable, and re-announces verified departures clearly with{' '}
          <strong className="text-[var(--color-chalk-100)]">Gnani Timbre v2.5</strong>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <a
            href="#try-it"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-[var(--color-lamp-400)] text-[var(--color-night-950)] hover:bg-[var(--color-lamp-600)] transition-all duration-200 shadow-lg shadow-[var(--color-lamp-400)]/15"
          >
            <MicrophoneIcon size={18} weight="fill" />
            Decode an announcement
          </a>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm border border-[var(--color-night-700)] bg-[var(--color-night-800)]/60 text-[var(--color-chalk-100)] hover:border-[var(--color-steel-400)] transition-all duration-200"
          >
            How it works
          </a>
        </div>
      </div>

      {/* Hero Footnote / Scroll Indicator */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-xs font-mono text-[var(--color-steel-400)] opacity-70">
        <a href="#how-it-works" className="flex items-center gap-1 hover:text-[var(--color-lamp-400)] transition-colors">
          <span>Three passes. One truth.</span>
          <ArrowDownIcon size={12} />
        </a>
      </div>
    </section>
  )
}
