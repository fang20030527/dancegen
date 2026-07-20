import type { CustomTemplateMime } from "./types";
import { CustomTemplateValidationError } from "./validation.ts";

const mp4FileTypeBox = [0x66, 0x74, 0x79, 0x70] as const;
const webmEbmlHeader = [0x1a, 0x45, 0xdf, 0xa3] as const;

export function detectVideoMime(prefix: Uint8Array): CustomTemplateMime {
  if (prefix.byteLength >= 8 && matchesAt(prefix, mp4FileTypeBox, 4)) {
    return "video/mp4";
  }

  if (matchesAt(prefix, webmEbmlHeader, 0)) {
    return "video/webm";
  }

  throw new CustomTemplateValidationError("INVALID_FORMAT");
}

function matchesAt(
  bytes: Uint8Array,
  signature: readonly number[],
  offset: number,
): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}
