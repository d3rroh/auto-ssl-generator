import * as acme from "acme-client"
import * as crypto from "crypto"
import { createJob, updateJob, getJob, type Job, type Challenge } from "./jobs"
import { generateSecureId } from "./security"
import { sanitizeDomain, sanitizeEmail } from "./validation"

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
}

const stateStore = new Map<string, StoredState>()

export async function startCertificateRequest(
  domains: string[],
  email: string
): Promise<{ jobId: string; challenges: Challenge[] }> {
  const accountKey = generatePrivateKeySync()
  const accountClient = new acme.Client({
    directoryUrl: DIRECTORY_URL,
    accountKey,
  })

  await accountClient.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${sanitizeEmail(email)}`],
  })

  const sanitizedDomains = domains.map(sanitizeDomain)
  const order = await accountClient.createOrder({
    identifiers: sanitizedDomains.map((d) => ({
      type: "dns" as const,
      value: d,
    })),
  })

  const authzUrls = await accountClient.getAuthorizations(order)
  const challenges: Challenge[] = []
  const acmeChallenges: any[] = []

  for (const authz of authzUrls) {
    const domain = authz.identifier.value
    const challenge = authz.challenges.find((c) => c.type === "dns-01")
    if (!challenge) {
      throw new Error(`No DNS-01 challenge available for ${domain}`)
    }

    const keyAuthorization = await accountClient.getChallengeKeyAuthorization(challenge)
    const dnsValue = crypto.createHash("sha256").update(keyAuthorization).digest("base64url")

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
  stateStore.set(jobId, { challenges: acmeChallenges, order })

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
  })

  for (const challenge of stored.challenges) {
    await accountClient.completeChallenge(challenge)
  }

  const order = await accountClient.waitForValidStatus(stored.order)

  const certificateKey = generatePrivateKeySync()
  const [, csr] = await acme.crypto.createCsr({
    commonName: job.domains[0],
    altNames: job.domains,
  }, certificateKey)

  const cert = await accountClient.finalizeOrder(order, csr)
  const certPem = await accountClient.getCertificate(cert)
  stateStore.delete(jobId)

  const certParts = acme.crypto.splitPemChain(certPem)
  const chainPem = certParts.length > 1 ? certParts.slice(1).join("\n") : ""
  const fullchainPem = certPem

  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  updateJob(jobId, {
    status: "completed",
    certificate: {
      cert: certPem,
      chain: chainPem,
      fullchain: fullchainPem,
      privateKey: certificateKey,
      issuedAt,
      expiresAt,
    },
  })

  return { cert: certPem, chain: chainPem, fullchain: fullchainPem, privateKey: certificateKey, issuedAt, expiresAt }
}
