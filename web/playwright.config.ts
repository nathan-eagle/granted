import { defineConfig } from "@playwright/test"

const isCI = !!process.env.CI

export default defineConfig({
  testDir: "./tests",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
  },
  webServer: {
    command: "npm run start -- --hostname 0.0.0.0 --port 3000",
    url: "http://127.0.0.1:3000",
    timeout: 120_000,
    reuseExistingServer: !isCI,
  },
})
