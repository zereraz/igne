# Git Worktree Workflow

This document describes the git worktree setup for parallel development of Igne phases.

## Directory Structure

```
~/Code/Zereraz/
├── igne/                    # Main repository (current phase)
│   ├── src/
│   ├── scripts/
│   └── work/
│
└── igne-worktrees/          # Parallel worktrees
    ├── igne-phase-d/        # Phase D: Command Registry
    ├── igne-phase-e/        # Phase E: Obsidian API (future)
    └── igne-phase-f/        # Phase F: Plugin System (future)
```

## Why Worktrees?

Git worktrees allow you to:
- Work on multiple phases simultaneously
- Run loops in parallel (different terminals)
- Keep work isolated until ready to merge
- Avoid merge conflicts during development

## Quick Start

### 1. Create a New Worktree

```bash
# From main repository
cd ~/Code/Zereraz/igne

# Create phase-d worktree from main branch
./scripts/create-worktree.sh phase-d main

# Create phase-e worktree from phase-d (dependencies)
./scripts/create-worktree.sh phase-e phase-d
```

### 2. Add Tasks to the Worktree

```bash
# Edit the task file
cd ../igne-worktrees/igne-phase-d
vim work/task.txt

# Or from main
vim ../igne-worktrees/igne-phase-d/work/task.txt
```

### 3. Run the Loop in a Worktree

```bash
# Set API key
export GLM_API_KEY="your-key-here"

# Run loop
./scripts/run-loop.sh phase-d

# Or directly
cd ../igne-worktrees/igne-phase-d
./scripts/loop.sh
```

### 4. Stop the Loop

```bash
# From another terminal
touch ../igne-worktrees/igne-phase-d/work/stop
```

### 5. When Complete - Merge to Main

```bash
# From main repository
cd ~/Code/Zereraz/igne

# Merge the worktree
./scripts/merge-worktree.sh phase-d
```

## Available Scripts

### `create-worktree.sh` - Create New Worktree

```bash
./scripts/create-worktree.sh <phase-name> [base-branch]

Examples:
  ./scripts/create-worktree.sh phase-d main       # Create from main
  ./scripts/create-worktree.sh phase-e phase-d    # Create from phase-d
```

What it does:
- Creates git worktree
- Creates new branch
- Installs dependencies
- Sets up work/ directories
- Copies loop script
- Creates task template

### `run-loop.sh` - Run Loop in Worktree

```bash
export GLM_API_KEY="your-key"
./scripts/run-loop.sh phase-d
```

What it does:
- Checks worktree exists
- Validates API key
- Runs the loop in the worktree

### `merge-worktree.sh` - Merge Worktree to Main

```bash
./scripts/merge-worktree.sh phase-d
```

What it does:
- Fetches latest from origin
- Rebases worktree onto main
- Merges into main
- Pushes to origin
- Optionally removes worktree

### `list-worktrees.sh` - List All Worktrees

```bash
./scripts/list-worktrees.sh
```

What it shows:
- All worktrees and their paths
- Branch names
- Uncommitted changes
- Task file summaries

## Workflow Examples

### Example 1: Sequential Phases

```bash
# 1. Complete Phase B in main
cd ~/Code/Zereraz/igne
git commit -m "feat: Phase B complete"
git push

# 2. Create Phase D worktree
./scripts/create-worktree.sh phase-d main

# 3. Work on Phase D
./scripts/run-loop.sh phase-d

# 4. When complete, merge
./scripts/merge-worktree.sh phase-d
```

### Example 2: Parallel Phases (Advanced)

```bash
# Terminal 1: Work on Phase D
cd ~/Code/Zereraz/igne
./scripts/run-loop.sh phase-d

# Terminal 2: While D runs, prepare Phase E
./scripts/create-worktree.sh phase-e main
# Add tasks to ../igne-worktrees/igne-phase-e/work/task.txt

# Terminal 3: While D runs, prepare Phase F
./scripts/create-worktree.sh phase-f phase-d
# Add tasks...
```

**Note:** Parallel development requires careful planning of task dependencies.

## Worktree Management

### List All Worktrees

```bash
git worktree list
./scripts/list-worktrees.sh
```

### Remove a Worktree

```bash
# Remove worktree metadata and folder
git worktree remove ../igne-worktrees/igne-phase-d

# Delete the branch
git branch -D phase-d
```

### Prune Stale Worktrees

```bash
# Clean up worktree metadata for deleted folders
git worktree prune
```

### Move a Worktree

```bash
# Git doesn't support moving directly
# Instead:
git worktree remove old/path
git worktree add new/path branch-name
```

## Task File Format

Each worktree has a `work/task.txt` file:

```markdown
# Phase X: Phase Name

## Task X1: First Task

Description...

**Success criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## Completion

When complete, add this marker on its own line:

<promise>COMPLETE</promise>
```

**Important:** Do NOT include `<promise>COMPLETE</promise>` in the initial task file, or the loop will exit immediately.

## Troubleshooting

### Worktree Path Issues

If you move a worktree folder manually:

```bash
# Fix with:
git worktree prune
git worktree remove old/path
git worktree add new/path branch-name
```

### Branch Already Exists

```bash
# Delete branch first
git branch -D phase-name

# Then create worktree
./scripts/create-worktree.sh phase-name main
```

### Merge Conflicts

During `merge-worktree.sh`:

```bash
# If rebase fails:
cd ../igne-worktrees/igne-phase-d
# Resolve conflicts
git add .
git rebase --continue
# Run merge script again

# If merge fails:
cd ~/Code/Zereraz/igne
# Resolve conflicts
git add .
git commit
git push origin main
```

### Loop Won't Start

Check:
1. GLM_API_KEY is set: `echo $GLM_API_KEY`
2. Worktree exists: `git worktree list`
3. Task file exists: `ls ../igne-worktrees/igne-phase-d/work/task.txt`
4. No completion marker: `grep COMPLETE ../igne-worktrees/igne-phase-d/work/task.txt`

## Best Practices

1. **One phase per worktree** - Don't mix unrelated work
2. **Clear task files** - Be specific about success criteria
3. **Commit frequently** - Don't let worktrees diverge too much
4. **Merge before starting new worktrees** - Keep base branches fresh
5. **Clean up old worktrees** - Remove completed phases to avoid confusion

## Current Status

```bash
./scripts/list-worktrees.sh
```

Or:

```bash
git worktree list
```

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- `docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md` - Phase definitions
