import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Configuración de Playwright para ReadHub.
 * - Reportes HTML + anotaciones en el PR (reporter "github") en CI.
 * - Screenshots y video solo cuando una prueba falla.
 * - Levanta la app con `next dev` (reutiliza el servidor en local).
 */
export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Márgenes amplios: en dev la primera navegación compila la ruta y la
  // autenticación depende de la latencia de red.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: CI
    ? [["github"], ["html", { outputFolder: "e2e/playwright-report", open: "never" }], ["list"]]
    : [["html", { outputFolder: "e2e/playwright-report", open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
