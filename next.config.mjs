/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase timeout for long-running AI operations
  experimental: {
    proxyTimeout: 300000, // 5 minutes in milliseconds
  },
  // Output standalone for optimized production builds
  output: 'standalone',
  async rewrites() {
    // Use API_URL for server-side rewrites (set in Cloud Run)
    // For local development with docker-compose, use backend:3001
    // For local development without docker, use localhost:3001
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    console.log('[Next.js Rewrites] Using API URL:', apiUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
