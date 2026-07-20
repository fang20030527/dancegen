import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

import { Agent, request as undiciRequest } from "undici";

import { customTemplateLimits } from "./validation.ts";

export class RemoteVideoError extends Error {
  readonly code: "UNSAFE_URL" | "DOWNLOAD_FAILED" | "DOWNLOAD_TIMEOUT" | "FILE_TOO_LARGE";

  constructor(code: "UNSAFE_URL" | "DOWNLOAD_FAILED" | "DOWNLOAD_TIMEOUT" | "FILE_TOO_LARGE") {
    super(code);
    this.name = "RemoteVideoError";
    this.code = code;
  }
}

export function assertPublicHttpsUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new RemoteVideoError("UNSAFE_URL");
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443")
  ) {
    throw new RemoteVideoError("UNSAFE_URL");
  }

  const literalAddress = stripIpv6Brackets(url.hostname);
  if (isIP(literalAddress) !== 0 && isForbiddenAddress(literalAddress)) {
    throw new RemoteVideoError("UNSAFE_URL");
  }

  return url;
}

export function isForbiddenAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return isForbiddenIpv4(parseIpv4(address));
  }

  if (family !== 6) {
    return true;
  }

  const value = parseIpv6(address);
  const mapped = extractMappedIpv4(value);
  if (mapped !== null) {
    return isForbiddenIpv4(mapped);
  }

  if (!inIpv6Range(value, publicIpv6Network, 3)) {
    return true;
  }

  return forbiddenIpv6Ranges.some(([network, prefix]) => inIpv6Range(value, network, prefix));
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

function parseIpv4(address: string): number {
  return address.split(".").reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function isForbiddenIpv4(value: number): boolean {
  return forbiddenIpv4Ranges.some(([network, prefix]) => inIpv4Range(value, network, prefix));
}

function inIpv4Range(value: number, network: number, prefix: number): boolean {
  const shift = 32 - prefix;
  return shift === 32 ? true : value >>> shift === network >>> shift;
}

const forbiddenIpv4Ranges: readonly (readonly [number, number])[] = [
  [parseIpv4("0.0.0.0"), 8],
  [parseIpv4("10.0.0.0"), 8],
  [parseIpv4("100.64.0.0"), 10],
  [parseIpv4("127.0.0.0"), 8],
  [parseIpv4("169.254.0.0"), 16],
  [parseIpv4("172.16.0.0"), 12],
  [parseIpv4("192.0.0.0"), 24],
  [parseIpv4("192.0.2.0"), 24],
  [parseIpv4("192.88.99.0"), 24],
  [parseIpv4("192.168.0.0"), 16],
  [parseIpv4("198.18.0.0"), 15],
  [parseIpv4("198.51.100.0"), 24],
  [parseIpv4("203.0.113.0"), 24],
  [parseIpv4("224.0.0.0"), 4],
  [parseIpv4("240.0.0.0"), 4],
];

function parseIpv6(address: string): Uint8Array {
  const withoutZone = address.split("%", 1)[0];
  const [head, tail, ...extra] = withoutZone.split("::");
  if (extra.length > 0) {
    throw new RemoteVideoError("UNSAFE_URL");
  }

  const headParts = parseIpv6Parts(head);
  const tailParts = tail === undefined ? [] : parseIpv6Parts(tail);
  const missing = 8 - headParts.length - tailParts.length;
  if ((tail === undefined && missing !== 0) || (tail !== undefined && missing < 1)) {
    throw new RemoteVideoError("UNSAFE_URL");
  }

  const parts = [...headParts, ...Array.from({ length: missing }, () => 0), ...tailParts];
  return Uint8Array.from(parts.flatMap((part) => [part >>> 8, part & 0xff]));
}

function parseIpv6Parts(section: string): number[] {
  if (!section) {
    return [];
  }

  const parts = section.split(":");
  const last = parts.at(-1);
  if (last?.includes(".")) {
    if (isIP(last) !== 4) {
      throw new RemoteVideoError("UNSAFE_URL");
    }
    const ipv4 = parseIpv4(last);
    parts.splice(parts.length - 1, 1, (ipv4 >>> 16).toString(16), (ipv4 & 0xffff).toString(16));
  }

  return parts.map((part) => {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) {
      throw new RemoteVideoError("UNSAFE_URL");
    }
    return Number.parseInt(part, 16);
  });
}

function extractMappedIpv4(value: Uint8Array): number | null {
  const isMapped = value.subarray(0, 10).every((byte) => byte === 0) &&
    value[10] === 0xff && value[11] === 0xff;
  if (!isMapped) {
    return null;
  }

  return (
    ((value[12] << 24) >>> 0) +
    (value[13] << 16) +
    (value[14] << 8) +
    value[15]
  ) >>> 0;
}

function inIpv6Range(value: Uint8Array, network: Uint8Array, prefix: number): boolean {
  const wholeBytes = Math.floor(prefix / 8);
  const remainingBits = prefix % 8;

  for (let index = 0; index < wholeBytes; index += 1) {
    if (value[index] !== network[index]) {
      return false;
    }
  }

  if (remainingBits === 0) {
    return true;
  }

  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (value[wholeBytes] & mask) === (network[wholeBytes] & mask);
}

