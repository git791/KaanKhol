import { useEffect, Suspense, lazy } from 'react'
import { initLenis, destroyLenis } from './lib/motion'
import { usePipeline } from './lib/pipeline'
import HowItWorks from './components/HowItWorks'
import TryIt from './components/TryIt'
import Results from './components/Results'
import Benchmark from './components/Benchmark'
import Leaderboard from './components/Leaderboard'
import Footer from './components/Footer'
import CustomCursor from './components/CustomCursor'

// Lazy-load 3D hero after first paint
const Hero = lazy(() => import('./components/Hero'))

export default function App() {
  const { state, micLevel, startRecording, stopRecording, processFile, reset } = usePipeline()

  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  return (
    <>
      {/* Precision Signal Lamp Reticle Cursor */}
      <CustomCursor />

      {/* SVG grain overlay — 4% opacity, disabled under reduced-motion */}
      <div className="grain-overlay" aria-hidden="true" />

      <main>
        {/* Section 1: 3D Hero */}
        <Suspense fallback={<HeroFallback />}>
          <Hero />
        </Suspense>

        {/* Section 2: How It Works */}
        <HowItWorks />

        {/* Section 3: Try It */}
        <TryIt
          state={state}
          micLevel={micLevel}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onFileUpload={processFile}
        />

        {/* Section 4: Results (shown when result available) */}
        {(state.phase === 'result' || state.phase === 'speaking' || state.phase === 'transcribing' || state.phase === 'extracting' || state.phase === 'fusing') && (
          <Results state={state} onReset={reset} />
        )}

        {/* Section 5: Benchmark */}
        <Benchmark />

        {/* Section 6: Leaderboard */}
        <Leaderboard lastScore={state.phase === 'result' ? state.result?.clarityScore : undefined} />

        {/* Section 7: Built with Gnani */}
        <BuiltWithGnani />
      </main>

      <Footer />
    </>
  )
}

/** CSS-only hero fallback shown while 3D canvas loads */
function HeroFallback() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1B3A55, #0C1D2D 60%, #08141F)',
      }}
    >
      {/* Animated SVG waveform fallback */}
      <div className="text-center px-6">
        <svg
          width="120"
          height="40"
          viewBox="0 0 120 40"
          aria-hidden="true"
          className="mx-auto mb-8 opacity-70"
        >
          {[10, 25, 40, 55, 70, 85, 100].map((x, i) => (
            <line
              key={x}
              x1={x} y1="5" x2={x} y2="35"
              stroke="#FFB62E"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                animation: `waveBar 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
                transformOrigin: `${x}px 20px`,
              }}
            />
          ))}
          <style>{`@keyframes waveBar { from { transform: scaleY(0.2); } to { transform: scaleY(1); } } @media (prefers-reduced-motion: reduce) { line { animation: none; } }`}</style>
        </svg>
        <h1
          className="text-4xl md:text-6xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
        >
          KaanKhol
        </h1>
        <p style={{ color: 'var(--color-steel-400)' }}>Loading…</p>
      </div>
    </section>
  )
}

/** "Built with Gnani" section — names models explicitly per AGENTS.md rule 7 */
function BuiltWithGnani() {
  return (
    <section
      id="built-with-gnani"
      className="py-20 px-6 max-w-4xl mx-auto"
      aria-labelledby="gnani-heading"
    >
      <h2
        id="gnani-heading"
        className="text-3xl font-bold mb-10"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
      >
        Built with Gnani
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div
          className="p-6 rounded-2xl border"
          style={{ background: 'var(--color-night-800)', borderColor: 'var(--color-night-700)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--color-steel-400)' }}>Speech-to-Text</p>
          <p className="text-xl font-semibold" style={{ color: 'var(--color-lamp-400)' }}>Gnani Prisma v2.5</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-steel-400)' }}>
            Three parallel calls per clip — one per language (Kannada, Hindi, English).
            Multilingual Indian-accent STT.
          </p>
        </div>
        <div
          className="p-6 rounded-2xl border"
          style={{ background: 'var(--color-night-800)', borderColor: 'var(--color-night-700)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--color-steel-400)' }}>Text-to-Speech</p>
          <p className="text-xl font-semibold" style={{ color: 'var(--color-wave-400)' }}>Gnani Timbre v2.5</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-steel-400)' }}>
            Re-announces verified facts clearly. Also used to synthesise the benchmark corpus.
          </p>
        </div>
      </div>

      <div
        className="p-6 rounded-2xl border"
        style={{ background: 'var(--color-night-800)', borderColor: 'var(--color-night-700)' }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-chalk-100)' }}>Team</h3>
        <div className="space-y-3">
          <div>
            <p className="font-medium" style={{ color: 'var(--color-chalk-100)' }}>Bibi Sufiya Shariff</p>
            <p className="text-sm" style={{ color: 'var(--color-steel-400)' }}>
              Product · Speech pipeline (Prisma STT integration) · Fusion logic · Noise benchmark
            </p>
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--color-chalk-100)' }}>Mohammed Ayaan Adil Ahmed</p>
            <p className="text-sm" style={{ color: 'var(--color-steel-400)' }}>
              Frontend · 3D hero · Motion · Edge API (Timbre TTS integration) · Leaderboard
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
