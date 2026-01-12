# E2E Testing for Igne

## Overview

This project uses Playwright for end-to-end testing with Tauri WebDriver.

## Platform Support

| Platform | E2E Tests | Notes |
|----------|-----------|-------|
| Linux | Full Support | Tauri WebDriver works with WebKitWebDriver |
| Windows | Full Support | Requires msedgedriver |
| macOS | Limited | No WebDriver support - Tauri uses WKWebView which has no driver |

## Running Tests

### Local Development (macOS)

Unit tests work locally:

```bash
# Run unit tests
npm run test:run

# Open Vitest UI
npm run test:ui
```

### E2E Tests

E2E tests require Tauri WebDriver which only works on Linux/Windows. Options:

1. **GitHub Actions** (recommended) - E2E tests run automatically on Linux runners
2. **Linux VM/Container** - Run locally with Linux
3. **Tilt/Docker** - Development environment with Linux

```bash
# This will fail on macOS
npm run test:e2e

# View test results from CI runs
# Check the "Actions" tab in GitHub
```

## CI/CD Setup

E2E tests run on GitHub Actions (Linux runners):

- **Unit tests**: Run on macOS, Linux, Windows
- **E2E tests**: Run on Ubuntu Linux only

See `.github/workflows/e2e-tests.yml` for configuration.

## Test Infrastructure

```
tests/
├── fixtures.ts          # Test page objects and fixtures
├── e2e/
│   ├── basic-flows.spec.ts   # 16 tests - file operations
│   └── widgets.spec.ts       # 27 tests - widgets (tags, wikilinks, tasks)
└── vitest.config.ts
```

## Writing Tests

Use the `AppPage` fixture for common operations:

```typescript
import { test, expect } from './fixtures';

test.describe('Wikilinks', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('test.md');
  });

  test('wikilink navigation', async ({ app }) => {
    await app.editor.setCodeMirrorContent('See [[Target]] for info');
    await app.page.keyboard.press('End');  // Move cursor away
    await app.editor.waitForWikilinkWidget();
    expect(await app.editor.hasWikilink('Target')).toBe(true);
  });
});
```

## Troubleshooting

### "Port 1420 already in use"
```bash
pkill -f vite
# or
lsof -i :1420 | awk 'NR>1 {print $2}' | xargs kill -9
```

### Tauri WebDriver issues on Linux
```bash
# Check WebKitWebDriver
which WebKitWebDriver

# Install if missing (Debian/Ubuntu)
sudo apt-get install webkit2gtk-driver

# Install tauri-driver
cargo install tauri-driver --locked
```
