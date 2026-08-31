import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Node-only packages that must never be bundled/traced by webpack (breaks with
// "Can't resolve 'http'/'pg'" and bullmq's broken ESM randomUUID export). Externalizing
// them makes the server emit a plain require() at runtime — including in the
// `instrumentation.ts` layer, which serverExternalPackages does not reach in Next 15.0.
const NODE_ONLY = ["bullmq", "ioredis", "web-push", "postgres", "mysql2", "pg", "https-proxy-agent", "agent-base", "resend", "nodemailer"];

const nextConfig: NextConfig = {
  // Style-lint (unused vars, unescaped entities) shouldn't fail the production build.
  // TypeScript type-checking stays on — that's the real correctness gate. Run `next lint` in CI.
  eslint: { ignoreDuringBuilds: true },

  serverExternalPackages: NODE_ONLY,

  webpack: (config, { isServer, nextRuntime }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@valkey/valkey-glide": false,
    };
    // The Edge compile of instrumentation.ts follows the (Node-only) worker/producer chunks even
    // though register() returns early on Edge. Stub the Node builtins/queues those chunks pull in
    // so the Edge build resolves — they're never executed there.
    if (nextRuntime === "edge") {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false, stream: false, pg: false, http: false, https: false, net: false, tls: false,
        dns: false, fs: false, child_process: false, bullmq: false, ioredis: false, "web-push": false,
        // resend (+ its optional React-email renderer) and nodemailer are server-only; never on edge.
        resend: false, "@react-email/render": false, nodemailer: false,
      };
    }
    if (isServer) {
      const externals = config.externals || [];
      config.externals = [
        ...(Array.isArray(externals) ? externals : [externals]),
        ({ request }: { request?: string }, cb: (err?: unknown, result?: string) => void) =>
          request && NODE_ONLY.includes(request) ? cb(undefined, `commonjs ${request}`) : cb(),
      ];
    } else {
      // These server-only libs must never resolve in a client/fallback bundle. Stub them so
      // bullmq's optional pg transport + node builtins don't emit "can't resolve" warnings.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false, http: false, https: false, net: false, tls: false, dns: false,
        fs: false, child_process: false, bullmq: false, ioredis: false, "web-push": false,
      };
    }
    return config;
  },
};

// Sentry: error monitoring + (when SENTRY_AUTH_TOKEN is set) source-map upload for readable
// stack traces. Org/project match the Sentry SaaS project. Source-map upload is skipped unless
// an auth token is present, so builds succeed without it.
export default withSentryConfig(nextConfig, {
  org: "digicloudify",
  project: "sentry-cordovan-arrow",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  widenClientFileUpload: true,
});
