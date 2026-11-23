import { defineConfig } from "vitest/config";

// Tests run from the repository root, so paths in tests are root-relative.
export default defineConfig({
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "tools/*/test/**/*.test.ts",
      "apps/*/test/**/*.test.{ts,tsx}",
      "test/**/*.test.ts",
    ],
  },
});
