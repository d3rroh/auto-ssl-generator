import * as acme from "acme-client"
import * as crypto from "crypto"
import * as dns from "dns"
import * as https from "https"
import { createJob, updateJob, getJob, type Job, type Challenge } from "./jobs"
import { generateSecureId } from "./security"
import { sanitizeDomain, sanitizeEmail } from "./validation"
import { checkTxtRecordPublic } from "./dns"
import { patchDnsLookup } from "./dns-tcp"

// Patch Node.js dns.lookup to use TCP — UDP is broken by Cilium BPF datapath
patchDnsLookup()

// Force IPv4 — Docker has no IPv6, Node.js tries it first and hangs
dns.setDefaultResultOrder("ipv4first")

// Replace global HTTPS agent with IPv4-only agent
// This forces ALL outgoing HTTPS connections (including acme-client's axios) to use IPv4
;(https as unknown as { globalAgent: https.Agent }).globalAgent = new https.Agent({ family: 4 })

const DIRECTORY_URL =
  process.env.ACME_DIRECTORY_URL || "https://acme-v02.api.letsencrypt.org/directory"

function generatePrivateKeySync(): string {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
  }).privateKey
}

interface StoredState {
  challenges: any[]
  order: any
  accountUrl: string
}

const stateStore: Map<string, StoredState> = (globalThis as any).__sslStateStore ?? new Map<string, StoredState>()
if (!(globalThis as any).__sslStateStore) (globalThis as any).__sslStateStore = stateStore

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`ACME ${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function startCertificateRequest(
  domains: string[],
  email: string
): Promise<{ jobId: string; challenges: Challenge[] }> {
  const accountKey = generatePrivateKeySync()
  const accountClient = new acme.Client({
    directoryUrl: DIRECTORY_URL,
    accountKey,
    backoffAttempts: 3,
    backoffMin: 2000,
    backoffMax: 8000,
  })

  await withTimeout(
    accountClient.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${sanitizeEmail(email)}`],
    }),
    30000,
    "createAccount"
  )

  const sanitizedDomains = domains.map(sanitizeDomain)
  const order = await withTimeout(
    accountClient.createOrder({
      identifiers: sanitizedDomains.map((d) => ({
        type: "dns" as const,
        value: d,
      })),
    }),
    30000,
    "createOrder"
  )

  const authzUrls = await withTimeout(
    accountClient.getAuthorizations(order),
    30000,
    "getAuthorizations"
  )
  const challenges: Challenge[] = []
  const acmeChallenges: any[] = []

  for (const authz of authzUrls) {
    const domain = authz.identifier.value
    const challenge = authz.challenges.find((c) => c.type === "dns-01")
    if (!challenge) {
      throw new Error(`No DNS-01 challenge available for ${domain}`)
    }

    const keyAuthorization = await accountClient.getChallengeKeyAuthorization(challenge)
    const dnsValue = keyAuthorization

    challenges.push({
      domain,
      dnsName: `_acme-challenge.${domain}`,
      dnsValue,
      challengeUrl: challenge.url,
      keyAuthorization,
    })

    acmeChallenges.push(challenge)
  }

  const jobId = generateSecureId()
  const job: Job = {
    id: jobId,
    domains: sanitizedDomains,
    email: sanitizeEmail(email),
    status: "challenges_ready",
    accountKey,
    orderUrl: order.url,
    challenges,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
  }

  createJob(job)
  stateStore.set(jobId, { challenges: acmeChallenges, order, accountUrl: accountClient.getAccountUrl() })

  return { jobId, challenges }
}

export async function completeValidation(jobId: string): Promise<{
  cert: string
  chain: string
  fullchain: string
  privateKey: string
  issuedAt: string
  expiresAt: string
}> {
  const job = getJob(jobId)
  if (!job) {
    throw new Error("Job not found or expired")
  }

  if (job.status !== "challenges_ready" && job.status !== "dns_verified") {
    throw new Error(`Job is in unexpected state: ${job.status}`)
  }

  const stored = stateStore.get(jobId)
  if (!stored) {
    throw new Error("Session state expired. Please start over.")
  }

  updateJob(jobId, { status: "validating" })

  const accountClient = new acme.Client({
    directoryUrl: DIRECTORY_URL,
    accountKey: job.accountKey,
    accountUrl: stored.accountUrl,
    backoffAttempts: 2,
    backoffMin: 2000,
    backoffMax: 5000,
  })

  // Verify DNS has propagated to public resolvers before calling Let's Encrypt
  for (const jobChallenge of job.challenges) {
    let propagated = false
    for (let attempt = 0; attempt < 5; attempt++) {
      const publicCheck = await checkTxtRecordPublic(jobChallenge.dnsName, jobChallenge.dnsValue)
      if (publicCheck.found) {
        propagated = true
        break
      }
      console.error(`[validate] Public DNS not ready for ${jobChallenge.dnsName}, attempt ${attempt + 1}/5, waiting 2s...`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    if (!propagated) {
      throw new Error(`DNS record for ${jobChallenge.dnsName} has not propagated to public resolvers (Google 8.8.8.8 / Cloudflare 1.1.1.1) yet. Please wait a few more minutes and start a new request.`)
    }
  }

  for (const challenge of stored.challenges) {
    await withTimeout(accountClient.completeChallenge(challenge), 15000, "completeChallenge")
  }

  // Brief pause for Let's Encrypt to pick up the challenge completion
  await new Promise((resolve) => setTimeout(resolve, 3000))

  let order: any
  try {
    order = await withTimeout(accountClient.waitForValidStatus(stored.order), 60000, "waitForValidStatus")
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : ""
    if (msg.includes("invalid")) {
      // Fetch authorization details to see WHY it failed
      try {
        const authzUrls = await accountClient.getAuthorizations(stored.order)
        for (const authz of authzUrls) {
          const challengeInfo = authz.challenges?.map((c: any) => ({
            type: c.type,
            status: c.status,
            error: c.error,
            validated: c.validated,
            token: c.token,
          }))
          console.error("[validate] Authz:", JSON.stringify({
            domain: authz.identifier?.value,
            status: authz.status,
            challenges: challengeInfo,
          }, null, 2))
        }
      } catch (authzErr) {
        console.error("[validate] Failed to fetch authz:", authzErr)
      }
      throw new Error("DNS validation failed. Let's Encrypt could not verify the TXT record. Please ensure the record is correct, wait a few minutes for full propagation, then start a new request.")
    }
    throw err
  }

  const [certificateKey, csr] = await acme.crypto.createCsr({
    commonName: job.domains[0],
    altNames: job.domains,
  })

  const cert = await withTimeout(accountClient.finalizeOrder(order, csr), 30000, "finalizeOrder")
  const certPem = await withTimeout(accountClient.getCertificate(cert), 30000, "getCertificate")
  stateStore.delete(jobId)

  const certParts = acme.crypto.splitPemChain(certPem)
  const chainPem = certParts.length > 1 ? certParts.slice(1).join("\n") : ""
  const fullchainPem = certPem

  const privateKeyPem = Buffer.isBuffer(certificateKey) ? certificateKey.toString() : String(certificateKey)
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  updateJob(jobId, {
    status: "completed",
    certificate: {
      cert: certPem,
      chain: chainPem,
      fullchain: fullchainPem,
      privateKey: privateKeyPem,
      issuedAt,
      expiresAt,
    },
  })

  return { cert: certPem, chain: chainPem, fullchain: fullchainPem, privateKey: privateKeyPem, issuedAt, expiresAt }
}
