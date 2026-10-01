/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve AVIF first (much smaller for photography), WebP as the fallback.
    formats: ["image/avif", "image/webp"],
    // The hero photo is a 1600px-wide 4:3 master. Cap the generated variants so
    // we never ask the optimiser to upscale it.
    deviceSizes: [360, 480, 640, 828, 1080, 1200, 1600, 1920, 2048],
  },
}

module.exports = nextConfig
