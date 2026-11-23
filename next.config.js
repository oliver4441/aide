const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    // Serve AVIF first (much smaller for photography), WebP as the fallback.
    formats: ["image/avif", "image/webp"],
    // The hero photo is a 1600px-wide 4:3 master. Cap the generated variants at
    // that width so we never ask the optimiser to upscale it (Next's defaults
    // include 1920 and 2048, which would have blown it up).
    // 1600 is also a divisor of common viewport widths, so `sizes="100vw"`
    // still resolves to an exact variant rather than a wasted near-miss.
    deviceSizes: [360, 480, 640, 828, 1080, 1200, 1600],
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "omix-systems",
  project: process.env.SENTRY_PROJECT || "aide",
  // Suppress Sentry's build-time logs.
  silent: true,
  // Upload source maps for readable stack traces; requires SENTRY_AUTH_TOKEN.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});