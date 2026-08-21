import { NextResponse } from "next/server"
import { getJob } from "@/lib/jobs"
import { completeValidation } from "@/lib/acme"
import { checkRateLimit, getClientIp, checkBodySize } from "@/lib/security"

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
}

const MAX_BODY_BYTES = 4096

export async function POST(request: Request) {
  if (!(await checkBodySize(request, MAX_BODY_BYTES))) {
    return NextResponse.json(
      { error: "Request body too large." },
      { status: 413, headers: SECURITY_HEADERS }
    )
  }

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`validate:${ip}`)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: SECURITY_HEADERS }
    )
  }

  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Job ID is required." },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    const job = getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: "Job not found or expired." },
        { status: 404, headers: SECURITY_HEADERS }
      )
    }

    if (job.status !== "challenges_ready" && job.status !== "dns_verified") {
      return NextResponse.json(
        { error: "Job is not ready for validation." },
        { status: 400, headers: SECURITY_HEADERS }
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
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error("[validate] Error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Certificate validation failed." },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}
