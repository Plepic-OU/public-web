---
slug: 2026-05-11-three-agents-walking
format: vlog
recorded_at: 2026-05-11
filmed_by: Kaido
---

# Three agents running, I walked to my car

**Format:** vertical 9:16, single iPhone take while walking, target 30–60 seconds.
**Goal:** capture one moment that shows what agentic coding actually feels like now.
**Audience:** software agency owners and developers (2+ years experience) in Nordic-Baltic. The ones still treating agents as a demo, not a workflow.

---

## The angle

Three Claude Code agents running. Time to drive home. Instead of shutting things down, I carried the open laptop out to the car. The work doesn't pause anymore; it follows you.

This is a small concrete moment, not a thesis. No "here's what AI means." Just: this is what my Tuesday afternoon looked like.

## Tone

Observational, slightly amused. Not boastful, not anxious. The energy is "look at this funny thing that's now normal," not "look how busy I am."

## Caption emphasis

Words to highlight in brand-green during caption burn-in:

- "three agents"
- "open laptop"
- "didn't want to stop"

## Editing direction

Kaido's direct ask: **short and streamlined, avoid repetitions.**

- Aggressive filler-word trim (default list is fine).
- If the same point is said twice, keep the cleaner take, cut the rest.
- No need to land a "lesson." The image of someone walking to their car with an open laptop because the agents are still working is the whole point.

## Don't

- Don't lecture about agentic coding.
- Don't pitch training.
- Don't drag past ~60 seconds.

## What the pipeline will do

- Auto-trim filler words and >1.5s pauses.
- Burn in word-level captions, brand-green emphasis on the words above.
- Generate YouTube + LinkedIn metadata from this plan + transcript.
- Pause before YouTube upload for review.

## When done

```
npx ts-node scripts/video-publish.ts \
  ~/Documents/plepic-video/inbox/2026-05-11-three-agents-walking.MOV \
  --plan analytics/video-plans/2026-05-11-three-agents-walking.md
```

Run from `public-web/`.
