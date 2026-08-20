"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  Loader2,
  Circle,
  Shield,
  FileText,
  Lock,
  Zap,
} from "lucide-react"

type StageStatus = "completed" | "active" | "pending" | "failed"

interface Stage {
  id: string
  label: string
  description: string
  status: StageStatus
}

interface CertificateProgressProps {
  stages?: Stage[]
  currentMessage?: string
  errorMessage?: string
}

const DEFAULT_STAGES: Stage[] = [
  {
    id: "detect",
    label: "DNS Record Detected",
    description: "TXT record propagated to DNS resolvers",
    status: "pending",
  },
  {
    id: "validate",
    label: "Let\u2019s Encrypt Validation",
    description: "ACME server verifying domain ownership",
    status: "pending",
  },
  {
    id: "generate",
    label: "Certificate Generation",
    description: "Creating SSL certificate with domain bindings",
    status: "pending",
  },
  {
    id: "issue",
    label: "Certificate Issued",
    description: "Signed certificate ready for download",
    status: "pending",
  },
]

const STAGE_ICONS: Record<string, typeof CheckCircle2> = {
  detect: Shield,
  validate: Zap,
  generate: FileText,
  issue: Lock,
}

function StageIcon({ stageId, status }: { stageId: string; status: StageStatus }) {
  const Icon = STAGE_ICONS[stageId] || Circle

  return (
    <div className="pipeline-icon-wrap">
      <div
        className={`pipeline-icon ${
          status === "completed"
            ? "pipeline-icon--completed"
            : status === "active"
              ? "pipeline-icon--active"
              : status === "failed"
                ? "pipeline-icon--failed"
                : "pipeline-icon--pending"
        }`}
      >
        {status === "completed" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : status === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "failed" ? (
          <Circle className="h-3 w-3" />
        ) : (
          <Icon className="h-3.5 w-3.5 opacity-40" />
        )}
      </div>
      {status === "active" && (
        <div className="pipeline-icon-ring" />
      )}
    </div>
  )
}

function VerificationShield() {
  return (
    <svg
      width="80"
      height="90"
      viewBox="0 0 80 90"
      fill="none"
      className="verification-shield"
    >
      <defs>
        <linearGradient id="shield-grad" x1="40" y1="0" x2="40" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2ec7ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7b68ee" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="shield-stroke" x1="40" y1="0" x2="40" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2ec7ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7b68ee" stopOpacity="0.3" />
        </linearGradient>
        <filter id="shield-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* Glow */}
      <path
        d="M40 4 L72 20 V48 C72 66 58 80 40 86 C22 80 8 66 8 48 V20 Z"
        fill="#2ec7ff"
        opacity="0.06"
        filter="url(#shield-glow)"
      />

      {/* Shield body */}
      <path
        d="M40 6 L70 21 V48 C70 65 56 78 40 84 C24 78 10 65 10 48 V21 Z"
        fill="url(#shield-grad)"
        stroke="url(#shield-stroke)"
        strokeWidth="1.5"
      />

      {/* Inner shield */}
      <path
        d="M40 14 L62 25 V48 C62 61 51 72 40 77 C29 72 18 61 18 48 V25 Z"
        fill="none"
        stroke="rgba(46,199,255,0.12)"
        strokeWidth="0.8"
      />

      {/* Certificate icon inside */}
      <rect x="29" y="30" width="22" height="28" rx="3" fill="rgba(46,199,255,0.08)" stroke="rgba(46,199,255,0.25)" strokeWidth="1" />
      <line x1="33" y1="38" x2="47" y2="38" stroke="rgba(46,199,255,0.3)" strokeWidth="1" />
      <line x1="33" y1="43" x2="43" y2="43" stroke="rgba(46,199,255,0.2)" strokeWidth="1" />
      <line x1="33" y1="48" x2="45" y2="48" stroke="rgba(46,199,255,0.2)" strokeWidth="1" />

      {/* Rotating verification ring */}
      <circle
        cx="40"
        cy="44"
        r="36"
        fill="none"
        stroke="rgba(46,199,255,0.15)"
        strokeWidth="0.8"
        strokeDasharray="6 4"
        className="verification-ring"
      />
      <circle
        cx="40"
        cy="44"
        r="36"
        fill="none"
        stroke="rgba(46,199,255,0.4)"
        strokeWidth="1.5"
        strokeDasharray="20 200"
        strokeLinecap="round"
        className="verification-ring-dot"
      />
    </svg>
  )
}

