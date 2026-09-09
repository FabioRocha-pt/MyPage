import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // sharp runs in the Node runtime only; keep it out of the bundle graph.
  serverExternalPackages: ["sharp", "@prisma/client"],
  experimental: {
    // Uploads go through route handlers that stream to disk; the default 1 MB
    // body limit only applies to Server Actions, which we do not use for files.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default config;
