const DOMAIN_REGEX = /^(?:\*\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateDomain(domain: string): ValidationResult {
  const trimmed = domain.trim().toLowerCase()

  if (!trimmed) {
    return { valid: false, error: "Domain cannot be empty" }
  }

  if (trimmed.length > 253) {
    return { valid: false, error: "Domain name is too long (max 253 characters)" }
  }

  if (!DOMAIN_REGEX.test(trimmed)) {
    return { valid: false, error: `"${domain}" is not a valid domain name` }
  }

  const parts = trimmed.split(".")
  if (parts.length < 2) {
    return { valid: false, error: "Domain must have at least two parts (e.g., example.com)" }
  }

  for (const part of parts) {
    if (part.length === 0 || part.length > 63) {
      return { valid: false, error: `Invalid domain label: "${part}"` }
    }
    if (part.startsWith("-") || part.endsWith("-")) {
      return { valid: false, error: `Domain label cannot start or end with a hyphen: "${part}"` }
    }
  }

  return { valid: true }
}

export function validateDomains(domains: string[]): ValidationResult {
  if (!domains || domains.length === 0) {
    return { valid: false, error: "At least one domain is required" }
  }

  if (domains.length > 100) {
    return { valid: false, error: "Maximum 100 domains per request" }
  }

  const normalized = new Set<string>()
  for (const domain of domains) {
    const result = validateDomain(domain)
    if (!result.valid) return result

    const normalizedDomain = domain.trim().toLowerCase()
    if (normalized.has(normalizedDomain)) {
      return { valid: false, error: `Duplicate domain: "${domain}"` }
    }
    normalized.add(normalizedDomain)
  }

  return { valid: true }
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim()

  if (!trimmed) {
    return { valid: false, error: "Email address is required" }
  }

  if (trimmed.length > 254) {
    return { valid: false, error: "Email address is too long" }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" }
  }

  return { valid: true }
}

export function sanitizeDomain(domain: string): string {
  return domain.trim().toLowerCase()
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
