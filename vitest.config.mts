import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // The real package throws outside a React Server environment.
      "server-only": fromRoot("./src/lib/server-only.stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
