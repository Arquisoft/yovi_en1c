import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    server: {
      deps: {
        inline: [/users-service/, /db/],
      },
    },
    testTimeout: 10000,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})


