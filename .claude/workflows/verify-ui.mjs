export const meta = {
  name: 'verify-ui',
  description: 'Deep adversarial visual verification of a UI, grounded in the impeccable design rubric, across states and viewports',
  whenToUse: 'Before handing back any frontend/UI change. Renders the page across viewports and states, has agents look at the real screenshots and judge against impeccable + the project design system, adversarially verifies each defect, then synthesizes a ranked fix list. Pass args = { url, capDir, hero }.',
  phases: [
    { title: 'Inspect', detail: 'agents look at real screenshots, judged against impeccable rubric' },
    { title: 'Verify', detail: 'independent skeptics confirm/refute each defect by looking' },
    { title: 'Synthesize', detail: 'dedupe + rank confirmed defects with concrete fixes' },
  ],
}

// args: { url, capDir, hero }  — capture the states first with
// scripts/capture-states.mjs <url> <capDir> [--hero], then pass capDir here.
const URL = (args && args.url) || 'https://www.plepic.com/'
const CAP = (args && args.capDir) || './capture'
const HERO = !(args && args.hero === false)

// Impeccable is the bar; this workflow enforces it at scale across states and
// widths. Agents are told to read the skill's own references so they judge
// against the same rubric the design skill uses, not an ad-hoc brief.
const IMPECCABLE = '/Users/kaidokoort/.claude/skills/impeccable/reference'
const RUBRIC = `GROUND YOUR JUDGEMENT IN THE IMPECCABLE DESIGN RUBRIC — read these before reporting (Read tool):
- ${IMPECCABLE}/brand.md — the register, the AI-slop test, and the DON'Ts (banned patterns).
- ${IMPECCABLE}/critique.md — score all 10 Nielsen heuristics 0-4, cognitive load, emotional journey, AI-slop verdict.
- ${IMPECCABLE}/audit.md — the 5 technical dimensions (a11y, performance, theming, responsive, code quality), score 0-4.
- ${IMPECCABLE}/polish.md — the final-pass bar (alignment, spacing, consistency, detail).
- /Users/kaidokoort/Documents/Plepic Business/public-web/DESIGN.md — the LOCKED Plepic design system (palette, type, motion tokens, named rules).
- /Users/kaidokoort/Documents/Plepic Business/public-web/PRODUCT.md — register, users, anti-references.
A defect is anything that fails this rubric OR that a demanding studio art director would not ship. The AI-slop test is mandatory: if a visitor could say "AI made this," that is a blocking defect.`

const CONTEXT = `You are verifying the LIVE hero of plepic.com (a warm green-on-cream brand site for agentic-coding training). Left column: badge, "Claude Code Training for Dev Teams" headline, description, ONE orange "View Full Program" CTA, qualifier line. Right column: a crystalline low-poly GREEN butterfly logo above a monospace code loop "while(task) { explore -> act -> verify }". On load it holds a static rest state ~5s, then a metamorphosis plays ONCE (caterpillar crawls -> chrysalis -> unfurls into the butterfly) and rests forever.

SCREENSHOTS in ${CAP}/ named <viewport>-<n>-<state>.png:
  states: 1-initial (first paint), 2-settled (~2.5s resting), 3-crawl (mid animation), 4-restfinal (after arc, resting); plus reduced-motion.png
  viewports: mobile(390) tablet(820) laptop(1440) desktop(1920) wide(2560)
${CAP}/metrics.json has measured geometry + consoleErrors per state (metrics have known Y-orientation quirks; the IMAGES are ground truth — LOOK at them).

${RUBRIC}`

const SCHEMA = {
  type: 'object', required: ['defects'],
  properties: { defects: { type: 'array', items: {
    type: 'object', required: ['title', 'detail', 'severity', 'evidence', 'state', 'viewport', 'rubric'],
    properties: {
      title: { type: 'string' },
      detail: { type: 'string', description: 'what is wrong and what correct would look like' },
      severity: { enum: ['blocking', 'major', 'minor'] },
      evidence: { type: 'string', description: 'screenshot file(s) + what you saw' },
      state: { type: 'string' }, viewport: { type: 'string' },
      rubric: { type: 'string', description: 'which impeccable/DESIGN.md rule or heuristic it violates' },
    } } } },
}
const VERDICT = { type: 'object', required: ['confirmed', 'reason'],
  properties: { confirmed: { type: 'boolean' }, reason: { type: 'string' } } }

