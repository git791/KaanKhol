import { useState, useEffect } from 'react'
import { ChartBarIcon, DownloadSimpleIcon, LightningIcon } from '@phosphor-icons/react'
import { fetchBenchmark } from '../../lib/api'
import type { BenchmarkData, BenchmarkRow } from '../../types'

export default function Benchmark() {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(1) // Default to 10 dB

  useEffect(() => {
    fetchBenchmark().then(setData)
  }, [])

  const rows: BenchmarkRow[] = data?.rows ?? [
    { snr_db: 20, single_best: 86.7, fused: 96.7, sample_count: 30 },
    { snr_db: 10, single_best: 73.3, fused: 90.0, sample_count: 30 },
    { snr_db: 5, single_best: 56.7, fused: 80.0, sample_count: 30 },
    { snr_db: 0, single_best: 36.7, fused: 63.3, sample_count: 30 },
    { snr_db: 'telephony', single_best: 46.7, fused: 73.3, sample_count: 30 },
  ]

  const activeRow = rows[selectedIdx] ?? rows[0]!
  const delta = (activeRow.fused - activeRow.single_best).toFixed(1)

  const downloadCSV = () => {
    const header = 'Condition,Single_Best_Recovery_Pct,Fused_Recovery_Pct,Delta_Gain_Pct,Sample_Size\n'
    const body = rows
      .map(
        (r) =>
          `${typeof r.snr_db === 'number' ? r.snr_db + ' dB' : 'Telephony (8kHz)'},${r.single_best}%,${r.fused}%,+${(r.fused - r.single_best).toFixed(1)}%,${r.sample_count}`
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kaankhol_noise_benchmark.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      id="benchmark"
      className="py-24 px-6 max-w-4xl mx-auto border-t border-[var(--color-night-700)]"
      aria-labelledby="bench-heading"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-mono text-[var(--color-wave-400)]">
            Noise Canceller Track Verification
          </span>
          <h2
            id="bench-heading"
            className="text-3xl md:text-5xl font-bold mt-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
          >
            Fact Recovery Benchmark
          </h2>
          <p className="text-sm text-[var(--color-steel-400)] mt-2">
            Multi-pass trilingual fusion vs. best single-pass STT under station crowd noise and 8 kHz telephony.
          </p>
        </div>

        <button
          onClick={downloadCSV}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono border border-[var(--color-night-700)] hover:border-[var(--color-steel-400)] text-[var(--color-chalk-100)] transition-colors"
        >
          <DownloadSimpleIcon size={16} />
          Export CSV Dataset
        </button>
      </div>

      {/* SNR selector controls */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[var(--color-night-800)] border border-[var(--color-night-700)] mb-10">
        {rows.map((row, idx) => {
          const label = typeof row.snr_db === 'number' ? `${row.snr_db} dB SNR` : '8 kHz Telephony'
          const active = idx === selectedIdx
          return (
            <button
              key={String(row.snr_db)}
              onClick={() => setSelectedIdx(idx)}
              className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-mono transition-all duration-200 text-center ${
                active
                  ? 'bg-[var(--color-lamp-400)] text-[var(--color-night-950)] font-bold shadow-md'
                  : 'text-[var(--color-steel-400)] hover:text-[var(--color-chalk-100)] hover:bg-[var(--color-night-700)]/40'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Benchmark recovery display */}
      <div className="p-8 rounded-2xl bg-[var(--color-night-800)] border border-[var(--color-night-700)]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-mono text-[var(--color-steel-400)] uppercase">
              Condition Tested
            </span>
            <p className="text-xl font-bold text-[var(--color-chalk-100)]">
              {typeof activeRow.snr_db === 'number'
                ? `${activeRow.snr_db} dB Signal-to-Noise Ratio`
                : 'Bandwidth-limited 8 kHz Telephony'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-[var(--color-go-400)] flex items-center gap-1 justify-end">
              <LightningIcon size={14} weight="fill" /> Fusion Advantage
            </span>
            <p className="text-2xl font-bold font-mono text-[var(--color-go-400)]">
              +{delta}%
            </p>
          </div>
        </div>

        {/* Visual Comparison Bars */}
        <div className="space-y-6">
          {/* Fused Bar */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-[var(--color-chalk-100)] font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-go-400)]"></span>
                KaanKhol Fused (3 Passes + Timetable)
              </span>
              <span className="text-[var(--color-go-400)] font-bold">{activeRow.fused}% Fact Accuracy</span>
            </div>
            <div className="h-5 w-full bg-[var(--color-night-950)] rounded-full overflow-hidden p-0.5 border border-[var(--color-night-700)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-wave-400)] to-[var(--color-go-400)] rounded-full transition-all duration-500"
                style={{ width: `${activeRow.fused}%` }}
              ></div>
            </div>
          </div>

          {/* Single Best Bar */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-[var(--color-steel-400)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-steel-400)]"></span>
                Single-Language Best Pass (Prisma STT alone)
              </span>
              <span className="text-[var(--color-steel-400)]">{activeRow.single_best}% Fact Accuracy</span>
            </div>
            <div className="h-5 w-full bg-[var(--color-night-950)] rounded-full overflow-hidden p-0.5 border border-[var(--color-night-700)]">
              <div
                className="h-full bg-[var(--color-steel-400)]/60 rounded-full transition-all duration-500"
                style={{ width: `${activeRow.single_best}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-night-700)] text-xs text-[var(--color-steel-400)] flex items-center justify-between">
          <span>Simulation evaluated with seeded acoustic drop models; reproducible via bench/run_benchmark.py.</span>
          <span className="font-mono">N = {activeRow.sample_count} runs per condition</span>
        </div>
      </div>
    </section>
  )
}
