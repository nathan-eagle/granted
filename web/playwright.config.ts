import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
  },
})
