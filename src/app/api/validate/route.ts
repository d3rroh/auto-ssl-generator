import { NextResponse } from "next/server"
import { getJob } from "@/lib/jobs"
import { completeValidation } from "@/lib/acme"
import { checkRateLimit, getClientIp, SECURITY_HEADERS } from "@/lib/security"

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`validate:${ip}`)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { ...SECURITY_HEADERS } }
    )
  }

  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required." },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    const job = getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: "Job not found or expired." },
        { status: 404, headers: { ...SECURITY_HEADERS } }
      )
    }

    if (job.status !== "challenges_ready" && job.status !== "dns_verified") {
      return NextResponse.json(
        { error: "Job is not ready for validation." },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    const cert = await completeValidation(jobId)

    return NextResponse.json(
      {
        status: "completed",
        domains: job.domains,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
      },
      { headers: { ...SECURITY_HEADERS } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Validation failed"

    return NextResponse.json(
      { error: `Certificate validation failed: ${message}` },
      { status: 500, headers: { ...SECURITY_HEADERS } }
    )
  }
}
