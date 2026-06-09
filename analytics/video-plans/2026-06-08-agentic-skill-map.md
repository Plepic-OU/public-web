---

## slug: agentic-skill-map  
format: vlog  
recorded_at: 2026-06-08  
filmed_by: Kaido

# The 3 Axes of Agentic Skill

**Format:** vertical 9:16, single iPhone take, ~55 seconds.
**Goal:** spark discussion among advanced agentic engineers, act as a soft lead magnet toward skill.plepic.com, and surface trainer candidates (downstream, via DM). Single CTA: try it, tell us where the model is wrong.
**Audience:** developers using AI coding agents (Claude Code and similar), from beginner to advanced.
**Promotes:** skill.plepic.com (the map). Secondary: plepic.com/training.

---

## Read this aloud (as delivered; one short line = one caption cue, bold = green emphasis)

Have you thought,
how good are you
at **AI** coding?
Most people
can't really say.
After training
hundreds of developers,
we don't think
it's one skill.
It's actually three:
**Autonomy**, **parallelism**,
and **skill usage**.
Most of us
are strong on one,
while stuck
on the rest.
So, at
**skill plepic com**.
And if you're
an agentic coding pioneer,
we would love
your feedback on it.

---

## Filming notes (single take)

- **Frame:** medium close-up, eyes in the upper third. Your usual office background is fine.
- **Light:** face the window. No backlit silhouette.
- **Audio:** AirPods or lav mic if you have one, otherwise the iPhone front mic indoors with no fan running.
- **Teleprompter:** PromptSmart Pro (voice-track) or Teleprompter.com. Paste the spoken lines only. Do NOT enable the app's own captions, logo, or eye-contact AI, the pipeline adds Plepic captions and an end card.
- **Pace:** unhurried. Let the "tell me where the model is wrong" close land calm, not rushed.
- **Eye contact:** straight into the lens. A glance away on the reflective beat is fine.
- **Re-takes are fine.** The pipeline auto-trims pauses and filler. Give a clean ~5s of silence at the start and end for trim margin.

## What the pipeline will do for you

- Auto-trim filler words ("um", "uh", "like", "so", "basically") and pauses over 1.5s.
- Burn in word-level captions with brand-green emphasis on the bolded terms (AI, autonomy, parallelism, skill usage, skill plepic com).
- Generate YouTube + LinkedIn metadata (title, description with UTM, tags, pinned comment).
- Build a thumbnail and a Plepic end card.
- Open a VLC preview and pause before upload so you can review.

## When done

```
npx ts-node scripts/video-publish.ts ~/Documents/plepic-video/inbox/<your-file>.MOV \
  --plan analytics/video-plans/2026-06-08-agentic-skill-map.md
```

Run from `public-web/`. Add `--unlisted` on the first run for a shakedown, then re-run without it (or flip privacy in YouTube Studio) to go public. The Short publishes with the `#Shorts` tag; LinkedIn assets land in a `linkedin/` folder for a ~30s manual upload.
