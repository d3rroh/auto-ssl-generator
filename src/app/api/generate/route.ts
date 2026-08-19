import { NextResponse } from "next/server"
import { startCertificateRequest } from "@/lib/acme"
import { validateDomains, validateEmail } from "@/lib/validation"
import { checkRateLimit, getClientIp, SECURITY_HEADERS } from "@/lib/security"
import { getJobCount } from "@/lib/jobs"

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`generate:${ip}`)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { ...SECURITY_HEADERS } }
    )
  }

  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_JOBS || "5", 10)
  if (getJobCount() >= maxConcurrent) {
    return NextResponse.json(
      { error: "Server is busy. Please try again in a moment." },
      { status: 503, headers: { ...SECURITY_HEADERS } }
    )
  }

  try {
    const body = await request.json()
    const { domains, email } = body

    if (!Array.isArray(domains) || !email) {
      return NextResponse.json(
        { error: "Invalid request. Domains array and email are required." },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    const domainValidation = validateDomains(domains)
    if (!domainValidation.valid) {
      return NextResponse.json(
        { error: domainValidation.error },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    const result = await startCertificateRequest(
      domains.map((d: string) => d.trim().toLowerCase()),
      email.trim().toLowerCase()
    )

    return NextResponse.json(
      {
        jobId: result.jobId,
        challenges: result.challenges.map((c) => ({
          domain: c.domain,
          dnsName: c.dnsName,
          dnsValue: c.dnsValue,
        })),
      },
      { headers: { ...SECURITY_HEADERS } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred"

    if (message.includes("Rate limit") || message.includes("too many")) {
      return NextResponse.json(
        { error: "Let's Encrypt rate limit encountered. Please try again later." },
        { status: 429, headers: { ...SECURITY_HEADERS } }
      )
    }

    return NextResponse.json(
      { error: "Failed to start certificate request. Please check your details and try again." },
      { status: 500, headers: { ...SECURITY_HEADERS } }
    )
  }
}
