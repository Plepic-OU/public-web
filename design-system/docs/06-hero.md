# Hero

One composition for every page with a hero. The homepage headline is "{{hero_h1}}".

- Split the grid 1.4fr to 0.6fr with a `space-xl` gap, aligned to the bottom, so the headline and the butterfly share a baseline and read as one object.
- Set the headline in `display-hero`. Break the line after the comma in the markup, never by wrapping.
- Keep the text track at 580px and the sentence at 480px. The butterfly stage is 440px and disappears below 900px: the page loses the butterfly rather than shrink it.
- Pair one primary button (`.btn-primary .btn-lg`) with one ghost button. The body call to action spends the viewport's accent, so the nav call to action is an ink outline and no urgency badge shares the view.
- Enter with a settle: content starts 6px low and fully legible, and rises over 600ms once the fonts load. Nothing load-bearing starts invisible.
- Cohort state, engineers trained, rating, price and subsidy share are slots filled on the page, never in design material.
