import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest para la app web. Solo pruebas de lógica pura (validators, utils);
 * los flujos de UI se cubren con Playwright (e2e/), que se excluye aquí para no
 * duplicar pruebas entre frameworks.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "services/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["lib/**/*.ts", "services/**/*.ts"],
    },
  },
});