const forbiddenIpv6Ranges: readonly (readonly [Uint8Array, number])[] = [
  [parseIpv6("::"), 128],
  [parseIpv6("::1"), 128],
  [parseIpv6("::"), 96],
  [parseIpv6("64:ff9b::"), 96],
  [parseIpv6("64:ff9b:1::"), 48],
  [parseIpv6("100::"), 64],
  [parseIpv6("2001::"), 23],
  [parseIpv6("2001::"), 32],
  [parseIpv6("2001:2::"), 48],
  [parseIpv6("2001:10::"), 28],
  [parseIpv6("2001:20::"), 28],
  [parseIpv6("2001:db8::"), 32],
  [parseIpv6("2002::"), 16],
  [parseIpv6("3fff::"), 20],
  [parseIpv6("5f00::"), 16],
  [parseIpv6("fc00::"), 7],
  [parseIpv6("fe80::"), 10],
  [parseIpv6("ff00::"), 8],
];

const publicIpv6Network = parseIpv6("2000::");

export type DownloadedRemoteVideo = {
  bytes: Uint8Array;
  contentType: string | null;
  finalUrl: URL;
};

export async function downloadRemoteVideo(
  rawUrl: string,
  dependencies: { lookup?: typeof dnsLookup; request?: typeof undiciRequest } = {},
): Promise<DownloadedRemoteVideo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    return await downloadWithRedirects(rawUrl, dependencies, controller.signal);
  } catch (error) {
    if (error instanceof RemoteVideoError) {
      throw error;
    }

    if (controller.signal.aborted || isUndiciTimeout(error)) {
      throw new RemoteVideoError("DOWNLOAD_TIMEOUT");
    }

    throw new RemoteVideoError("DOWNLOAD_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadWithRedirects(
  rawUrl: string,
  dependencies: { lookup?: typeof dnsLookup; request?: typeof undiciRequest },
  signal: AbortSignal,
): Promise<DownloadedRemoteVideo> {
  const lookup = dependencies.lookup ?? dnsLookup;
  const request = dependencies.request ?? undiciRequest;
  let currentUrl = assertPublicHttpsUrl(rawUrl);

  for (let redirectCount = 0; ; redirectCount += 1) {
    const addresses = await resolvePublicAddresses(currentUrl, lookup);
    const dispatcher = createPinnedDispatcher(addresses);

    try {
      const response = await request(currentUrl, {
        dispatcher,
        headersTimeout: 5_000,
        bodyTimeout: 30_000,
        signal,
      });

      if (isRedirect(response.statusCode)) {
        if (redirectCount >= 3) {
          await closeResponseBody(response.body);
          throw new RemoteVideoError("UNSAFE_URL");
        }

        const location = readSingleHeader(response.headers.location);
        await closeResponseBody(response.body);
        if (!location) {
          throw new RemoteVideoError("DOWNLOAD_FAILED");
        }

        currentUrl = assertPublicHttpsUrl(new URL(location, currentUrl).href);
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        await closeResponseBody(response.body);
        throw new RemoteVideoError("DOWNLOAD_FAILED");
      }

      let bytes: Uint8Array;
      try {
        assertContentLengthAllowed(readSingleHeader(response.headers["content-length"]));
        bytes = await collectBoundedBody(response.body);
      } catch (error) {
        await closeResponseBody(response.body);
        throw error;
      }

      return {
        bytes,
        contentType: readSingleHeader(response.headers["content-type"]),
        finalUrl: currentUrl,
      };
    } finally {
      await dispatcher.close();
    }
  }
}

async function resolvePublicAddresses(
  url: URL,
  lookup: typeof dnsLookup,
): Promise<LookupAddress[]> {
  const hostname = stripIpv6Brackets(url.hostname);

  try {
    const literalFamily = isIP(hostname);
    const addresses = literalFamily
      ? [{ address: hostname, family: literalFamily }]
      : ((await lookup(hostname, { all: true, verbatim: true })) as LookupAddress[]);

    if (
      addresses.length === 0 ||
      addresses.some(
        ({ address, family }) =>
          (family !== 4 && family !== 6) || isForbiddenAddress(address),
      )
    ) {
      throw new RemoteVideoError("UNSAFE_URL");
    }

    return addresses;
  } catch (error) {
    if (error instanceof RemoteVideoError) {
      throw error;
    }
    throw new RemoteVideoError("UNSAFE_URL");
  }
}

function createPinnedDispatcher(addresses: LookupAddress[]): Agent {
  let nextAddress = 0;

  return new Agent({
    connect: {
      timeout: 5_000,
      lookup(_hostname, _options, callback) {
        const target = addresses[nextAddress % addresses.length];
        nextAddress += 1;
        callback(null, target.address, target.family);
      },
    },
  });
}

function isRedirect(statusCode: number): boolean {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function readSingleHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : null;
  }
  return value ?? null;
}

function assertContentLengthAllowed(contentLength: string | null): void {
  if (!contentLength) {
    return;
  }

  if (!/^\d+$/.test(contentLength)) {
    throw new RemoteVideoError("DOWNLOAD_FAILED");
  }

  if (BigInt(contentLength) > BigInt(customTemplateLimits.maxBytes)) {
    throw new RemoteVideoError("FILE_TOO_LARGE");
  }
}

async function collectBoundedBody(body: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;

  for await (const chunk of body) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    if (sizeBytes + bytes.byteLength > customTemplateLimits.maxBytes) {
      throw new RemoteVideoError("FILE_TOO_LARGE");
    }
    chunks.push(bytes);
    sizeBytes += bytes.byteLength;
  }

  const result = new Uint8Array(sizeBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function closeResponseBody(body: {
  destroy?: () => void;
  dump?: () => Promise<void>;
}): Promise<void> {
  if (typeof body.destroy === "function") {
    body.destroy();
    return;
  }

  if (typeof body.dump === "function") {
    await body.dump();
  }
}

function isUndiciTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return ["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"].includes(
    String(error.code),
  );
}
