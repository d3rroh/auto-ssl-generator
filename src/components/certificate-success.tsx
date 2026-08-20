"use client"

import { motion } from "framer-motion"
import {
  Shield,
  Calendar,
  Lock,
  Globe,
  CheckCircle2,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface CertificateSuccessProps {
  domains: string[]
  issuedAt: string
  expiresAt: string
}

function CertInfoRow({
  icon: Icon,
  label,
  value,
  color,
  mono,
  delay,
}: {
  icon: typeof Shield
  label: string
  value: string
  color?: string
  mono?: boolean
  delay: number
}) {
  return (
    <motion.div
      className="cert-info-row"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <span className="cert-info-label">
        <Icon className="h-3 w-3" style={{ color: color || "var(--text-muted)" }} />
        {label}
      </span>
      <span className={`cert-info-value ${mono ? "mono" : ""}`}>
        {value}
      </span>
    </motion.div>
  )
}

export function CertificateSuccess({
  domains,
  issuedAt,
  expiresAt,
}: CertificateSuccessProps) {
  return (
    <div className="cert-success-container">
      {/* Hero status */}
      <motion.div
        className="cert-success-hero"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="cert-success-shield">
          <CheckCircle2 className="h-10 w-10 text-[#00d26a]" />
          <div className="cert-success-shield-glow" />
        </div>
        <div>
          <h2 className="cert-success-title">Certificate Issued</h2>
          <p className="cert-success-sub">
            Your SSL certificate is active and ready for installation.
          </p>
        </div>
      </motion.div>

      {/* Certificate details */}
      <div className="cert-details-panel">
        <CertInfoRow
          icon={Globe}
          label="Domain"
          value={domains[0]}
          color="#2ec7ff"
          mono
          delay={0.15}
        />
        {domains.length > 1 && (
          <CertInfoRow
            icon={Globe}
            label="SANs"
            value={`${domains.length - 1} additional domain(s)`}
            color="#2ec7ff"
            delay={0.2}
          />
        )}
        <CertInfoRow
          icon={Shield}
          label="Issuer"
          value="Let's Encrypt R3"
          color="#7b68ee"
          delay={0.25}
        />
        <CertInfoRow
          icon={Lock}
          label="Validation"
          value="DNS-01 Challenge"
          color="#f0b429"
          delay={0.3}
        />
        <CertInfoRow
          icon={CheckCircle2}
          label="Status"
          value="Active"
          color="#00d26a"
          delay={0.35}
        />
        <CertInfoRow
          icon={Calendar}
          label="Issued"
          value={formatDate(issuedAt)}
          delay={0.4}
        />
        <CertInfoRow
          icon={Calendar}
          label="Expires"
          value={formatDate(expiresAt)}
          delay={0.45}
        />
      </div>
    </div>
  )
}
