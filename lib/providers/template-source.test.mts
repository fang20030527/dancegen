import assert from "node:assert/strict";
import test from "node:test";

import { assertProviderSupportsTemplateSource } from "./types.ts";
import { appendDrivingVideo } from "./viggle-render.ts";

test("allows Viggle custom sources and rejects Seedance custom sources", () => {
  const custom = {
    kind: "custom",
    ingestId: "i1",
    objectKey: "custom-template-quarantine/member/i1",
    mimeType: "video/mp4",
  } as const;

  assert.doesNotThrow(() => assertProviderSupportsTemplateSource("viggle-v4-preview", custom));
  assert.throws(
    () => assertProviderSupportsTemplateSource("seedance-2.0-mini-reference-to-video", custom),
    /does not support member-supplied driving videos/,
  );
});

test("allows platform templates for both providers", () => {
  const platform = { kind: "platform", templateId: "hip-hop" } as const;

  assert.doesNotThrow(() => assertProviderSupportsTemplateSource("viggle-v4-preview", platform));
  assert.doesNotThrow(() =>
    assertProviderSupportsTemplateSource("seedance-2.0-mini-reference-to-video", platform),
  );
});

test("loads custom driving-video bytes only through private object storage", async () => {
  const formData = new FormData();
  let requestedObjectKey = "";

  await appendDrivingVideo(
    formData,
    {
      kind: "custom",
      ingestId: "ingest-1",
      objectKey: "custom-template-quarantine/member/ingest-1",
      mimeType: "video/webm",
    },
    {
      async getObjectBytes(objectKey) {
        requestedObjectKey = objectKey;
        return new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
      },
    },
  );

  const drivingVideo = formData.get("driving_video");
  assert.ok(drivingVideo instanceof File);
  assert.equal(requestedObjectKey, "custom-template-quarantine/member/ingest-1");
  assert.equal(drivingVideo.name, "member-driving-video.webm");
  assert.equal(drivingVideo.type, "video/webm");
  assert.deepEqual(new Uint8Array(await drivingVideo.arrayBuffer()), new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
});
