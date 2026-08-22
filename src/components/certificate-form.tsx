"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, X, AlertCircle, ChevronRight, Zap, Loader2, Circle, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react"

type ButtonStep = "form" | "dns_challenge" | "dns_verify" | "validating" | "unlocking" | "success"

interface CertificateFormProps {
  onSubmit: (domains: string[], email: string) => void
  isLoading: boolean
  error: string | null
  currentStep?: ButtonStep
}

function getButtonConfig(step: ButtonStep, isLoading: boolean, error: string | null) {
  if (error) {
    return {
      text: "Certificate Request Failed",
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      variant: "error" as const,
      disabled: false,
    }
  }

  switch (step) {
    case "form":
      if (isLoading) {
        return {
          text: "Initializing SSL Request",
          icon: <Loader2 className="h-4 w-4 shrink-0 animate-spin" />,
          variant: "processing" as const,
          disabled: true,
        }
      }
      return {
        text: "Generate Free SSL",
        icon: <Zap className="h-4 w-4 shrink-0" />,
        variant: "idle" as const,
        disabled: false,
      }
    case "dns_challenge":
      return {
        text: "Waiting for DNS",
        icon: <Circle className="h-4 w-4 shrink-0" />,
        variant: "dns" as const,
        disabled: true,
      }
    case "dns_verify":
      return {
        text: "Domain Verified",
        icon: <CheckCircle className="h-4 w-4 shrink-0" />,
        variant: "verified" as const,
        disabled: true,
      }
    case "validating":
      return {
        text: "Validating Certificate",
        icon: <Loader2 className="h-4 w-4 shrink-0 animate-spin" />,
        variant: "processing" as const,
        disabled: true,
      }
    case "unlocking":
    case "success":
      return {
        text: "Certificate Generated",
        icon: <CheckCircle className="h-4 w-4 shrink-0" />,
        variant: "success" as const,
        disabled: true,
      }
  }
}

const btnStyles = {
  idle: {
    background: "#ff2d2d",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 20px rgba(255,45,45,0.25), 0 0 0 0.5px rgba(255,255,255,0.08) inset",
  },
  processing: {
    background: "linear-gradient(135deg, #cc2424 0%, #ff2d2d 100%)",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 20px rgba(255,45,45,0.30), 0 0 0 0.5px rgba(255,255,255,0.10) inset",
  },
  dns: {
    background: "linear-gradient(135deg, #1a3a55 0%, #1e4568 100%)",
    color: "#92d5f5",
    border: "1px solid rgba(46,199,255,0.25)",
    boxShadow: "0 4px 16px rgba(46,199,255,0.12), 0 0 0 0.5px rgba(46,199,255,0.08) inset",
  },
  verified: {
    background: "linear-gradient(135deg, #0a5e3a 0%, #0d7a4a 100%)",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 20px rgba(0,210,106,0.30), 0 0 0 0.5px rgba(0,210,106,0.12) inset",
  },
  success: {
    background: "linear-gradient(135deg, #0a5e3a 0%, #0d7a4a 100%)",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 20px rgba(0,210,106,0.25), 0 0 0 0.5px rgba(0,210,106,0.10) inset",
  },
  error: {
    background: "#1a1015",
    color: "#EF4444",
    border: "1px solid rgba(239,68,68,0.30)",
    boxShadow: "0 4px 16px rgba(239,68,68,0.12), 0 0 0 0.5px rgba(239,68,68,0.08) inset",
  },
} as const

