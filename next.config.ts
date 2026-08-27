import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Style-lint (unused vars, unescaped entities) shouldn't fail the production build.
  // TypeScript type-checking stays on — that's the real correctness gate. Run `next lint` in CI.
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@valkey/valkey-glide': false,
    };
    return config;
  },
};

export default nextConfig;
