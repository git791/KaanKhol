import { useState, useEffect } from 'react'
import { MapPinIcon, TrophyIcon, BroadcastIcon } from '@phosphor-icons/react'
import { fetchLeaderboard } from '../../lib/api'
import type { LeaderboardStation } from '../../lib/api'
import stationsData from '../../data/stations.json'

interface Props {
  lastScore?: number | undefined
}

const STATION_MAP: Record<string, string> = Object.fromEntries(
  (stationsData as Array<{ code: string; name: string }>).map((s) => [s.code, s.name])
)

// Initial fallback seed (strictly labelled as sample per rules)
const FALLBACK_SEED: LeaderboardStation[] = [
  { station_code: 'SBC', avg_score: 78, submission_count: 14, has_sample: 1 },
  { station_code: 'HYB', avg_score: 71, submission_count: 9, has_sample: 1 },
  { station_code: 'NDLS', avg_score: 65, submission_count: 22, has_sample: 1 },
  { station_code: 'MAS', avg_score: 59, submission_count: 18, has_sample: 1 },
  { station_code: 'BCT', avg_score: 52, submission_count: 11, has_sample: 1 },
  { station_code: 'HWH', avg_score: 68, submission_count: 16, has_sample: 1 },
  { station_code: 'PNBE', avg_score: 54, submission_count: 8, has_sample: 1 },
  { station_code: 'ADI', avg_score: 74, submission_count: 12, has_sample: 1 },
]

export default function Leaderboard({ lastScore }: Props) {
  const [stations, setStations] = useState<LeaderboardStation[]>(FALLBACK_SEED)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
      .then((res) => {
        if (res && res.length > 0) {
          setStations(res)
        }
      })
      .finally(() => setLoading(false))
  }, [lastScore])

  return (
    <section
      id="leaderboard"
      className="py-24 px-6 max-w-4xl mx-auto border-t border-[var(--color-night-700)]"
      aria-labelledby="leader-heading"
    >
      <div className="text-center mb-16">
        <span className="text-xs uppercase tracking-widest font-mono text-[var(--color-lamp-400)]">
          Crowdsourced Station Clarity
        </span>
        <h2
          id="leader-heading"
          className="text-3xl md:text-5xl font-bold mt-2 mb-4"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
        >
          Station Audio Leaderboard
        </h2>
        <p className="max-w-xl mx-auto text-sm text-[var(--color-steel-400)]">
          Aggregated fact-recovery scores across Indian railway stations. Help map which junctions have the clearest PA systems.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-night-700)] bg-[var(--color-night-800)] overflow-hidden">
        <div className="p-4 px-6 bg-[var(--color-night-950)]/50 border-b border-[var(--color-night-700)] flex justify-between items-center text-xs font-mono text-[var(--color-steel-400)]">
          <span>STATION / JUNCTION</span>
          <div className="flex gap-8">
            <span className="hidden sm:inline">REPORTS SUBMITTED</span>
            <span>CLARITY SCORE</span>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-night-700)]">
          {stations.map((item, idx) => {
            const stationName = STATION_MAP[item.station_code] ?? item.station_code
            const isTop = idx === 0

            return (
              <div
                key={item.station_code}
                className="p-4 px-6 flex items-center justify-between hover:bg-[var(--color-night-700)]/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm w-5 text-[var(--color-steel-400)]">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--color-chalk-100)]">
                        {stationName}
                      </span>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--color-night-700)] text-[var(--color-steel-400)]">
                        {item.station_code}
                      </span>
                      {item.has_sample === 1 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-[var(--color-steel-400)]/40 text-[var(--color-steel-400)]">
                          sample
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <span className="hidden sm:inline text-xs font-mono text-[var(--color-steel-400)]">
                    {item.submission_count} {item.submission_count === 1 ? 'report' : 'reports'}
                  </span>
                  <div className="flex items-center gap-2 w-20 justify-end">
                    <span
                      className={`text-lg font-mono font-bold ${
                        item.avg_score >= 70
                          ? 'text-[var(--color-go-400)]'
                          : item.avg_score >= 50
                          ? 'text-[var(--color-lamp-400)]'
                          : 'text-[var(--color-stop-400)]'
                      }`}
                    >
                      {item.avg_score}%
                    </span>
                    {isTop && <TrophyIcon size={16} weight="fill" className="text-[var(--color-lamp-400)]" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-steel-400)]">
        <span>Scores calculated via verified / expected facts. No audio recorded.</span>
        <span>Rate-limited: 1 score/station/day</span>
      </div>
    </section>
  )
}
