"use client"

import { useState } from "react"
import { Copy, Check, ChevronDown, ChevronUp, Globe, Info } from "lucide-react"

interface Challenge {
  domain: string
  dnsName: string
  dnsValue: string
}

interface DnsChallengeProps {
  challenges: Challenge[]
}

function CopyButton({ text, label }: { text: string; label?: string }) {
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
    <button
      type="button"
      onClick={handleCopy}
      className={`copy-btn ${copied ? "copy-btn-copied" : ""}`}
      aria-label={`Copy ${label || "value"}`}
    >
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

function ProviderHelp() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const providers = [
    {
      name: "Cloudflare",
      steps: [
        "Open your domain dashboard.",
        "Go to DNS \u2192 Records.",
        "Click Add Record.",
        "Choose Type: TXT.",
        "Paste the Name and Value above.",
        "Save and wait for propagation.",
      ],
    },
    {
      name: "cPanel",
      steps: [
        "Open Zone Editor.",
        "Click Manage next to your domain.",
        "Add Record \u2192 Type: TXT.",
        "Enter the Name and Value above.",
        "Save the record.",
      ],
    },
    {
      name: "GoDaddy",
      steps: [
        "Go to My Products \u2192 DNS.",
        "Click Add Record.",
        "Choose Type: TXT.",
        "Enter the Name and Value above.",
        "Save and wait for propagation.",
      ],
    },
    {
      name: "Namecheap",
      steps: [
        "Go to Domain List \u2192 Manage.",
        "Open Advanced DNS.",
        "Add New Record \u2192 Type: TXT.",
        "Enter the Name and Value above.",
        "Save changes.",
      ],
    },
    {
      name: "Hostinger",
      steps: [
        "Open DNS Zone for your domain.",
        "Click Add Record.",
        "Choose Type: TXT.",
        "Enter the Name and Value above.",
        "Save the record.",
      ],
    },
    {
      name: "Route 53",
      steps: [
        "Open Route 53 \u2192 Hosted Zones.",
        "Select your domain.",
        "Click Create Record.",
        "Choose Type: TXT.",
        "Enter the Name and Value above.",
        "Save changes.",
      ],
    },
    {
      name: "Other",
      steps: [
        "Find your DNS Zone Editor.",
        "Add a new TXT record.",
        "Set the Name to the value above.",
        "Set the Value to the challenge token.",
        "Save and wait for propagation.",
      ],
    },
  ]

  return (
    <div className="dns-provider-help">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3.5 text-left"
      >
        <span className="text-[12px] font-medium text-text-secondary">
          Where do I add this record?
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-3.5 pb-3.5 pt-3">
          {/* Provider selector pills */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {providers.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setSelected(selected === p.name ? null : p.name)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide transition-all duration-150 ${
                  selected === p.name
                    ? "bg-cyan-400/15 text-cyan-400 border border-cyan-400/25"
                    : "bg-white/[0.04] text-text-muted border border-white/[0.06] hover:bg-white/[0.07] hover:text-text-secondary"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Instructions */}
          {selected && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                {selected}
              </p>
              <ol className="space-y-1">
                {providers
                  .find((p) => p.name === selected)
                  ?.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-text-secondary">
                      <span className="mono mt-px text-[9px] text-text-muted">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DnsChallenge({ challenges }: DnsChallengeProps) {
  return (
    <div className="space-y-4">
      {challenges.map((challenge) => (
        <div key={challenge.domain} className="dns-record-card glass-reflection">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-cyan-400/70" />
              <div>
                <p className="mono text-[10px] uppercase tracking-wider text-text-muted">Domain</p>
                <p className="mono text-[13px] font-medium text-text-primary">{challenge.domain}</p>
              </div>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[9px] font-medium tracking-wider text-cyan-400 border border-cyan-400/15">
              DNS-01
            </span>
          </div>

          {/* Record rows */}
          <div className="p-5">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
              DNS Record to Publish
            </p>

            {/* TYPE */}
            <div className="dns-record-row">
              <span className="dns-record-label">TYPE</span>
              <code className="mono flex-1 text-[12px] font-medium text-text-primary">TXT</code>
              <CopyButton text="TXT" label="record type" />
            </div>

            {/* NAME */}
            <div className="dns-record-row">
              <span className="dns-record-label">NAME</span>
              <code className="mono flex-1 truncate text-[12px] text-text-primary">{challenge.dnsName}</code>
              <CopyButton text={challenge.dnsName} label="record name" />
            </div>

            {/* VALUE */}
            <div className="dns-record-value">
              <span className="dns-record-label">VALUE</span>
              <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-signal-success-border bg-signal-success-dim/50 p-3">
                <code className="mono min-h-[32px] flex-1 whitespace-pre-wrap break-all text-[11px] font-medium leading-relaxed text-text-primary">
                  {challenge.dnsValue}
                </code>
                <CopyButton text={challenge.dnsValue} label="challenge value" />
              </div>
            </div>

            {/* DNS warning */}
            <div className="mt-4 flex items-start gap-2">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-text-muted/50" />
              <p className="text-[10px] leading-relaxed text-text-muted">
                DNS changes can take a few minutes to propagate depending on your provider.
              </p>
            </div>
          </div>

          {/* Provider help */}
          <div className="border-t border-white/[0.06]">
            <ProviderHelp />
          </div>
        </div>
      ))}
    </div>
  )
}
