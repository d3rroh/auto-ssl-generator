export type JobStatus =
  | "pending"
  | "challenges_ready"
  | "dns_verified"
  | "validating"
  | "completed"
  | "failed"

export interface Challenge {
  domain: string
  dnsName: string
  dnsValue: string
  challengeUrl: string
  keyAuthorization: string
}

export interface CertificateData {
  cert: string
  chain: string
  fullchain: string
  privateKey: string
  issuedAt: string
  expiresAt: string
}

export interface Job {
  id: string
  domains: string[]
  email: string
  status: JobStatus
  accountKey: string
  orderUrl: string
  challenges: Challenge[]
  certificate?: CertificateData
  error?: string
  createdAt: number
  lastAccessed: number
}

const jobs = new Map<string, Job>()

const JOB_EXPIRY = parseInt(process.env.JOB_EXPIRY_MS || "3600000", 10)
const CLEANUP_INTERVAL = 60000

setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.lastAccessed > JOB_EXPIRY) {
      jobs.delete(id)
    }
  }
}, CLEANUP_INTERVAL)

export function createJob(job: Job): void {
  jobs.set(job.id, job)
}

export function getJob(id: string): Job | undefined {
  const job = jobs.get(id)
  if (job) {
    job.lastAccessed = Date.now()
  }
  return job
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id)
  if (!job) return undefined

  const updated = { ...job, ...updates, lastAccessed: Date.now() }
  jobs.set(id, updated)
  return updated
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id)
}

export function getJobCount(): number {
  return jobs.size
}
