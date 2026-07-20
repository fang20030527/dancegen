import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteCustomTemplate,
  getCustomTemplateState,
  importCustomTemplate,
  uploadCustomTemplate,
} from "../../components/generator/custom-template-client.ts";

test("uploads directly with the prepared headers, reports progress, then finalizes", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const progress: number[] = [];
  const xhr = new FakeXmlHttpRequest();
  const request = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith("/prepare")) {
      return Response.json({
        ingestId: "16b2de68-3857-4916-a4a6-27581a75093e",
        uploadUrl: "https://uploads.example.test/signed-put",
        uploadHeaders: {
          "Content-Type": "video/mp4",
          "x-amz-checksum-sha256": "checksum",
        },
        expiresInSeconds: 600,
      }, { status: 201 });
    }

    return Response.json({
      id: "16b2de68-3857-4916-a4a6-27581a75093e",
      state: "ready",
      mimeType: "video/mp4",
      sizeBytes: 4,
      durationSeconds: 5,
      expiresAt: "2026-07-22T00:00:00.000Z",
      reasonCode: null,
      customTemplateToken: "one-time-token",
    }, { status: 202 });
  };

  const resultPromise = uploadCustomTemplate({
    file: new File([new Uint8Array([0, 1, 2, 3])], "dance.mp4", { type: "video/mp4" }),
    rightsConfirmed: true,
    onProgress: (value) => progress.push(value),
  }, { request, createRequest: () => xhr as unknown as XMLHttpRequest });

  while (!xhr.body) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  xhr.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 4 } as ProgressEvent<EventTarget>);
  xhr.status = 200;
  xhr.onload?.({} as ProgressEvent<EventTarget>);

  const result = await resultPromise;
  assert.deepEqual(xhr.headers, {
    "Content-Type": "video/mp4",
    "x-amz-checksum-sha256": "checksum",
  });
  assert.equal(xhr.method, "PUT");
  assert.equal(xhr.url, "https://uploads.example.test/signed-put");
  assert.equal(xhr.body instanceof File, true);
  assert.deepEqual(progress, [50]);
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /\/finalize$/);
  assert.equal(result.customTemplateToken, "one-time-token");
});

test("loads and removes only the requested owned ingest", async () => {
  const methods: string[] = [];
  const urls: string[] = [];
  const request = async (url: string | URL | Request, init?: RequestInit) => {
    methods.push(init?.method ?? "GET");
    urls.push(String(url));
    return Response.json({
      id: "16b2de68-3857-4916-a4a6-27581a75093e",
      state: init?.method === "DELETE" ? "deleted" : "reviewing",
      mimeType: "video/mp4",
      sizeBytes: 4096,
      durationSeconds: null,
      expiresAt: null,
      reasonCode: null,
    });
  };

  await getCustomTemplateState("16b2de68-3857-4916-a4a6-27581a75093e", undefined, { request });
  await deleteCustomTemplate("16b2de68-3857-4916-a4a6-27581a75093e", { request });

  assert.deepEqual(methods, ["GET", "DELETE"]);
  assert.deepEqual(urls, [
    "/api/templates/custom/16b2de68-3857-4916-a4a6-27581a75093e",
    "/api/templates/custom/16b2de68-3857-4916-a4a6-27581a75093e",
  ]);
});

test("submits a direct video URL only when import is explicitly requested", async () => {
  let capturedBody = "";
  const state = await importCustomTemplate({
    url: "https://media.example.test/dance.webm",
    rightsConfirmed: true,
  }, {
    request: async (_url, init) => {
      capturedBody = String(init?.body);
      return Response.json({
        id: "16b2de68-3857-4916-a4a6-27581a75093e",
        state: "ready",
        mimeType: "video/webm",
        sizeBytes: 4096,
        durationSeconds: 6,
        expiresAt: "2026-07-22T00:00:00.000Z",
        reasonCode: null,
        customTemplateToken: "import-token",
      }, { status: 202 });
    },
  });

  const payload = JSON.parse(capturedBody) as Record<string, unknown>;
  assert.equal(payload.url, "https://media.example.test/dance.webm");
  assert.equal(payload.rightsConfirmed, true);
  assert.equal(typeof payload.idempotencyKey, "string");
  assert.equal(state.customTemplateToken, "import-token");
});

class FakeXmlHttpRequest {
  body: Document | XMLHttpRequestBodyInit | null = null;
  headers: Record<string, string> = {};
  method = "";
  onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
  onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
  onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
  status = 0;
  upload = { onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null };
  url = "";

  abort() {
    this.onabort?.call(this as unknown as XMLHttpRequest, {} as ProgressEvent<EventTarget>);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body?: Document | XMLHttpRequestBodyInit | null) {
    this.body = body ?? null;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
}
