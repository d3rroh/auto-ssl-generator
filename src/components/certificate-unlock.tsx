"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2 } from "lucide-react"

type Phase = "validated" | "lock" | "key-approach" | "insert" | "turn" | "open" | "unlocked" | "done"

interface Props {
  onComplete: () => void
}

const PHASE_DURATIONS: Record<Phase, number> = {
  validated: 600,
  lock: 350,
  "key-approach": 500,
  insert: 300,
  turn: 350,
  open: 400,
  unlocked: 550,
  done: 0,
}

const PHASE_ORDER: Phase[] = [
  "validated",
  "lock",
  "key-approach",
  "insert",
  "turn",
  "open",
  "unlocked",
  "done",
]

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return reduced
}

/* ================================================================
   SVG ILLUSTRATIONS
   ================================================================ */

function Padlock({ color, glow, shackleOpen }: {
  color: string
  glow: string
  shackleOpen: number // 0 = closed, 1 = fully open
}) {
  const shackleY = -12 * shackleOpen
  const shackleRotate = -25 * shackleOpen

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      {/* Glow filter */}
      <defs>
        <filter id="lock-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={3 + shackleOpen * 4} />
        </filter>
      </defs>

      {/* Background glow circle */}
      <circle cx="60" cy="60" r="50" fill={glow} opacity={0.08 + shackleOpen * 0.12} />

      {/* Shackle */}
      <g style={{
        transformOrigin: "42px 48px",
        transform: `translateY(${shackleY}px) rotate(${shackleRotate}deg)`,
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <path
          d="M 42 48 V 34 C 42 24 78 24 78 34 V 48"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Lock body */}
      <rect
        x="30" y="48" width="60" height="44" rx="6"
        fill="#141B2E"
        stroke={color}
        strokeWidth="2"
      />

      {/* Keyhole */}
      <circle cx="60" cy="64" r="5" fill={color} opacity={0.7} />
      <rect x="58" y="64" width="4" height="10" rx="1.5" fill={color} opacity={0.7} />

      {/* Subtle body edge lighting */}
      <line x1="32" y1="50" x2="88" y2="50" stroke={color} strokeWidth="0.5" opacity={0.3} />
    </svg>
  )
}

function Key({ color, glow }: { color: string; glow: string }) {
  return (
    <svg width="64" height="32" viewBox="0 0 64 32" fill="none">
      <defs>
        <filter id="key-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* Key head */}
      <circle cx="14" cy="16" r="10" stroke={color} strokeWidth="2" fill="#141B2E" />
      <circle cx="14" cy="16" r="4" fill={color} opacity={0.5} />

      {/* Key shaft */}
      <rect x="24" y="14" width="26" height="4" rx="1" fill={color} />

      {/* Teeth */}
      <rect x="40" y="18" width="3" height="5" rx="0.5" fill={color} />
      <rect x="46" y="18" width="2" height="4" rx="0.5" fill={color} />
      <rect x="50" y="18" width="3" height="6" rx="0.5" fill={color} />

      {/* Tip */}
      <rect x="50" y="14" width="8" height="4" rx="1" fill={color} opacity={0.8} />

      {/* Circuit detail */}
      <line x1="30" y1="16" x2="36" y2="16" stroke={glow} strokeWidth="0.8" opacity={0.5} />
      <circle cx="33" cy="16" r="1" fill={glow} opacity={0.4} />
    </svg>
  )
}

/* ================================================================
   ANIMATION KEYFRAMES (CSS)
   ================================================================ */

const ANIMATION_STYLES = `
  @keyframes ripple-expand {
    0% { transform: scale(0.5); opacity: 0.6; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes particle-float {
    0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
    100% { opacity: 0; }
  }
  @keyframes subtle-glow-pulse {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.25; }
  }
`

/* ================================================================
   COMPONENT
   ================================================================ */

