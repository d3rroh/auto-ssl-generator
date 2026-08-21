import { NextResponse } from "next/server"
import * as https from "https"
import * as dnsPromises from "dns/promises"
import { checkRateLimit, getClientIp } from "@/lib/security"

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
}

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`diag:${ip}`, 5, 60000)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: SECURITY_HEADERS }
    )
  }

  const results: Record<string, unknown> = {}

  try {
    const resolver = new dnsPromises.Resolver()
    const addresses = await resolver.resolve4("acme-v02.api.letsencrypt.org")
    results.dns = { resolved: addresses.length > 0 }
  } catch {
    results.dns = { resolved: false }
  }

  try {
    await new Promise<{ status: number }>((resolve, reject) => {
      const req = https.get("https://acme-v02.api.letsencrypt.org/directory", {
        timeout: 10000,
        family: 4,
      }, (res) => {
        resolve({ status: res.statusCode || 0 })
        res.resume()
      })
      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error("HTTPS connection timed out after 10s"))
      })
    })
    results.https = { reachable: true }
  } catch {
    results.https = { reachable: false }
  }

  const allOk = results.dns && (results.dns as { resolved: boolean }).resolved &&
                results.https && (results.https as { reachable: boolean }).reachable

  return NextResponse.json({
    status: allOk ? "ok" : "network_issue",
  }, {
    status: allOk ? 200 : 503,
    headers: SECURITY_HEADERS,
  })
}
