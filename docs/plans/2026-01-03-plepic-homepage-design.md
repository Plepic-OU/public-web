# Plepic Homepage Design

## Overview

New homepage for plepic.com that combines the hero from the existing site with training content from the one-pager. Built as pure HTML + CSS for simplicity.

**Target Maturity:** Production-ready

**Hosting:** GitHub Pages

## Goals

- Replace current plepic.com homepage
- Highlight the 6-week agentic coding training
- Enable future subpages (2-4 pages expected)
- Allow non-technical people to add pages with Claude Code

## File Structure

```
public-web/
├── index.html              # Homepage
├── training/
│   └── index.html          # Training subpage
├── css/
│   └── styles.css          # Shared styles
├── images/                 # Shared images (logos, photos, QR)
├── robots.txt              # Allow all crawlers
└── favicon.ico             # Browser tab icon
```

## Design System

**Design Philosophy: Swiss Style + Broken Grid**

Inspired by the International Typographic Style (Swiss Design) with intentional grid breaks for visual tension and modern dynamism.

**Core Principles:**
- Mathematical 12-column grid as foundation
- Deliberate breaks where elements escape grid boundaries
- Strong typographic hierarchy with generous whitespace
- Asymmetrical compositions that create visual interest
- Flush-left alignment (no centered text except hero tagline)
- Objective, utilitarian aesthetic with moments of playfulness

**Grid System:**
- Base: 12-column grid, 1200px max-width, 24px gutters
- Breakpoints: 480px (mobile), 768px (tablet), 1024px (desktop)
- Grid breaks: Elements may extend beyond columns, overlap adjacent sections, or use negative margins to break visual monotony

**Colors:**
- Brand green: #00674f (primary accent, CTAs, key numbers)
- Background: #f5f3ee (warm cream, main canvas)
- White: #ffffff (cards, elevated surfaces)
- Black: #1a1a1a (headlines, primary text)
- Gray: #444 (body text), #666 (secondary text), #e0e0e0 (borders)
- Accent blocks: Solid green backgrounds for emphasis sections

**Typography (Swiss-inspired):**
- Headlines: Inter (700, 800) — clean geometric sans-serif
- Body: Inter (400, 500, 600) — consistent type family
- Accent/Labels: Inter (600) uppercase with letter-spacing: 0.1em
- Scale: 14px base, 1.5 line-height, modular scale (1.25 ratio)
- Numbers: Tabular figures for stats, oversized for impact (72-96px)

**Spacing System:**
- Base unit: 8px
- Section padding: 80px (desktop), 48px (mobile)
- Component spacing: 24px, 32px, 48px
- Micro spacing: 4px, 8px, 16px

**Visual Elements:**
- Photos: Grayscale with high contrast, may break grid boundaries
- Geometric shapes: Rectangles and lines as dividers/accents
- No rounded corners (except buttons: 4px max)
- Thin borders (1px) for subtle separation
- Drop shadows: Minimal, only for elevation (cards)

**Broken Grid Techniques:**
1. **Offset positioning:** Elements shifted 20-40px outside their grid column
2. **Overlapping sections:** Photos or accent blocks extend into adjacent sections
3. **Asymmetric margins:** Left-heavy or right-heavy compositions per section
4. **Bleeding elements:** Full-bleed backgrounds that contrast contained content
5. **Staggered layouts:** Alternating left/right alignment between sections

**Tagline:** "Curious play. Epic growth."

## Homepage Sections

### 1. Navigation

- **Logo:** "Plepic" (left, DM Serif Display, brand green)
- **Links:** Training · Clients · Team · Contact (right)
- **Behavior:** Anchor links scroll smoothly to sections (CSS `scroll-behavior: smooth`)
- **Sticky:** Header stays visible on scroll
  - Fixed height (e.g., 70px) to prevent CLS
  - Subtle shadow appears on scroll
  - White/cream background with slight transparency

### 2. Hero Banner

