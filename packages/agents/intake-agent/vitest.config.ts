import { defineConfig } from "vitest/config";
import { resolve } from "path";

// pnpm doesn't hoist all packages to root — resolve workspace deps from source
// and third-party deps from the shared node_modules that has them installed.
const SHARED_MODULES = resolve(__dirname, "../../shared/node_modules");

export default defineConfig({
  resolve: {
    alias: {
      "@beauty-booking/shared": resolve(__dirname, "../../shared/src/index.ts"),
      "@beauty-booking/config": resolve(__dirname, "../../config/src/index.ts"),
      // Resolve zod + @anthropic-ai/sdk from shared's node_modules
      "zod": resolve(SHARED_MODULES, "zod"),
      "@anthropic-ai/sdk": resolve(SHARED_MODULES, "@anthropic-ai/sdk"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
