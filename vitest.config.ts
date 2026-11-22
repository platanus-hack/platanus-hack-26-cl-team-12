import { defineConfig } from "vitest/config";

// Un solo runner para todo el monorepo JS: los paquetes @puente/* exportan .ts sin build.
export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.{ts,tsx}", "apps/*/test/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
