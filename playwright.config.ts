import { defineConfig, devices } from '@playwright/test';

/**
 * Tauri E2E Testing Configuration
 *
 * Three testing modes:
 *
 * 1. TAURI mode (Linux/Windows only):
 *    - Full Tauri API testing via WebDriver
 *    - Requires: tauri-driver, built app
 *    - Run: npx playwright test --project=tauri
 *
 * 2. DEV mode (Any OS):
 *    - Tests run against Vite dev server
 *    - Tauri APIs mocked via @tauri-apps/api/mocks
 *    - Run: npx playwright test --project=dev
 *
 * 3. DOCKER mode (Any OS, full testing):
 *    - Runs Linux container with full Tauri support
 *    - Run: ./scripts/run-e2e-tests.sh --docker
 */

const isDocker = process.env.DOCKER === 'true';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? 'github' : 'html',
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'on-first-retry' : 'off',
  },

  projects: [
    {
      name: 'tauri',
      use: {
        ...devices['Desktop Chrome'],
        // Tauri WebDriver connects via WebSocket
        // The app window is controlled through tauri-driver
        launchOptions: {
          // Connect to tauri-driver WebSocket endpoint
          args: ['--remote-debugging-port=9222'],
        },
      },
      // Only run on Linux/Windows where WebDriver works
      testIgnore: process.platform === 'darwin' ? ['**/*'] : undefined,
    },
    {
      name: 'dev',
      use: {
        ...devices['Desktop Chrome'],
        // Dev mode uses regular browser against Vite server
      },
    },
  ],

  // Web server configuration for dev mode
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },
});
