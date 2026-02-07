import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Set the correct workspace root
  outputFileTracingRoot: path.join(__dirname),

  // Output configuration for Vercel standalone mode
  output: 'standalone',

  // Ensure data directory is included in the build
  outputFileTracingIncludes: {
    '/api/*': ['./data/**/*'],
  },

  // Configure webpack for sql.js WASM support
  webpack: (config) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

export default nextConfig;
