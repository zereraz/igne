#!/bin/bash
# Create a new git worktree for parallel development
# Usage: ./scripts/create-worktree.sh <phase-name> [base-branch]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/../igne-worktrees"

PHASE_NAME="${1:-}"
BASE_BRANCH="${2:-main}"

if [ -z "$PHASE_NAME" ]; then
  echo "Usage: $0 <phase-name> [base-branch]"
  echo ""
  echo "Examples:"
  echo "  $0 phase-d main       # Create phase-d worktree from main"
  echo "  $0 phase-e phase-d    # Create phase-e worktree from phase-d"
  exit 1
fi

# Validate phase name (should start with phase-)
if [[ ! "$PHASE_NAME" =~ ^phase-[a-z]+$ ]]; then
  echo "Error: Phase name must be in format 'phase-X' (e.g., 'phase-d', 'phase-e')"
  exit 1
fi

# Create worktrees directory if it doesn't exist
mkdir -p "$WORKTREES_DIR"

WORKTREE_PATH="$WORKTREES_DIR/$PHASE_NAME"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
  echo "Error: Worktree already exists at $WORKTREE_PATH"
  echo "Remove it first with: git worktree remove $WORKTREE_PATH"
  exit 1
fi

# Check if branch already exists
BRANCH_EXISTS=$(git branch --list "$PHASE_NAME")
if [ -n "$BRANCH_EXISTS" ]; then
  echo "Error: Branch '$PHASE_NAME' already exists"
  echo "Delete it first with: git branch -D $PHASE_NAME"
  exit 1
fi

echo "Creating worktree for $PHASE_NAME..."
echo "  Base branch: $BASE_BRANCH"
echo "  Worktree path: $WORKTREE_PATH"
echo ""

cd "$PROJECT_ROOT"

# Create the worktree
git worktree add "$WORKTREE_PATH" -b "$PHASE_NAME" "$BASE_BRANCH"

# Install dependencies in the worktree
echo "Installing dependencies..."
(cd "$WORKTREE_PATH" && bun install)

# Create work directories
mkdir -p "$WORKTREE_PATH/work/outputs"
mkdir -p "$WORKTREE_PATH/logs"

# Copy loop script
cp "$SCRIPT_DIR/loop.sh" "$WORKTREE_PATH/scripts/loop.sh"
chmod +x "$WORKTREE_PATH/scripts/loop.sh"

# Create task file from template if it doesn't exist
TASK_FILE="$WORKTREE_PATH/work/task.txt"
if [ ! -f "$TASK_FILE" ]; then
  cat > "$TASK_FILE" << EOF
# $PHASE_NAME Tasks

## Phase: $PHASE_NAME

Tasks for $PHASE_NAME will be added here.

## Completion

When all tasks are complete, add this marker:

<promise>COMPLETE</promise>
EOF
  echo "Created template task file at $TASK_FILE"
fi

echo ""
echo "✅ Worktree created successfully!"
echo ""
echo "Worktree location: $WORKTREE_PATH"
echo "Branch: $PHASE_NAME (from $BASE_BRANCH)"
echo ""
echo "Next steps:"
echo "  1. Add tasks to: $TASK_FILE"
echo "  2. Run loop: cd $WORKTREE_PATH && ./scripts/loop.sh"
echo "  3. When complete, merge with: ./scripts/merge-worktree.sh $PHASE_NAME"
