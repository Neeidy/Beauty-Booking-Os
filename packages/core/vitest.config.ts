import { defineConfig } from "vitest/config";
import { resolve } from "path";

const SHARED_MODULES = resolve(__dirname, "../shared/node_modules");

export default defineConfig({
  resolve: {
    alias: {
      "@beauty-booking/shared": resolve(__dirname, "../shared/src/index.ts"),
      "@beauty-booking/config": resolve(__dirname, "../config/src/index.ts"),
      "@beauty-booking/followup-agent": resolve(__dirname, "../agents/followup-agent/index.ts"),
      "@beauty-booking/content-agent": resolve(__dirname, "../agents/content-agent/index.ts"),
      // DB is mocked in tests — alias points to src for type resolution only
      "@beauty-booking/db": resolve(__dirname, "../db/src/index.ts"),
      "zod": resolve(SHARED_MODULES, "zod"),
      "@anthropic-ai/sdk": resolve(SHARED_MODULES, "@anthropic-ai/sdk"),
      // DB runtime deps — mock prevents actual connections
      "postgres": resolve(__dirname, "__mocks__/postgres.ts"),
      "drizzle-orm/postgres-js": resolve(__dirname, "__mocks__/drizzle.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