export function CertificateUnlockAnimation({ onComplete }: Props) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>("validated")
  const [skipped, setSkipped] = useState(false)

  // Auto-advance phases
  useEffect(() => {
    if (reduced && !skipped) {
      // Skip immediately on reduced motion
      setPhase("done")
      onComplete()
      return
    }

    if (phase === "done") {
      onComplete()
      return
    }

    const duration = PHASE_DURATIONS[phase]
    if (duration === 0) return

    const timer = setTimeout(() => {
      const idx = PHASE_ORDER.indexOf(phase)
      if (idx < PHASE_ORDER.length - 1) {
        setPhase(PHASE_ORDER[idx + 1])
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [phase, reduced, skipped, onComplete])

  const handleSkip = useCallback(() => {
    setSkipped(true)
    setPhase("done")
    onComplete()
  }, [onComplete])

  // Computed state
  const isUnlocked = phase === "turn" || phase === "open" || phase === "unlocked" || phase === "done"
  const lockColor = isUnlocked ? "#2DD4A7" : "#8B93A7"
  const lockGlow = isUnlocked ? "#2DD4A7" : "#3B6CB4"
  const shackleOpen = phase === "open" || phase === "unlocked" || phase === "done" ? 1 : 0

  // Key position
  const getKeyStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    }

    switch (phase) {
      case "validated":
        return { ...base, opacity: 0, transform: "translateX(60px) translateY(-8px)" }
      case "lock":
        return { ...base, opacity: 0, transform: "translateX(60px) translateY(-8px)" }
      case "key-approach":
        return { ...base, opacity: 1, transform: "translateX(28px) translateY(-8px)" }
      case "insert":
        return { ...base, opacity: 1, transform: "translateX(12px) translateY(-8px) rotate(-5deg)" }
      case "turn":
        return { ...base, opacity: 1, transform: "translateX(12px) translateY(-8px) rotate(90deg)" }
      case "open":
        return { ...base, opacity: 1, transform: "translateX(12px) translateY(-8px) rotate(90deg)" }
      case "unlocked":
        return { ...base, opacity: 0, transform: "translateX(12px) translateY(-8px) rotate(90deg)" }
      default:
        return { ...base, opacity: 0 }
    }
  }

  // Ripple particles on turn
  const showRipple = phase === "turn" || phase === "open"

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      <div className="panel flex flex-col items-center justify-center py-16 px-6 relative overflow-hidden">
        {/* ── PHASE 1: Validation complete ────────────── */}
        <AnimatePresence mode="wait">
          {phase === "validated" && (
            <motion.div
              key="validated"
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-signal-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="mono text-[14px] font-semibold tracking-wide">DOMAIN VERIFIED</span>
              </div>
              <div className="flex items-center gap-2 text-signal-success/70">
                <CheckCircle2 className="h-4 w-4" />
                <span className="mono text-[12px] tracking-wide">LET&apos;S ENCRYPT VALIDATION SUCCESSFUL</span>
              </div>
            </motion.div>
          )}

          {/* ── PHASES 2–7: Lock + Key illustration ──── */}
          {(phase !== "validated" && phase !== "done") && (
            <motion.div
              key="illustration"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              {/* Lock + Key composition */}
              <div className="relative flex items-center justify-center" style={{ width: 180, height: 120 }}>
                {/* Ripple on turn */}
                {showRipple && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div
                      className="rounded-full border"
                      style={{
                        width: 100,
                        height: 100,
                        borderColor: isUnlocked ? "#2DD4A7" : "#C0392B",
                        animation: "ripple-expand 0.6s ease-out forwards",
                      }}
                    />
                  </div>
                )}

                {/* Padlock */}
                <div style={{ position: "relative", zIndex: 2 }}>
                  <Padlock color={lockColor} glow={lockGlow} shackleOpen={shackleOpen} />
                </div>

                {/* Key */}
                <div style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  marginTop: -16,
                  zIndex: 3,
                  ...getKeyStyle(),
                }}>
                  <Key
                    color={isUnlocked ? "#2DD4A7" : "#C0392B"}
                    glow={isUnlocked ? "#2DD4A7" : "#E74C3C"}
                  />
                </div>
              </div>

              {/* Phase text */}
              <div className="text-center">
                {phase === "lock" && (
                  <motion.p
                    className="text-[11px] uppercase tracking-widest text-text-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    Security lock
                  </motion.p>
                )}

                {(phase === "key-approach" || phase === "insert") && (
                  <motion.p
                    className="text-[11px] uppercase tracking-widest text-signal-error/80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    Access credential detected
                  </motion.p>
                )}

                {phase === "turn" && (
                  <motion.p
                    className="text-[11px] uppercase tracking-widest text-signal-success/80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    Decrypting certificate...
                  </motion.p>
                )}

                {phase === "open" && (
                  <motion.p
                    className="text-[11px] uppercase tracking-widest text-signal-success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    Access granted
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PHASE 7: Certificate Unlocked ────────────── */}
        {phase === "unlocked" && (
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 text-signal-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="mono text-[14px] font-semibold tracking-wide">CERTIFICATE UNLOCKED</span>
            </div>
            <p className="text-[12px] text-text-secondary">
              Your SSL certificate is ready.
            </p>
          </motion.div>
        )}

        {/* Skip button */}
        {phase !== "done" && (
          <button
            onClick={handleSkip}
            className="absolute bottom-4 right-4 text-[10px] text-text-muted/50 hover:text-text-muted transition-colors tracking-wider uppercase"
          >
            Skip
          </button>
        )}
      </div>
    </>
  )
}
