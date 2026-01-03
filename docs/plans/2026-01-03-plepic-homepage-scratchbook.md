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

Follow the design system in the design doc (Swiss Style + Broken Grid, Inter font, 12-column grid). The training one-pager uses different fonts and simpler layout - only reuse its colors and content, not its CSS patterns.

Build homepage first, get it looking good, then the training subpage is just the one-pager content with shared header/footer.

Do sections top-to-bottom since they're independent. Team section is the complex one - save it for later when the simpler sections are done.

## Order of work

- [x] Set up file structure + copy assets to images/
- [x] Create shared CSS with design system
- [x] Homepage: navigation (sticky header)
- [x] Homepage: hero banner
- [x] Homepage: training highlight section
- [x] Homepage: client logos
- [x] Homepage: testimonials/stats
- [x] Homepage: team section (the complex one)
- [x] Homepage: footer/contact
- [x] Add meta tags, OpenGraph, favicon
- [x] Training subpage: adapt one-pager with shared header/footer
- [ ] robots.txt
- [ ] Test responsive on mobile
- [ ] Final review + commit

## Uncertainties

- Smooth scroll: CSS `scroll-behavior: smooth` - does it work well enough in Safari? Will test, might be fine.
- ~~Sticky header shadow on scroll~~ → Needed tiny JS (5 lines), CSS can't detect scroll position
- ~~Timeline in Team section~~ → Simplified to year markers only (2005 → 2015 → 2025), flexbox wraps on mobile
- ~~Favicon~~ → Used plepic-logo.png directly - PNG favicons work in modern browsers

## Watch out for

- Don't forget `loading="lazy"` on below-fold images
- Fixed header height to prevent CLS
- Alt text on all images
- Check color contrast with the green
- Training page link goes to /training/ not /training (trailing slash for GitHub Pages)

## Learnings log

| Task | Learning | Placed in |
|------|----------|-----------|
| CSS design system | Use CSS custom properties for all design tokens - makes responsive overrides clean | Scratchbook |
| Navigation | Scroll shadow needs JS - CSS has no scroll position detection | Scratchbook |
