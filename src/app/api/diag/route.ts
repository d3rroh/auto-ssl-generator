import { NextResponse } from "next/server"
import * as dns from "dns"
import * as https from "https"

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. DNS resolution
  try {
    const addresses = await new Promise<dns.LookupAddress[]>((resolve, reject) => {
      dns.lookup("acme-v02.api.letsencrypt.org", { all: true }, (err, addrs) => {
        if (err) reject(err)
        else resolve(addrs)
      })
    })
    results.dns = { resolved: true, addresses }
  } catch (err: unknown) {
    results.dns = { resolved: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 2. HTTPS connectivity (TCP + TLS handshake to Let's Encrypt)
  try {
    const connectResult = await new Promise<{ status: number; headers: Record<string, string> }>((resolve, reject) => {
      const req = https.get("https://acme-v02.api.letsencrypt.org/directory", {
        timeout: 10000,
        family: 4,
      }, (res) => {
        const headers: Record<string, string> = {}
        if (res.headers) {
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") headers[k] = v
          }
        }
        resolve({ status: res.statusCode || 0, headers })
        res.resume()
      })
      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error("HTTPS connection timed out after 10s"))
      })
    })
    results.https = { reachable: true, status: connectResult.status, server: connectResult.headers["server"] || "unknown" }
  } catch (err: unknown) {
    results.https = { reachable: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 3. Node.js info
  results.node = {
    version: process.version,
    platform: process.platform,
    arch: process.arch,
  }

  const allOk = results.dns && (results.dns as { resolved: boolean }).resolved &&
                results.https && (results.https as { reachable: boolean }).reachable

  return NextResponse.json({
    status: allOk ? "ok" : "network_issue",
    ...results,
  }, {
    status: allOk ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  })
}
