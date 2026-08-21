import * as net from "net"

const DNS_TCP_TIMEOUT = 5000

function buildDnsQuery(name: string, type: number): Buffer {
  const labels = name.replace(/\.$/, "").split(".")
  const header = Buffer.alloc(12)
  header.writeUInt16BE(0x1234, 0) // Transaction ID
  header.writeUInt16BE(0x0100, 2) // Standard query, recursion desired
  header.writeUInt16BE(1, 4) // 1 question
  header.writeUInt16BE(0, 6) // 0 answers
  header.writeUInt16BE(0, 8) // 0 authority
  header.writeUInt16BE(0, 10) // 0 additional

  const questionBuffers: Buffer[] = []
  for (const label of labels) {
    const buf = Buffer.alloc(1 + label.length)
    buf.writeUInt8(label.length, 0)
    buf.write(label, 1, "ascii")
    questionBuffers.push(buf)
  }
  questionBuffers.push(Buffer.alloc(1)) // root label

  const qname = Buffer.concat(questionBuffers)
  const question = Buffer.alloc(4)
  question.writeUInt16BE(type, 0) // QTYPE
  question.writeUInt16BE(1, 2) // QCLASS IN

  return Buffer.concat([header, qname, question])
}

function parseDnsResponse(buf: Buffer): { rcode: number; answers: { name: string; type: number; data: string }[] } {
  if (buf.length < 12) return { rcode: -1, answers: [] }

  const rcode = buf[3] & 0x0f
  const qdcount = buf.readUInt16BE(4)
  const ancount = buf.readUInt16BE(6)

  let offset = 12

  // Skip questions
  for (let i = 0; i < qdcount; i++) {
    while (offset < buf.length && buf[offset] !== 0) {
      const len = buf[offset]
      if (len >= 192) {
        offset += 2
        break
      }
      offset += 1 + len
    }
    if (offset < buf.length && buf[offset] === 0) offset++
    offset += 4 // QTYPE + QCLASS
  }

  const answers: { name: string; type: number; data: string }[] = []

  for (let i = 0; i < ancount; i++) {
    // Parse name (may use compression pointers)
    const nameStart = offset
    const nameParts: string[] = []
    let jumped = false

    while (offset < buf.length) {
      const len = buf[offset]
      if (len === 0) {
        offset++
        if (!jumped) jumped = true
        break
      }
      if (len >= 192) {
        if (!jumped) offset += 2
        jumped = true
        const ptr = ((len & 0x3f) << 8) | buf[offset]
        offset = ptr
        continue
      }
      offset++
      nameParts.push(buf.toString("ascii", offset, offset + len))
      offset += len
    }

    if (!jumped) offset = nameStart + 1

    if (offset + 10 > buf.length) break

    const type = buf.readUInt16BE(offset)
    const rdlength = buf.readUInt16BE(offset + 8)
    offset += 10

    if (offset + rdlength > buf.length) break

    let data = ""

    if (type === 5) {
      // CNAME - skip, just read next answer
    } else if (type === 16) {
      // TXT
      const txtParts: string[] = []
      let txtOffset = offset
      while (txtOffset < offset + rdlength) {
        const txtLen = buf[txtOffset]
        txtOffset++
        if (txtOffset + txtLen <= offset + rdlength) {
          txtParts.push(buf.toString("utf8", txtOffset, txtOffset + txtLen))
        }
        txtOffset += txtLen
      }
      data = txtParts.join("")
    } else if (type === 1) {
      // A record
      data = `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`
    } else if (type === 28) {
      // AAAA record
      const parts: string[] = []
      for (let j = 0; j < 16; j += 2) {
        parts.push(buf.readUInt16BE(offset + j).toString(16))
      }
      data = parts.join(":")
    }

    if (type === 16 || type === 1 || type === 28) {
      answers.push({ name: nameParts.join("."), type, data })
    }

    offset += rdlength
  }

  return { rcode, answers }
}

function queryTcp(
  server: string,
  query: Buffer,
  port = 53
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error(`TCP DNS timeout for ${server}`))
    }, DNS_TCP_TIMEOUT)

    const socket = net.createConnection({ host: server, port }, () => {
      // DNS over TCP: 2-byte length prefix
      const lenBuf = Buffer.alloc(2)
      lenBuf.writeUInt16BE(query.length, 0)
      socket.write(Buffer.concat([lenBuf, query]))
    })

    let response = Buffer.alloc(0)
    let expectedLen = -1

    socket.on("data", (chunk) => {
      response = Buffer.concat([response, chunk])

      if (expectedLen === -1 && response.length >= 2) {
        expectedLen = response.readUInt16BE(0)
      }

      if (expectedLen !== -1 && response.length >= 2 + expectedLen) {
        clearTimeout(timeout)
        socket.destroy()
        resolve(response.subarray(2, 2 + expectedLen))
      }
    })

    socket.on("error", (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    socket.on("close", () => {
      clearTimeout(timeout)
      if (response.length < 2) {
        reject(new Error(`TCP DNS connection closed before response from ${server}`))
      }
    })
  })
}

export async function queryWithFallback(
  servers: string[],
  name: string,
  type: number,
  port = 53
): Promise<{ rcode: number; answers: { name: string; type: number; data: string }[] }> {
  const query = buildDnsQuery(name, type)
  const errors: Error[] = []

  for (const server of servers) {
    try {
      const response = await queryTcp(server, query, port)
      return parseDnsResponse(response)
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)))
    }
  }

  throw new Error(
    `All TCP DNS servers failed: ${errors.map((e) => e.message).join("; ")}`
  )
}

const CLUSTER_DNS = ["10.1.0.161", "10.1.0.18"]
const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"]
const ALL_DNS = [...CLUSTER_DNS, ...PUBLIC_DNS]

export async function resolveTxtTcp(
  hostname: string,
  servers: string[] = ALL_DNS
): Promise<{ found: boolean; records: string[]; via: string }> {
  const result = await queryWithFallback(servers, hostname, 16)
  const records = result.answers.filter((a) => a.type === 16).map((a) => a.data)
  return { found: records.length > 0, records, via: "tcp" }
}

export async function resolveTxtTcpPublic(
  hostname: string,
  expectedValue: string,
  servers: string[] = PUBLIC_DNS
): Promise<{ found: boolean; records: string[] }> {
  const result = await queryWithFallback(servers, hostname, 16)
  const records = result.answers.filter((a) => a.type === 16).map((a) => a.data)
  const found = records.some((r) => r === expectedValue)
  return { found, records }
}
