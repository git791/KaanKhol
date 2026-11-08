import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [trailPos, setTrailPos] = useState({ x: -100, y: -100 })
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Strictly disable on touch devices, coarse pointers, or reduced motion
    const isTouchOrCoarse =
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      'ontouchstart' in window

    if (isTouchOrCoarse) {
      return
    }

    let targetX = -100
    let targetY = -100
    let currentX = -100
    let currentY = -100
    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      setPos({ x: targetX, y: targetY })
      if (!visible) setVisible(true)

      // Check if hovering over interactive element
      const target = e.target as HTMLElement | null
      const isInteractive = target?.closest('button, a, input, [role="button"], select, textarea') !== null
      setIsHovering(isInteractive)
    }

    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)
    const handleMouseLeave = () => setVisible(false)
    const handleMouseEnter = () => setVisible(true)

    // Smooth trailing animation loop
    const tick = () => {
      currentX += (targetX - currentX) * 0.18
      currentY += (targetY - currentY) * 0.18
      setTrailPos({ x: currentX, y: currentY })
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      cancelAnimationFrame(rafId)
    }
  }, [visible])

  if (!visible) return null

  return (
    <>
      {/* Precision center dot */}
      <div
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full transition-transform duration-75"
        style={{
          width: '6px',
          height: '6px',
          backgroundColor: isClicking ? 'var(--color-go-400)' : 'var(--color-lamp-400)',
          transform: `translate3d(${pos.x - 3}px, ${pos.y - 3}px, 0) scale(${isHovering ? 1.5 : 1})`,
        }}
        aria-hidden="true"
      />

      {/* Trailing signal reticle ring (crisp technical style, NO glowing bubble) */}
      <div
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full border transition-all duration-200"
        style={{
          width: isHovering ? '44px' : '26px',
          height: isHovering ? '44px' : '26px',
          borderColor: isHovering ? 'var(--color-lamp-400)' : 'rgba(111, 140, 166, 0.45)',
          borderWidth: isHovering ? '1.5px' : '1px',
          borderStyle: isHovering ? 'solid' : 'dashed',
          transform: `translate3d(${trailPos.x - (isHovering ? 22 : 13)}px, ${trailPos.y - (isHovering ? 22 : 13)}px, 0) scale(${isClicking ? 0.8 : 1})`,
          backgroundColor: isHovering ? 'rgba(255, 182, 46, 0.05)' : 'transparent',
        }}
        aria-hidden="true"
      />
    </>
  )
}
