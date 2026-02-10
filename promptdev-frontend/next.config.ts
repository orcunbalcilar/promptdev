import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching potential issues
  reactStrictMode: true,

  // Enable React Compiler for automatic memoization optimization
  reactCompiler: true,

  // Force @github/copilot-sdk to be treated as an external package
  // This prevents Turbopack from bundling it and breaking import.meta.resolve
  serverExternalPackages: ["@github/copilot-sdk"],

  // Standalone output for Docker/Podman container deployments
  output: "standalone",

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
