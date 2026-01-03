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

**Colors:**
- Brand green: #00674f
- Background: #f5f3ee (warm cream)
- White: #ffffff
- Text: #1a1a1a, #444, #666

**Typography:**
- Headings: DM Serif Display
- Body: Source Sans Pro (400, 600, 700)

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
- **Layout:** Left-aligned content
- **Headline:** "Claude Code and Performance-Based Development for Entrepreneurs"
- **Tagline:** "Curious play. Epic growth."
- **CTA:** Green button "Book Free Strategy Session" (scrolls to Contact)

### 3. Training Highlight

- **Label:** "MARCH 2026 COHORT"
- **Headline:** "Master agentic coding in 6 weeks"
- **Description:** Claude Code practitioners train your developers to work 3-5x faster. Learn from early adopters how to build prompt libraries and automated workflows.
- **Stats grid (4 items):**
  - 6 Weeks / Fridays
  - 50 Academic Hours
  - 20 Max Participants
  - 2+ Years Experience Required
- **Pricing:** "80% funded by Töötukassa → You pay €504 (+VAT)"
- **Link:** "View full program →" (links to /training)

### 4. Client Logos

- **Label:** "Used by Estonian Tech Companies"
- **Logos:** Helmes, Holm, DPate, btweb, Ktiva Finance Group
- **Style:** Grayscale or muted, horizontal row, wraps on mobile

### 5. Testimonials & Stats

- **Stats (2 items):**
  - 8.4/10 Hackathon Avg. Score
  - 100+ Developers Trained
- **Note:** "Try our teaching style at upcoming hackathons before you commit to the full course."
- **Style:** Large serif numbers in brand green

### 6. Team

Two full-width cards based on the hackathon slides design.

**Joosep Simm card:**
- Photo: Grayscale with name label overlay
- Title: "Developer, Architect & AI Trainer"
- Languages: Java, Kotlin, Golang, TypeScript, Python
- Skills: Frontend, Backend, DevOps, AI Coding
- Tagline: Telecommunications | Blockchain | AML | Energy | Game Design | Agentic Coding | Father of Two
- Timeline: 2005 → 2015 → 2025 with company logos (Nortal, Guardtime, Salv, Scopeful)

**Kaido Koort card:**
- Photo: Grayscale with name label overlay
- Title: "Over 23 years I've led eight teams, launched six products and wrote a handbook"
- Credentials: MSc, MA
- Products: StaffLogic, Smart-ID, SurfCast, Lunar Base, PSD2, KaTa
- Tagline: Professional Service Companies | Analysis | Strategy | Product | CTO | Game Design | Incentive Alignment | Father of Two
- Timeline: 2005 → 2015 → 2025 with company logos (Starman, Sampo Pank, Nortal, SK ID Solutions, Luminor, Makecommerce, LHV, Scopeful)

**Shared element:** Book cover "AI Coding for Beginners" with caption "Co-authors"

**Mobile responsive:**
- Photo + name stacks above content
- Timeline simplified (years + key logos)
- Book cover moves below bio

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

- **Desktop:** Multi-column layouts where appropriate
- **Tablet:** Reduced columns, adjusted spacing
- **Mobile:** Single column, stacked elements, simplified timelines

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
