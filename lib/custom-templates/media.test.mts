import assert from "node:assert/strict";
import test from "node:test";

import { detectVideoMime } from "./media.ts";

test("detects MP4 ftyp and WebM EBML signatures", () => {
  assert.equal(
    detectVideoMime(Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])),
    "video/mp4",
  );
  assert.equal(
    detectVideoMime(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3])),
    "video/webm",
  );
  assert.throws(() => detectVideoMime(Uint8Array.from([1, 2, 3, 4])));
});
