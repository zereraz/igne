#!/bin/bash
# Tauri E2E Test Setup Script
#
# This script sets up and runs E2E tests for the Tauri app.
#
# Requirements:
# - Linux or Windows (macOS has no WebDriver support)
# - cargo install tauri-driver --locked
# - cargo tauri build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Linux*)
        log_info "Linux detected - Tauri WebDriver supported"
        ;;
    Darwin*)
        log_warn "macOS detected - Tauri WebDriver NOT supported on macOS"
        log_warn "WebDriver requires WebKitWebDriver which is not available on macOS"
        log_warn "Use --dev-mode flag for limited testing with Vite dev server"
        ;;
    MINGW*|CYGWIN*|MSYS*)
        log_info "Windows detected - Tauri WebDriver supported (requires msedgedriver)"
        ;;
esac

# Check for --dev-mode flag
DEV_MODE=false
for arg in "$@"; do
    case $arg in
        --dev-mode)
            DEV_MODE=true
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev-mode    Run tests with Vite dev server (macOS fallback)"
            echo "  --help, -h    Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  CI            Run in CI mode (no interactive prompts)"
            exit 0
            ;;
    esac
done

# Check if tauri-driver is installed
check_tauri_driver() {
    if ! command -v tauri-driver &> /dev/null; then
        log_error "tauri-driver not found. Install with:"
        echo "  cargo install tauri-driver --locked"
        return 1
    fi
    log_info "tauri-driver found: $(which tauri-driver)"
    return 0
}

# Check if Tauri app is built
check_tauri_build() {
    local app_path="./src-tauri/target/release/igne"
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        app_path="./src-tauri/target/release/igne.app"
    fi

    if [ ! -f "$app_path" ] && [ ! -d "$app_path" ]; then
        log_warn "Tauri app not built. Building now..."
        cargo tauri build --quiet
    fi
    log_info "Tauri app built"
    return 0
}

# Get the app binary path
get_app_path() {
    local app_path="./src-tauri/target/release/igne"
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        app_path="./src-tauri/target/release/igne.app/Contents/MacOS/igne"
    elif [[ "$OS_TYPE" == "MINGW"* ]] || [[ "$OS_TYPE" == "MSYS"* ]]; then
        app_path="./src-tauri/target/release/igne.exe"
    fi
    echo "$app_path"
}

# Run tests in WebDriver mode (Linux/Windows)
run_webdriver_tests() {
    local app_path=$(get_app_path)

    log_info "Starting tauri-driver on port 4444..."
    tauri-driver --port 4444 &
    local driver_pid=$!

    # Give tauri-driver time to start
    sleep 2

    # Function to cleanup on exit
    cleanup() {
        log_info "Cleaning up..."
        if kill -0 $driver_pid 2>/dev/null; then
            kill $driver_pid 2>/dev/null || true
        fi
    }
    trap cleanup EXIT

    log_info "Running Playwright tests..."
    npx playwright test --project=tauri "$@"
}

# Run tests in dev mode (Vite dev server + limited Tauri APIs)
run_dev_mode_tests() {
    local DEV_PORT=1420

    log_info "Starting Vite dev server on port $DEV_PORT..."
    bun run dev &
    local dev_pid=$!

    # Wait for dev server to start
    local max_attempts=30
    local attempt=0
    while ! curl -s http://localhost:$DEV_PORT > /dev/null 2>&1; do
        sleep 1
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            log_error "Dev server failed to start"
            kill $dev_pid 2>/dev/null || true
            exit 1
        fi
    done

    log_info "Vite dev server started on port $DEV_PORT"

    # Function to cleanup on exit
    cleanup() {
        log_info "Cleaning up..."
        kill $dev_pid 2>/dev/null || true
    }
    trap cleanup EXIT

    log_info "Running Playwright tests in dev mode..."
    log_warn "Note: Some Tauri-specific APIs will not be available in dev mode"

    # Use dev project for HTTP-based testing
    npx playwright test --project=dev --reporter=line "$@"
}

# Main logic
main() {
    # Filter out --dev-mode from arguments before passing to test functions
    local test_args=()
    for arg in "$@"; do
        case $arg in
            --dev-mode|--help|-h)
                # Skip these as they're handled separately
                ;;
            *)
                test_args+=("$arg")
                ;;
        esac
    done

    if [ "$DEV_MODE" = true ]; then
        run_dev_mode_tests "${test_args[@]}"
    else
        # Check prerequisites for WebDriver mode
        if ! check_tauri_driver; then
            log_warn "Falling back to dev mode..."
            run_dev_mode_tests "${test_args[@]}"
            return $?
        fi

        check_tauri_build
        run_webdriver_tests "${test_args[@]}"
    fi
}

main "$@"
