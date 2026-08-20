"use client"

import { CheckCircle2 } from "lucide-react"

interface DnsVerificationProps {
  status: "checking" | "found" | "not_found"
  domain: string
}

function DnsNetworkIcon({ state }: { state: "checking" | "not_found" | "found" }) {
  const isActive = state === "checking"
  const color = state === "found" ? "#00d26a" : "#2ec7ff"

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      {/* Outer ring */}
      <svg viewBox="0 0 64 64" className="absolute h-full w-full">
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeDasharray="4 3"
          opacity={isActive ? 0.4 : 0.15}
          className={isActive ? "animate-spin" : ""}
          style={{ animationDuration: "8s", transformOrigin: "center" }}
        />
        <circle
          cx="32"
          cy="32"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="0.6"
          opacity={isActive ? 0.25 : 0.1}
        />
      </svg>

      {/* Center node */}
      <div
        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          border: `1.5px solid ${color}40`,
        }}
      >
        {/* DNS text */}
        <span
          className="mono text-[8px] font-bold tracking-wider"
          style={{ color }}
        >
          DNS
        </span>

        {/* Pulse ring */}
        {isActive && (
          <span
            className="absolute inline-flex h-full w-full rounded-full"
            style={{
              border: `1px solid ${color}30`,
              animation: "dns-node-pulse 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Orbiting dot */}
      {isActive && (
        <div
          className="absolute h-full w-full"
          style={{ animation: "dns-node-orbit 3s linear infinite" }}
        >
          <div
            className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
          />
        </div>
      )}
    </div>
  )
}

export function DnsVerification({ status, domain }: DnsVerificationProps) {
  if (status === "found") {
    return (
      <div className="dns-verified-card">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-success-dim"
            style={{ animation: "check-settle 0.4s ease-out" }}
          >
            <CheckCircle2 className="h-4.5 w-4.5 text-signal-success" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-signal-success">DNS Verified</p>
            <p className="mono text-[11px] text-text-muted">
              {domain} \u2014 record detected
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <DnsNetworkIcon state={status} />
      <div className="text-center">
        <p className="mb-1 text-[13px] font-medium text-text-primary">
          {status === "checking" ? "DNS Verification" : "Waiting for DNS"}
        </p>
        <p className="text-[11px] text-text-muted leading-relaxed">
          {status === "checking"
            ? `Querying public resolvers for ${domain}...`
            : "Add the TXT record below, then verify when DNS propagation is complete."}
        </p>
      </div>
    </div>
  )
}
