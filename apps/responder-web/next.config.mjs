/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@rescue-link/schema'],

  // survivor-web's client code calls relative `/api/...` paths (see
  // src/lib/offlineQueue.ts and src/components/IncidentStatus.tsx there).
  // This app follows the same convention. If the real `apps/api` service
  // runs on a separate origin during local development, set
  // RESCUE_LINK_API_ORIGIN and requests to /api/* will be proxied there.
  // In production, prefer terminating both under one gateway/domain instead.
  async rewrites() {
    const apiOrigin = process.env.RESCUE_LINK_API_ORIGIN || 'http://localhost:3001';
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
