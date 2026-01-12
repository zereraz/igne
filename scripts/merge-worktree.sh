#!/bin/bash
# Merge a completed worktree back to main
# Usage: ./scripts/merge-worktree.sh <phase-name>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/../igne-worktrees"

PHASE_NAME="${1:-}"

if [ -z "$PHASE_NAME" ]; then
  echo "Usage: $0 <phase-name>"
  echo ""
  echo "Examples:"
  echo "  $0 phase-d    # Merge phase-d into main"
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

echo "=== Merge Worktree: $PHASE_NAME ==="
echo ""
echo "This will:"
echo "  1. Fetch latest changes from origin"
echo "  2. Rebase $PHASE_NAME onto origin/main"
echo "  3. Switch to main branch"
echo "  4. Merge $PHASE_NAME into main"
echo "  5. Push to origin"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted"
  exit 1
fi

cd "$PROJECT_ROOT"

# Step 1: Fetch latest
echo ""
echo "Step 1: Fetching latest from origin..."
git fetch origin

# Step 2: Rebase the worktree branch
echo ""
echo "Step 2: Rebasing $PHASE_NAME onto origin/main..."
cd "$WORKTREE_PATH"
git rebase "origin/main"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Rebase failed! Please resolve conflicts in $WORKTREE_PATH"
  echo ""
  echo "After resolving conflicts:"
  echo "  1. cd $WORKTREE_PATH"
  echo "  2. git add ."
  echo "  3. git rebase --continue"
  echo "  4. Run this script again"
  exit 1
fi

# Step 3: Switch to main
echo ""
echo "Step 3: Switching to main branch..."
cd "$PROJECT_ROOT"
git checkout main

# Step 4: Pull latest main
echo ""
echo "Step 4: Pulling latest main..."
git pull origin main

# Step 5: Merge the worktree branch
echo ""
echo "Step 5: Merging $PHASE_NAME into main..."
git merge "$PHASE_NAME" --no-ff -m "Merge $PHASE_NAME into main

Completes Phase: $PHASE_NAME
Phase details: docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Merge failed! Please resolve conflicts"
  echo ""
  echo "After resolving conflicts:"
  echo "  1. git add ."
  echo "  2. git commit"
  exit 1
fi

# Step 6: Push to origin
echo ""
echo "Step 6: Pushing to origin..."
git push origin main

# Step 7: Clean up worktree (optional)
echo ""
read -p "Remove worktree after successful merge? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Removing worktree..."
  cd "$PROJECT_ROOT"
  git worktree remove "$WORKTREE_PATH"
  git branch -D "$PHASE_NAME"
  echo "✅ Worktree removed"
fi

echo ""
echo "✅ Merge complete!"
echo ""
echo "Next: Create next phase worktree with:"
echo "  ./scripts/create-worktree.sh phase-e main"
