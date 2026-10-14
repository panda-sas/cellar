import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // ponytail: frame-ancestors only. A full script/style CSP needs per-request nonces
  // for Next's inline scripts plus 'wasm-unsafe-eval' for RDKit.js — its own change.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // @structflo/components ships raw .tsx with no build step — Next compiles it.
  transpilePackages: ["@structflo/components"],
  turbopack: {
    resolveAlias: {
      // RDKit.js WASM has `require('fs')` in its Node.js detection path.
      // Stub it out for client bundles — the WASM loader uses fetch, not fs.
      fs: "./src/shared/lib/rdkit/empty-module.ts",
    },
  },
};

export default nextConfig;
