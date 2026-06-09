---

## slug: agentic-skill-map  
format: vlog  
recorded_at: 2026-06-09  
filmed_by: Kaido

# The 3 Axes of Agentic Skill (take 2)

**Format:** vertical 9:16, single iPhone teleprompter take.
**Goal:** spark discussion among advanced agentic engineers, soft lead magnet to skill.plepic.com, surface trainer candidates (downstream, via DM).
**Promotes:** skill.plepic.com.
**Overlays:** persistent `skill.plepic.com` URL strip (bottom); full-frame outro card = result screenshot + Plepic logo + link (last ~3s).

---

## Read this aloud (as delivered; one short line = one caption cue, bold = green emphasis)

How good are you
at **AI** coding?
Most people
can't really say.
After training
hundreds of developers,
we don't think
it's one skill.
It's actually
three skills:
**Autonomy**, **parallelism**,
and **skill usage**.
Most of us
are strong on one,
while stuck on another.
So we built
a map.
It allows you
to mark
where you are
and see what's next.
It's free
and available at
**skill plepic com**.
And if you're
an agentic coding pioneer,
we'd love your feedback
on the application
to make it better.

---

## Filming notes (single take)
- Already recorded: `Teleprompter-2026-09-06_08-33-17.mp4` (1080×1920, 52.5s).
- Captions = per-caption cream pill, top third, green emphasis (no band).

## What the pipeline will do for you
- Auto-trim filler words and pauses over 1.5s (keeping a ~0.4s breath each side).
- Burn cream-pill captions with brand-green emphasis on the bolded terms (AI, Autonomy, parallelism, skill usage, skill plepic com).
- Pin a `skill.plepic.com` strip at the bottom during the talk.
- Compose a full-frame outro card (result screenshot + Plepic logo + skill.plepic.com) for the last ~3s.
- Generate YouTube + LinkedIn metadata; open a VLC preview.

## When done

```
npx ts-node scripts/video-publish.ts ~/Documents/plepic-video/inbox/Teleprompter-2026-09-06_08-33-17.mp4 \
  --plan analytics/video-plans/2026-06-09-agentic-skill-map.md \
  --outro-image "$HOME/Documents/plepic-video/inbox/Screenshot 2026-06-09 at 08.39.03.png" \
  --link skill.plepic.com
```

Run from `public-web/`. Add `--unlisted` on the first publish for a shakedown.
