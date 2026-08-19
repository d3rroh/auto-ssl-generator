"use client"

import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react"

interface DnsVerificationProps {
  status: "checking" | "found" | "not_found"
  domain: string
}

export function DnsVerification({ status, domain }: DnsVerificationProps) {
  return (
    <div className={`panel p-5 ${status === "checking" ? "panel-pending" : status === "found" ? "panel-verified" : ""}`}>
      {status === "checking" && (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-pending-dim">
            <Loader2 className="h-4 w-4 animate-spin text-signal-pending" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-text-primary">Checking DNS records</p>
            <p className="mono text-[11px] text-text-muted">Querying {domain}...</p>
          </div>
        </div>
      )}

      {status === "found" && (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-success-dim" style={{ animation: "check-settle 0.4s ease-out" }}>
            <CheckCircle2 className="h-4 w-4 text-signal-success" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-signal-success">DNS Record Verified</p>
            <p className="mono text-[11px] text-text-muted">{domain} — record detected</p>
          </div>
        </div>
      )}

      {status === "not_found" && (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-pending-dim">
            <AlertTriangle className="h-4 w-4 text-signal-pending" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-signal-pending">DNS Record Not Found</p>
            <p className="text-[11px] text-text-muted">DNS propagation may take 1-5 minutes. Check that the TXT record matches exactly.</p>
          </div>
        </div>
      )}
    </div>
  )
}
