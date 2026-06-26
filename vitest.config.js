import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.js"],
    exclude: ["test/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["js/**/*.js"],
      exclude: ["js/pretext/**", "js/config.js"],
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 35,
        lines: 40,
      },
    },
    setupFiles: ["test/setup.js"],
  },
  resolve: {
    alias: {
      // Allow tests to import site modules with relative paths
      "@": resolve(__dirname, "js"),
      "@components": resolve(__dirname, "js/components"),
      "@pages": resolve(__dirname, "js/pages"),
      "@utils": resolve(__dirname, "js/utils"),
    },
  },
});
