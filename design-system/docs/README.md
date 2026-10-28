Plepic teaches software engineers to direct coding agents. The brand reads like a practitioner's notebook: cream paper, ink headings, one green phrase that carries the claim, and a faceted butterfly that is never redrawn. Colour names a role and holds it. Play lives in weight, lift, tilt and breath, never in colour.

## Using this system

- Load `tokens.css`, then `components/bundle.css`. Together they are the plepic.com stylesheet, so its class names (`.btn`, `.panel-white`, `.badge`, `.tt-card`) render exactly as on the site.
- Light mode only. There is no dark theme, no dark section and no dark token. Never invent one.
- Take every colour, size, space, radius, duration and ease from a token. A new need takes an existing step, never a new value.
- Read the sections below before writing copy or placing the mark. Voice, The mark, Layout, Motion, Surfaces and Hero each hold rules that a token cannot.
- One accent element per viewport: a call-to-action button, an urgency badge or an accent dot. Never two.
- No em-dashes in anything a customer reads. Use commas, colons and full stops.

## Colour

One green ramp, one colour that is not green, and seven neutrals named by their job.

- Headings, body copy and section labels are `text` on `bg`, `bg-alt` or `surface`. The supporting sentence is `text-2`. Captions and the card eyebrow are `text-3`, the floor: nothing lighter carries readable text.
- Links and the one green phrase in a heading are `green-brand`, the only green that clears AA on cream.
- `green-vivid` is never text on light: it measures 2.5:1 on cream. Use it for facet light and decoration only.
- `green-dark` is body green that needs AAA, the mark's body and the keyboard focus ring.
- `green-light` fills behind a green statement; `green-surface` grounds a block that must lift off the page.
- `accent` is the ember at the mark's head and one call to action. States use opacity, never a second orange.
- `border` is the only line the page draws.

### Why the palette holds these values

- Every green is hue 137 at 73 percent saturation; `green-vivid` alone runs at full saturation. `accent` sits at hue 15, saturation-matched, so the orange and the greens look mixed by one hand.
- Headings are ink. At most one phrase inside a heading is `green-brand`. A fully green heading is off-canon in any medium.
- Nothing shines: no cyan, neon, glassmorphism, gradient text, glow or blur. If it could be any company, it is not this one.

## Type

Three faces, one job each. A face never borrows another's job.

- **Bitter** (`--font-display`) carries every heading, weight 700, line height 1.15, tracking -0.01em. Use the styles `display-h1` to `heading-h4`.
- **Hanken Grotesk** (`--font-body`) carries every sentence: `body` at 1.7 for running text, `body-ui` at 1.5 for UI text.
- **JetBrains Mono** (`--font-mono`) carries every label and every line of code: `label` uppercase for section labels and panel headers, `card-eyebrow` on the instructor card only, `mono-code` at its natural tracking.
- Headings ramp with the viewport through `fs-h2` and `fs-h3`; body does not.
- `display-hero` belongs to the hero alone. An interior page's h1 is `display-h1`; the hero ramp on an interior page makes every page a landing page.
- At the clamp minimums h3, h4 and body are one size, so weight separates them. An h3 is never weight 400.
- `--fs-` is size and `--text-` is colour. A token that sets both is wrong for one of them.
- Buttons, badges and labels set `line-height: normal`. A control that inherits body's 1.7 grows a box nobody asked for.
- Uppercase belongs to mono labels, never to a heading.

## Iconography

The brand icon is the mark, `assets/Logos/plepic-mark.svg`: twenty-two facets, a leaf body, two antennae and one ember. It is an upload: read it by its id, `{{mark_id}}`, or copy the inline SVG from `components/Lockup/preview.html`. Place it whole; never redraw, re-facet, stretch or recolour it. The Mark section holds its rules. Plepic uses no emoji and one icon set: the curriculum pictograms, the `<symbol>` sprite at the top of the curriculum section in `training/index.html`. Each is a 24-unit line drawing with stroke 2 and round caps and joins, coloured by `currentColor`: ink, `--green-dark`, or white on the dark-green active node, never the accent. A pictogram names a week, a day mode (watch, build, share, lunch) or an outcome; it never decorates. A new pictogram joins that sprite in the same style, and no icon library enters the site. An external link earns an arrow (↗), nothing more.

## Not synced

- `--rounded-badge` (`20px 4px 16px`) is a three-value radius the token format cannot hold. It stays in the `:root` block of `components/bundle.css` with the transitions, tier fills, card tilt, mark breath and runtime channels.
- The card's tilt and the mark's breath and wing beat need the site's scripts. Previews show the CSS lift only.
- The hero's crystalline metamorphosis is a WebGL module and is never redrawn here.
