// tcp-dns-bootstrap.js — loaded via --require, runs BEFORE net.js or any other module
// CRITICAL: We must patch dns.lookup BEFORE requiring net, because net.js
// destructures `const { lookup } = require('dns')` at load time.

const dns = require('dns');

// 1. Patch dns.lookup FIRST (before net.js loads)
const _originalLookup = dns.lookup;

const cache = new Map();
const DNS_SERVERS = ['10.1.0.161', '10.1.0.18', '8.8.8.8', '1.1.1.1'];

function buildQuery(name, type) {
  const labels = name.replace(/\.$/, '').split('.');
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x1234, 0);
  header.writeUInt16BE(0x0100, 2);
  header.writeUInt16BE(1, 4);
  const parts = [header];
  for (const label of labels) {
    const buf = Buffer.alloc(1 + label.length);
    buf.writeUInt8(label.length, 0);
    buf.write(label, 1, 'ascii');
    parts.push(buf);
  }
  parts.push(Buffer.alloc(1));
  const q = Buffer.alloc(4);
  q.writeUInt16BE(type, 0);
  q.writeUInt16BE(1, 2);
  parts.push(q);
  return Buffer.concat(parts);
}

function parseResponse(buf) {
  if (buf.length < 12) return [];
  const ancount = buf.readUInt16BE(6);
  let off = 12;
  for (let i = 0; i < buf.readUInt16BE(4); i++) {
    while (off < buf.length && buf[off] !== 0) {
      if (buf[off] >= 192) { off += 2; break; }
      off += 1 + buf[off];
    }
    if (off < buf.length && buf[off] === 0) off++;
    off += 4;
  }
  const addrs = [];
  for (let i = 0; i < ancount; i++) {
    while (off < buf.length && buf[off] !== 0) {
      if (buf[off] >= 192) { off += 2; break; }
      off += 1 + buf[off];
    }
    if (off < buf.length && buf[off] === 0) off++;
    if (off + 10 > buf.length) break;
    const type = buf.readUInt16BE(off);
    const rdlen = buf.readUInt16BE(off + 8);
    off += 10;
    if (off + rdlen > buf.length) break;
    if (type === 1 && rdlen === 4) {
      addrs.push(`${buf[off]}.${buf[off+1]}.${buf[off+2]}.${buf[off+3]}`);
    }
    off += rdlen;
  }
  return addrs;
}

function queryTcp(server, query) {
  return new Promise((resolve, reject) => {
    // Use raw net.createConnection with the patched dns.lookup
    const net = require('net');
    const timer = setTimeout(() => { s.destroy(); reject(new Error('tcp dns timeout')); }, 3000);
    const s = net.createConnection({ host: server, port: 53, family: 4 }, () => {
      const len = Buffer.alloc(2);
      len.writeUInt16BE(query.length, 0);
      s.write(Buffer.concat([len, query]));
    });
    let resp = Buffer.alloc(0);
    let expect = -1;
    s.on('data', (c) => {
      resp = Buffer.concat([resp, c]);
      if (expect < 0 && resp.length >= 2) expect = resp.readUInt16BE(0);
      if (expect >= 0 && resp.length >= 2 + expect) {
        clearTimeout(timer);
        s.destroy();
        resolve(resp.subarray(2, 2 + expect));
      }
    });
    s.on('error', (e) => { clearTimeout(timer); reject(e); });
    s.on('close', () => { clearTimeout(timer); reject(new Error('closed')); });
  });
}

async function resolveA(hostname) {
  const query = buildQuery(hostname, 1);
  for (const srv of DNS_SERVERS) {
    try {
      const resp = await queryTcp(srv, query);
      const addrs = parseResponse(resp);
      if (addrs.length > 0) return addrs;
    } catch {}
  }
  return null;
}

// The patched lookup: checks cache first, resolves async via TCP if miss
dns.lookup = function patchedDnsLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const cached = cache.get(hostname);
  if (cached) {
    const fam = (options && options.family) || 4;
    if (options && options.all) {
      callback(null, cached.map((a) => ({ address: a, family: 4 })));
    } else {
      callback(null, cached[0], 4);
    }
    return;
  }

  // Resolve async via TCP, populate cache
  resolveA(hostname).then((addrs) => {
    if (addrs && addrs.length > 0) {
      cache.set(hostname, addrs);
      if (options && options.all) {
        callback(null, addrs.map((a) => ({ address: a, family: 4 })));
      } else {
        callback(null, addrs[0], 4);
      }
    } else {
      // Fallback to original UDP lookup
      _originalLookup.call(dns, hostname, options, callback);
    }
  }).catch(() => {
    _originalLookup.call(dns, hostname, options, callback);
  });
};

// 2. NOW require net (it will destructure our patched dns.lookup)
const net = require('net');

// 3. Eagerly resolve known hostnames at startup (they'll be cached by the time acme-client needs them)
const eagerHosts = ['acme-v02.api.letsencrypt.org', 'letsencrypt.org'];
for (const h of eagerHosts) {
  resolveA(h).then((addrs) => {
    if (addrs && addrs.length > 0) {
      cache.set(h, addrs);
      console.log(`[tcp-dns] Pre-resolved ${h} → ${addrs[0]}`);
    }
  }).catch(() => {});
}

console.log('[tcp-dns-bootstrap] Patched dns.lookup for TCP DNS resolution');