export function CertificateProgress({
  stages = DEFAULT_STAGES,
  currentMessage,
  errorMessage,
}: CertificateProgressProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatElapsed = useCallback((s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }, [])

  const activeIndex = stages.findIndex((s) => s.status === "active")
  const hasFailed = stages.some((s) => s.status === "failed")
  const allComplete = stages.every((s) => s.status === "completed")

  return (
    <div className="panel cert-pipeline-panel">
      {/* Header strip */}
      <div className="cert-pipeline-header">
        <div className="flex items-center gap-3">
          <VerificationShield />
          <div>
            <h3 className="cert-pipeline-title">
              {allComplete
                ? "Certificate Verified"
                : hasFailed
                  ? "Validation Failed"
                  : "Certificate Issuance"}
            </h3>
            <p className="cert-pipeline-sub">
              {allComplete
                ? "Your certificate is ready for use"
                : hasFailed
                  ? errorMessage || "Domain validation could not be completed"
                  : currentMessage || (activeIndex >= 0 ? stages[activeIndex].description : "Preparing issuance...")}
            </p>
          </div>
        </div>

        {/* Timer */}
        {!allComplete && !hasFailed && (
          <div className="cert-pipeline-timer">
            <span className="cert-pipeline-timer-dot" />
            <span className="mono text-[11px] text-cyan-400/70">
              {formatElapsed(elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Pipeline stages */}
      <div className="cert-pipeline-stages">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1
          const isCompleted = stage.status === "completed"
          const isActive = stage.status === "active"
          const isFailed = stage.status === "failed"

          return (
            <div key={stage.id} className="cert-pipeline-row">
              {/* Icon + line column */}
              <div className="cert-pipeline-line-col">
                <StageIcon stageId={stage.id} status={stage.status} />
                {!isLast && (
                  <div
                    className={`cert-pipeline-line ${
                      isCompleted
                        ? "cert-pipeline-line--completed"
                        : isActive
                          ? "cert-pipeline-line--active"
                          : ""
                    }`}
                  >
                    {isActive && <div className="cert-pipeline-line-packet" />}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`cert-pipeline-content ${isLast ? "mb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`cert-pipeline-label ${
                      isCompleted
                        ? "cert-pipeline-label--completed"
                        : isActive
                          ? "cert-pipeline-label--active"
                          : isFailed
                            ? "cert-pipeline-label--failed"
                            : ""
                    }`}
                  >
                    {stage.label}
                  </span>
                  {isCompleted && (
                    <span className="cert-pipeline-badge cert-pipeline-badge--done">
                      DONE
                    </span>
                  )}
                  {isActive && (
                    <span className="cert-pipeline-badge cert-pipeline-badge--active">
                      IN PROGRESS
                    </span>
                  )}
                  {isFailed && (
                    <span className="cert-pipeline-badge cert-pipeline-badge--failed">
                      FAILED
                    </span>
                  )}
                </div>
                <p className="cert-pipeline-desc">{stage.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status bar */}
      <div className="cert-pipeline-status-bar">
        <div
          className={`cert-pipeline-status-indicator ${
            allComplete
              ? "cert-pipeline-status-indicator--success"
              : hasFailed
                ? "cert-pipeline-status-indicator--failed"
                : "cert-pipeline-status-indicator--active"
          }`}
        >
          {allComplete ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : hasFailed ? (
            <Circle className="h-3 w-3" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          <span className="mono text-[10px] font-medium uppercase tracking-wider">
            {allComplete
              ? "Certificate Issued"
              : hasFailed
                ? "Failed"
                : "Issuing Certificate"}
          </span>
        </div>
        <span className="mono text-[10px] text-text-muted">
          {stages.filter((s) => s.status === "completed").length}/{stages.length} stages
        </span>
      </div>
    </div>
  )
}
