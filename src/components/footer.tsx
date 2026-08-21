"use client"

import type { SceneState } from "@/components/three-scene"

interface FooterProps {
  sceneState?: SceneState
}

function getStatusText(state: SceneState): string {
  switch (state) {
    case "idle": return "SECURE SESSION"
    case "requesting": return "CERTIFICATE REQUEST ACTIVE"
    case "dns_challenge": return "WAITING FOR DNS"
    case "dns_verified": return "DOMAIN VERIFIED"
    case "validating": return "CERTIFICATE VALIDATION"
    case "certificate_ready": return "SSL CERTIFICATE READY"
    case "unlocking": return "SSL CERTIFICATE READY"
    default: return "SECURE SESSION"
  }
}

function getStatusColor(state: SceneState): string {
  if (state === "dns_verified" || state === "certificate_ready" || state === "unlocking") return "#00d26a"
  if (state === "dns_challenge") return "#2ec7ff"
  if (state === "requesting" || state === "validating") return "#ff2d2d"
  return "#2ec7ff"
}

function TechBadge({ label }: { label: string }) {
  return (
    <span
      className="mono rounded px-2 py-0.5 text-[9px] font-medium tracking-wider"
      style={{
        color: "rgba(138,152,173,0.50)",
        background: "rgba(46,199,255,0.03)",
        border: "1px solid rgba(120,180,220,0.06)",
      }}
    >
      {label}
    </span>
  )
}

export function Footer({ sceneState = "idle" }: FooterProps) {
  const statusText = getStatusText(sceneState)
  const dotColor = getStatusColor(sceneState)

  return (
    <footer
      style={{
        background: "linear-gradient(0deg, rgba(7,16,28,0.70) 0%, rgba(7,16,28,0.50) 100%)",
        backdropFilter: "blur(16px) saturate(130%)",
        WebkitBackdropFilter: "blur(16px) saturate(130%)",
        borderTop: "1px solid rgba(120,180,220,0.08)",
        boxShadow: "0 -1px 0 0 rgba(120,180,220,0.04) inset, 0 -4px 30px rgba(0,0,0,0.25)",
      }}
    >
      {/* Main footer row */}
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:px-6 sm:py-3.5">
        {/* Left — brand + description */}
        <div className="flex flex-col items-center gap-0.5 sm:items-start">
          <span className="text-[11px] font-semibold tracking-wider text-text-primary/80">
            AUTO SSL GENERATOR
          </span>
          <span className="hidden text-[10px] text-text-muted sm:block">
            Automated SSL certificate generation
          </span>
        </div>

        {/* Center — tech badges */}
        <div className="hidden items-center gap-1.5 md:flex">
          <TechBadge label="ACME v2" />
          <TechBadge label="DNS-01" />
          <TechBadge label="LET'S ENCRYPT" />
        </div>

        {/* Right — live status */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-[5px] w-[5px]">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-40"
              style={{ backgroundColor: dotColor, animation: "status-glow 3s ease-in-out infinite" }}
            />
            <span
              className="relative inline-flex h-[5px] w-[5px] rounded-full"
              style={{ backgroundColor: dotColor }}
            />
          </span>
          <span className="mono text-[10px] font-medium tracking-wider text-text-secondary">
            {statusText}
          </span>
        </div>
      </div>

      {/* Sub-bottom signature line */}
      <div className="border-t border-white/[0.04] px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 sm:flex-row sm:justify-between">
          <span className="mono text-[8px] tracking-[0.15em] text-text-muted/40">
            AUTOMATED SSL &nbsp;&#8226;&nbsp; DNS VALIDATION &nbsp;&#8226;&nbsp; ACME PROTOCOL
          </span>
          <span className="mono text-[8px] tracking-wider text-text-muted/30">
            &copy; 2026 Auto SSL Generator
          </span>
        </div>
      </div>
    </footer>
  )
}
