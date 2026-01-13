#!/bin/bash
# Run multiple phase loops in parallel
# Usage: ./scripts/run-parallel-loops.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/../igne-worktrees"

LOGS_DIR="$PROJECT_ROOT/logs/parallel-runs"
mkdir -p "$LOGS_DIR"

echo "=== Starting Parallel Loops ==="
echo "Logs: $LOGS_DIR"
echo ""

# Phases to run in parallel
PHASES=("a" "c" "e" "g" "h")
PIDS=()

# Start each loop in background
for phase in "${PHASES[@]}"; do
    WORKTREE_PATH="$WORKTREES_DIR/phase-$phase"
    LOOP_LOG="$LOGS_DIR/phase-$phase.log"
    PID_FILE="$LOGS_DIR/phase-$phase.pid"

    echo "Starting Phase $phase..."
    echo "  Worktree: $WORKTREE_PATH"
    echo "  Log: $LOOP_LOG"

    # Start the loop in background, redirecting output
    cd "$WORKTREE_PATH"
    nohup ./scripts/loop.sh > "$LOOP_LOG" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    PIDS+=($PID)

    echo "  PID: $PID"
    echo ""
done

echo "=== All Loops Started ==="
echo ""
echo "Monitoring progress..."
echo ""

# Function to check if a phase is complete
check_complete() {
    local phase=$1
    local task_file="$WORKTREES_DIR/phase-$phase/work/task.txt"

    if grep -q "PROMISE_COMPLETE_TAG" "$task_file" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Monitor all loops
while true; do
    ALL_DONE=true

    for phase in "${PHASES[@]}"; do
        PID_FILE="$LOGS_DIR/phase-$phase.pid"

        # Check if process is still running
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null 2>&1; then
                ALL_DONE=false
            else
                # Process finished, check if complete
                if check_complete "$phase"; then
                    echo "✅ Phase $phase COMPLETE"
                else
                    echo "⚠️  Phase $phase finished but not complete (check logs)"
                fi
                rm -f "$PID_FILE"
            fi
        fi
    done

    if [ "$ALL_DONE" = true ]; then
        break
    fi

    sleep 5
done

echo ""
echo "=== All Phases Complete ==="
echo ""
echo "Check logs:"
echo "  ls -la $LOGS_DIR/"
echo ""
echo "Tail specific log:"
echo "  tail -f $LOGS_DIR/phase-{a,c,e,g,h}.log"
