import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // These packages use native Node.js bindings (.node files) — keep them
  // out of the webpack bundle and load them directly from node_modules at runtime.
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  // Force Vercel's file tracer to include pdfjs worker files in the Lambda bundle.
  // Without this, pdfjs-dist/legacy/build/pdf.worker.mjs is missing at runtime
  // because it's only referenced as a string (not a static import).
  outputFileTracingIncludes: {
    '/api/upload': ['./node_modules/pdfjs-dist/legacy/build/**'],
  },
};

export default nextConfig;
