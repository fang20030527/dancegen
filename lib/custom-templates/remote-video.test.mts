import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPublicHttpsUrl,
  downloadRemoteVideo,
  isForbiddenAddress,
  RemoteVideoError,
} from "./remote-video.ts";
import { customTemplateLimits } from "./validation.ts";

test("allows canonical HTTPS and rejects credentials, ports, and private IPs", () => {
  assert.equal(assertPublicHttpsUrl("https://cdn.example.com/video.mp4").hostname, "cdn.example.com");
  assert.throws(() => assertPublicHttpsUrl("http://cdn.example.com/video.mp4"));
  assert.throws(() => assertPublicHttpsUrl("https://user:pass@cdn.example.com/video.mp4"));
  assert.throws(() => assertPublicHttpsUrl("https://cdn.example.com:8443/video.mp4"));
  assert.equal(isForbiddenAddress("127.0.0.1"), true);
  assert.equal(isForbiddenAddress("169.254.169.254"), true);
  assert.equal(isForbiddenAddress("10.1.2.3"), true);
  assert.equal(isForbiddenAddress("2606:4700:4700::1111"), false);
});

test("rejects reserved address classes and mapped private IPv4 while allowing public addresses", () => {
  for (const address of [
    "0.0.0.0",
    "100.64.0.1",
    "172.31.255.255",
    "192.0.2.10",
    "198.18.0.1",
    "203.0.113.8",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "::8.8.8.8",
    "64:ff9b::7f00:1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "2002:7f00:1::",
    "3fff::1",
    "4000::1",
    "fec0::1",
  ]) {
    assert.equal(isForbiddenAddress(address), true, address);
  }

  assert.equal(isForbiddenAddress("8.8.8.8"), false);
  assert.equal(isForbiddenAddress("::ffff:8.8.8.8"), false);
  assert.equal(isForbiddenAddress("not-an-ip"), true);
  assert.throws(() => assertPublicHttpsUrl("https://[::ffff:127.0.0.1]/video.mp4"));
});

test("pins validated DNS separately for every redirect target", async () => {
  const lookedUpHosts = [];
  const requestedUrls = [];
  const responses = [
    response(302, [], { location: "https://media.example.net/final.webm" }),
    response(200, [[1, 2], [3, 4]], { "content-type": "video/webm" }),
  ];

  const downloaded = await downloadRemoteVideo("https://cdn.example.com/start", {
    lookup: (async (hostname) => {
      lookedUpHosts.push(hostname);
      return [{ address: hostname === "cdn.example.com" ? "8.8.8.8" : "1.1.1.1", family: 4 }];
    }),
    request: (async (url) => {
      requestedUrls.push(String(url));
      const next = responses.shift();
      if (!next) throw new Error("unexpected request");
      return next;
    }),
  });

  assert.deepEqual(lookedUpHosts, ["cdn.example.com", "media.example.net"]);
  assert.deepEqual(requestedUrls, [
    "https://cdn.example.com/start",
    "https://media.example.net/final.webm",
  ]);
  assert.deepEqual([...downloaded.bytes], [1, 2, 3, 4]);
  assert.equal(downloaded.contentType, "video/webm");
  assert.equal(downloaded.finalUrl.href, "https://media.example.net/final.webm");
});

test("fails before requesting when any resolved address is private", async () => {
  let requested = false;

  await assert.rejects(
    downloadRemoteVideo("https://cdn.example.com/video.mp4", {
      lookup: async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ],
      request: async () => {
        requested = true;
        return response(200, []);
      },
    }),
    (error) => error instanceof RemoteVideoError && error.code === "UNSAFE_URL",
  );

  assert.equal(requested, false);
});

test("allows no more than three redirects and validates each redirect URL", async () => {
  let requests = 0;
  await assert.rejects(
    downloadRemoteVideo("https://cdn.example.com/0", {
      lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      request: async () => {
        requests += 1;
        return response(302, [], { location: `https://cdn.example.com/${requests}` });
      },
    }),
    (error) => error instanceof RemoteVideoError && error.code === "UNSAFE_URL",
  );
  assert.equal(requests, 4);

  await assert.rejects(
    downloadRemoteVideo("https://cdn.example.com/start", {
      lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      request: async () => response(302, [], { location: "https://127.0.0.1/secret" }),
    }),
    (error) => error instanceof RemoteVideoError && error.code === "UNSAFE_URL",
  );
});

test("enforces the 50 MB limit from headers and from the byte stream", async () => {
  const safeLookup = async () => [{ address: "8.8.8.8", family: 4 }];

  await assert.rejects(
    downloadRemoteVideo("https://cdn.example.com/large.mp4", {
      lookup: safeLookup,
      request: async () =>
        response(200, [], { "content-length": String(customTemplateLimits.maxBytes + 1) }),
    }),
    (error) => error instanceof RemoteVideoError && error.code === "FILE_TOO_LARGE",
  );

  await assert.rejects(
    downloadRemoteVideo("https://cdn.example.com/chunked.mp4", {
      lookup: safeLookup,
      request: async () =>
        response(200, [
          new Uint8Array(customTemplateLimits.maxBytes),
          Uint8Array.of(1),
        ]),
    }),
    (error) => error instanceof RemoteVideoError && error.code === "FILE_TOO_LARGE",
  );
});

function response(statusCode, chunks, headers = {}) {
  return {
    statusCode,
    headers,
    body: {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk);
        }
      },
      async dump() {},
    },
  };
}
