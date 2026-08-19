"use client"

import { useState } from "react"
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react"

interface Challenge {
  domain: string
  dnsName: string
  dnsValue: string
}

interface DnsChallengeProps {
  challenges: Challenge[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" onClick={handleCopy} className="copy-btn">
      {copied ? (
        <>
          <Check className="h-3 w-3 text-signal-success" />
          <span className="text-signal-success">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  )
}

function DnsInstructions() {
  const [open, setOpen] = useState(false)

  const providers = [
    { name: "Cloudflare", steps: "DNS > Records > Add Record > Type: TXT > Name: _acme-challenge > Content: value" },
    { name: "cPanel", steps: "Zone Editor > Manage > Add Record > TXT > Name: _acme-challenge > Content: value" },
    { name: "GoDaddy", steps: "My Products > DNS > Add Record > Type: TXT > Name: _acme-challenge > Value: value" },
    { name: "Namecheap", steps: "Domain List > Manage > Advanced DNS > Add New Record > TXT > Name: _acme-challenge > Value: value" },
    { name: "Hostinger", steps: "DNS Zone > Add Record > Type: TXT > Name: _acme-challenge > Content: value" },
    { name: "Truehost", steps: "Client Area > DNS Management > Add Record > Type: TXT > Name: _acme-challenge > Content: value" },
    { name: "Other", steps: "Find DNS Zone Editor > Add TXT Record > Name: _acme-challenge.<domain> > Value: the challenge string above" },
  ]

  return (
    <div className="rounded-md border border-border-subtle bg-base/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-[12px] font-medium text-text-secondary">
          Where do I add this record?
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        )}
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-border-subtle px-3 pb-3 pt-2.5">
          {providers.map((provider) => (
            <div key={provider.name} className="space-y-0.5">
              <span className="text-[11px] font-medium text-text-secondary">{provider.name}</span>
              <p className="mono text-[10px] leading-relaxed text-text-muted">{provider.steps}</p>
            </div>
          ))}
          <p className="text-[11px] text-text-muted">
            DNS changes may take a few minutes to propagate depending on your provider&apos;s TTL.
          </p>
        </div>
      )}
    </div>
  )
}

export function DnsChallenge({ challenges }: DnsChallengeProps) {
  return (
    <div className="panel p-5">
      <h3 className="mb-1 text-[13px] font-semibold text-text-primary">
        DNS Record to Publish
      </h3>
      <p className="mb-4 text-[12px] text-text-secondary">
        Add this TXT record to your DNS provider.
      </p>

      {challenges.map((challenge) => (
        <div key={challenge.domain} className="space-y-3">
          {/* Domain badge */}
          <div className="mono rounded bg-signal-success-dim px-2 py-1 text-[11px] font-medium text-signal-success inline-block">
            {challenge.domain}
          </div>

          {/* Type */}
          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-base/50 px-3 py-2">
            <span className="text-[11px] text-text-muted">Type</span>
            <div className="flex items-center gap-1">
              <code className="mono text-[12px] font-medium text-text-primary">TXT</code>
              <CopyButton text="TXT" />
            </div>
          </div>

          {/* Name */}
          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-base/50 px-3 py-2">
            <span className="text-[11px] text-text-muted">Name</span>
            <div className="flex items-center gap-1 min-w-0">
              <code className="mono truncate text-[12px] text-text-primary max-w-[200px]">
                {challenge.dnsName}
              </code>
              <CopyButton text={challenge.dnsName} />
            </div>
          </div>

          {/* Value — strongest emphasis, teal border */}
          <div className="space-y-1">
            <span className="mono text-[10px] font-medium uppercase tracking-wider text-text-muted">Value</span>
            <div className="flex items-start gap-2 rounded-md border border-signal-success-border bg-signal-success-dim p-3">
              <code className="mono min-h-[36px] flex-1 whitespace-pre-wrap break-all text-[12px] font-medium leading-relaxed text-text-primary">
                {challenge.dnsValue}
              </code>
              <CopyButton text={challenge.dnsValue} />
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4">
        <DnsInstructions />
      </div>
    </div>
  )
}
