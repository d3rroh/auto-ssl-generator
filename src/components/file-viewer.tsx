"use client"

import { useState } from "react"
import {
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  DownloadCloud,
  ClipboardCheck,
} from "lucide-react"

interface FileData {
  cert: string
  chain: string
  fullchain: string
  privateKey: string
}

interface CertificateFileViewerProps {
  files: FileData
  jobId: string
  domains: string[]
}

function SingleFileViewer({
  filename,
  content,
  isPrivate,
}: {
  label: string
  filename: string
  content: string
  isPrivate?: boolean
}) {
  const [revealed, setRevealed] = useState(!isPrivate)
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = content
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: "application/x-pem-file" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const lineCount = content.split("\n").length

  return (
    <div className="file-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="mono text-[12px] font-medium text-text-primary">{filename}</span>
          <span className="rounded bg-base/50 px-1.5 py-0.5 text-[9px] text-text-muted">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-0.5">
          {isPrivate && (
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="copy-btn"
            >
              {revealed ? (
                <><EyeOff className="h-3 w-3" /> Hide</>
              ) : (
                <><Eye className="h-3 w-3" /> Show</>
              )}
            </button>
          )}
          <button type="button" onClick={handleCopy} disabled={!revealed} className="copy-btn disabled:opacity-30">
            {copied ? (
              <><Check className="h-3 w-3 text-signal-success" /><span className="text-signal-success">Copied</span></>
            ) : (
              <><Copy className="h-3 w-3" /> Copy</>
            )}
          </button>
          <button type="button" onClick={handleDownload} disabled={!revealed} className="copy-btn disabled:opacity-30">
            <Download className="h-3 w-3" /> DL
          </button>
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="copy-btn">
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {isPrivate && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex w-full items-center justify-center gap-2 p-6 text-text-muted transition-colors hover:text-text-secondary"
        >
          <Eye className="h-4 w-4" />
          <span className="text-[12px] font-medium">Click to reveal private key</span>
        </button>
      ) : !collapsed ? (
        <div className="relative max-h-[350px] overflow-auto">
          <pre className="p-3 text-[11px] leading-relaxed">
            <code className="mono">
              {content.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="mr-3 inline-block w-6 select-none text-right text-text-muted/25">
                    {i + 1}
                  </span>
                  <span className="flex-1 break-all text-text-primary/70">{line}</span>
                </div>
              ))}
            </code>
          </pre>
          {lineCount > 20 && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-panel to-transparent" />
          )}
        </div>
      ) : null}
    </div>
  )
}

export function CertificateFileViewer({ files, jobId, domains }: CertificateFileViewerProps) {
  const [allCopied, setAllCopied] = useState(false)

  const handleCopyAll = async () => {
    const sep = "\n\n"
    const all = [
      `===== cert.pem =====${sep}${files.cert}`,
      `===== chain.pem =====${sep}${files.chain}`,
      `===== fullchain.pem =====${sep}${files.fullchain}`,
      `===== privkey.pem =====${sep}${files.privateKey}`,
    ].join(sep)

    try {
      await navigator.clipboard.writeText(all)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = all
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 3000)
  }

  const handleDownloadAll = () => {
    window.open(`/api/files?jobId=${jobId}&download=all`, "_blank")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleCopyAll} className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-[12px]">
          {allCopied ? (
            <><ClipboardCheck className="h-3.5 w-3.5" /> All Files Copied</>
          ) : (
            <><Copy className="h-3.5 w-3.5" /> Copy All Files</>
          )}
        </button>
        <button onClick={handleDownloadAll} className="btn-secondary flex items-center gap-2 rounded-md px-4 py-2 text-[12px]">
          <DownloadCloud className="h-3.5 w-3.5" /> Download ZIP
        </button>
      </div>

      <div className="space-y-3">
        <SingleFileViewer label="Certificate" filename="cert.pem" content={files.cert} />
        <SingleFileViewer label="Full Chain" filename="fullchain.pem" content={files.fullchain} />
        <SingleFileViewer label="Chain" filename="chain.pem" content={files.chain} />

        <div className="rounded-md border border-signal-pending-border bg-signal-pending-dim p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-pending" />
            <p className="text-[11px] text-text-secondary">
              Keep your private key secret. Anyone with access to it may be able to impersonate your domain.
            </p>
          </div>
        </div>

        <SingleFileViewer label="Private Key" filename="privkey.pem" content={files.privateKey} isPrivate />
      </div>
    </div>
  )
}
