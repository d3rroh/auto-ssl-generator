"use client"

import { Check, Circle, Loader2 } from "lucide-react"

interface Step {
  label: string
  status: "completed" | "active" | "pending"
}

interface CertificateProgressProps {
  steps: Step[]
}

export function CertificateProgress({ steps }: CertificateProgressProps) {
  return (
    <div className="panel p-5">
      <h3 className="mb-4 text-[13px] font-semibold text-text-primary">
        Certificate Issuance
      </h3>
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                  step.status === "completed"
                    ? "border-signal-success/40 bg-signal-success-dim"
                    : step.status === "active"
                      ? "border-signal-pending/40 bg-signal-pending-dim"
                      : "border-border-subtle bg-base/50"
                }`}
              >
                {step.status === "completed" && <Check className="h-3.5 w-3.5 text-signal-success" />}
                {step.status === "active" && <Loader2 className="h-3.5 w-3.5 animate-spin text-signal-pending" />}
                {step.status === "pending" && <Circle className="h-2.5 w-2.5 text-text-muted/40" />}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-6 w-px transition-colors duration-200 ${
                    step.status === "completed" ? "bg-signal-success/25" : "bg-border-subtle"
                  }`}
                />
              )}
            </div>
            <p
              className={`pb-1.5 pt-0.5 text-[12px] font-medium transition-colors duration-200 ${
                step.status === "completed"
                  ? "text-signal-success"
                  : step.status === "active"
                    ? "text-signal-pending"
                    : "text-text-muted"
              }`}
            >
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
