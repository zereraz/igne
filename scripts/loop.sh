#!/bin/bash
# Ralph loop script using GLM (Z.ai)
# SAFETY: Directory scoping + dangerously-skip-permissions (safe within project)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TASK_FILE="$PROJECT_ROOT/work/task.txt"
OUTPUT_DIR="$PROJECT_ROOT/work/outputs"
LOG_FILE="$PROJECT_ROOT/logs/loop.log"

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check for stop file
check_stop() {
    if [ -f "$PROJECT_ROOT/work/stop" ]; then
        log "Stop file detected, exiting"
        rm -f "$PROJECT_ROOT/work/stop"
        exit 0
    fi
}

iteration=1
while true; do
    check_stop

    # Check if task is already marked as complete before running
    if grep -qE '<promise>COMPLETE</promise>|ALL_TASKS_COMPLETE' "$TASK_FILE"; then
        log "Task file already marked as complete. Exiting loop."
        break
    fi

    # Generate session ID BEFORE running so we can tail it
    SESSION_ID=$(uuidgen 2>/dev/null || echo "session-$iteration-$$")
    OUTPUT_FILE="$OUTPUT_DIR/output-$iteration.json"

    log "=== Iteration $iteration ==="
    log "Session ID: $SESSION_ID"
    log "Output: $OUTPUT_FILE"

    # Path to Claude session log
    SESSION_LOG="$HOME/.claude/projects/-Users-zereraz-Code-Zereraz-igne/$SESSION_ID.jsonl"

    # Start log viewer in background
    log "Starting log viewer..."
    claude-log-viewer "$SESSION_LOG" 2>/dev/null &
    TAIL_PID=$!

    # Run Claude with GLM directly (no cz wrapper)
    GEMINI_API_KEY="" \
    GOOGLE_CLOUD_PROJECT="" \
    GOOGLE_APPLICATION_CREDENTIALS="" \
    CLAUDE_CODE_USE_VERTEX="" \
    CLOUD_ML_REGION="" \
    GOOGLE_VERTEX_PROJECT="" \
    ANTHROPIC_VERTEX_PROJECT_ID="" \
    ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic" \
    ANTHROPIC_AUTH_TOKEN="$GLM_API_KEY" \
    DISABLE_INTERLEAVED_THINKING=true \
    API_TIMEOUT_MS=600000 \
    BASH_MAX_TIMEOUT_MS=300000 \
    CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1 \
    claude -p "$(cat "$TASK_FILE")" \
        --output-format json \
        --add-dir "$PROJECT_ROOT" \
        --dangerously-skip-permissions \
        --session-id "$SESSION_ID" \
        2>&1 | tee "$OUTPUT_FILE"

    # Kill the log viewer process
    kill $TAIL_PID 2>/dev/null || true

    # Check for completion signals (multiple formats for flexibility)
    if grep -qE '<promise>COMPLETE</promise>|ALL_TASKS_COMPLETE|ALL_PHASES_COMPLETE' "$OUTPUT_FILE"; then
        log "All tasks complete! Exiting loop."
        break
    fi

    # Also check the plan file for completion marker
    PLAN_FILE="$PROJECT_ROOT/.claude/plans/"*.md
    if [ -f "$PLAN_FILE" ] && grep -q "✅ ALL_PHASES_COMPLETE" "$PLAN_FILE"; then
        log "Plan marked as complete. Exiting loop."
        break
    fi

    # Check max iterations
    if [ $iteration -ge 250 ]; then
        log "Max iterations (250) reached"
        break
    fi

    iteration=$((iteration + 1))
    sleep 2
done