- **Background:** Warm cream (#f5f3ee)
- **Layout:** Asymmetric two-column (7/5 split)
  - Left: Headline + CTA (spans columns 1-7)
  - Right: Large decorative number "01" or geometric block extending off-canvas
- **Headline:** "Claude Code and Performance-Based Development for Entrepreneurs"
- **Tagline:** "Curious play. Epic growth." (smaller, uppercase, tracked)
- **CTA:** Green button "Book Free Strategy Session" (scrolls to Contact)
- **Grid break:** Green accent bar extends from left edge past content boundary

### 3. Training Highlight

- **Background:** Full-bleed brand green (#00674f)
- **Layout:** Offset grid composition
  - Label + Headline: Left-aligned, columns 2-7 (indented from edge)
  - Stats: Right side, columns 8-12, vertically stacked
- **Label:** "MARCH 2026 COHORT" (uppercase, white, tracked)
- **Headline:** "Master agentic coding in 6 weeks" (white, large)
- **Description:** Claude Code practitioners train your developers to work 3-5x faster. Learn from early adopters how to build prompt libraries and automated workflows.
- **Stats block (staggered alignment):**
  - 6 Weeks / Fridays
  - 50 Academic Hours
  - 20 Max Participants
  - 2+ Years Experience Required
  - Numbers in oversized white type (72px), labels below (14px)
- **Pricing:** "80% funded by Töötukassa → You pay €504 (+VAT)" (highlighted in cream)
- **Link:** "View full program →" (links to /training)
- **Grid break:** Stats numbers overlap section boundary at top

### 4. Client Logos

- **Label:** "Used by Estonian Tech Companies"
- **Logos:** Helmes, Holm, DPate, btweb, Ktiva Finance Group
- **Style:** Grayscale or muted, horizontal row, wraps on mobile

### 5. Testimonials & Stats

- **Layout:** Two-column asymmetric (4/8 split)
  - Left column: Oversized stats stacked vertically
  - Right column: Supporting text
- **Stats (2 items):**
  - "8.4" / "Hackathon Avg. Score" — number in 96px brand green, label in 14px gray
  - "100+" / "Developers Trained" — same treatment
- **Note:** "Try our teaching style at upcoming hackathons before you commit to the full course."
- **Grid break:** Large numbers overlap into left margin area
- **Style:** Swiss-inspired large numerals with clear hierarchy

### 6. Team

Two team cards using broken grid layout with overlapping photos and asymmetric compositions.

**Layout pattern (alternating):**
- Card 1 (Joosep): Photo left, breaks grid leftward; content right
- Card 2 (Kaido): Photo right, breaks grid rightward; content left

**Joosep Simm card:**
- **Photo:** Grayscale, high contrast, extends 40px beyond left grid boundary
- **Name overlay:** White label positioned at photo bottom edge, extending into content area
- Title: "Developer, Architect & AI Trainer"
- Languages: Java, Kotlin, Golang, TypeScript, Python (inline badges)
- Skills: Frontend, Backend, DevOps, AI Coding
- Tagline: Telecommunications | Blockchain | AML | Energy | Game Design | Agentic Coding | Father of Two
- Timeline: Horizontal bar with year markers (2005 → 2015 → 2025) and company logos below

**Kaido Koort card:**
- **Photo:** Grayscale, high contrast, extends 40px beyond right grid boundary
- **Name overlay:** White label positioned at photo bottom edge, extending into content area
- Title: "Over 23 years I've led eight teams, launched six products and wrote a handbook"
- Credentials: MSc, MA (small badges)
- Products: StaffLogic, Smart-ID, SurfCast, Lunar Base, PSD2, KaTa
- Tagline: Professional Service Companies | Analysis | Strategy | Product | CTO | Game Design | Incentive Alignment | Father of Two
- Timeline: Horizontal bar with year markers (2005 → 2015 → 2025) and company logos below

**Shared element:** Book cover "AI Coding for Beginners"
- Positioned between the two cards, centered
- Slight rotation (2-3°) for visual interest
- Caption: "Co-authors" below

**Grid break techniques:**
- Photos extend beyond content container
- Name labels overlap photo/content boundary
- Timeline bars span full width, ignore column structure

**Mobile responsive:**
- Single column, photos full-width (no offset)
- Name labels stack below photo
- Timelines simplified to key milestones
- Book cover centered between cards

### 7. Footer / Contact

- **Heading:** "Contact"
- **Icons:** LinkedIn, Phone, Email (clickable)
- **Links:**
  - LinkedIn: linkedin.com/in/kaidokoort/
  - Phone: +372 5077 333
  - Email: kaido@plepic.com
- **Company info:**
  - Plepic OÜ
  - Liivalaia 7, 10118, Tallinn
  - Reg. nr: 11275881 • VAT ID: EE102813797
- **Copyright:** © 2026 Plepic. All rights reserved.

## Training Subpage (/training)

- Full content from the existing training one-pager
- Same header/footer as homepage for consistency
- Not linked from main navigation (unlisted, accessed via direct link from Training section)

## Responsive Behavior

**Desktop (1024px+):**
- Full 12-column grid active
- All broken grid effects (offsets, overlaps, bleeds)
- Asymmetric layouts with alternating compositions

**Tablet (768px - 1023px):**
- 8-column grid
- Reduced grid breaks (20px offsets instead of 40px)
- Photos contained within grid (no overflow)
- Maintain asymmetric text alignment

**Mobile (< 768px):**
- Single column, full-width
- No grid breaks — clean stacked layout
- Photos full-width, no offsets
- Centered CTAs, left-aligned text
- Simplified timelines (years only, fewer logos)
- Stats numbers remain large (64px) but contained

## Assets

**From training one-pager (`docs/training-one-pager/`):**
- image.png (Joosep photo)
- image2.png (Plepic logo/image)
- image3.jpg (Kaido photo)
- qr-code.png (registration QR)
- Client logo SVGs (inline in HTML)

**To create:**
- favicon.ico (from Plepic logo, 32x32)

**From assets directory (`docs/assets/`):**
- book-cover.png
- Company logos: nortal.png, guardtime.png, salv.png, helmes.png, holm.png, bitweb.png, datel.png, gridraven.png, lhv.png, luminor.png, make-commerce.png, sampo-pank.png, starman.png, id-solutions.png, smartid.png
- Tech icons: java.png, typescript.png, python.png, claude-code.png, aws.png
- Education: taltech.png, tartu-uni.png, itswf-belgium.png

## Deployment

**Platform:** GitHub Pages

**Process:**
1. Push to `main` branch
2. GitHub Pages serves from root directory
3. Custom domain: plepic.com (configure in repo settings + DNS)

**CI/CD:** None required for static HTML. Push = deploy.

## Security

- **HTTPS:** Enforced by GitHub Pages
- **No forms:** Contact via external links (email, phone, LinkedIn) - no server-side processing
- **External links:** Google Forms for registration (QR code)
- **Privacy:** No cookies, no tracking by default. Add privacy policy link if analytics added later.
- **CSP:** Not required for static site with no inline scripts

## Performance

**Targets (Core Web Vitals):**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Optimizations:**
- Images: Compress PNGs, use appropriate sizes
- Lazy loading: `loading="lazy"` on below-fold images (Team section, timeline logos)
- Fonts: Use `font-display: swap` for Google Fonts
- CSS: Single stylesheet, no unused styles
- No JavaScript required for core functionality

## SEO & Accessibility

**SEO:**
- Semantic HTML (header, main, section, footer)
- Meta title and description per page
- OpenGraph tags for social sharing
- Canonical URLs

**Accessibility (WCAG 2.1 AA):**
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for all images
- Sufficient color contrast (brand green on white/cream)
- Keyboard navigable
- Skip-to-content link

## Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome for Android
