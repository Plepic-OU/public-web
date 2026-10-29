The Plepic design system, generated from `css/styles.css`, `index.html` and `training/index.html` by `design-system/build.py`. If a value here disagrees with the stylesheet, the stylesheet is right. No page carries a price, a date or any value that moves; Voice lists what stays in the page.

## Using this system

- Read the nine sections in order before you design anything: Foundations, Type, Voice, The mark, Layout, Motion, Components, The card, Hero. Each is also a showcase page under the Brand book group, where Motion, Components and The card run live.
- Load `tokens.css`, then `components/bundle.css`, and keep `fonts/` beside `tokens.css`: its `@font-face` rules point there. Together they are the plepic.com stylesheet, so its classes (`.btn`, `.panel-white`, `.badge`, `.tt-card`, `.logo-lockup`) render as on the site. The component cards show the markup each class expects.
- Take every value from a token. A new need takes an existing step, never a new value.

## Logos

Logos are uploads, not files: `design-system.json` lists each under `assetGroups.Logos.files.<name>.blob`, and you read it by passing that id as the path. Or copy the inline SVG from the Lockup component. The Mark section holds the rules; never redraw, recolour or stretch any of them.

- The mark alone: `plepic-mark`; the SVG's id is `{{mark_id}}`.
- The lockup, the default everywhere: `plepic-lockup`.
- Stacked, for a narrow or centred space: `plepic-lockup-stacked`.
- On a green ground, where the wordmark turns ink: `plepic-lockup-on-brand`.
- The domain wordmark, for print and merchandise: `plepic-com-lockup`, or `plepic-com-wordmark` where the mark stands apart, as on the social card.

Each comes as `.pdf` (vector, fonts embedded: send this to a printer), `.svg` (text as outlines: for any tool) and `.png` (transparent, for slides and documents).
## Iconography

The brand icon is the mark (Logos above). Plepic uses no emoji and one icon set: the curriculum pictograms, the `<symbol>` sprite at the top of the curriculum section in `training/index.html`. Each is a 24-unit line drawing with stroke 2 and round caps and joins, coloured by `currentColor`: ink, `--green-dark`, or white on the dark-green active node, never the accent. A pictogram names a week, a day mode (watch, build, share, lunch) or an outcome; it never decorates. A new pictogram joins that sprite in the same style, and no icon library enters the site. An external link earns an arrow (↗), nothing more.

## Not synced

- `--rounded-badge` (`20px 4px 16px`) is a three-value radius the token format cannot hold. It stays in the `:root` block of `components/bundle.css` with the transitions, tier fills, card tilt, mark breath and runtime channels.
- The card's tilt and the mark's breath and wing beat need the site's scripts; the showcase pages run the CSS parts only.
- The logo files are RGB. No CMYK or spot-colour separation exists.
- The hero's crystalline metamorphosis is a WebGL module and is never redrawn here.
