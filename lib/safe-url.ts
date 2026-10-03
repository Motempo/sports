/**
 * Literal URL and IP checks for article fetches.
 *
 * DNS resolution and redirect following live in `safe-http.ts` so this module
 * stays free of Node network APIs (it is imported by client components via
 * `news-media.ts`).
 */

const BLOCKED_HOST_NAMES = new Set(["localhost", "metadata", "metadata.google.internal"]);

/** Strip brackets and a trailing DNS root dot. `URL.hostname` keeps both for some hosts. */
export function normalizeHost(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  while (host.endsWith(".")) host = host.slice(0, -1);
  return host;
}

function parseIpv4Part(part: string): number | null {
  if (part.length === 0 || part.length > 16) return null;
  let text = part;
  let base = 10;
  if (/^0x[0-9a-f]+$/i.test(part)) {
    base = 16;
    text = part.slice(2);
  } else if (/^0[0-7]+$/.test(part)) {
    base = 8;
    text = part;
  } else if (!/^[0-9]+$/.test(part)) {
    return null;
  }
  const value = Number.parseInt(text, base);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * inet_aton / WHATWG IPv4 parser: decimal, octal (`0177`), hex (`0x7f`),
 * and 1–4 part forms (`127.1`, `2130706433`).
 */
function parseIpv4(host: string): number | null {
  if (!host || host.includes(":")) return null;
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    const value = parseIpv4Part(part);
    if (value === null) return null;
    nums.push(value);
  }
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i]! > 255) return null;
  }
  const lastMax = 256 ** (5 - nums.length) - 1;
  if (nums[nums.length - 1]! > lastMax) return null;

  let value = 0;
  if (nums.length === 1) value = nums[0]!;
  else if (nums.length === 2) value = nums[0]! * 2 ** 24 + nums[1]!;
  else if (nums.length === 3) value = nums[0]! * 2 ** 24 + nums[1]! * 2 ** 16 + nums[2]!;
  else value = nums[0]! * 2 ** 24 + nums[1]! * 2 ** 16 + nums[2]! * 2 ** 8 + nums[3]!;

  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return null;
  return value;
}

function isCanonicalIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
}

function isOddNumericIpv4(host: string): boolean {
  if (host.includes(":")) return false;
  if (parseIpv4(host) === null) return false;
  return !isCanonicalIpv4(host);
}

function isBlockedIpv4Number(value: number): boolean {
  const a = (value >>> 24) & 0xff;
  const b = (value >>> 16) & 0xff;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // Multicast (224/4) and reserved (240/4), including 255.255.255.255.
  if (a >= 224) return true;
  return false;
}

/** Parse an IPv6 address, including a dotted IPv4 tail, into 16 bytes. */
function parseIpv6(input: string): Uint8Array | null {
  let host = normalizeHost(input);
  if (!host || host.includes("%")) return null;

  if (host.includes(".")) {
    const idx = host.lastIndexOf(":");
    if (idx === -1) return null;
    const v4 = parseIpv4(host.slice(idx + 1));
    if (v4 === null) return null;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    host = `${host.slice(0, idx + 1)}${hi}:${lo}`;
  }

  const halves = host.split("::");
  if (halves.length > 2) return null;

  const parseSide = (side: string): number[] | null => {
    if (side === "") return [];
    const parts = side.split(":");
    const nums: number[] = [];
    for (const part of parts) {
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      nums.push(Number.parseInt(part, 16));
    }
    return nums;
  };

  const left = parseSide(halves[0] ?? "");
  if (!left) return null;
  const compressed = halves.length === 2;
  const right = compressed ? parseSide(halves[1] ?? "") : [];
  if (!right) return null;

  const count = left.length + right.length;
  if (!compressed && count !== 8) return null;
  if (compressed && count >= 8) return null;

  const missing = 8 - count;
  const groups = compressed ? [...left, ...new Array<number>(missing).fill(0), ...right] : left;
  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const group = groups[i]!;
    bytes[i * 2] = (group >> 8) & 0xff;
    bytes[i * 2 + 1] = group & 0xff;
  }
  return bytes;
}

function isZeroRange(bytes: Uint8Array, start: number, length: number): boolean {
  for (let i = 0; i < length; i++) {
    if (bytes[start + i] !== 0) return false;
  }
  return true;
}

