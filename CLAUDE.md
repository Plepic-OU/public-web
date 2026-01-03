# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plepic is a static marketing website for an Estonian tech training company. The site promotes agentic coding training using Claude Code, targeting developers with 2+ years experience.

## Architecture

**Static HTML + CSS only** - No build system, bundler, or JavaScript framework. Files are served directly.

```
index.html          # Homepage
training/index.html # Training subpage
css/styles.css      # Single stylesheet with CSS custom properties
images/             # All static assets (logos, photos)
docs/               # Design documents and one-pagers
```

## Development

**Local development:** Open HTML files directly in browser or use any static file server.

**Design system:** CSS uses custom properties (design tokens) defined in `:root`. Reference `docs/plans/2026-01-03-plepic-homepage-design.md` for design decisions.

**Key CSS patterns:**
- Swiss style typography with `DM Serif Display` (logo) and `Inter` (body)
- 12-column grid system with broken grid layouts
- Brand color: `--color-brand: #00674f` (dark green)
- All spacing uses 8px base unit via `--space-*` tokens

## Content Notes

- Site is English only language, but Estonian market, English content.
- Company logos are inline SVGs for performance. Also using some PNG images.
- Team photos use `filter: grayscale(100%)`
