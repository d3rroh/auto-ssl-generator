import * as dns from "dns"

const dnsResolver = new dns.Resolver()

export async function checkTxtRecord(
  hostname: string,
  expectedValue: string
): Promise<{ found: boolean; records: string[] }> {
  return new Promise((resolve) => {
    dnsResolver.resolveTxt(hostname, (err, records) => {
      if (err) {
        resolve({ found: false, records: [] })
        return
      }

      const flatRecords = records.map((r) => r.join(""))
      const found = flatRecords.some((r) => r === expectedValue)

      resolve({ found, records: flatRecords })
    })
  })
}

export async function checkTxtRecordPublic(
  hostname: string,
  expectedValue: string
): Promise<{ found: boolean; records: string[] }> {
  const publicResolver = new dns.Resolver()
  publicResolver.setServers(["8.8.8.8", "1.1.1.1"])

  return new Promise((resolve) => {
    publicResolver.resolveTxt(hostname, (err, records) => {
      if (err) {
        resolve({ found: false, records: [] })
        return
      }

      const flatRecords = records.map((r) => r.join(""))
      const found = flatRecords.some((r) => r === expectedValue)

      resolve({ found, records: flatRecords })
    })
  })
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
