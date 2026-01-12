import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'tauri',
      use: {
        ...devices['Desktop Chrome'],
        // Tauri WebDriver connects to port 4444
        wsEndpoint: 'http://localhost:4444',
      },
    },
    {
      name: 'dev',
      use: {
        ...devices['Desktop Chrome'],
        // Dev mode uses HTTP instead of WebDriver
      },
    },
  ],
  webServer: {
    command: 'cargo tauri build --quiet 2>/dev/null; tauri-driver --port 4444',
    url: 'http://localhost:4444/status',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});

/**
 * Tauri WebDriver Testing Setup
 *
 * Requirements:
 * 1. Linux or Windows (macOS not supported - no WKWebView driver)
 * 2. Install tauri-driver: cargo install tauri-driver --locked
 * 3. Build the app first: cargo tauri build
 *
 * For CI (GitHub Actions - Linux runners):
 * - Runs automatically on Linux
 * - Full Tauri API testing supported
 *
 * For macOS development:
 * - Use Vite dev server mode (limited Tauri API)
 * - Or run tests on Linux VM/container
 */
