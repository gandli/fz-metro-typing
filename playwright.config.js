import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: "http://localhost:5175",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev -- --port 5175 --strictPort",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "mobile-iphone",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium", // 强制用 chromium 模拟 iPhone (避免装 webkit)
      },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
