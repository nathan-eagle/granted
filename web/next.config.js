/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  eslint: {
    // TODO: tighten once legacy components are refactored; see lint log in UX2 checklist.
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