function embeddedIpv4Blocked(bytes: Uint8Array, offset: number): boolean {
  const value =
    (bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
  return isBlockedIpv4Number(value >>> 0);
}

function isBlockedIpv6(bytes: Uint8Array): boolean {
  // Unspecified `::` and loopback `::1`.
  if (isZeroRange(bytes, 0, 15) && bytes[15]! <= 1) return true;
  // Unique local fc00::/7.
  if ((bytes[0]! & 0xfe) === 0xfc) return true;
  // Link-local fe80::/10.
  if (bytes[0] === 0xfe && (bytes[1]! & 0xc0) === 0x80) return true;
  // Deprecated site-local fec0::/10.
  if (bytes[0] === 0xfe && (bytes[1]! & 0xc0) === 0xc0) return true;
  // Multicast ff00::/8.
  if (bytes[0] === 0xff) return true;
  // IPv4-mapped ::ffff:0:0/96 — refuse the whole prefix (it rewrites IPv4).
  if (isZeroRange(bytes, 0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) return true;
  // IPv4-translated ::ffff:0:0:0/96.
  if (
    isZeroRange(bytes, 0, 8) &&
    bytes[8] === 0xff &&
    bytes[9] === 0xff &&
    bytes[10] === 0 &&
    bytes[11] === 0
  ) {
    return true;
  }
  // IPv4-compatible ::/96 (deprecated). The embedded address must be public.
  if (isZeroRange(bytes, 0, 12)) return embeddedIpv4Blocked(bytes, 12);
  // NAT64 well-known prefix 64:ff9b::/96.
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    isZeroRange(bytes, 4, 8)
  ) {
    return embeddedIpv4Blocked(bytes, 12);
  }
  // 6to4 2002::/16 embeds an IPv4 address in bits 16–48.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return embeddedIpv4Blocked(bytes, 2);
  return false;
}

/** True when `address` is an IP literal we will not connect to. Non-IPs return false. */
export function isBlockedIpAddress(address: string): boolean {
  const host = normalizeHost(address);
  if (!host || host.includes("%")) return true;
  if (!host.includes(":")) {
    const v4 = parseIpv4(host);
    if (v4 === null) return false;
    if (!isCanonicalIpv4(host)) return true;
    return isBlockedIpv4Number(v4);
  }
  const v6 = parseIpv6(host);
  if (!v6) return false;
  return isBlockedIpv6(v6);
}

export function isIpAddress(address: string): boolean {
  const host = normalizeHost(address);
  if (!host || host.includes("%")) return false;
  if (!host.includes(":")) return parseIpv4(host) !== null;
  return parseIpv6(host) !== null;
}

function isBlockedHostname(host: string): boolean {
  if (BLOCKED_HOST_NAMES.has(host)) return true;
  return (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain")
  );
}

/** Host as it appeared in the input, before WHATWG IPv4 normalization. */
function extractRawHost(raw: string): string | null {
  const match = raw.trim().match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i);
  if (!match) return null;
  let authority = match[1] ?? "";
  const at = authority.lastIndexOf("@");
  if (at !== -1) authority = authority.slice(at + 1);
  if (authority.startsWith("[")) {
    const end = authority.indexOf("]");
    if (end === -1) return null;
    return normalizeHost(authority.slice(0, end + 1));
  }
  const colon = authority.lastIndexOf(":");
  if (colon !== -1 && /^\d+$/.test(authority.slice(colon + 1))) {
    authority = authority.slice(0, colon);
  }
  return normalizeHost(authority);
}

/**
 * Sync gate for http(s) URLs. Rejects literal loopback, private, link-local,
 * metadata, unique-local, IPv4-mapped IPv6, and non-canonical numeric IPv4.
 * Hostnames that only *resolve* to those addresses are rejected by
 * `isPublicHttpUrl` before the socket is opened.
 */
export function isSafeHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = normalizeHost(url.hostname);
  if (!host || isBlockedHostname(host)) return false;
  const rawHost = extractRawHost(raw);
  if (rawHost && isOddNumericIpv4(rawHost)) return false;
  if (isIpAddress(host) && isBlockedIpAddress(host)) return false;
  return true;
}
