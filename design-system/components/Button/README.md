# Button

Three sizes by three variants: a variant sets colour, a size sets the box.

- Markup: an `<a>` or `<button>` with `.btn` plus one variant, `.btn-primary`, `.btn-outline` or `.btn-ghost`, and optionally `.btn-lg` (heroes) or `.btn-sm` (nav, dense UI). The consumer supplies the label: a verb first, sentence case.
- `.btn-primary` is `accent` with `text` ink and spends the viewport's one accent. Use one per view.
- Pair a primary with a ghost: one thing to do, one to read. Never two solid-looking buttons; use `.btn-outline` only where no primary shares the row.
- Outline and ghost are ink and hover to `green-surface` under `green-dark`.
- The focus ring is 2px `green-dark` at a 2px offset. Never remove or restyle it per control.
