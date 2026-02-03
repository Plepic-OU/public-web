# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plepic is a static marketing website for an Estonian tech training company. The site promotes agentic coding training using Claude Code, targeting developers with 2+ years experience.

## Architecture

**Static HTML + CSS only** - No build system, bundler, or JavaScript framework. Files are served directly.

```
index.html          # Homepage
agent/index.html    # What is an AI Agent? (educational)
training/index.html # Training program details & enrollment
css/styles.css      # Single stylesheet with CSS custom properties
images/             # All static assets (logos, photos)
docs/               # Design documents and one-pagers
```

## Development

**Local development:** Open HTML files directly in browser or use any static file server.

**Branching:** All development work should be done in a separate feature branch, not directly on `main`.

**Deployment:** GitHub Pages from `main` branch. Push to main = deploy. Custom domain: plepic.com

**Design system:** CSS uses custom properties (design tokens) defined in `:root`. Reference `docs/plans/2026-01-03-plepic-homepage-design.md` for design decisions.

**Key CSS patterns:**
- Starcraft-inspired retro-futuristic aesthetic with `Orbitron` (headings/logo), `Exo 2` (body), and `Share Tech Mono` (code/labels)
- CSS grid layouts with broken grid designs
- Brand colors: cyan `--color-cyan: #00ffff` and orange `--color-orange: #ff6600` on dark void `--color-void: #050508`
- All spacing uses 8px base unit via `--space-*` tokens
- Fonts loaded via `<link>` in HTML (not CSS @import) for faster discovery

## Content Notes

- English content for Estonian market
- No forms on site - contact via external links (email, phone, LinkedIn, Google Calendar)
- Registration uses external Google Forms (QR code)
- Company logos are inline SVGs for performance, also PNG images
- Team photos use `filter: grayscale(100%)`
