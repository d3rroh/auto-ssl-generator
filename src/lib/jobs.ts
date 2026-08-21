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

const jobs: Map<string, Job> = (globalThis as any).__sslJobs ?? new Map<string, Job>()
if (!(globalThis as any).__sslJobs) (globalThis as any).__sslJobs = jobs

const JOB_EXPIRY = parseInt(process.env.JOB_EXPIRY_MS || "3600000", 10)
const MAX_TOTAL_JOBS = parseInt(process.env.MAX_TOTAL_JOBS || "100", 10)
const CLEANUP_INTERVAL = 60000

const STALE_THRESHOLD = 600000 // 10 minutes

type JobDeleteCallback = (jobId: string) => void
const deleteCallbacks: JobDeleteCallback[] = []

export function onJobDelete(callback: JobDeleteCallback): void {
  deleteCallbacks.push(callback)
}

function notifyDelete(jobId: string): void {
  for (const cb of deleteCallbacks) {
    try { cb(jobId) } catch { /* ignore */ }
  }
}

function evictOldestJob(): void {
  let oldest: string | null = null
  let oldestTime = Infinity
  for (const [id, job] of jobs) {
    if (job.status === "completed" || job.status === "failed") {
      if (job.lastAccessed < oldestTime) {
        oldestTime = job.lastAccessed
        oldest = id
      }
    }
  }
  if (oldest) {
    jobs.delete(oldest)
    notifyDelete(oldest)
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.lastAccessed > JOB_EXPIRY) {
      jobs.delete(id)
      notifyDelete(id)
    } else if (
      job.status !== "completed" &&
      job.status !== "failed" &&
      now - job.createdAt > STALE_THRESHOLD
    ) {
      jobs.set(id, { ...job, status: "failed", error: "Job timed out — abandoned" })
    }
  }
}, CLEANUP_INTERVAL)

export function createJob(job: Job): boolean {
  if (jobs.size >= MAX_TOTAL_JOBS) {
    evictOldestJob()
  }
  if (jobs.size >= MAX_TOTAL_JOBS) {
    return false
  }
  jobs.set(job.id, job)
  return true
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
  const existed = jobs.delete(id)
  if (existed) {
    notifyDelete(id)
  }
  return existed
}

export function getJobCount(): number {
  let count = 0
  for (const job of jobs.values()) {
    if (job.status !== "completed" && job.status !== "failed") {
      count++
    }
  }
  return count
}
