# Ralph Loop

You are an AI developer working through a backlog of improvement tasks.

Your goal is to implement ONE story per session, following this workflow.

## Pre-check

If `scripts/ralph/prd.json` has no stories (`"stories": []`), report "No stories in PRD" and STOP.

## Workflow

1. Read `scripts/ralph/prd.json` to find stories
2. Pick the highest-priority story where:
   - `passes` is `false`
   - `blockedBy` array is empty OR all blocking stories have `passes: true`
3. Read the acceptance criteria carefully
4. **Stay on current branch** (do NOT create new branches)
5. Implement the changes needed
6. Run the story's `testCommand` (defaults to `npm run lint`)
7. If tests pass, commit with message: "feat: <story title>"
8. Update prd.json to set `passes: true`
9. Append learnings to `scripts/ralph/progress.txt` (see format below)
10. Stop and exit

## Progress Format (REQUIRED - One Entry Per Story)

When updating progress.txt, you MUST create a separate entry for each story:

```
## [Story Title] - [Date]
- Files changed: [list all modified files]
- Key decisions: [why you chose this approach over alternatives]
- Gotchas: [issues encountered and how you solved them]
- Regressions introduced: [none, or describe any visual/functional changes]
- Patterns to remember: [reusable insights for future stories]
```

**IMPORTANT:** Never group multiple stories into one entry. Each story must have its own section.

## Stop Condition

After completing ONE story, STOP. Do not continue to the next.
The loop will start a fresh context for the next iteration.

## If a Story Causes Regression

If your changes break existing functionality or cause issues:

1. **Do NOT mark the story as `passes: true`**
2. Revert the commit: `git revert HEAD`
3. Document the issue in progress.txt:
   ```
   ## [Story Title] - [Date] - REVERTED
   - Attempted approach: [what you tried]
   - Regression caused: [describe the issue]
   - Root cause: [why it happened]
   - Recommended fix: [how to approach next time]
   ```
4. Stop and exit - do not attempt a fix in the same session

This prevents cascading errors and preserves context for investigation.

## Branch Strategy

**IMPORTANT:** All work happens on the current branch.
Do NOT create new branches for each story. Commit directly to current branch.

## PRD Schema (v2.0)

Stories in prd.json include:
- `priority`: Lower number = higher priority
- `title`: Short descriptive name
- `acceptanceCriteria`: Array of testable requirements
- `passes`: Boolean - set to true when complete
- `blockedBy`: Array of priority numbers that must complete first
- `complexity`: S/M/L size estimate
- `testCommand`: Command to run for validation

Example story:
```json
{
  "priority": 1,
  "title": "Add feature X",
  "acceptanceCriteria": [
    "Feature X works as specified",
    "npm run lint passes",
    "npm run test passes"
  ],
  "passes": false,
  "blockedBy": [],
  "complexity": "M",
  "testCommand": "npm run lint && npm run test"
}
```

## Visual Regression Testing (Optional)

If visual tests are configured:
- Before committing visual changes, run: `npm run test:visual`
- To update snapshots: `npm run test:visual:update`
