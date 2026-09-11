---

## slug: how-i-build-with-claude-code-silver-must-lammas
format: long
recorded_at: 2026-07-24
filmed_by: Silver (Must Lammas), guest speaker
published_by: Plepic

# How I build with Claude Code (Plepic developer meetup talk)

**Format:** 16:9 screen recording, 20:19, spoken in English, one continuous take Silver cut himself (v3).
**Goal:** practitioner to practitioner learning. Silver explicitly asks for feedback on his flow, so the video is a discussion opener, not a tutorial.
**Guest video:** the speaker is not Kaido. Credit Silver in the first line of the description. Never write the description in Kaido's first person.
**Promotes:** plepic.com/training (soft, single CTA at the end of the description).
**Overlays:** none. No caption burn-in, no cuts, no outro card. The talk ships as delivered.

---

## Use these fields verbatim

**title:** Five pull requests overnight, reviewed by ten agents: how Silver builds with Claude Code

**description:**

Silver needed a Merit Aktiva accounting integration for his WooCommerce shop. The existing plugin carried too much bloat, so he described what he wanted, went to sleep, and woke up to four scoped pull requests that ten review agents had already gone through.

This is his working setup, shown as it is. Recorded at the Plepic developer meetup, July 2026. Silver is a developer at Stebby and a co-founder of the Must Lammas web agency, which runs the Padelhaus e-shop. His opening line: he is not here to teach Claude Code because he is still learning it himself. He asked for feedback on the gaps, so comments are the point of this one.

What he walks through:

A brain dump prompt, then a brainstorming session that interviews him about what he left out, then a handoff prompt for a fresh session.
Git worktrees so several agents can work in parallel without stepping on each other.
One orchestrator that splits the work into logically scoped pull requests and picks the model per task.
A review loop: ten review agents each with their own remit, then a scorer that rates every comment 1 to 100 and discards anything under 80.
A stop condition. After three fix and review rounds the loop stops and waits for a human, because that many mistakes means the plan was wrong.
Pull request summaries used as project memory instead of a ticket tracker.
An in house inventory app with an email agent that drafts customer replies and leaves notes on orders.
A client project where the documentation folder carries the client calls, conventions and decisions that every session reads.
Skills for transactions, migrations, front end work, deploys, SEO and test driven development.
A personal brain vault that holds projects, people and machine setup.

The principle underneath all of it: every step gets a second agent to verify it. Plan gets verified, code gets verified, then the human reviews.

Silver reads the comments here. If you run a different loop, say so.

Plepic trains development teams to work this way: https://www.plepic.com/training?utm_source=youtube&utm_content=how-i-build-with-claude-code-silver-must-lammas

**chapters:**
0:00 Who Silver is, and why this is not a tutorial
1:18 The web agency and the padel e-shop
2:00 The problem: WooCommerce needs Merit Aktiva
2:43 Trying the existing plugin first
3:30 Brain dump, then a brainstorming session
4:28 What the planning session produced
5:37 Splitting the work: one orchestrator, many subagents
6:36 Git worktrees and logically scoped pull requests
7:17 Five pull requests while he slept
7:40 Pull request summaries instead of Jira
8:50 The review loop: ten reviewers and a scorer
10:22 Three rounds, then it stops for the human
11:42 Every step gets a peer agent to verify it
12:15 The result, one overnight plugin
12:40 Second project: the in house inventory app
13:46 The email agent that drafts customer replies
15:09 From a Discord message to a shipped feature
16:03 Client project: documentation is the core asset
17:19 Roadmap phases sized for overnight runs
18:06 The skills that steer the agents
19:24 The brain vault
20:08 Closing

**tags:** claude code, agentic coding, ai coding, subagents, code review agents, git worktree, woocommerce plugin, wordpress development, merit aktiva, ai pair programming, orchestrator agent, developer workflow, test driven development, plepic, eesti

**pinnedComment:** Silver asked for feedback on this flow, so here is the open question: after three failed review rounds his loop stops and waits for a human. Where does your loop stop?

---

## Pipeline invocation

```
npx ts-node scripts/video-publish.ts \
  ~/Documents/plepic-video/inbox/how-i-build-with-claude-code-silver-must-lammas.mp4 \
  --plan analytics/video-plans/2026-07-31-how-i-build-with-claude-code-silver-must-lammas.md \
  --no-cuts --no-open
```

Run from `public-web/`. `--no-cuts` is mandatory: this is a guest talk and filler trimming would desync narration from the screen recording.

## Source handling (already done)

Silver delivered `plepic-presentation-cut-v3.mp4` (2690x1758, 5.9 Mbps) via Drive. Padded to 2560x1440 on brand ink `#1c1c1a` with lanczos, x264 crf 18, audio copied. The odd source resolution would otherwise pillarbox in the YouTube player.

## Distribution

- YouTube: public today, on @plepic-agentic.
- Discord `claude-code-ee`: post in Estonian, then a thread so Silver gets the feedback he asked for.
- LinkedIn: Monday 2026-08-03 08:30, Kaido's personal profile.
