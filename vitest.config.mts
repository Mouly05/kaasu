import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e/**", ".next"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/lib/**/index.ts",
        "src/lib/env.ts",
        "src/lib/env.client.ts",
      ],
      reporter: ["text", "html"],
      thresholds: {
        "src/lib/money.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
