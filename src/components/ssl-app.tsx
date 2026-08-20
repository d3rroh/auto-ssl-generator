"use client"

import { useState, useCallback, useEffect } from "react"
import { Toaster, toast } from "sonner"
import { RotateCcw, RefreshCw, ArrowRight } from "lucide-react"
import { CertificateForm } from "@/components/certificate-form"
import { DnsChallenge } from "@/components/dns-challenge"
import { DnsVerification } from "@/components/dns-verification"
import { ProgressStepper } from "@/components/progress-stepper"
import { CertificateProgress } from "@/components/certificate-progress"
import { CertificateSuccess } from "@/components/certificate-success"
import { CertificateUnlockAnimation } from "@/components/certificate-unlock"
import { CertificateFileViewer } from "@/components/file-viewer"
import { InstallationHelp } from "@/components/installation-help"
import type { SceneState } from "@/components/three-scene"

type AppStep = "form" | "dns_challenge" | "dns_verify" | "validating" | "unlocking" | "success"

interface Challenge {
  domain: string
  dnsName: string
  dnsValue: string
}

interface JobResult {
  jobId: string
  challenges: Challenge[]
}

interface CertResult {
  domains: string[]
  issuedAt: string
  expiresAt: string
}

interface FileResult {
  cert: string
  chain: string
  fullchain: string
  privateKey: string
}

const DNS_STEPS = [
  { label: "Request", status: "completed" as const },
  { label: "DNS Validation", status: "active" as const },
  { label: "Certificate", status: "upcoming" as const },
  { label: "Ready", status: "upcoming" as const },
]

const DNS_STEPS_VERIFIED = [
  { label: "Request", status: "completed" as const },
  { label: "DNS Validation", status: "completed" as const },
  { label: "Certificate", status: "active" as const },
  { label: "Ready", status: "upcoming" as const },
]

