"use client"

import type { SceneState } from "@/components/three-scene"
import { Logo } from "@/components/logo"
import { CheckCircle, AlertTriangle } from "lucide-react"

interface HeaderProps {
  sceneState?: SceneState
}

const SCENE_CONFIG: Record<SceneState, { label: string; color: string; active: boolean }> = {
  idle:              { label: "OPERATIONAL", color: "#2ec7ff", active: false },
  requesting:        { label: "PROCESSING",  color: "#ff2d2d", active: true },
  dns_challenge:     { label: "DNS VALIDATION", color: "#2ec7ff", active: true },
  dns_verified:      { label: "VERIFIED",    color: "#00d26a", active: true },
  validating:        { label: "VALIDATING",  color: "#ff2d2d", active: true },
  unlocking:         { label: "ISSUING",     color: "#00d26a", active: true },
  certificate_ready: { label: "ISSUED",      color: "#00d26a", active: false },
}

function StatusBadge({ sceneState }: { sceneState: SceneState }) {
  const { label, color, active } = SCENE_CONFIG[sceneState]
  const showCheck = sceneState === "certificate_ready"
  const showWarning = sceneState === "validating"

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Tech badges — md+ */}
      <div className="hidden items-center gap-1.5 md:flex">
        <span
          className="mono rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider"
          style={{ color: "rgba(138,152,173,0.60)", background: "rgba(46,199,255,0.04)", border: "1px solid rgba(120,180,220,0.07)" }}
        >
          ACME v2
        </span>
        <span
          className="mono rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider"
          style={{ color: "rgba(138,152,173,0.60)", background: "rgba(46,199,255,0.04)", border: "1px solid rgba(120,180,220,0.07)" }}
        >
          DNS-01
        </span>
      </div>

      {/* Status indicator */}
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1"
        style={{ background: "rgba(7,16,28,0.60)", border: "1px solid rgba(120,180,220,0.10)" }}
      >
        <span className="relative flex h-[5px] w-[5px]">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-40"
            style={{ backgroundColor: color, animation: "status-glow 3s ease-in-out infinite" }}
          />
          <span
            className="relative inline-flex h-[5px] w-[5px] rounded-full"
            style={{ backgroundColor: color }}
          />
        </span>
        <span className="hidden text-[10px] font-medium tracking-wider text-text-secondary sm:inline">
          {label}
        </span>
        {showCheck && <CheckCircle className="h-3 w-3 text-signal-success" />}
        {showWarning && <AlertTriangle className="h-3 w-3 text-signal-error opacity-60" />}
      </div>
    </div>
  )
}

export function Header({ sceneState = "idle" }: HeaderProps) {
  return (
    <header
      className="relative z-50"
      style={{
        background: "linear-gradient(180deg, rgba(7,16,28,0.72) 0%, rgba(7,16,28,0.55) 100%)",
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        borderBottom: "1px solid rgba(120,180,220,0.10)",
        boxShadow: "0 1px 0 0 rgba(120,180,220,0.05) inset, 0 4px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left — brand lockup */}
        <div className="flex items-center gap-3">
          <Logo sceneState={sceneState} />

          <div className="flex flex-col gap-0">
            {/* Wordmark */}
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[13px] font-semibold tracking-wide text-text-primary sm:text-[14px]"
                style={{ textShadow: sceneState !== "idle" ? `0 0 20px ${sceneState === "certificate_ready" || sceneState === "unlocking" || sceneState === "dns_verified" ? "rgba(0,210,106,0.12)" : "rgba(46,199,255,0.12)"}` : "0 0 20px rgba(46,199,255,0.08)" }}
              >
                AUTO SSL
              </span>
              <span className="text-[11px] font-normal tracking-wide text-text-secondary sm:text-[12px]">
                GENERATOR
              </span>
            </div>

            {/* Technical descriptor */}
            <span
              className="hidden mono text-[9px] tracking-[0.10em] text-text-muted sm:block"
              style={{ letterSpacing: "0.10em" }}
            >
              DNS-01 &nbsp;&#8226;&nbsp; ACME &nbsp;&#8226;&nbsp; LET&apos;S ENCRYPT
            </span>
          </div>
        </div>

        {/* Right — status */}
        <StatusBadge sceneState={sceneState} />
      </div>
    </header>
  )
}
