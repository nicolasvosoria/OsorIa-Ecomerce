import { defineConfig } from "vitest/config";

export default defineConfig({
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "node",
    globals: true,
    css: false,
    include: ["tests/docs/**/*.test.ts"],
  },
});
