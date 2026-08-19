"use client"

import { useState } from "react"
import type { SceneState } from "@/components/three-scene"

interface LogoProps {
  sceneState?: SceneState
}

export function Logo({ sceneState = "idle" }: LogoProps) {
  const [hovered, setHovered] = useState(false)

  const isEmerald = sceneState === "dns_verified" || sceneState === "certificate_ready"
  const isUnlocking = sceneState === "unlocking"
  const isActive = sceneState === "requesting" || sceneState === "dns_challenge" || sceneState === "validating"
  const showHover = hovered && sceneState === "idle"

  const shieldStroke = isEmerald || isUnlocking ? "#00d26a" : "#2ec7ff"
  const shieldFill = isEmerald || isUnlocking ? "rgba(0,210,106,0.10)" : "rgba(46,199,255,0.08)"
  const lockStroke = isEmerald || isUnlocking ? "#00d26a" : "#2ec7ff"
  const keyholeColor = isEmerald || isUnlocking ? "#00d26a" : "#2ec7ff"
  const nodeColor = isEmerald || isUnlocking ? "#00d26a" : "#2ec7ff"
  const certDetailColor = isEmerald || isUnlocking ? "rgba(0,210,106,0.35)" : "rgba(46,199,255,0.30)"
  const glowColor = isEmerald || isUnlocking ? "rgba(0,210,106,0.50)" : "rgba(46,199,255,0.50)"
  const lockBodyColor = isEmerald || isUnlocking ? "rgba(0,210,106,0.06)" : "rgba(46,199,255,0.04)"

  const logoState = isUnlocking
    ? "logo-unlocking"
    : isEmerald
      ? "logo-success"
      : isActive
        ? "logo-active"
        : "logo-idle"

  return (
    <div
      className="relative h-[34px] w-[34px] shrink-0 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="img"
      aria-label="Auto SSL Generator logo"
    >
      <svg viewBox="0 0 36 40" fill="none" className={`h-[34px] w-[34px] ${logoState}`} aria-hidden="true">
        <defs>
          <linearGradient id="shieldGrad" x1="6" y1="4" x2="30" y2="31">
            <stop offset="0%" stopColor={shieldStroke} stopOpacity="0.9" />
            <stop offset="100%" stopColor={isEmerald || isUnlocking ? "#00b35e" : "#1e6fa0"} stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="lockGrad" x1="13" y1="17" x2="23" y2="25">
            <stop offset="0%" stopColor={lockStroke} stopOpacity="0.08" />
            <stop offset="100%" stopColor={isEmerald || isUnlocking ? "#00b35e" : "#1e6fa0"} stopOpacity="0.03" />
          </linearGradient>
          <filter id="shieldGlow">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lockGlow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shield */}
        <path
          d="M18 4 L30 8.5 L30 17 C30 24 24.5 29.5 18 31.5 C11.5 29.5 6 24 6 17 L6 8.5 Z"
          fill={shieldFill}
          stroke="url(#shieldGrad)"
          strokeWidth="1.1"
          strokeLinejoin="round"
          filter="url(#shieldGlow)"
        />

        {/* Shield perimeter trace dot */}
        <circle r="1.2" fill={shieldStroke} fillOpacity="0.6" className="shield-trace-dot">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M18 4 L30 8.5 L30 17 C30 24 24.5 29.5 18 31.5 C11.5 29.5 6 24 6 17 L6 8.5 Z"
          />
        </circle>

        {/* Certificate detail — subtle hint behind lock */}
        <rect x="14" y="14.8" width="8" height="0.6" rx="0.3" fill={certDetailColor} className="cert-detail" />

        {/* Lock body */}
        <rect
          x="13" y="17" width="10" height="7.5" rx="1.8"
          fill="url(#lockGrad)"
          stroke={lockStroke}
          strokeWidth="0.7"
          strokeOpacity="0.5"
          filter="url(#lockGlow)"
        />

        {/* Lock shackle — animates open on success */}
        <path
          className="lock-shackle"
          d="M14.8 17 V14.5 C14.8 11.8 21.2 11.8 21.2 14.5 V17"
          stroke={lockStroke}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          strokeOpacity="0.6"
        />

        {/* Keyhole — animates open on success */}
        <g className="keyhole">
          <circle cx="18" cy="20.5" r="1.2" fill={keyholeColor} fillOpacity="0.85" />
          <rect x="17.55" y="20.5" width="0.9" height="2.5" rx="0.4" fill={keyholeColor} fillOpacity="0.75" />
        </g>

        {/* Network nodes */}
        <g className="network-nodes">
          <circle cx="1" cy="16" r="1.5" fill={nodeColor} fillOpacity="0.2" filter="url(#nodeGlow)" className="node" />
          <circle cx="3.5" cy="23" r="1.1" fill={nodeColor} fillOpacity="0.15" filter="url(#nodeGlow)" className="node node-2" />
          <circle cx="4" cy="8" r="1" fill={nodeColor} fillOpacity="0.15" filter="url(#nodeGlow)" className="node node-3" />
          <circle cx="34" cy="16" r="1.5" fill={nodeColor} fillOpacity="0.2" filter="url(#nodeGlow)" className="node" />
          <circle cx="32" cy="8" r="1" fill={nodeColor} fillOpacity="0.15" filter="url(#nodeGlow)" className="node node-3" />
          <circle cx="18" cy="36.5" r="1.2" fill={nodeColor} fillOpacity="0.15" filter="url(#nodeGlow)" className="node node-2" />
        </g>

        {/* Connection lines — visible on hover only */}
        <g className={`connection-lines ${showHover ? "show" : ""}`}>
          <line x1="4" y1="8" x2="7" y2="9" stroke={shieldStroke} strokeWidth="0.4" strokeOpacity="0.25" strokeDasharray="1.5 1" />
          <line x1="1" y1="16" x2="6.5" y2="15" stroke={shieldStroke} strokeWidth="0.4" strokeOpacity="0.2" strokeDasharray="1.5 1" />
          <line x1="32" y1="8" x2="29" y2="9" stroke={shieldStroke} strokeWidth="0.4" strokeOpacity="0.25" strokeDasharray="1.5 1" />
          <line x1="34" y1="16" x2="29.5" y2="15" stroke={shieldStroke} strokeWidth="0.4" strokeOpacity="0.2" strokeDasharray="1.5 1" />
          <line x1="3.5" y1="23" x2="7.5" y2="21" stroke={shieldStroke} strokeWidth="0.3" strokeOpacity="0.15" strokeDasharray="1.5 1" />
          <line x1="18" y1="36.5" x2="18" y2="32" stroke={shieldStroke} strokeWidth="0.3" strokeOpacity="0.15" strokeDasharray="1.5 1" />
        </g>
      </svg>

      {/* Geometric glow behind shield */}
      <div
        className="absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${glowColor.replace("0.50", "0.06")} 0%, transparent 70%)`,
          opacity: isActive ? 0.8 : 0.25,
        }}
      />
    </div>
  )
}
