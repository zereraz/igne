#!/bin/bash
# Run the autonomous loop in a worktree
# Usage: ./scripts/run-loop.sh <phase-name>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/../igne-worktrees"

PHASE_NAME="${1:-}"

if [ -z "$PHASE_NAME" ]; then
  echo "Usage: $0 <phase-name>"
  echo ""
  echo "Examples:"
  echo "  $0 phase-d    # Run loop in phase-d worktree"
  echo ""
  echo "Available worktrees:"
  git worktree list
  exit 1
fi

WORKTREE_PATH="$WORKTREES_DIR/$PHASE_NAME"

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
  echo "Error: Worktree not found: $WORKTREE_PATH"
  echo ""
  echo "Available worktrees:"
  git worktree list
  exit 1
fi

# Check if GLM API key is set
if [ -z "${GLM_API_KEY:-}" ]; then
  echo "Error: GLM_API_KEY environment variable not set"
  echo ""
  echo "Set it with:"
  echo "  export GLM_API_KEY='your-key-here'"
  exit 1
fi

# Check if loop script exists
LOOP_SCRIPT="$WORKTREE_PATH/scripts/loop.sh"
if [ ! -f "$LOOP_SCRIPT" ]; then
  echo "Error: Loop script not found: $LOOP_SCRIPT"
  exit 1
fi

# Check if task file exists
TASK_FILE="$WORKTREE_PATH/work/task.txt"
if [ ! -f "$TASK_FILE" ]; then
  echo "Error: Task file not found: $TASK_FILE"
  exit 1
fi

echo "=== Starting Loop: $PHASE_NAME ==="
echo ""
echo "Worktree: $WORKTREE_PATH"
echo "Task file: $TASK_FILE"
echo "Loop script: $LOOP_SCRIPT"
echo ""
echo "To stop the loop gracefully:"
echo "  touch $WORKTREE_PATH/work/stop"
echo ""
echo "---"
echo ""

# Run the loop
cd "$WORKTREE_PATH"
exec "$LOOP_SCRIPT"
