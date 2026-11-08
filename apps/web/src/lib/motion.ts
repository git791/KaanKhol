/**
 * motion.ts — Lenis smooth scroll + GSAP integration helpers.
 * Always respects prefers-reduced-motion.
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

export { gsap, ScrollTrigger, SplitText }

// ── Reduced motion detection ──────────────────────────────────────────────────

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── Lenis initialisation ──────────────────────────────────────────────────────

let lenisInstance: { raf: (time: number) => void; destroy: () => void } | null = null

export async function initLenis(): Promise<void> {
  if (prefersReducedMotion()) return
  if ('ontouchstart' in window) return // disable on touch devices

  const { default: Lenis } = await import('lenis')
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  })

  gsap.ticker.add((time) => {
    lenisInstance?.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  document.documentElement.classList.add('lenis')
}

export function destroyLenis(): void {
  lenisInstance?.destroy()
  lenisInstance = null
  document.documentElement.classList.remove('lenis')
}

// ── Text reveal (Indic-safe: split by words, not chars/graphemes) ─────────────

export function revealWords(
  el: Element | null,
  options: { delay?: number; stagger?: number } = {},
): gsap.core.Timeline | null {
  if (!el || prefersReducedMotion()) return null

  const split = new SplitText(el, { type: 'words,lines' })
  const tl = gsap.timeline()

  tl.from(split.words, {
    opacity: 0,
    y: 20,
    duration: 0.6,
    ease: 'power3.out',
    stagger: options.stagger ?? 0.06,
    delay: options.delay ?? 0,
  })

  return tl
}

// ── Section reveal on scroll ──────────────────────────────────────────────────

export function revealOnScroll(
  el: Element | null,
  options: { y?: number; duration?: number } = {},
): gsap.core.Tween | null {
  if (!el || prefersReducedMotion()) {
    if (el) gsap.set(el, { opacity: 1 })
    return null
  }

  return gsap.from(el, {
    opacity: 0,
    y: options.y ?? 32,
    duration: options.duration ?? 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      once: true,
    },
  })
}

// ── Number flip (departure-board style) ──────────────────────────────────────

export function flipNumber(
  el: Element | null,
  from: number,
  to: number,
  duration = 0.8,
): void {
  if (!el) return

  if (prefersReducedMotion()) {
    el.textContent = String(to)
    return
  }

  const obj = { val: from }
  gsap.to(obj, {
    val: to,
    duration,
    ease: 'power2.out',
    onUpdate() {
      el.textContent = Math.round(obj.val).toString()
    },
  })
}
