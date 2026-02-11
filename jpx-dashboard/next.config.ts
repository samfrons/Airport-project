import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Set the correct workspace root
  outputFileTracingRoot: path.join(__dirname),

  // Output configuration for Vercel standalone mode
  output: 'standalone',

  // Prevent Next.js from webpack-bundling sql.js (CJS + WASM doesn't survive bundling)
  serverExternalPackages: ['sql.js'],

  // Ensure data directory is included in the build
  outputFileTracingIncludes: {
    '/api/*': ['./data/**/*'],
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {},
};

export default nextConfig;
