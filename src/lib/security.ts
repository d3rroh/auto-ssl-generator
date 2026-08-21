interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export function checkRateLimit(
  identifier: string,
  maxRequests: number = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10", 10),
  windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10)
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6_REGEX = /^[0-9a-fA-F:]+$/
const MAX_FORWARDED_CHAIN = 3

function isValidIp(ip: string): boolean {
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip)
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim()
  }

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const parts = forwarded.split(",").slice(0, MAX_FORWARDED_CHAIN)
    for (const part of parts) {
      const trimmed = part.trim()
      if (isValidIp(trimmed)) {
        return trimmed
      }
    }
  }

  return "unknown"
}

export function generateSecureId(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function checkBodySize(request: Request, maxBytes: number = 16384): Promise<boolean> {
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return false
  }

  const cloned = request.clone()
  const reader = cloned.body?.getReader()
  if (!reader) return true

  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.length
      if (totalBytes > maxBytes) {
        reader.cancel()
        return false
      }
    }
  } catch {
    return false
  }
  return true
}

const jobCreatorCounts = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of jobCreatorCounts) {
    if (now > entry.resetAt) {
      jobCreatorCounts.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export function checkJobCreationLimit(
  ip: string,
  maxJobs: number = parseInt(process.env.MAX_JOBS_PER_IP || "3", 10),
  windowMs: number = parseInt(process.env.JOB_CREATION_WINDOW_MS || "3600000", 10)
): boolean {
  const now = Date.now()
  const entry = jobCreatorCounts.get(ip)

  if (!entry || now > entry.resetAt) {
    jobCreatorCounts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxJobs) {
    return false
  }

  entry.count++
  return true
}