export function SslApp({ onSceneStateChange }: { onSceneStateChange?: (state: SceneState) => void }) {
  const [step, setStep] = useState<AppStep>("form")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<JobResult | null>(null)
  const [certResult, setCertResult] = useState<CertResult | null>(null)
  const [fileResult, setFileResult] = useState<FileResult | null>(null)
  const [dnsCheckStatus, setDnsCheckStatus] = useState<"checking" | "found" | "not_found">("checking")
  const [isCheckingDns, setIsCheckingDns] = useState(false)
  const [isContinuing, setIsContinuing] = useState(false)
  const [validatingStages, setValidatingStages] = useState<{ id: string; label: string; description: string; status: "completed" | "active" | "pending" | "failed" }[]>([
    { id: "detect", label: "DNS Record Detected", description: "TXT record propagated to DNS resolvers", status: "completed" },
    { id: "validate", label: "Let\u2019s Encrypt Validation", description: "ACME server verifying domain ownership", status: "active" },
    { id: "generate", label: "Certificate Generation", description: "Creating SSL certificate with domain bindings", status: "pending" },
    { id: "issue", label: "Certificate Issued", description: "Signed certificate ready for download", status: "pending" },
  ])
  const [validatingMessage, setValidatingMessage] = useState<string | undefined>(undefined)
  const [validatingError, setValidatingError] = useState<string | undefined>(undefined)

  const stepToScene = useCallback((s: AppStep): SceneState => {
    switch (s) {
      case "form": return "idle"
      case "dns_challenge": return "dns_challenge"
      case "dns_verify": return "dns_verified"
      case "validating": return "validating"
      case "unlocking": return "unlocking"
      case "success": return "certificate_ready"
    }
  }, [])

  useEffect(() => {
    onSceneStateChange?.(stepToScene(step))
  }, [step, onSceneStateChange, stepToScene])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleGenerate = async (domains: string[], email: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate certificate request")
      }

      setJobResult(data)
      setStep("dns_challenge")
      toast.success("Challenge generated", {
        description: "Add the TXT record to your DNS to proceed.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
      toast.error("Request failed", { description: message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckDns = async () => {
    if (!jobResult) return

    setIsCheckingDns(true)
    setDnsCheckStatus("checking")
    setStep("dns_verify")

    try {
      const firstDomain = jobResult.challenges[0].domain
      const response = await fetch("/api/check-dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jobResult.jobId, domain: firstDomain }),
      })

      const data = await response.json()

      if (data.found) {
        setDnsCheckStatus("found")
        toast.success("DNS record detected!")
      } else {
        setDnsCheckStatus("not_found")
      }
    } catch {
      setDnsCheckStatus("not_found")
      toast.error("DNS check failed")
    } finally {
      setIsCheckingDns(false)
    }
  }

  const handleContinueValidation = async () => {
    if (!jobResult) return

    setIsContinuing(true)
    setStep("validating")
    setValidatingError(undefined)
    setValidatingStages([
      { id: "detect", label: "DNS Record Detected", description: "TXT record propagated to DNS resolvers", status: "completed" },
      { id: "validate", label: "Let\u2019s Encrypt Validation", description: "ACME server verifying domain ownership", status: "active" },
      { id: "generate", label: "Certificate Generation", description: "Creating SSL certificate with domain bindings", status: "pending" },
      { id: "issue", label: "Certificate Issued", description: "Signed certificate ready for download", status: "pending" },
    ])

    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jobResult.jobId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Validation failed")
      }

      setValidatingStages([
        { id: "detect", label: "DNS Record Detected", description: "TXT record propagated to DNS resolvers", status: "completed" },
        { id: "validate", label: "Let\u2019s Encrypt Validation", description: "ACME server verifying domain ownership", status: "completed" },
        { id: "generate", label: "Certificate Generation", description: "Creating SSL certificate with domain bindings", status: "completed" },
        { id: "issue", label: "Certificate Issued", description: "Signed certificate ready for download", status: "completed" },
      ])

      setCertResult({
        domains: data.domains,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
      })

      const fileResponse = await fetch(`/api/files?jobId=${jobResult.jobId}`)
      const files = await fileResponse.json()

      setFileResult({
        cert: files.cert,
        chain: files.chain,
        fullchain: files.fullchain,
        privateKey: files.privateKey,
      })

      setStep("unlocking")
      toast.success("Certificate issued!", {
        description: "Your SSL certificate is ready for installation.",
      })
      scrollToTop()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed"
      setValidatingError(message)
      setValidatingStages((prev) =>
        prev.map((s) =>
          s.status === "active"
            ? { ...s, status: "failed" as const }
            : s
        )
      )
      toast.error("Validation failed", { description: message })
    } finally {
      setIsContinuing(false)
    }
  }

  const handleReset = () => {
    if (jobResult?.jobId) {
      fetch(`/api/files?jobId=${jobResult.jobId}`, { method: "DELETE" }).catch(() => {})
    }
    setStep("form")
    setIsLoading(false)
    setError(null)
    setJobResult(null)
    setCertResult(null)
    setFileResult(null)
    setDnsCheckStatus("checking")
  }

  const isDnsActive = step === "dns_challenge" || step === "dns_verify"
  const stepperSteps = dnsCheckStatus === "found" ? DNS_STEPS_VERIFIED : DNS_STEPS

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#141B2E",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#E5E9F0",
            fontSize: "0.8rem",
            borderRadius: "6px",
          },
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">

        {/* ── FORM ── */}
        <div className="mx-auto max-w-[520px] animate-fade-in">
          <CertificateForm
            onSubmit={handleGenerate}
            isLoading={isLoading}
            error={error}
            currentStep={step}
          />
        </div>

        {/* ── DNS STEPPER ── */}
        {isDnsActive && (
          <div className="mx-auto mt-6 max-w-[600px] animate-fade-in">
            <ProgressStepper steps={stepperSteps} />
          </div>
        )}

        {/* ── DNS CHALLENGE ── */}
        {step === "dns_challenge" && (
          <div className="mx-auto mt-6 max-w-[600px] animate-fade-in">
            {/* DNS Status strip */}
            <div className="dns-status-strip mb-5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-[6px] w-[6px]">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-40"
                    style={{ animation: "status-glow 3s ease-in-out infinite" }}
                  />
                  <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-cyan-400" />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-text-primary">DNS Verification</p>
                  <p className="text-[10px] text-text-muted">
                    Add the TXT record below, then verify when DNS propagation is complete.
                  </p>
                </div>
              </div>
            </div>

            {/* DNS Record hero card */}
            <DnsChallenge challenges={jobResult?.challenges || []} />

            {/* What happens next */}
            <div className="what-happens-next mt-5">
              <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
                What happens next
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span className="h-1 w-1 rounded-full bg-text-muted/40" />
                  DNS ownership verified
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span className="h-1 w-1 rounded-full bg-text-muted/40" />
                  Let&apos;s Encrypt validates your request
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span className="h-1 w-1 rounded-full bg-text-muted/40" />
                  SSL certificate is generated
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span className="h-1 w-1 rounded-full bg-text-muted/40" />
                  Certificate files become available
                </div>
              </div>
            </div>

            {/* Verify button */}
            <button
              onClick={handleCheckDns}
              disabled={isCheckingDns}
              className="btn-verify mt-5 flex w-full items-center justify-center gap-2"
            >
              {isCheckingDns ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Checking DNS...
                </>
              ) : (
                <>
                  Check DNS Status
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── DNS VERIFY ── */}
        {step === "dns_verify" && (
          <div className="mx-auto mt-6 max-w-[600px] animate-fade-in">
            <DnsVerification
              status={dnsCheckStatus}
              domain={jobResult?.challenges[0]?.domain || ""}
            />

            {dnsCheckStatus === "found" ? (
              <button
                onClick={handleContinueValidation}
                disabled={isContinuing}
                className="btn-verify mt-5 flex w-full items-center justify-center gap-2"
              >
                {isContinuing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Validating Certificate...
                  </>
                ) : (
                  <>
                    Continue to Issuance
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCheckDns}
                disabled={isCheckingDns}
                className="btn-verify-secondary mt-5 flex w-full items-center justify-center gap-2"
              >
                {isCheckingDns ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Checking DNS...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Check Again
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── VALIDATING ── */}
        {step === "validating" && (
          <div className="mx-auto mt-6 max-w-[600px] animate-fade-in">
            <CertificateProgress
              stages={validatingStages}
              currentMessage={validatingMessage}
              errorMessage={validatingError}
            />
            {validatingError && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleContinueValidation}
                  disabled={isContinuing}
                  className="btn-verify flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Validation
                </button>
                <button
                  onClick={handleReset}
                  className="btn-verify-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── UNLOCKING ── */}
        {step === "unlocking" && (
          <div className="mx-auto max-w-[520px] animate-fade-in">
            <CertificateUnlockAnimation onComplete={() => setStep("success")} />
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && certResult && fileResult && (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto max-w-[600px]">
              <CertificateSuccess
                domains={certResult.domains}
                issuedAt={certResult.issuedAt}
                expiresAt={certResult.expiresAt}
              />
            </div>

            <div className="mx-auto max-w-[600px]">
              <CertificateFileViewer
                files={fileResult}
                jobId={jobResult?.jobId || ""}
                domains={certResult.domains}
              />
            </div>

            <div className="mx-auto max-w-[600px]">
              <InstallationHelp domains={certResult.domains} />
            </div>

            <div className="flex justify-center pt-2 pb-8">
              <button
                onClick={handleReset}
                className="btn-secondary inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[12px] font-medium"
              >
                <RotateCcw className="h-4 w-4" />
                Generate Another Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
