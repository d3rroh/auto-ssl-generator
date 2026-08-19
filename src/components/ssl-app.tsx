"use client"

import { useState, useCallback, useEffect } from "react"
import { Toaster, toast } from "sonner"
import { RotateCcw, RefreshCw, ArrowRight } from "lucide-react"
import { CertificateForm } from "@/components/certificate-form"
import { DnsChallenge } from "@/components/dns-challenge"
import { DnsVerification } from "@/components/dns-verification"
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

  // Map AppStep → SceneState
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
      toast.error("Validation failed", { description: message })
      setStep("dns_challenge")
    } finally {
      setIsContinuing(false)
    }
  }

  const handleReset = () => {
    setStep("form")
    setIsLoading(false)
    setError(null)
    setJobResult(null)
    setCertResult(null)
    setFileResult(null)
    setDnsCheckStatus("checking")
  }

  const getProgressSteps = (): { label: string; status: "completed" | "active" | "pending" }[] => {
    const steps: { label: string; status: "completed" | "active" | "pending" }[] = [
      { label: "Certificate request started", status: "completed" },
      { label: "DNS challenge generated", status: "completed" },
    ]

    if (step === "validating") {
      steps.push(
        { label: "DNS record detected", status: "completed" },
        { label: "Let's Encrypt validation", status: "active" },
        { label: "Certificate generation", status: "pending" },
        { label: "Complete", status: "pending" }
      )
    } else if (step === "unlocking" || step === "success") {
      steps.push(
        { label: "DNS record detected", status: "completed" },
        { label: "Let's Encrypt validation", status: "completed" },
        { label: "Certificate generation", status: "completed" },
        { label: "Complete", status: "completed" }
      )
    }

    return steps
  }

  const showRightPanel = step === "dns_challenge" || step === "dns_verify"

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

        {/* ── FORM (always mounted, drives the button across all steps) ── */}
        <div className="mx-auto max-w-[520px] animate-fade-in">
          <CertificateForm
            onSubmit={handleGenerate}
            isLoading={isLoading}
            error={error}
            currentStep={step}
          />
        </div>

        {/* ── TWO-PANE: DNS Challenge / Verification ─────── */}
        {showRightPanel && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] animate-fade-in">
            {/* Left: domain info + check button */}
            <div className="space-y-4">
              <div className="panel p-4">
                <p className="mono text-[11px] uppercase tracking-wider text-text-muted mb-2">Active domain</p>
                <p className="mono text-[14px] font-medium text-text-primary break-all">
                  {jobResult?.challenges[0]?.domain}
                </p>
                <div className="mt-3 h-px bg-border-subtle" />
                <p className="mt-2 text-[11px] text-text-secondary">
                  {step === "dns_challenge"
                    ? "Publish the TXT record, then check DNS."
                    : dnsCheckStatus === "found"
                      ? "Record verified. Continue to issuance."
                      : "Record not yet visible. Check your DNS."}
                </p>
              </div>

              {step === "dns_challenge" && (
                <button
                  onClick={handleCheckDns}
                  disabled={isCheckingDns}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px]"
                >
                  {isCheckingDns ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-base/30 border-t-bg-base" />
                      Checking DNS...
                    </>
                  ) : (
                    <>
                      Check DNS Status
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {step === "dns_verify" && dnsCheckStatus === "found" && (
                <button
                  onClick={handleContinueValidation}
                  disabled={isContinuing}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px]"
                >
                  {isContinuing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-base/30 border-t-bg-base" />
                      Validating Certificate...
                    </>
                  ) : (
                    <>
                      Continue to Issuance
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {step === "dns_verify" && dnsCheckStatus === "not_found" && (
                <button
                  onClick={handleCheckDns}
                  disabled={isCheckingDns}
                  className="btn-secondary flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check Again
                </button>
              )}
            </div>

            {/* Right: DNS record panel / verification status */}
            <div className="space-y-4">
              {step === "dns_challenge" && jobResult && (
                <div style={{ animation: "panel-reveal 0.4s ease-out" }}>
                  <DnsChallenge challenges={jobResult.challenges} />
                </div>
              )}

              {step === "dns_verify" && (
                <DnsVerification
                  status={dnsCheckStatus}
                  domain={jobResult?.challenges[0]?.domain || ""}
                />
              )}
            </div>
          </div>
        )}

        {/* ── VALIDATING ─────────────────────────────────── */}
        {step === "validating" && (
          <div className="mx-auto max-w-[520px] animate-fade-in">
            <CertificateProgress steps={getProgressSteps()} />
          </div>
        )}

        {/* ── UNLOCKING ──────────────────────────────────── */}
        {step === "unlocking" && (
          <div className="mx-auto max-w-[520px] animate-fade-in">
            <CertificateUnlockAnimation onComplete={() => setStep("success")} />
          </div>
        )}

        {/* ── SUCCESS ────────────────────────────────────── */}
        {step === "success" && certResult && fileResult && (
          <div className="space-y-6 animate-fade-in">
            <div className="mx-auto max-w-[520px]">
              <CertificateSuccess
                domains={certResult.domains}
                issuedAt={certResult.issuedAt}
                expiresAt={certResult.expiresAt}
              />
            </div>

            <div className="mx-auto max-w-4xl">
              <h3 className="mb-3 text-[13px] font-semibold text-text-primary">
                Certificate Files
              </h3>
              <CertificateFileViewer
                files={fileResult}
                jobId={jobResult?.jobId || ""}
                domains={certResult.domains}
              />
            </div>

            <div className="mx-auto max-w-4xl">
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
