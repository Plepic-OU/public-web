# Layout

One scale, one container, one rhythm. Vertical space separates most blocks, so the space scale does more work than any component.

## Space

- Use only the eight `space-*` steps. A value off the scale is a mistake.
- Group tight and separate generously. Even spacing everywhere reads as an unfinished wireframe.
- `space-4xl` pads a section top and bottom; `space-3xl` separates blocks inside it; `space-2xl` sits between a heading and its block.

## The container

- Cap content at `max-width` with a `space-xl` side gutter that never collapses.
- When a page feels empty, let the emptiness be vertical.
- The header is fixed at `header-height`, with a 12px blur over the page ground at 90 percent opacity. Anchors pad by `header-height` plus `space-3xl`.

## Arrangement

- Split two columns asymmetrically, 1.4fr to 0.6fr, never 50/50. The hero, comparisons and panel rows lean.
- On desktop, centre one short thing only, never a page of them.
- Breakpoints sit where something measurably broke: 640px (the type ramp bottoms out), 768px (one column, the nav collapses), 900px (the hero's butterfly stage is hidden).

## Radius

- Buttons use `rounded-sm`, `rounded-md` and `rounded-lg` by size. Panels use `rounded-xl`. Content cards cap at `rounded-2xl`. Pills use `rounded-pill`.
- The badge alone uses the signature corner, `--rounded-badge` (20px 4px 16px).
- The instructor card and every rule-based block have no radius.
