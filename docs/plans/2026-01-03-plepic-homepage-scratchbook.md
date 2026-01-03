# Scratchbook: Plepic Homepage

Design: [2026-01-03-plepic-homepage-design.md](./2026-01-03-plepic-homepage-design.md)

## Access check
- [x] Design doc: have it
- [x] Code: this repo, main branch
- [x] Assets: docs/assets/ has logos, docs/training-one-pager/ has photos
- [x] Reference: training one-pager HTML exists with working styles
- [x] Tests: N/A (static HTML, will test in browser)
- [x] Build: N/A (no build step, just files)

## My approach

Start by stealing from the training one-pager - it already has the design system (colors, fonts, responsive patterns). Don't reinvent.

Build homepage first, get it looking good, then the training subpage is just the one-pager content with shared header/footer.

Do sections top-to-bottom since they're independent. Team section is the complex one - save it for later when the simpler sections are done.

## Order of work

- [ ] Set up file structure + copy assets to images/
- [ ] Create shared CSS with design system from one-pager
- [ ] Homepage: navigation (sticky header)
- [ ] Homepage: hero banner
- [ ] Homepage: training highlight section
- [ ] Homepage: client logos
- [ ] Homepage: testimonials/stats
- [ ] Homepage: team section (the complex one)
- [ ] Homepage: footer/contact
- [ ] Add meta tags, OpenGraph, favicon
- [ ] Training subpage: adapt one-pager with shared header/footer
- [ ] robots.txt
- [ ] Test responsive on mobile
- [ ] Final review + commit

## Uncertainties

- Smooth scroll: CSS `scroll-behavior: smooth` - does it work well enough in Safari? Will test, might be fine.
- Sticky header shadow on scroll: need tiny bit of JS or can fake with CSS? Try CSS first.
- Timeline in Team section: how to make it responsive? The PDF design is horizontal - might need to simplify for mobile.
- Favicon: need to create from logo. Can probably use online converter.

## Watch out for

- Don't forget `loading="lazy"` on below-fold images
- Fixed header height to prevent CLS
- Alt text on all images
- Check color contrast with the green
- Training page link goes to /training/ not /training (trailing slash for GitHub Pages)

## Learnings log

| Task | Learning | Placed in |
|------|----------|-----------|