phase('Inspect')
const DIMENSIONS = [
  { key: 'load-consistency', brief: 'LOAD SEQUENCE + STATE CONSISTENCY. Per viewport, compare 1-initial vs 2-settled vs 4-restfinal: the butterfly AND code must sit at the SAME position and size in all three resting frames. Any vertical jump, size pop, colour shift, or flash on the poster->canvas swap or when the arc resolves is a defect (impeccable polish.md: no layout shift; DESIGN.md Mark-Motion Rule). Founder specifically reported the initial butterfly sitting higher than the final one.' },
  { key: 'lockup-composition', brief: 'LOCKUP + COMPOSITION at rest (2-settled full page). Butterfly<->code must read as ONE tight lockup (small caption gap, not a void). The right-column visual must be balanced against the left headline column — not floating high/low, not lost in whitespace. Judge the gestalt against impeccable brand.md (studio bar) + polish.md (spacing/alignment). Run the AI-slop test on the whole fold.' },
  { key: 'centering-alignment', brief: 'CENTERING + ALIGNMENT at rest and crawl. Code centered under the butterfly BODY axis (code is left-heavy — judge optical centre). Caterpillar centered over the code in 3-crawl. Right edges (cursor, wing, CTA line) consistent. Any drift at any width. (polish.md alignment.)' },
  { key: 'responsive', brief: 'RESPONSIVE across mobile/tablet/laptop/desktop/wide (2-settled). Does it COMPOSE at each width or just shrink/stretch (impeccable adapt.md)? TABLET 820 is just below the 901 desktop breakpoint — inspect hardest: does the stacked layout put a giant butterfly above the headline, or leave awkward gaps? Any overflow, clipping, cramping, tiny/huge visual.' },
  { key: 'brand-a11y-motion', brief: 'BRAND LOCKS + A11Y + REDUCED MOTION + CONSOLE. Off-palette colours, more than ONE ember/orange element per viewport, banned effects (cyan/neon/glow/gradient-text) per DESIGN.md + brand.md. reduced-motion.png: static butterfly+code, on-brand, not blank/broken — judge whether the pale 0.28-opacity poster reads as intentional or washed-out/broken. metrics.json consoleErrors must be empty. Contrast per audit.md a11y.' },
  { key: 'motion-arc', brief: 'THE ANIMATION (3-crawl + reasoning about the ~13s arc). Legible caterpillar (not clipped/blob), sensibly placed, code showing the evolving snippet. Motion must fit DESIGN.md motion tokens + animate.md (no jank, purposeful). Flag anything that reads broken during the arc.' },
]
const inspections = await parallel(DIMENSIONS.map(d => () =>
  agent(CONTEXT + '\n\nYOUR DIMENSION: ' + d.brief + '\n\nRead the impeccable references above, then Read the relevant PNGs and LOOK. Report every defect tied to specific file(s)+state+viewport+rubric. Demanding studio art director standard; do not invent, do not rubber-stamp. Empty only if truly clean.',
    { label: 'inspect:' + d.key, phase: 'Inspect', schema: SCHEMA, effort: 'high' })))

phase('Verify')
const raw = inspections.filter(Boolean).flatMap((r, i) => (r.defects || []).map(d => ({ ...d, dim: DIMENSIONS[i].key })))
log(raw.length + ' raw defects across ' + DIMENSIONS.length + ' dimensions')
const verified = await parallel(raw.map(f => () =>
  agent(CONTEXT + '\n\nA reviewer claims:\nTITLE: ' + f.title + '\nDETAIL: ' + f.detail + '\nSTATE: ' + f.state + ' VP: ' + f.viewport + '\nRUBRIC: ' + f.rubric + '\nEVIDENCE: ' + f.evidence + '\n\nIndependent skeptic: open the SAME screenshot(s) and LOOK. confirmed=true ONLY if you personally see the defect and it violates the cited rubric. Refute if not visible, within tolerance, a metrics misread, or immaterial to a real visitor.',
    { label: 'verify:' + f.title.slice(0, 26), phase: 'Verify', schema: VERDICT, effort: 'high' })
    .then(v => ({ ...f, verdict: v }))))
const confirmed = verified.filter(Boolean).filter(f => f.verdict && f.verdict.confirmed)

phase('Synthesize')
const merged = JSON.stringify(confirmed.map(f => ({ title: f.title, detail: f.detail, severity: f.severity, state: f.state, viewport: f.viewport, rubric: f.rubric, dim: f.dim })))
const summary = await agent(CONTEXT + '\n\nConfirmed defects (each seen by two agents): ' + merged + '\n\nSynthesize the fix list: (1) dedupe across dimensions/viewports; (2) rank blocking->major->minor; (3) concrete fix per defect (file + CSS/JS change + value) — the hero is index.html inline styles + js/crystalline-metamorphosis.js (Three.js, framing opts markPx/markRightPx/markBottomPx, poster SVG). (4) State explicitly whether these are CONFIRMED: initial-vs-final jump, rest-state gap, tablet-820 layout. Cite the impeccable/DESIGN.md rule each fix satisfies. Terse, implementable, plain text.', { label: 'synthesize', phase: 'Synthesize', effort: 'xhigh' })
return { confirmedCount: confirmed.length, rawCount: raw.length, summary }
