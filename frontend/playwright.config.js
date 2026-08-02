import { defineConfig, devices } from "@playwright/test";

const projects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  {
    name: "firefox",
    testMatch: /uat\/accessibility-responsive\.spec\.js/,
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    testMatch: /uat\/accessibility-responsive\.spec\.js/,
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "tablet",
    testMatch: /uat\/accessibility-responsive\.spec\.js/,
    use: { ...devices["iPad Pro 11"] },
  },
  {
    name: "mobile-chrome",
    testMatch: /uat\/accessibility-responsive\.spec\.js/,
    use: { ...devices["Pixel 7"] },
  },
  {
    name: "mobile-safari",
    testMatch: /uat\/accessibility-responsive\.spec\.js/,
    use: { ...devices["iPhone 13"] },
  },
];

if (process.env.UAT_EDGE === "true") {
  projects.push({
    name: "edge",
    use: { ...devices["Desktop Chrome"], channel: "msedge" },
  });
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/playwright",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects,
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
