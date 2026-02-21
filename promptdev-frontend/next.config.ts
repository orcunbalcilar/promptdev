import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching potential issues
  reactStrictMode: true,

  // Enable React Compiler for automatic memoization optimization
  reactCompiler: true,

  // Force Copilot packages to be treated as external (they use node:sqlite at runtime)
  serverExternalPackages: ["@github/copilot-sdk", "@github/copilot"],

  // Standalone output for Podman/Docker container deployments
  output: "standalone",

  // Image optimization: allow external avatar sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Include external packages in standalone output
  // Required for packages in serverExternalPackages that need node_modules at runtime
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/@github/copilot-sdk/**/*",
      "node_modules/@github/copilot/**/*",
    ],
  },
};

export default nextConfig;
