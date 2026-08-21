import { NextResponse } from "next/server"
import { getJob, updateJob } from "@/lib/jobs"
import { checkTxtRecord } from "@/lib/dns"
import { checkRateLimit, getClientIp, checkBodySize } from "@/lib/security"

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
}

const MAX_BODY_BYTES = 4096

export async function POST(request: Request) {
  if (!checkBodySize(request, MAX_BODY_BYTES)) {
    return NextResponse.json(
      { error: "Request body too large." },
      { status: 413, headers: SECURITY_HEADERS }
    )
  }

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`check-dns:${ip}`, 30)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: SECURITY_HEADERS }
    )
  }

  try {
    const body = await request.json()
    const { jobId, domain } = body

    if (!jobId || !domain || typeof jobId !== "string" || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Job ID and domain are required." },
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

    const challenge = job.challenges.find((c) => c.domain === domain)
    if (!challenge) {
      return NextResponse.json(
        { error: "Domain not found in this job." },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    const result = await checkTxtRecord(challenge.dnsName, challenge.dnsValue)

    if (result.found) {
      const verifiedDomains = new Set<string>()
      for (const c of job.challenges) {
        const r = await checkTxtRecord(c.dnsName, c.dnsValue)
        if (r.found) verifiedDomains.add(c.domain)
      }

      if (verifiedDomains.size === job.challenges.length) {
        updateJob(jobId, { status: "dns_verified" })
      }
    }

    return NextResponse.json(
      {
        found: result.found,
        records: result.records,
      },
      { headers: SECURITY_HEADERS }
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to check DNS records." },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}
