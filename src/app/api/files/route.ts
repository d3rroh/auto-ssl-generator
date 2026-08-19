import { NextResponse } from "next/server"
import { getJob } from "@/lib/jobs"
import { checkRateLimit, getClientIp, SECURITY_HEADERS } from "@/lib/security"
import JSZip from "jszip"

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`files:${ip}`, 30)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { ...SECURITY_HEADERS } }
    )
  }

  const url = new URL(request.url)
  const jobId = url.searchParams.get("jobId")
  const fileType = url.searchParams.get("type")
  const download = url.searchParams.get("download")

  if (!jobId) {
    return NextResponse.json(
      { error: "Job ID is required." },
      { status: 400, headers: { ...SECURITY_HEADERS } }
    )
  }

  const job = getJob(jobId)
  if (!job || !job.certificate) {
    return NextResponse.json(
      { error: "Certificate not found or expired." },
      { status: 404, headers: { ...SECURITY_HEADERS } }
    )
  }

  if (download === "all") {
    const zip = new JSZip()
    zip.file("cert.pem", job.certificate.cert)
    zip.file("chain.pem", job.certificate.chain)
    zip.file("fullchain.pem", job.certificate.fullchain)
    zip.file("privkey.pem", job.certificate.privateKey)

    const content = await zip.generateAsync({ type: "uint8array" })

    return new Response(new Uint8Array(content), {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="ssl-certificates-${job.domains[0].replace(/\./g, "-")}.zip"`,
      },
    })
  }

  if (download === "single" && fileType) {
    const fileMap: Record<string, { content: string; name: string }> = {
      cert: { content: job.certificate.cert, name: "cert.pem" },
      chain: { content: job.certificate.chain, name: "chain.pem" },
      fullchain: { content: job.certificate.fullchain, name: "fullchain.pem" },
      privkey: { content: job.certificate.privateKey, name: "privkey.pem" },
    }

    const file = fileMap[fileType]
    if (!file) {
      return NextResponse.json(
        { error: "Invalid file type." },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    return new Response(file.content, {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "application/x-pem-file",
        "Content-Disposition": `attachment; filename="${file.name}"`,
      },
    })
  }

  if (fileType) {
    const fileMap: Record<string, string> = {
      cert: job.certificate.cert,
      chain: job.certificate.chain,
      fullchain: job.certificate.fullchain,
      privkey: job.certificate.privateKey,
    }

    const content = fileMap[fileType]
    if (!content) {
      return NextResponse.json(
        { error: "Invalid file type." },
        { status: 400, headers: { ...SECURITY_HEADERS } }
      )
    }

    return NextResponse.json(
      { content },
      { headers: { ...SECURITY_HEADERS } }
    )
  }

  return NextResponse.json(
    {
      cert: job.certificate.cert,
      chain: job.certificate.chain,
      fullchain: job.certificate.fullchain,
      issuedAt: job.certificate.issuedAt,
      expiresAt: job.certificate.expiresAt,
      domains: job.domains,
    },
    { headers: { ...SECURITY_HEADERS } }
  )
}
