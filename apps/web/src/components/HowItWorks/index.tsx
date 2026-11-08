import { SparkleIcon, CheckCircleIcon, ShieldCheckIcon } from '@phosphor-icons/react'

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: <SparkleIcon size={24} weight="duotone" className="text-[var(--color-lamp-400)]" />,
      title: '3 Passes, 3 Languages',
      sub: 'Kannada · Hindi · English',
      desc: 'Indian railway platforms repeat every announcement 3 times. Crackly speakers and Diwali crowd noise corrupt individual words, but the facts are duplicated across passes.',
    },
    {
      num: '02',
      icon: <CheckCircleIcon size={24} weight="duotone" className="text-[var(--color-wave-400)]" />,
      title: 'Cross-Language Voting',
      sub: 'Redundancy as Error Correction',
      desc: 'Gnani Prisma v2.5 transcribes each pass in parallel. Our voting algorithm detects agreement on train numbers, platform, and delay across languages.',
    },
    {
      num: '03',
      icon: <ShieldCheckIcon size={24} weight="duotone" className="text-[var(--color-go-400)]" />,
      title: 'Timetable Verification',
      sub: 'Truth Grounding & Re-speech',
      desc: 'Extracted facts are cross-checked against national railway timetable records. Verified facts are spoken clearly with Gnani Timbre v2.5.',
    },
  ]

  return (
    <section
      id="how-it-works"
      className="py-24 px-6 max-w-5xl mx-auto border-t border-[var(--color-night-700)]"
      aria-labelledby="how-heading"
    >
      <div className="text-center mb-16">
        <span className="text-xs uppercase tracking-widest font-mono text-[var(--color-lamp-400)]">
          The Architecture of Redundancy
        </span>
        <h2
          id="how-heading"
          className="text-3xl md:text-5xl font-bold mt-2 mb-4"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-chalk-100)' }}
        >
          How It Works
        </h2>
        <p className="max-w-2xl mx-auto text-sm md:text-base text-[var(--color-steel-400)]">
          Instead of fighting noise with a single mic, KaanKhol turns station repetition into an error-correcting code.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-8 rounded-2xl border border-[var(--color-night-700)] bg-[var(--color-night-800)] flex flex-col justify-between hover:border-[var(--color-lamp-400)] transition-colors duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-2xl font-bold text-[var(--color-steel-400)]/40">
                  {step.num}
                </span>
                {step.icon}
              </div>
              <h3
                className="text-xl font-bold mb-1 text-[var(--color-chalk-100)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {step.title}
              </h3>
              <p className="text-xs font-mono text-[var(--color-lamp-400)] mb-4">
                {step.sub}
              </p>
              <p className="text-sm text-[var(--color-steel-400)] leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
