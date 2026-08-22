"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Shield,
  CheckCircle2,
  FileCode,
  KeyRound,
  Link2,
  Package,
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
import { formatDate } from "@/lib/utils"

interface CertificateSuccessProps {
  domains: string[]
  issuedAt: string
  expiresAt: string
  files?: {
    cert: string
    chain: string
    fullchain: string
    privateKey: string
  }
  jobId?: string
}

const BADGE_ITEMS = [
  { label: "LET'S ENCRYPT", color: "#7b68ee" },
  { label: "DNS-01", color: "#2ec7ff" },
  { label: "ACTIVE", color: "#00d26a" },
]

const GENERATED_ITEMS = [
  { key: "cert", label: "CERTIFICATE", icon: FileCode, file: "cert.pem" },
  { key: "privateKey", label: "PRIVATE KEY", icon: KeyRound, file: "privkey.pem" },
  { key: "chain", label: "CHAIN", icon: Link2, file: "chain.pem" },
  { key: "fullchain", label: "FULL CHAIN", icon: Package, file: "fullchain.pem" },
]

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
const BOUNCE: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

/* ── Sub-components ────────────────────────────────────────── */

function StatusBadge({ label, color, delay }: { label: string; color: string; delay: number }) {
  return (
    <motion.span
      className="success-badge"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      style={{ color, borderColor: color + "22", background: color + "0a" }}
    >
      {label}
    </motion.span>
  )
}

function CertInfoRow({
  label, value, mono, accent, delay,
}: {
  label: string; value: string; mono?: boolean; accent?: string; delay: number
}) {
  return (
    <motion.div
      className="cert-detail-row"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <span className="cert-detail-label">{label}</span>
      <span className={`cert-detail-value ${mono ? "mono" : ""}`} style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </motion.div>
  )
}

function GeneratedItem({
  label, icon: Icon, available, delay,
}: {
  label: string; icon: typeof Shield; available: boolean; delay: number
}) {
  return (
    <motion.div
      className="generated-item"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="generated-item-icon">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="generated-item-label">{label}</span>
      <span className="generated-item-status">
        {available ? (
          <><CheckCircle2 className="h-3 w-3" /> Generated</>
        ) : (
          <span className="text-text-muted">Not generated</span>
        )}
      </span>
    </motion.div>
  )
}

/* ── File Card ─────────────────────────────────────────────── */

function FileCard({
  filename,
  label,
  description,
  content,
  isPrivate,
  delay,
}: {
  filename: string
  label: string
  description: string
  content: string
  isPrivate?: boolean
  delay: number
}) {
  const [revealed, setRevealed] = useState(!isPrivate)
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(content) } catch {
      const ta = document.createElement("textarea")
      ta.value = content
      ta.style.cssText = "position:fixed;opacity:0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [content])

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "application/x-pem-file" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [content, filename])

  const lineCount = content.split("\n").length

  return (
    <motion.div
      className={`file-card-extended glass-reflection ${isPrivate ? "file-card-private" : ""}`}
      data-glass-success
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
    >
      {/* Header */}
      <button type="button" className="file-card-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="file-card-header-left">
          <div className={`file-card-icon ${isPrivate ? "file-card-icon-key" : "file-card-icon-cert"}`}>
            {isPrivate ? <KeyRound className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
          </div>
          <div>
            <span className="mono text-[12px] font-medium text-text-primary">{filename}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="file-card-type">{description}</span>
              <span className="file-card-lines">{lineCount} lines</span>
            </div>
          </div>
        </div>
        <div className="file-card-header-right" onClick={(e) => e.stopPropagation()}>
          {isPrivate && (
            <button type="button" onClick={() => setRevealed(!revealed)} className="copy-btn">
              {revealed ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
            </button>
          )}
          <button type="button" onClick={handleCopy} disabled={!revealed} className="copy-btn disabled:opacity-30">
            {copied
              ? <><Check className="h-3 w-3 text-signal-success" /><span className="text-signal-success">Copied</span></>
              : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
          <button type="button" onClick={handleDownload} disabled={!revealed} className="copy-btn disabled:opacity-30">
            <Download className="h-3 w-3" /> DL
          </button>
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="copy-btn">
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </button>

      {/* Content */}
      {isPrivate && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="file-card-reveal-btn"
        >
          <Eye className="h-4 w-4" />
          <span className="text-[12px] font-medium">Click to reveal private key</span>
        </button>
      ) : !collapsed ? (
        <div className="file-card-content">
          <pre className="file-card-pre">
            <code className="mono">
              {content.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="file-card-linenum">{i + 1}</span>
                  <span className="file-card-codeline">{line}</span>
                </div>
              ))}
            </code>
          </pre>
          {lineCount > 20 && <div className="file-card-fade" />}
        </div>
      ) : null}
    </motion.div>
  )
}

/* ── Main Component ────────────────────────────────────────── */

