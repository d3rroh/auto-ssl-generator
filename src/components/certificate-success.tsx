"use client"

import { CheckCircle2, Shield, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface CertificateSuccessProps {
  domains: string[]
  issuedAt: string
  expiresAt: string
}

export function CertificateSuccess({ domains, issuedAt, expiresAt }: CertificateSuccessProps) {
  return (
    <div className="panel border-signal-success-border p-6" style={{ animation: "verified-settle 0.5s ease-out" }}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4" style={{ animation: "check-settle 0.4s ease-out" }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-signal-success-dim ring-2 ring-signal-success/25">
            <CheckCircle2 className="h-8 w-8 text-signal-success" />
          </div>
        </div>

        <h2 className="mb-1 text-lg font-semibold text-text-primary">
          Certificate Generated
        </h2>
        <p className="mb-5 text-[13px] text-text-secondary">
          Your SSL certificate is ready for installation.
        </p>

        <div className="w-full max-w-xs space-y-1.5">
          <div className="flex items-center justify-between rounded border border-border-subtle bg-base/50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Shield className="h-3 w-3" /> Status
            </span>
            <span className="mono text-[11px] font-semibold text-signal-success">Active</span>
          </div>
          <div className="flex items-center justify-between rounded border border-border-subtle bg-base/50 px-3 py-2">
            <span className="text-[11px] text-text-muted">Issuer</span>
            <span className="mono text-[11px] font-medium text-text-secondary">Let&apos;s Encrypt</span>
          </div>
          <div className="flex items-center justify-between rounded border border-border-subtle bg-base/50 px-3 py-2">
            <span className="text-[11px] text-text-muted">Domains</span>
            <div className="flex flex-wrap justify-end gap-1">
              {domains.map((d) => (
                <span key={d} className="mono rounded bg-field px-1.5 py-0.5 text-[10px] font-medium text-text-primary">
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded border border-border-subtle bg-base/50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Calendar className="h-3 w-3" /> Issued
            </span>
            <span className="mono text-[11px] font-medium text-text-secondary">{formatDate(issuedAt)}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-border-subtle bg-base/50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Calendar className="h-3 w-3" /> Expires
            </span>
            <span className="mono text-[11px] font-medium text-text-secondary">{formatDate(expiresAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
