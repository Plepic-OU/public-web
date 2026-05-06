---

## slug: squad-few-last-seats  
format: vlog  
recorded_at: 2026-05-06  
filmed_by: Kaido

# Squad 2 — Last Seats

**Format:** vertical 9:16, single iPhone take, ~30 seconds.
**Goal:** fill the last 1–2 seats in Squad 2 (starts Friday 2026-05-08).
**Audience:** Estonian/Nordic developers with 2+ years experience.

---

## Read this aloud (≈75 words, ~30s)

Yesterday's hackathon team rated us **nine out of ten**.

*[short beat]*

Squad 1 finished last month. **Eight point seven** average. **NPS fifty.**

*[beat]*

**Squad 2 starts this Friday.** Six Fridays, fully remote.
**Nineteen** seats taken. Few spots left.

*[slight slowdown, more reflective]*

If you've been coding for **two-plus years**, and the gap between what AI promises and what it actually ships in your codebase has been wearing on you — you'd fit in.

*[matter-of-fact]*

**State covers eighty percent.** Your share is around **five hundred euros**.  
After this, summer's quiet. **Next squad's in August/September.**

*[soft, hand gesture down toward caption]*

Link below. No pressure either way.

---

## Filming notes (single take)

- **Frame:** medium close-up. Eyes in the upper third of frame. Green-screen-free office background (your usual setup is fine).
- **Light:** face the window. No backlit silhouette.
- **Audio:** AirPods or lav mic if available. Otherwise iPhone front mic, indoors, no fan running.
- **Pace:** unhurried. The "no pressure either way" close should feel calm, not rushed.
- **Eye contact:** straight into lens. If you glance away on the slowdown beat, it actually helps the reflective tone.
- **Re-takes are fine** — the pipeline auto-trims pauses and filler. Just give a clean ~5s of silence at the start and end so it has trim margin.

## What the pipeline will do for you

- Auto-trim filler words ("um", "uh", "like", "so", "basically") and >1.5s pauses.
- Burn in word-level captions in **black Plus Jakarta Sans** with **brand-green emphasis** on numbers and key terms (Squad, Plepic, Töötukassa, Friday, etc.).
- Generate YouTube + LinkedIn metadata.
- Pause before upload so you can review.

## When done

```
npx ts-node scripts/video-publish.ts ~/plepic-video/inbox/<your-file>.MOV \
  --plan analytics/video-plans/2026-05-06-squad-2-last-seats.md \
  --interactive
```

Run from `public-web/`.