export function CertificateSuccess({
  domains,
  issuedAt,
  expiresAt,
  files,
  jobId,
}: CertificateSuccessProps) {
  const [allCopied, setAllCopied] = useState(false)

  const handleCopyAll = useCallback(async () => {
    if (!files) return
    const sep = "\n\n"
    const all = [
      `===== cert.pem =====${sep}${files.cert}`,
      `===== fullchain.pem =====${sep}${files.fullchain}`,
      `===== chain.pem =====${sep}${files.chain}`,
      `===== privkey.pem =====${sep}${files.privateKey}`,
    ].join(sep)
    try { await navigator.clipboard.writeText(all) } catch {
      const ta = document.createElement("textarea")
      ta.value = all; document.body.appendChild(ta)
      ta.select(); document.execCommand("copy"); document.body.removeChild(ta)
    }
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 3000)
  }, [files])

  const handleDownloadAll = useCallback(() => {
    if (!jobId) return
    window.open(`/api/files?jobId=${jobId}&download=all`, "_blank")
  }, [jobId])

  return (
    <div className="space-y-8">

      {/* ── SUCCESS HERO ─────────────────────────────────── */}
      <motion.div
        className="success-hero glass-reflection"
        data-glass-success
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className="success-icon-wrap">
          <motion.div
            className="success-icon"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: BOUNCE }}
          >
            <Shield className="h-7 w-7" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            className="success-icon-ring"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          />
          <motion.div
            className="success-icon-check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.7, ease: BOUNCE }}
          >
            <CheckCircle2 className="h-4 w-4" />
          </motion.div>
        </div>

        <div className="text-center">
          <motion.h2
            className="success-title"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            CERTIFICATE ISSUED
          </motion.h2>
          <motion.p
            className="success-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            Your SSL certificate is active and ready for installation.
          </motion.p>
        </div>

        <motion.div
          className="success-badges"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          {BADGE_ITEMS.map((b, i) => (
            <StatusBadge key={b.label} label={b.label} color={b.color} delay={0.5 + i * 0.08} />
          ))}
        </motion.div>
      </motion.div>

      {/* ── SECURED DOMAIN ───────────────────────────────── */}
      <motion.div
        className="success-domain-panel glass-reflection"
        data-glass-success
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
      >
        <span className="success-section-label">SECURED DOMAIN</span>
        <div className="success-domain-list">
          {domains.map((d, i) => (
            <motion.span
              key={d}
              className="success-domain-name mono"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
            >
              {d}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* ── CERTIFICATE DETAILS ──────────────────────────── */}
      <motion.div
        className="success-details-panel glass-reflection"
        data-glass-success
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
      >
        <span className="success-section-label">CERTIFICATE DETAILS</span>
        <CertInfoRow label="DOMAIN" value={domains[0]} mono accent="#2ec7ff" delay={0.45} />
        {domains.length > 1 && (
          <CertInfoRow label="SANs" value={`${domains.length - 1} additional domain(s)`} accent="#2ec7ff" delay={0.5} />
        )}
        <CertInfoRow label="ISSUER" value="Let's Encrypt R3" accent="#7b68ee" delay={0.55} />
        <CertInfoRow label="VALIDATION" value="DNS-01 Challenge" delay={0.6} />
        <CertInfoRow label="STATUS" value="Active" accent="#00d26a" delay={0.65} />
        <CertInfoRow label="ISSUED" value={formatDate(issuedAt)} delay={0.7} />
        <CertInfoRow label="EXPIRES" value={formatDate(expiresAt)} delay={0.75} />
      </motion.div>

      {/* ── WHAT WAS GENERATED ───────────────────────────── */}
      <motion.div
        className="success-generated-panel glass-reflection"
        data-glass-success
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.5 }}
      >
        <span className="success-section-label">CERTIFICATE</span>
        <div className="generated-items">
          {GENERATED_ITEMS.map((item, i) => (
            <GeneratedItem
              key={item.key}
              label={item.label}
              icon={item.icon}
              available={!!files}
              delay={0.55 + i * 0.06}
            />
          ))}
        </div>
      </motion.div>

      {/* ── SSL FILES ────────────────────────────────────── */}
      {files && (
        <motion.div
          className="success-files-panel glass-reflection"
          data-glass-success
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.6 }}
        >
          <div className="success-files-header">
            <div>
              <span className="success-section-label">SSL CERTIFICATE FILES</span>
              <p className="text-[11px] text-text-muted mt-1">Your certificate files are ready for installation.</p>
            </div>
            <div className="success-files-actions">
              <button onClick={handleCopyAll} className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-[12px]">
                {allCopied
                  ? <><ClipboardCheck className="h-3.5 w-3.5" /> All Files Copied</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy All Files</>}
              </button>
              {jobId && (
                <button onClick={handleDownloadAll} className="btn-secondary flex items-center gap-2 rounded-md px-4 py-2 text-[12px]">
                  <DownloadCloud className="h-3.5 w-3.5" /> Download ZIP
                </button>
              )}
            </div>
          </div>

          {/* Private key security notice */}
          <motion.div
            className="private-key-notice"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.75 }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-medium text-amber-400/90">Private Key</span>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Keep your private key secret. Never publish it or share it publicly.
              </p>
            </div>
          </motion.div>

          <div className="space-y-3">
            <FileCard filename="cert.pem" label="Certificate" description="PEM CERTIFICATE" content={files.cert} delay={0.7} />
            <FileCard filename="fullchain.pem" label="Full Chain" description="PEM FULL CHAIN" content={files.fullchain} delay={0.8} />
            <FileCard filename="chain.pem" label="Chain" description="PEM CERTIFICATE CHAIN" content={files.chain} delay={0.9} />
            <FileCard filename="privkey.pem" label="Private Key" description="RSA PRIVATE KEY" content={files.privateKey} isPrivate delay={1.0} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
