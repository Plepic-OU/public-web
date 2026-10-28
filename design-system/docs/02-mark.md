# The mark

One locked cut at every size: twenty-two facets, a leaf body, two antennae and one ember. Use the upload `{{mark_id}}` (`assets/Logos/plepic-mark.svg`) or the inline SVG in the Lockup component. Never redraw, re-facet, stretch or recolour it, not even in one colour.

## The lockup

- Wordmark left, mark right, `space-sm` apart. The wordmark is "Plepic" in Bitter 600 at 1.5rem in `green-brand`, and the mark is sized to its ascender so the pair scales as one.
- Stacked (`.logo-lockup--stacked`) puts the mark above the wordmark, for a narrow or centred space.
- On a `green-brand` ground (`.on-brand`) the wordmark turns `text`, because green on green is illegible. The mark never changes.

## Four sizes, and no fifth

The viewBox owns the ratio: size the host and the mark follows.

- 300px: display.
- 120px: art.
- 30px: the header lockup.
- 15px: the set glyph beside a card name (`.tt-setglyph`).

## The facet law

- No two adjacent facets share a colour. The facets use `green-dark`, `green-brand` and `green-vivid` only.
- The two wings are exact outline mirrors. The asymmetry lives in the fills: in slots 6 and 7 the right wing swaps `green-brand` and `green-dark`. So a wing is never made by flipping the other.
- The ember at the head is the mark's only `accent`, and it spends no viewport accent.

## Motion

- At rest the wings breathe on a long, calm loop (`breath-period`, `ease-calm`) while the core bobs. Rotation and translation only, never colour.
- On a card hover the wings beat wide (`wingbeat-dur`) on top of the breath.
- Motion that resolves to the locked mark is allowed. Static effects stay banned: glow, gradient, drop shadow, per-facet opacity, outline wings.
