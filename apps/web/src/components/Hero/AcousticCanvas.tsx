import { useEffect, useRef } from 'react'

interface Props {
  mousePos: { x: number; y: number }
  reduced: boolean
}

export default function AcousticCanvas({ mousePos, reduced }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef(mousePos)

  // Keep mouseRef updated without triggering re-render/useEffect restart
  useEffect(() => {
    mouseRef.current = mousePos
  }, [mousePos])

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    // Smooth lerped parallax coordinates
    let smoothX = 0
    let smoothY = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    // Background acoustic haze dust particles
    const particleCount = 50
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (canvas.width / (window.devicePixelRatio || 1)),
      y: Math.random() * (canvas.height / (window.devicePixelRatio || 1)),
      radius: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.25 - 0.1,
      alpha: Math.random() * 0.35 + 0.1,
    }))

    const render = () => {
      time += 0.018
      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height

      // Exponential smoothing (damping / lerp) for butter-smooth parallax
      smoothX += (mouseRef.current.x - smoothX) * 0.06
      smoothY += (mouseRef.current.y - smoothY) * 0.06

      ctx.clearRect(0, 0, w, h)

      // ── 1. Railway Track Perspective Lines (per ASSETS.md §6.3) ──
      ctx.save()
      const vanishX = w * 0.5 + smoothX * 30
      const vanishY = h * 0.78 + smoothY * 15

      ctx.strokeStyle = 'rgba(27, 58, 85, 0.30)' // Night-700 subtle grid
      ctx.lineWidth = 1

      // Left rail & Right rail
      ctx.beginPath()
      ctx.moveTo(vanishX - 30, vanishY)
      ctx.lineTo(w * 0.15, h)
      ctx.moveTo(vanishX + 30, vanishY)
      ctx.lineTo(w * 0.85, h)
      ctx.stroke()

      // Track sleepers (ties) receding to vanishing point
      const sleeperCount = 8
      for (let s = 1; s <= sleeperCount; s++) {
        const factor = Math.pow(s / sleeperCount, 2.2)
        const sy = vanishY + (h - vanishY) * factor
        const leftX = (vanishX - 30) + (w * 0.15 - (vanishX - 30)) * factor
        const rightX = (vanishX + 30) + (w * 0.85 - (vanishX + 30)) * factor

        ctx.beginPath()
        ctx.moveTo(leftX, sy)
        ctx.lineTo(rightX, sy)
        ctx.strokeStyle = `rgba(27, 58, 85, ${0.1 + factor * 0.25})`
        ctx.stroke()
      }
      ctx.restore()

      // ── 2. Expanding Concentric Sound Shockwaves ──
      const focalX = vanishX
      const focalY = vanishY
      const rippleCount = 6

      for (let i = 0; i < rippleCount; i++) {
        const offsetTime = (time * 0.55 + i / rippleCount) % 1
        const radius = offsetTime * Math.max(w, h) * 0.65
        const alpha = Math.sin(offsetTime * Math.PI) * 0.28

        ctx.save()
        ctx.beginPath()
        ctx.arc(focalX, focalY, radius, 0, Math.PI * 2)
        // Alternating lamp-amber and wave-teal concentric bands
        ctx.strokeStyle = i % 2 === 0
          ? `rgba(255, 182, 46, ${alpha})`
          : `rgba(53, 196, 216, ${alpha * 0.7})`
        ctx.lineWidth = 1.2 + (1 - offsetTime) * 1.8
        ctx.setLineDash(i % 3 === 0 ? [6, 8] : [])
        ctx.stroke()
        ctx.restore()
      }

      // ── 3. Sound Dust Haze Particles ──
      for (const p of particles) {
        p.x += p.speedX + smoothX * 0.3
        p.y += p.speedY + smoothY * 0.3
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(242, 232, 213, ${p.alpha * 0.4})`
        ctx.fill()
      }

      // ── 4. Three Converging Language Waveform Ribbons ──
      // Lane 1: Regional Language (Amber #FFB62E)
      drawWaveRibbon(ctx, {
        startX: w * 0.05,
        startY: focalY - 35,
        focalX,
        focalY,
        color: 'rgba(255, 182, 46, 0.85)',
        glowColor: 'rgba(255, 182, 46, 0.25)',
        freq: 0.014,
        amp: 14 + Math.sin(time * 2.2) * 5,
        time: time * 2.0,
      })

      // Lane 2: Hindi (Teal #35C4D8)
      drawWaveRibbon(ctx, {
        startX: w * 0.03,
        startY: focalY,
        focalX,
        focalY,
        color: 'rgba(53, 196, 216, 0.85)',
        glowColor: 'rgba(53, 196, 216, 0.25)',
        freq: 0.018,
        amp: 16 + Math.cos(time * 1.8) * 6,
        time: time * 2.5 + 1.2,
      })

      // Lane 3: English (Diya Orange #FF8A3D)
      drawWaveRibbon(ctx, {
        startX: w * 0.05,
        startY: focalY + 35,
        focalX,
        focalY,
        color: 'rgba(255, 138, 61, 0.85)',
        glowColor: 'rgba(255, 138, 61, 0.25)',
        freq: 0.016,
        amp: 12 + Math.sin(time * 2.8) * 5,
        time: time * 1.9 + 2.4,
      })

      // ── 5. Fused Single Ground-Truth Beam (Signal Green #3DDC97) ──
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(focalX, focalY)

      // Slight animated micro-wave on the green fused beam
      const beamEnd = w * 0.95
      const beamSteps = 60
      for (let j = 0; j <= beamSteps; j++) {
        const bt = j / beamSteps
        const bx = focalX + (beamEnd - focalX) * bt
        const by = focalY + Math.sin(bx * 0.02 + time * 3) * 1.5 * bt
        ctx.lineTo(bx, by)
      }

      ctx.strokeStyle = '#3DDC97'
      ctx.lineWidth = 3.5
      ctx.shadowColor = 'rgba(61, 220, 151, 0.45)'
      ctx.shadowBlur = 10
      ctx.stroke()

      // Terminal Signal Node
      ctx.beginPath()
      ctx.arc(beamEnd, focalY, 4.5 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#3DDC97'
      ctx.fill()
      ctx.restore()

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  )
}

function drawWaveRibbon(
  ctx: CanvasRenderingContext2D,
  cfg: {
    startX: number
    startY: number
    focalX: number
    focalY: number
    color: string
    glowColor: string
    freq: number
    amp: number
    time: number
  }
) {
  ctx.save()
  ctx.beginPath()

  const steps = 90
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = cfg.startX + (cfg.focalX - cfg.startX) * t
    const baseY = cfg.startY + (cfg.focalY - cfg.startY) * (t * t)

    // Wave amplitude gracefully tapers to zero as it fuses at the speaker
    const envelope = Math.sin((1 - t) * Math.PI * 0.5)
    const wave = Math.sin(x * cfg.freq + cfg.time) * cfg.amp * envelope
    const y = baseY + wave

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }

  ctx.strokeStyle = cfg.color
  ctx.lineWidth = 2
  ctx.shadowColor = cfg.glowColor
  ctx.shadowBlur = 6
  ctx.stroke()
  ctx.restore()
}
