# Motion

Play lives in weight, lift, tilt and breath: each a duration and an ease, never a colour or a score bar.

## Durations and eases

- `dur-fast` for a state response, `dur-base` for the default transition and hover lift, `dur-settle` for something assembling, `dur-entrance` for the hero's arrival, once per page.
- Two eases, and no third. `ease-settle` for every arrival: hover, lift, reveal, entrance. `ease-calm` for loops that never stop. A linear ease is a bug.

## The reveal

Content rises 20px over 600ms, 100ms apart. It shows by default and hides only once the script has proved it runs, so a failed script still shows the page.

## Lift and tilt

A card rises `--lift-height` and a sheet prints beneath it with `card-shadow-hover` over `dur-base`. On a fine pointer it tilts up to `--tilt-x` and `--tilt-y`. The shadow belongs to the sheet, never the card.

## The signature

On the homepage a crystalline caterpillar crawls, cocoons and unfurls into the locked mark while the code line becomes the agentic loop. It plays once after load; after that the visitor replays it by hovering or tapping the resting mark. It is a WebGL module with a still poster, and it is never redrawn anywhere else.

## Rules that outrank any effect

- Every loop, reveal and tilt has a reduced-motion branch that lands on its end state instantly and hides nothing. Shipping without one is a defect.
- Sound belongs to the cohort loadout builder alone.
