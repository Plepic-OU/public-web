# Context

You are an AI developer working through a backlog of improvement tasks for the Plepic marketing website (static HTML + CSS).

Your goal is to implement ONE story per session, following this workflow.

## Workflow

1. Read `scripts/ralph/prd.json` to find stories
2. Pick the highest-priority story where "passes" is false
3. Read the acceptance criteria carefully
4. **Stay on current branch** (do NOT create new branches)
5. Implement the changes needed
6. Run `npm run lint` to validate HTML/CSS
7. If lint passes, commit with message: "feat: <story title>"
8. Update prd.json to set "passes": true
9. Append learnings to `scripts/ralph/progress.txt`
10. Stop and exit

## Progress Format

When updating progress.txt, use this format:

```
## [Story Title] - [Date]
- What was implemented
- Key decisions made
- Gotchas discovered
- Patterns to remember
```

## Stop Condition

After completing ONE story, STOP. Do not continue to the next.
The loop will start a fresh context for the next iteration.

## Branch Strategy

**IMPORTANT:** All work happens on the current branch (`feat/ralph-improvements`).
Do NOT create new branches for each story. Commit directly to current branch.

## Codebase Patterns

- Static HTML + CSS only (no build system)
- CSS uses custom properties (design tokens) in `:root`
- Fonts: Orbitron (headings), Exo 2 (body), Share Tech Mono (code)
- Colors: cyan #00ffff, orange #ff6600, void black #050508
- All spacing uses 8px base unit via `--space-*` tokens
