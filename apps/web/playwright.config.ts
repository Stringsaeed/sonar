import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;
// Point the suite at a deployed stage instead of the local dev server.
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: remote ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    // The narrowest phone we support, in Chromium (WebKit stalls on the Vite dev server).
    { name: "small-phone", use: { ...devices["iPhone 13 Mini"], browserName: "chromium" } },
  ],
  ...(remote
    ? {}
    : {
        webServer: {
          command: `vp run @sonar/worker#db:migrate:local && vp dev --port ${PORT} --strictPort`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
