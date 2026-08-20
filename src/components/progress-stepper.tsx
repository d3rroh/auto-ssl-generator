"use client"

type StepStatus = "completed" | "active" | "upcoming"

interface Step {
  label: string
  status: StepStatus
}

interface ProgressStepperProps {
  steps: Step[]
}

const STATUS_STYLES: Record<StepStatus, { dot: string; line: string; text: string }> = {
  completed: {
    dot: "bg-signal-success border-signal-success",
    line: "bg-signal-success/40",
    text: "text-signal-success",
  },
  active: {
    dot: "bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(46,199,255,0.5)]",
    line: "bg-white/10",
    text: "text-cyan-400",
  },
  upcoming: {
    dot: "bg-white/5 border-white/15",
    line: "bg-white/8",
    text: "text-text-muted",
  },
}

export function ProgressStepper({ steps }: ProgressStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const styles = STATUS_STYLES[step.status]
        const isLast = i === steps.length - 1

        return (
          <div key={i} className="flex items-center">
            {/* Step */}
            <div className="flex items-center gap-2">
              <div
                className={`relative flex h-[7px] w-[7px] items-center justify-center rounded-full border-[1.5px] ${styles.dot} transition-all duration-300`}
              >
                {step.status === "active" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/30" />
                )}
              </div>
              <span className={`mono text-[10px] font-medium tracking-wider uppercase ${styles.text} transition-colors duration-300`}>
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {!isLast && (
              <div className={`mx-3 h-px w-6 ${styles.line} transition-colors duration-300 sm:w-10`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
