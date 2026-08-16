/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["youtube-dl-exec"],
  outputFileTracingIncludes: {
    "/api/playlists": ["./node_modules/youtube-dl-exec/**"],
  },
};

export default nextConfig;