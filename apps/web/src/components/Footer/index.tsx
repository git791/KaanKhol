import { ArrowSquareOutIcon } from '@phosphor-icons/react'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-night-700)] bg-[var(--color-night-950)] py-16 px-6 text-xs text-[var(--color-steel-400)]">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-lg font-bold text-[var(--color-chalk-100)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                KaanKhol
              </span>
              <span className="font-mono text-[var(--color-lamp-400)]">/ कान खोल</span>
            </div>
            <p className="max-w-md">
              A trilingual Indian railway announcement decoder using multi-pass voting and timetable cross-verification.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 font-mono text-xs">
            <a
              href="#try-it"
              className="hover:text-[var(--color-chalk-100)] transition-colors"
            >
              Decoder
            </a>
            <a
              href="#benchmark"
              className="hover:text-[var(--color-chalk-100)] transition-colors"
            >
              Benchmark
            </a>
            <a
              href="#leaderboard"
              className="hover:text-[var(--color-chalk-100)] transition-colors"
            >
              Leaderboard
            </a>
            <a
              href="#built-with-gnani"
              className="hover:text-[var(--color-chalk-100)] transition-colors"
            >
              Gnani Models
            </a>
          </div>
        </div>

        {/* Attribution & Compliance per AGENTS.md rule 7 & ASSETS.md section 7 */}
        <div className="p-4 rounded-xl bg-[var(--color-night-900)] border border-[var(--color-night-700)] space-y-2">
          <p className="text-[var(--color-chalk-100)] font-medium">Attributions & Open Data</p>
          <p>
            Icons: Phosphor (MIT). Fonts: Clash Display and Satoshi (ITF Free Font Licence), Noto Sans Devanagari and Kannada (SIL Open Font License). Data: datameet/railways (CC0). Speech: Gnani Prisma v2.5 and Timbre v2.5.
          </p>
          <p className="text-[var(--color-wave-400)]">
            Privacy First: Audio is processed ephemerally in RAM. No user audio is ever committed, uploaded to third parties, or persisted.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-[var(--color-night-700)] gap-4">
          <p>
            Built for the <strong className="text-[var(--color-chalk-100)]">Gnani.ai Great Indian AI Internship Challenge</strong> (Track: Jugaad Genius).
          </p>
          <p className="font-mono">
            Bibi Sufiya Shariff · Mohammed Ayaan Adil Ahmed
          </p>
        </div>
      </div>
    </footer>
  )
}
