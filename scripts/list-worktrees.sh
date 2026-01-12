#!/bin/bash
# List all worktrees and their status

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== Igne Worktrees ==="
echo ""
git worktree list
echo ""

# Show status of each worktree
echo "=== Worktree Status ==="
echo ""

while IFS= read -r line; do
  if [[ "$line" =~ ^(.+)\s+([a-f0-9]+)\s+\[([^\]]+)\](.*)$ ]]; then
    WORKTREE_PATH="${BASH_REMATCH[1]}"
    BRANCH="${BASH_REMATCH[3]}"

    if [ "$WORKTREE_PATH" != "$PROJECT_ROOT" ]; then
      echo "📁 $BRANCH"
      echo "   Path: $WORKTREE_PATH"

      # Check for uncommitted changes
      if [ -d "$WORKTREE_PATH" ]; then
        cd "$WORKTREE_PATH"
        CHANGES=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
        if [ "$CHANGES" -gt 0 ]; then
          echo "   ⚠️  $CHANGES uncommitted changes"
        else
          echo "   ✅ Clean"
        fi

        # Check if loop is running
        if [ -f "work/task.txt" ]; then
          TASK_HEAD=$(head -5 work/task.txt)
          echo "   Task: $TASK_HEAD"
        fi
      fi
      echo ""
    fi
  fi
done < <(git worktree list)

echo "=== Commands ==="
echo ""
echo "Create new worktree:"
echo "  ./scripts/create-worktree.sh <phase-name> [base-branch]"
echo ""
echo "Merge worktree:"
echo "  ./scripts/merge-worktree.sh <phase-name>"
echo ""
echo "Remove worktree:"
echo "  git worktree remove <path>"
echo "  git branch -D <branch-name>"
echo ""
