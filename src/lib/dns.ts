import { resolveTxtTcp, resolveTxtTcpPublic } from "./dns-tcp"

const CLUSTER_DNS = ["10.152.183.213"]
const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"]

export async function checkTxtRecord(
  hostname: string,
  expectedValue: string
): Promise<{ found: boolean; records: string[] }> {
  try {
    const result = await resolveTxtTcp(hostname, [...CLUSTER_DNS, ...PUBLIC_DNS])
    const found = result.records.some((r) => r === expectedValue)
    return { found, records: result.records }
  } catch {
    return { found: false, records: [] }
  }
}

export async function checkTxtRecordPublic(
  hostname: string,
  expectedValue: string
): Promise<{ found: boolean; records: string[] }> {
  try {
    const result = await resolveTxtTcpPublic(hostname, expectedValue, PUBLIC_DNS)
    return { found: result.found, records: result.records }
  } catch {
    return { found: false, records: [] }
  }
}

export async function waitForDnsPropagation(
  hostname: string,
  expectedValue: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ propagated: boolean; attempts: number }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await checkTxtRecord(hostname, expectedValue)
    if (result.found) {
      return { propagated: true, attempts: attempt + 1 }
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
  return { propagated: false, attempts: maxAttempts }
}