export function CertificateForm({ onSubmit, isLoading, error, currentStep = "form" }: CertificateFormProps) {
  const [domains, setDomains] = useState<string[]>([""])
  const [email, setEmail] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [domainErrors, setDomainErrors] = useState<Record<number, string>>({})
  const [shakeKey, setShakeKey] = useState(0)
  const prevErrorRef = useRef(error)

  useEffect(() => {
    if (error && !prevErrorRef.current) {
      setShakeKey((k) => k + 1)
    }
    prevErrorRef.current = error
  }, [error])

  const addDomain = () => {
    if (domains.length < 100) setDomains([...domains, ""])
  }

  const removeDomain = (index: number) => {
    if (domains.length > 1) {
      setDomains(domains.filter((_, i) => i !== index))
      const newErrors = { ...domainErrors }
      delete newErrors[index]
      setDomainErrors(newErrors)
    }
  }

  const updateDomain = (index: number, value: string) => {
    const newDomains = [...domains]
    newDomains[index] = value
    setDomains(newDomains)
    const newErrors = { ...domainErrors }
    delete newErrors[index]
    setDomainErrors(newErrors)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validDomains = domains.filter((d) => d.trim())
    if (validDomains.length === 0) return
    onSubmit(validDomains, email)
  }

  const domainCount = domains.filter((d) => d.trim()).length
  const showForm = currentStep === "form"
  const config = getButtonConfig(currentStep, isLoading, error)
  const styles = btnStyles[config.variant]
  const isIdle = config.variant === "idle"
  const isError = config.variant === "error"

  return (
    <div className="panel panel-form glass-reflection p-6">
      {showForm && (
        <>
          <h2 className="mb-1 text-base font-semibold text-text-primary">
            Generate Your SSL Certificate
          </h2>
          <p className="mb-6 text-[13px] text-text-secondary">
            Secure your domain with a trusted Let&apos;s Encrypt certificate using DNS verification.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Domains */}
            <div className="space-y-2">
              <label className="mono block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Domain Name
              </label>
              <div className="space-y-2">
                {domains.map((domain, index) => (
                  <div key={index} className="flex gap-2" style={{ animation: "slide-up 0.2s ease-out" }}>
                    <div className="flex-1">
                      <input
                        value={domain}
                        onChange={(e) => updateDomain(index, e.target.value)}
                        placeholder={index === 0 ? "your-domain.com" : "Additional domain (optional)"}
                        className={`input-field mono h-10 w-full rounded border bg-field px-3 text-[13px] text-text-primary outline-none ${
                          domainErrors[index]
                            ? "border-signal-error/50"
                            : "border-border-default"
                        }`}
                        disabled={isLoading}
                      />
                      {domainErrors[index] && (
                        <p className="mt-1 text-[11px] text-signal-error">{domainErrors[index]}</p>
                      )}
                    </div>
                    {domains.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDomain(index)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-transparent text-text-muted transition-colors hover:border-border-default hover:text-signal-error"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDomain}
                disabled={isLoading || domains.length >= 100}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted transition-colors hover:text-signal-success disabled:opacity-35"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Domain
                {domainCount > 0 && (
                  <span className="ml-1 rounded bg-signal-success-dim px-1.5 py-0.5 text-[10px] font-semibold text-signal-success">
                    {domainCount}
                  </span>
                )}
              </button>
              <p className="text-[11px] text-text-muted">
                Supports normal, www, wildcard (*.example.com), and multiple SAN domains.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="mono block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourdomain.com"
                className="input-field mono h-10 w-full rounded border border-border-default bg-field px-3 text-[13px] text-text-primary outline-none"
                disabled={isLoading}
              />
              <p className="text-[11px] text-text-muted">
                Used for Let&apos;s Encrypt expiration notices and account recovery.
              </p>
            </div>

            {/* Certificate info */}
            <div className="rounded-md border border-border-subtle bg-base/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-muted">Certificate Authority</span>
                <span className="mono text-[12px] font-medium text-signal-success">Let&apos;s Encrypt</span>
              </div>
              <div className="my-2 h-px bg-border-subtle" />
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-muted">Validation Method</span>
                <span className="mono text-[12px] font-medium text-text-secondary">DNS-01</span>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex cursor-pointer items-start gap-2.5 py-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="custom-checkbox mt-0.5"
                disabled={isLoading}
              />
              <span className="text-[13px] leading-relaxed text-text-secondary">
                I agree to the{" "}
                <a
                  href="https://letsencrypt.org/documents/LE-SA-v1.5-August-1-2025.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal-success underline-offset-2 hover:underline"
                >
                  Let&apos;s Encrypt Subscriber Agreement
                </a>
              </span>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-signal-error/20 bg-signal-error-dim p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-signal-error" />
                <p className="text-[13px] text-signal-error">{error}</p>
              </div>
            )}
          </form>
        </>
      )}

      {/* Button — always visible, drives the entire experience */}
      {showForm ? (
        <form onSubmit={handleSubmit}>
          <div
            key={shakeKey}
            className={isError ? "animate-[btn-shake_0.4s_ease-out]" : ""}
          >
            <button
              type="submit"
              disabled={config.disabled || (!showForm && !error)}
              aria-label={config.text}
              aria-busy={config.variant === "processing"}
              className="btn-ssl-trigger group relative mt-5 flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-lg text-[13px] font-semibold"
              style={styles}
            >
              {/* Light sweep — idle only */}
              {isIdle && <span className="btn-sweep" />}

              {/* Border trail — processing / dns only */}
              {(config.variant === "processing" || config.variant === "dns") && (
                <span className="btn-border-trail" />
              )}

              <span className="relative z-10 flex items-center gap-2.5">
                {config.icon}
                <span className="tracking-wide">{config.text}</span>
                {isIdle && !error && (
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                )}
                {isError && (
                  <RotateCcw className="h-3.5 w-3.5 opacity-60" />
                )}
              </span>
            </button>
          </div>
        </form>
      ) : (
        /* Non-form steps: show compact status button */
        <div className="mt-5">
          <div
            className={isError ? "animate-[btn-shake_0.4s_ease-out]" : ""}
          >
            <div
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg text-[13px] font-semibold"
              style={styles}
            >
              {(config.variant === "processing" || config.variant === "dns") && (
                <span className="btn-border-trail" />
              )}
              <span className="relative z-10 flex items-center gap-2.5">
                {config.icon}
                <span className="tracking-wide">{config.text}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
