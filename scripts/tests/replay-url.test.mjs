import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveReplayBaseUrl } from "../../src/lib/replayUrl.mjs";

// AIDE-12: replay requests must not hardcode localhost in production.

test("uses AIDE_APP_URL first and strips trailing slashes", () => {
  const url = resolveReplayBaseUrl({
    AIDE_APP_URL: "https://aide.example.com/",
    NEXTAUTH_URL: "https://other.example.com",
    NODE_ENV: "production",
  });
  assert.equal(url, "https://aide.example.com");
});

test("falls back to NEXTAUTH_URL then NEXT_PUBLIC_APP_URL", () => {
  assert.equal(
    resolveReplayBaseUrl({ NEXTAUTH_URL: "https://aide.omixsystems.store", NODE_ENV: "production" }),
    "https://aide.omixsystems.store"
  );
  assert.equal(
    resolveReplayBaseUrl({ NEXT_PUBLIC_APP_URL: "https://app.example.com", NODE_ENV: "production" }),
    "https://app.example.com"
  );
});

test("derives https from VERCEL_URL", () => {
  assert.equal(
    resolveReplayBaseUrl({ VERCEL_URL: "aide-abc123.vercel.app", NODE_ENV: "production" }),
    "https://aide-abc123.vercel.app"
  );
});

test("production without configuration throws", () => {
  assert.throws(() => resolveReplayBaseUrl({ NODE_ENV: "production" }), /must be set/);
});

test("development falls back to localhost", () => {
  assert.equal(resolveReplayBaseUrl({ NODE_ENV: "development" }), "http://localhost:3000");
});

test("blank values are ignored", () => {
  assert.equal(
    resolveReplayBaseUrl({ AIDE_APP_URL: "  ", NEXTAUTH_URL: "", NODE_ENV: "development" }),
    "http://localhost:3000"
  );
});
