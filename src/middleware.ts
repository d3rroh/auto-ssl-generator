import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=()",
  "X-DNS-Prefetch-Control": "off",
  "X-Permitted-Cross-Domain-Policies": "none",
}

const ALLOWED_ORIGINS = new Set([
  "https://auto-ssl-generator-production.up.railway.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
])

const API_ROUTES = ["/api/generate", "/api/check-dns", "/api/validate", "/api/files"]

function isApiRoute(pathname: string): boolean {
  return API_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))
}

function getOrigin(request: NextRequest): string | null {
  return request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/") || null
}

function getCorsHeaders(origin: string | null, method: string): Record<string, string> {
  if (method === "OPTIONS") {
    return {
      "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    }
  }

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return { "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
  }

  return {}
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/") {
    const response = NextResponse.next()
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }

  if (pathname === "/api/diag" && process.env.NODE_ENV === "production") {
    return new NextResponse(JSON.stringify({ error: "Not available in production" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
    })
  }

  if (isApiRoute(pathname)) {
    const origin = getOrigin(request)
    const method = request.method

    if (method === "OPTIONS") {
      const corsHeaders = getCorsHeaders(origin, "OPTIONS")
      if (!corsHeaders["Access-Control-Allow-Origin"]) {
        return new NextResponse(null, { status: 403, headers: { ...SECURITY_HEADERS } })
      }
      return new NextResponse(null, { status: 204, headers: { ...corsHeaders, ...SECURITY_HEADERS } })
    }

    const corsHeaders = getCorsHeaders(origin, method)

    if (["POST", "PUT", "PATCH"].includes(method) && !origin) {
      const contentType = request.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const response = NextResponse.next()
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          response.headers.set(key, value)
        }
        Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v))
        return response
      }
    }

    if (origin && !ALLOWED_ORIGINS.has(origin) && method !== "GET") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
      })
    }

    const response = NextResponse.next()
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value)
    }
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }

  const response = NextResponse.next()
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|.*\\.ico).*)",
  ],
}
