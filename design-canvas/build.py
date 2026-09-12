#!/usr/bin/env python3
"""Generate the Claude Design canvas artboards from the live site source.

The canvas must not become a second set of values. Everything a rule can be
read off is pulled from css/styles.css, index.html and design-system.html at
build time: both inlinings of the mark verbatim, the token block, the card
measurements, the animation keyframes, the facet slot table. Nothing here
restates a value the repository owns.

The build refuses rather than lies. It stops unless the mark is 22 facets, the
hinge partition is 11/11, and exactly two facet slots are swapped. Add a check
here whenever you add a claim a value could falsify.

Ten artboards on three pages. Identity: Foundations, Type, Voice, Logo.
System: Layout, Motion, Components. Objects: Mark, Card, Hero. Motion and
Components are live; hovering does on the canvas what it does on the site.

To update the published canvas after a design change:

  1. python3 design-canvas/build.py
  2. Seed a fresh page from the bundled `design` skill's template:

     node "<skill dir>/seed-canvas.mjs" \
       --template "<skill dir>/payload.template.html" \
       --out plepic-design-system.html --title "Plepic Design System" \
       --artboard Main.dc.html   --artboard Type.dc.html \
       --artboard Voice.dc.html  --artboard Logo.dc.html \
       --artboard Layout.dc.html --artboard Motion.dc.html \
       --artboard Components.dc.html \
       --artboard Mark.dc.html   --artboard Card.dc.html \
       --artboard Hero.dc.html \
       --image joosep.jpg --image kaido.jpg --image vootele.jpg \
       --canvas canvas.json

  3. node "<skill dir>/seed-canvas.mjs" --check plepic-design-system.html
  4. Republish to the SAME artifact URL. Publishing without it creates a second
     canvas, which is the one failure the whole exercise exists to prevent.

Three things that look like oversights and are not. Export is not declared,
because a canvas offering PNG/PDF can be shared inside the org only and this
one is public. The seeded page is gitignored, because it is ~2.6 MB of editor
payload these sources rebuild. Ligatures are off canvas-wide, because
JetBrains Mono ligates a double hyphen into one long dash and silently renames
every token.

Frames in canvas.json are fixed. Surplus frame is harmless, clipping is not:
after a content change, measure the real height at 1120px wide and give the
frame about five percent of slack.

Scope and rationale: docs/specs/2026-09-08-claude-design-sync.md.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "design-canvas"
CSS = (ROOT / "css" / "styles.css").read_text()
INDEX = (ROOT / "index.html").read_text()

# --- values lifted from the stylesheet, never typed twice -------------------
def token(name):
    m = re.search(r"^\s*" + re.escape(name) + r":\s*(.+?);", CSS, re.M)
    if not m:
        raise SystemExit("missing token " + name)
    return m.group(1).strip()

def portrait_transform(who):
    m = re.search(
        r'\.tt-card\[data-instructor="' + who + r'"\] \.tt-portrait \{\s*transform:\s*(.+?);',
        CSS, re.S)
    if not m:
        raise SystemExit("missing portrait transform for " + who)
    return m.group(1).strip()

MARK = re.search(r'<svg class="mark-flat".*?</svg>', INDEX, re.S).group(0)
if MARK.count("<polygon") != 22:
    raise SystemExit("mark geometry is not 22 facets")

# The hinge partition is the module's own rule: a facet belongs to the wing its
# first point sits on, and the axis is the viewBox's own midline, so no
# coordinate is typed here either.
VIEWBOX = re.search(r'viewBox="0 0 ([0-9.]+) ([0-9.]+)"', MARK)
VB_W, VB_H = float(VIEWBOX.group(1)), float(VIEWBOX.group(2))
AXIS = VB_W / 2
_polys = re.findall(r'<polygon[^>]*/>', MARK)
_left = [p for p in _polys if float(re.search(r'points="([0-9.]+),', p).group(1)) < AXIS]
_right = [p for p in _polys if float(re.search(r'points="([0-9.]+),', p).group(1)) > AXIS]
if len(_left) != 11 or len(_right) != 11:
    raise SystemExit("hinge partition is not 11/11: %d/%d" % (len(_left), len(_right)))
_core = re.findall(r'<(?:path|circle)[^>]*/>', MARK)


FONTS = ("https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,400..700;1,400..500"
         "&family=Hanken+Grotesk:ital,wght@0,400..700;1,400"
         "&family=JetBrains+Mono:wght@400..700&display=swap")

TOKEN_NAMES = [
    "--green-vivid", "--green-brand", "--green-dark", "--green-light", "--green-surface",
    "--accent", "--bg", "--bg-alt", "--surface", "--dark", "--dark-surface",
    "--text", "--text-2", "--text-3", "--text-on-dark", "--text-on-dark-2",
    "--border", "--border-dark",
    "--font-display", "--font-body", "--font-mono",
    "--fs-body", "--fs-body-lg", "--fs-h2", "--fs-h3", "--fs-h4",
    "--space-xs", "--space-sm", "--space-md", "--space-lg", "--space-xl",
    "--space-2xl", "--space-3xl", "--space-4xl",
    "--card-shadow-hover", "--photo-grade", "--tilt-x", "--tilt-y",
    "--lift-height", "--tilt-dur", "--tilt-perspective",
    "--dur-fast", "--dur-base", "--dur-settle", "--dur-entrance",
    "--ease-settle", "--ease-calm", "--max-width", "--header-height",
    "--transition-fast", "--transition-base", "--transition-smooth",
    "--breath-period", "--breath-open", "--breath-offset", "--breath-bob",
    "--wingbeat-dur", "--wingbeat-open",
]
T = {n: token(n) for n in TOKEN_NAMES}

# The facet colour law: no two adjacent facets share a colour, and the wings
# are exact outline mirrors whose asymmetry lives only in the fills. The slot
# table is read off the geometry rather than transcribed, and the build stops
# if the number of swapped slots ever changes.
FACET_NAME = {T["--green-dark"]: "DK", T["--green-brand"]: "B", T["--green-vivid"]: "V"}


def _facet(poly):
    return FACET_NAME[re.search(r'fill="([^"]+)"', poly).group(1)]


SLOTS = [(i, _facet(l), _facet(r)) for i, (l, r) in enumerate(zip(_left, _right))]
SWAPS = [i for i, l, r in SLOTS if l != r]
if len(SWAPS) != 2:
    raise SystemExit("expected 2 swapped facet slots, found %d: %s" % (len(SWAPS), SWAPS))

BASE = """    :root {
%s
    }
    * { box-sizing: border-box; font-variant-ligatures: none; }
    body { margin: 0; background: var(--bg); color: var(--text);
           font-family: var(--font-body); font-weight: 400;
           -webkit-font-smoothing: antialiased; }
    .board { padding: 56px 64px; }
    .eyebrow { font-family: var(--font-mono); font-size: 9.5px; line-height: normal;
               letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-3);
               margin: 0 0 10px; }
    .board > h1 { font-family: var(--font-display); font-weight: 700; font-size: 2.6rem;
                  line-height: 1.15; letter-spacing: -0.01em; margin: 0 0 10px; }
    .lede { font-size: 1.05rem; line-height: 1.6; color: var(--text-2);
            max-width: 62ch; margin: 0 0 40px; }
    h2.sec { font-family: var(--font-display); font-weight: 700; font-size: 1.25rem;
             line-height: 1.15; margin: 0 0 4px; }
    .sec-note { font-size: 0.9rem; line-height: 1.5; color: var(--text-3);
                margin: 0 0 18px; max-width: 68ch; }
    .mono { font-family: var(--font-mono); }
    hr.rule { border: 0; border-top: 1px solid var(--border); margin: 40px 0 32px; }
""" % "\n".join("      %s: %s;" % (k, v) for k, v in T.items())


def page(body, extra_css=""):
    return (
        "<!doctype html>\n<html>\n<head><meta charset=\"utf-8\">"
        "<script src=\"./support.js\"></script></head>\n<body>\n<x-dc>\n"
        "  <helmet>\n"
        "    <link rel=\"stylesheet\" href=\"" + FONTS + "\">\n"
        "    <style>\n" + BASE + extra_css + "    </style>\n"
        "  </helmet>\n" + body + "\n</x-dc>\n</body>\n</html>\n")


# --- Main: foundations ------------------------------------------------------
# One ramp, lightest to darkest. Any other order is a list a reader has to
# take on trust; a ramp checks itself. The accent sits after a break because
# it is not a step on the ramp, it is the one colour that is not green.
BRAND = [
    ("--green-surface", "Section ground when a block must lift off the page"),
    ("--green-light", "Quiet fill behind a green statement"),
    ("--green-vivid", "Facet light. The mark, never text"),
    ("--green-brand", "The one load-bearing phrase in a heading"),
    ("--green-dark", "Facet shadow, mark body, antennae"),
]
ACCENT = ("--accent", "The ember at the mark's head. One call to action")

# Neutrals are one set of roles filled twice, not two lists of chips. The
# pairing is the content: a reader looks across a row instead of hunting a
# "-on-dark" twin in a second grid. Where dark has no twin, saying so is the
# useful fact. Each column is painted in its own ground, so every ink is shown
# on the ground it is for.
NEUTRALS = [
    ("Ground", "--bg", "--dark", "What the page is made of"),
    ("Recessed", "--bg-alt", None, "A well cut into the ground"),
    ("Raised", "--surface", "--dark-surface", "A sheet lifted off it"),
    ("Hairline", "--border", "--border-dark", "The only line either context draws"),
    ("Ink", "--text", "--text-on-dark", "Body and every heading"),
    ("Ink, quieter", "--text-2", "--text-on-dark-2", "The supporting sentence"),
    ("Ink, label", "--text-3", None, "Eyebrow, caption, token name"),
]
INK_ROLES = {"Ink", "Ink, quieter", "Ink, label"}


def brand_swatch(name, role):
    return ("      <div class=\"sw\">\n"
            "        <div class=\"chip\" style=\"background: %s\"></div>\n"
            "        <p class=\"sw-name mono\">%s</p>\n"
            "        <p class=\"sw-hex mono\">%s</p>\n"
            "        <p class=\"sw-role\">%s</p>\n"
            "      </div>\n" % (T[name], name, T[name], role))


def ncell(side, role, name):
    if name is None:
        return ("      <div class=\"ncell ncell--%s ncell--none\"><span class=\"nnone\">"
                "no twin</span></div>\n" % side)
    ink = " style=\"color: %s\"" % T[name] if role in INK_ROLES else ""
    return ("      <div class=\"ncell ncell--%s\">\n"
            "        <span class=\"nchip\" style=\"background: %s\"></span>\n"
            "        <span class=\"ntok mono\"%s>%s</span>\n"
            "        <span class=\"nhex mono\">%s</span>\n"
            "      </div>\n" % (side, T[name], ink, name, T[name]))


def nrow(role, light, dark, note):
    return ("      <div class=\"nrole\"><span class=\"nrole-name\">%s</span>"
            "<span class=\"nrole-note\">%s</span></div>\n%s%s"
            % (role, note, ncell("light", role, light), ncell("dark", role, dark)))


# Stated only while it is true, so a token change retires the sentence rather
# than turning it into a lie nobody re-reads.
DOUBLES = ""
if T["--dark"] == T["--text"] and T["--border"] == T["--text-on-dark"]:
    DOUBLES = (" Two values do four jobs here: the dark ground is the light ink, "
               "and the light hairline is the dark ink. An inverted section is "
               "the same page turned over.")

main_css = """    .sw-grid { display: grid; grid-template-columns: repeat(6, 1fr);
                gap: 0 18px; align-items: start; }
    .sw-break { border-left: 1px solid var(--border); padding-left: 18px;
                margin-left: -18px; }
    .chip { height: 76px; outline: 1px solid rgba(28, 28, 26, 0.1);
            outline-offset: -1px; }
    .sw-name { font-size: 11px; letter-spacing: 0.02em; color: var(--text);
               margin: 9px 0 2px; }
    .sw-hex { font-size: 10.5px; letter-spacing: 0.02em; color: var(--text-3);
              margin: 0 0 5px; }
    .sw-role { font-size: 0.82rem; line-height: 1.45; color: var(--text-2); margin: 0; }
    .ngrid { display: grid; grid-template-columns: 236px 1fr 1fr;
             align-items: stretch; }
    .nhead { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
             text-transform: uppercase; color: var(--text-3); padding: 0 0 8px 16px; }
    .nrole { display: flex; flex-direction: column; justify-content: center;
             padding: 11px 20px 11px 0; }
    .nrole-name { font-family: var(--font-display); font-weight: 700;
                  font-size: 0.95rem; line-height: 1.2; color: var(--text); }
    .nrole-note { font-size: 0.8rem; line-height: 1.4; color: var(--text-3);
                  margin-top: 2px; }
    .ncell { display: flex; align-items: center; gap: 12px; padding: 11px 16px; }
    .ncell--light { background: var(--bg); border-bottom: 1px solid var(--border); }
    .ncell--dark { background: var(--dark); border-bottom: 1px solid var(--border-dark); }
    .nchip { width: 26px; height: 26px; flex: none;
             outline: 1px solid rgba(128, 128, 122, 0.35); outline-offset: -1px; }
    .ntok { font-size: 11px; letter-spacing: 0.02em; flex: 1; }
    .ncell--light .ntok { color: var(--text); }
    .ncell--dark .ntok { color: var(--text-on-dark); }
    .nhex { font-size: 10.5px; letter-spacing: 0.02em; }
    .ncell--light .nhex { color: var(--text-3); }
    .ncell--dark .nhex { color: var(--text-on-dark-2); }
    .nnone { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.02em;
             color: var(--text-on-dark-2); }
    .canon { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .canon--4 { grid-template-columns: repeat(4, 1fr); gap: 22px; }
    .canon .mono { font-size: 0.92em; }
    .canon h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .canon p { font-size: 0.9rem; line-height: 1.55; color: var(--text-2); margin: 0; }
"""

main_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Foundations</h1>
    <p class="lede">The register is weight, lift, tilt and breath &mdash; never colour. Colour names a role and holds it. Every value on this canvas is the value in <span class="mono" style="font-size:0.95em">css/styles.css</span>; nothing here is a second opinion.</p>

    <h2 class="sec">Brand</h2>
    <p class="sec-note">One ramp, lightest to darkest, and one colour that is not green. In type, green is a single load-bearing phrase, never a whole heading.</p>
    <div class="sw-grid">
%s      <div class="sw sw-break">
        <div class="chip" style="background: %s"></div>
        <p class="sw-name mono">%s</p>
        <p class="sw-hex mono">%s</p>
        <p class="sw-role">%s</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Neutrals</h2>
    <p class="sec-note">One set of roles, filled twice. A colour is named by the job it does, so the dark column is the light column's answer and not a second palette. The dark column is a device for an emphasis section, never a theme: the public site is light on every page.%s</p>
    <div class="ngrid">
      <div></div><div class="nhead">On light</div><div class="nhead">On dark</div>
%s    </div>

    <hr class="rule">
    <h2 class="sec">Four laws</h2>
    <p class="sec-note">These are why the palette has the values it has. A new need is met by an existing step, never by a new colour.</p>
    <div class="canon canon--4">
      <div><h3>The 73%% rule</h3><p>One hue for every green, 137&deg;, at 73%% saturation. Vivid is the single decorative exception at 100%%. The accent sits at hue 15&deg; with its saturation matched to 73%%, which is why an orange and a green from this palette look like they were mixed by the same hand.</p></div>
      <div><h3>One accent per viewport</h3><p>Exactly one: a CTA button, or an urgency badge, or an accent dot. Never two, and the mobile sticky CTA yields to whatever is already there. No accent variants either &mdash; states use opacity.</p></div>
      <div><h3>The vivid text ban</h3><p><span class="mono">--green-vivid</span> is never text on light. It measures 2.5:1 on cream and fails AA. It is facet light and a dark-mode label, nothing else.</p></div>
      <div><h3>The dark placement rule</h3><p>The public site is light. Every page, no exemptions: no <span class="mono">.on-dark</span>, no dark background, whether written as a token or a hex literal. The device grew onto the homepage in June 2026 and came off in August; a guard now fails any production page that reaches for it. It appears on this canvas only where documenting a device is not using it.</p></div>
    </div>

    <hr class="rule">
    <div class="canon">
      <div><h3>Headings are ink</h3><p>At most one green phrase carries the sentence. A fully green heading is off-canon in any medium.</p></div>
      <div><h3>The mark is locked</h3><p>Twenty-two facets, one body, two antennae, one ember. Never recoloured, never re-faceted, never redrawn.</p></div>
      <div><h3>Nothing shines</h3><p>No cyan, no neon, no glassmorphism, no gradient text. Elevation is ink and shadow, and only ever a hover state.</p></div>
    </div>
  </div>""" % (
    "".join(brand_swatch(n, r) for n, r in BRAND),
    T[ACCENT[0]], ACCENT[0], T[ACCENT[0]], ACCENT[1],
    DOUBLES,
    "".join(nrow(*row) for row in NEUTRALS),
)

(OUT / "Main.dc.html").write_text(page(main_body, main_css))

# --- Type -------------------------------------------------------------------
type_css = """    .spec { display: grid; grid-template-columns: 168px 1fr; gap: 24px;
            padding: 20px 0; border-top: 1px solid var(--border); align-items: baseline; }
    .spec:last-of-type { border-bottom: 1px solid var(--border); }
    .spec .meta p { margin: 0 0 2px; font-family: var(--font-mono); font-size: 10.5px;
                    line-height: 1.5; letter-spacing: 0.02em; color: var(--text-3); }
    .spec .meta p.tok { color: var(--text); }
    .d { font-family: var(--font-display); font-weight: 700; line-height: 1.15;
         letter-spacing: -0.01em; color: var(--text); margin: 0; }
    .b { font-family: var(--font-body); color: var(--text); margin: 0; }
    .m { font-family: var(--font-mono); margin: 0; }
    .stack { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 8px; }
    .stack div { border-top: 1.5px solid var(--text); padding-top: 12px; }
    .canon { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .canon h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .canon p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .canon .mono { font-size: 0.92em; }
    .stack h3 { margin: 0 0 4px; font-size: 1rem; font-weight: 700;
                font-family: var(--font-display); }
    .stack p { margin: 0; font-size: 0.88rem; line-height: 1.55; color: var(--text-2); }
"""

def spec(tok, resolved, note, cls, style, sample):
    return ("    <div class=\"spec\">\n"
            "      <div class=\"meta\"><p class=\"tok\">%s</p><p>%s</p><p>%s</p></div>\n"
            "      <p class=\"%s\" style=\"%s\">%s</p>\n"
            "    </div>\n" % (tok, resolved, note, cls, style, sample))

type_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Type</h1>
    <p class="lede">Three faces, one job each. Bitter carries every heading, Hanken Grotesk every sentence, JetBrains Mono every label and every line of code. A face never borrows another's job.</p>

    <div class="stack">
      <div><h3>Bitter</h3><p>Display. 400&ndash;700 upright, 400&ndash;500 italic. Headings only, always at &minus;0.01em and 1.15 line height.</p></div>
      <div><h3>Hanken Grotesk</h3><p>Body. 400&ndash;700 upright, 400 italic. Running text at 1.7 line height; UI text at 1.5.</p></div>
      <div><h3>JetBrains Mono</h3><p>Label and code. Uppercase eyebrows at 0.16em; code at its natural tracking.</p></div>
    </div>

    <hr class="rule">
    <h2 class="sec">Scale</h2>
    <p class="sec-note">Headings ramp with the viewport; body does not. The two clamps below are shown at their upper bound.</p>
%s%s%s%s%s%s%s
    <hr class="rule">
    <h2 class="sec">Four things the scale assumes</h2>
    <div class="canon">
      <div><h3>Display is hero-only</h3><p>A non-hero h1 uses clamp(2rem, 2rem + 3vw, 3.5rem). Reaching for the hero ramp on an interior page makes every page look like a landing page.</p></div>
      <div><h3>Weight carries the bottom</h3><p>At their clamp minimums h3, h4 and body are the same size. What separates them there is weight, not scale, which is why an h3 must never be set at 400.</p></div>
      <div><h3>Two namespaces, no overlap</h3><p><span class="mono">--fs-</span> is size. <span class="mono">--text-</span> is colour. A token that sets both is a token that will be wrong for one of them.</p></div>
    </div>
    <p class="sec-note" style="margin-top: 18px">The Line-Height Trap: a compact component that inherits the body&rsquo;s 1.7 grows a box nobody asked for. Buttons, badges and labels set <span class="mono" style="font-size:0.95em">line-height: normal</span> explicitly.</p>
  </div>""" % (
    spec("--fs-h2", T["--fs-h2"], "Bitter 700 / 1.15", "d", "font-size: 2.6rem;",
         "Learn the craft from people who ship"),
    spec("--fs-h3", T["--fs-h3"], "Bitter 700 / 1.15", "d", "font-size: 1.65rem;",
         "Three instructors, one tabletop"),
    spec("--fs-h4", T["--fs-h4"], "Bitter 700 / 1.15", "d", "font-size: 1.25rem;",
         "What a cohort actually covers"),
    spec("card name", "1.4rem", "Bitter 700 / 1.15", "d", "font-size: 1.4rem;",
         "Joosep Simm"),
    spec("--fs-body", T["--fs-body"], "Hanken 400 / 1.7", "b",
         "font-size: 1.25rem; line-height: 1.7;",
         "An engineer arrives able to write code and leaves able to direct agents that write it."),
    spec("card role", "1rem", "Hanken 400 / 1.5 &middot; --text-2", "b",
         "font-size: 1rem; line-height: 1.5; color: var(--text-2);",
         "Ships code at Gridraven."),
    spec("eyebrow", "9.5px / 0.16em", "Mono 400 / uppercase &middot; --text-3", "m",
         "font-size: 9.5px; line-height: normal; letter-spacing: 0.16em; "
         "text-transform: uppercase; color: var(--text-3);",
         "Instructor &middot; Practitioner"),
)

(OUT / "Type.dc.html").write_text(page(type_body, type_css))

# --- Card -------------------------------------------------------------------
card_css = """    .row { display: grid; grid-template-columns: repeat(3, 300px);
           gap: 32px; align-items: stretch; }
    .seat { display: block; }
    .tt-card { position: relative; display: flex; flex-direction: column;
               height: 100%; padding: 18px 24px; }
    .tt-card::before { content: ""; position: absolute; z-index: -1; inset: 0;
                       background: var(--surface); opacity: 0; }
    .tt-type { margin: 0; padding-top: 12px; border-top: 1.5px solid var(--text);
               font-family: var(--font-mono); font-size: 9.5px; line-height: normal;
               letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-3); }
    .tt-name { display: flex; align-items: baseline; justify-content: space-between;
               gap: var(--space-sm); margin: 6px 0 0; font-family: var(--font-display);
               font-weight: 700; font-size: 1.4rem; line-height: 1.15; color: var(--text); }
    .tt-setglyph { width: 15px; flex: none; }
    .tt-setglyph svg { display: block; width: 100%; height: auto; }
    .tt-art { position: relative; flex: none; margin-top: 18px; aspect-ratio: 1;
              overflow: hidden; background: var(--bg-alt); }
    .tt-ink { position: absolute; inset: 0; mix-blend-mode: multiply; }
    .tt-portrait { width: 100%; height: 100%; object-fit: cover; filter: var(--photo-grade); }
    .tt-role { flex: 1; margin: 14px 0 0; padding-bottom: 16px;
               border-bottom: 1px solid var(--border); font-family: var(--font-body);
               font-size: 1rem; line-height: 1.5; color: var(--text-2); }
    .tt-company { color: var(--text); }
    .lifted > .tt-card { transform: translateY(calc(-1 * var(--lift-height))); }
    .lifted > .tt-card::before { opacity: 1; box-shadow: var(--card-shadow-hover); }
    .state { display: grid; grid-template-columns: repeat(2, 300px); gap: 88px; }
    .state-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
                   text-transform: uppercase; color: var(--text-3); margin: 0 0 14px; }
    .part { display: grid; grid-template-columns: 130px 130px 1fr; gap: 20px;
            padding: 11px 0; border-top: 1px solid var(--border); align-items: baseline; }
    .part b { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem;
              color: var(--text); }
    .part code { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.02em;
                 color: var(--text-3); }
    .part span { font-size: 0.85rem; line-height: 1.5; color: var(--text-2); }
    .anat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
            border-top: 1.5px solid var(--text); padding-top: 16px; }
    .anat h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
               margin: 0 0 6px; }
    .anat p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .anat .mono { font-size: 0.92em; }
"""

PARTS = [
    ("Seat", ".tt-seat",
     "An untransformed wrapper that owns the hover and the data-tilt hook. A transformed element is hit-tested against its transformed box, so a card that tracked its own hover chased itself out from under a resting pointer: 86 enter and leave events in two and a half seconds, measured. The seat never moves, which is what makes both the hover and the per-frame measurement trustworthy."),
    ("Column", ".tt-card",
     "A flex column at 18px 24px padding. It sets no width of its own: the Card fills the column it is handed, and the homepage team grid caps that track at 300px. The vertical padding keeps both rules off the cut edge; the horizontal padding is the margin the sheet shows once it appears."),
    ("Sheet", ".tt-card::before",
     "inset 0, --surface, opacity 0 at rest; on hover and focus-within it fades to 1 under --card-shadow-hover while the card rises. A ::before rather than the card's own background, because a background paints under the children's borders and both rules would vanish under the white the moment it faded in."),
    ("Standing head", ".tt-type",
     "Mono 9.5px, 0.16em, uppercase, --text-3 warming to --text-2 on hover, at line-height normal against the Line-Height Trap. It carries the 1.5px ink rule on its own top edge, so the rule that holds the column is a property of the first line rather than a separate element. Names the role. Carries no number."),
    ("Byline", ".tt-name",
     "Display 700 at 1.4rem, a flex row on align-items: baseline. The baseline sits the set glyph on the name's own baseline, so the two read as one printed line and not as a name with a badge beside it."),
    ("Set glyph", ".tt-setglyph",
     "The mark at 15px, the smallest sanctioned size, held at that width by flex: none when a long name claims the rest of the line. The ember head inside it belongs to the locked mark; it is not an accent element and does not spend the card's accent budget."),
    ("Plate", ".tt-art",
     "Square by aspect-ratio. Square corners, no frame, a tone instead of an edge: the ground is --bg-alt and is deliberately not swapped for white, because the multiply below pulls the cream up into the photograph as well as dropping the studio white down into the page. Every face picking up the same faint warm cast is the last step of the grade, and the one step identical for all three by construction."),
    ("Ink wrapper", ".tt-ink",
     "inset 0, mix-blend-mode multiply. The blend and the filter sit on different elements on purpose: both on one node is the combination engines disagree about, and a filtered image inside a blending wrapper renders the same everywhere."),
    ("Photograph", ".tt-portrait",
     "A real photograph, in colour, object-fit cover under --photo-grade. One chain, one selector, all three faces, no per-person override: if a face needs its own number the grade is wrong, not the face. Framing is the exception and it is geometry, never colour, so each card carries a translate and a scale per person."),
    ("Day-job line", ".tt-role",
     "The present-tense sentence in body on --text-2, employer in ink because it is the only word a reader scans for. It is also the part that grows: flex: 1 takes the spare height, so the closing 1px rule lands on one line across a row of unequal text."),
]

def card(who, name, role_html, lifted=False):
    return ("      <div class=\"seat%s\">\n"
            "        <article class=\"tt-card\">\n"
            "          <p class=\"tt-type\">Instructor &middot; Practitioner</p>\n"
            "          <h3 class=\"tt-name\">%s<span class=\"tt-setglyph\">%s</span></h3>\n"
            "          <div class=\"tt-art\">\n"
            "            <span class=\"tt-ink\"><img class=\"tt-portrait\" src=\"%s.jpg\" alt=\"%s\" style=\"transform: %s;\"></span>\n"
            "          </div>\n"
            "          <p class=\"tt-role\">%s</p>\n"
            "        </article>\n"
            "      </div>\n" % (" lifted" if lifted else "", name, MARK, who, name,
                               portrait_transform(who), role_html))


card_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>The card</h1>
    <p class="lede">A graded editorial column. The rule above the eyebrow opens it, the rule under the role closes it, and nothing else draws a box. The set is graded as one photograph, so three faces read as one deck rather than three uploads.</p>

    <h2 class="sec">The set at rest</h2>
    <p class="sec-note">Three columns on the page ground, no card of its own. 300px each, 32px apart, stretched to one height.</p>
    <div class="row">
%s%s%s    </div>

    <hr class="rule">
    <h2 class="sec">Rest and lift</h2>
    <p class="sec-note">Hover is the only time a sheet appears: the column rises 5px and a white surface with a soft shadow prints behind it. On a fine pointer the card also tilts up to 9&deg; / 11&deg; toward the cursor &mdash; motion this artboard cannot show.</p>
    <div class="state">
      <div><p class="state-label">Rest</p>
        <div class="row" style="grid-template-columns: 300px">
%s        </div>
      </div>
      <div><p class="state-label">Hover &middot; lifted</p>
        <div class="row" style="grid-template-columns: 300px">
%s        </div>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Part by part, in source order</h2>
    <p class="sec-note">Ten parts, and every one of them is answering something that went wrong. This is the component whole: drop a part and the reason it existed comes back.</p>
%s
    <hr class="rule">
    <h2 class="sec">Four things a card never does</h2>
    <div class="anat">
      <div><h3>It never rests elevated</h3><p>The Card obeys flat-by-default rather than claiming an exception to it. Nothing at rest but the two rules, and the sheet only while a pointer or the keyboard is on it.</p></div>
      <div><h3>It never ranks a person</h3><p>No tier and no power number on a card that carries a face. It ranks a real person in public, and the number behind the rank cannot be verified.</p></div>
      <div><h3>It never spends the accent</h3><p>The card&rsquo;s only warm pixel is the ember head inside the locked mark, so a row of three cards still leaves the viewport&rsquo;s one accent unspent.</p></div>
      <div><h3>It never depends on the script</h3><p>The lift is CSS, the rotation is JavaScript. With the module absent, on touch, and under reduced motion the sheet still appears and the card still rises. It simply does not rotate.</p></div>
    </div>

    <hr class="rule">
    <div class="anat">
      <div><h3>The rule opens it</h3><p>A 1.5px ink rule sits above the eyebrow. It is the card's only hard edge; there is no border and no radius.</p></div>
      <div><h3>One grade, one set</h3><p>Every portrait carries the same <span class="mono">--photo-grade</span> and multiplies into the page ground. Never grade a face on its own.</p></div>
      <div><h3>The mark signs the name</h3><p>A 15px butterfly closes the name line. It breathes on its own and beats its wings when the card is hovered.</p></div>
      <div><h3>Elevation is a state</h3><p><span class="mono">--surface</span> and <span class="mono">--card-shadow-hover</span> exist only under a pointer. At rest the card owns no shadow at all.</p></div>
    </div>
  </div>""" % (
    card("joosep", "Joosep Simm", "Ships code at <span class=\"tt-company\">Gridraven</span>."),
    card("kaido", "Kaido Koort", "Builds the <span class=\"tt-company\">Plepic</span> website and product."),
    card("vootele", "Vootele R&otilde;tov", "Builds <span class=\"tt-company\">Balancing.services</span>."),
    card("joosep", "Joosep Simm", "Ships code at <span class=\"tt-company\">Gridraven</span>."),
    card("joosep", "Joosep Simm", "Ships code at <span class=\"tt-company\">Gridraven</span>.", lifted=True),
    "".join("    <div class=\"part\"><b>%s</b><code>%s</code><span>%s</span></div>\n"
            % (n, c, d) for n, c, d in PARTS),
)

(OUT / "Card.dc.html").write_text(page(card_body, card_css))

# --- Mark -------------------------------------------------------------------
# The construction spec, the facet colour law and the slot table all come off
# the geometry that was extracted above, so this artboard cannot describe a
# mark the page does not draw.
mark_css = """    .sizes { display: flex; align-items: flex-end; gap: 60px; padding: 8px 0 0; }
    .size .m { display: block; }
    .size .cap { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
                 text-transform: uppercase; color: var(--text-3); margin: 18px 0 0; }
    .size .use { font-size: 0.85rem; line-height: 1.5; color: var(--text-2);
                 margin: 4px 0 0; max-width: 22ch; }
    .size svg { display: block; width: 100%; height: auto; }
    .spec { display: grid; grid-template-columns: 150px 1fr; gap: 16px;
            padding: 11px 0; border-top: 1px solid var(--border); }
    .spec b { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem;
              color: var(--text); }
    .spec span { font-size: 0.88rem; line-height: 1.5; color: var(--text-2); }
    .two { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 48px;
           align-items: start; }
    .slots { width: 100%; border-collapse: collapse; }
    .slots th, .slots td { text-align: left; font-family: var(--font-mono);
                           font-size: 10.5px; letter-spacing: 0.04em;
                           padding: 5px 8px; border-bottom: 1px solid var(--border); }
    .slots th { color: var(--text-3); text-transform: uppercase;
                letter-spacing: 0.16em; font-size: 9.5px; font-weight: 400; }
    .slots td:first-child { color: var(--text-3); }
    .slots .sw td { color: var(--accent); }
    .slots .sw td:last-child { font-size: 9.5px; letter-spacing: 0.1em; }
    .keys { display: flex; gap: 18px; margin: 0 0 14px; }
    .key { display: inline-flex; align-items: center; gap: 7px;
           font-family: var(--font-mono); font-size: 10.5px; color: var(--text-2); }
    .key i { width: 14px; height: 14px; display: block; }
    .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .facts h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .facts p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .facts .mono { font-size: 0.92em; }
"""


def mark_at(px, cls, use):
    return ("      <div class=\"size\">\n"
            "        <span class=\"m\" style=\"width: %dpx;\">%s</span>\n"
            "        <p class=\"cap\">%s &middot; %dpx</p>\n"
            "        <p class=\"use\">%s</p>\n"
            "      </div>\n" % (px, MARK, cls, px, use))


mark_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>The mark</h1>
    <p class="lede">One locked cut, at every size: twenty-two facets, a leaf body, two antennae and one ember at the head. It is never recoloured, never re-faceted and never redrawn by hand. Copy the geometry, do not rebuild it.</p>

    <h2 class="sec">Four host widths, and no fifth</h2>
    <p class="sec-note">The viewBox owns the ratio, so a placement sizes the host and the mark follows. Only the card glyph is placed today; the other three are declared and waiting, and the header and footer still carry a static copy of the SVG rather than the live component.</p>
    <div class="sizes">
%s%s%s%s    </div>

    <hr class="rule">
    <h2 class="sec">Construction</h2>
    <p class="sec-note">Every number here is in the markup on the page. They are listed so a new placement can be checked, not so it can be retyped.</p>
    <div class="spec"><b>viewBox</b><span>0 0 %g %g. Square-ish, %g wide by %g tall.</span></div>
    <div class="spec"><b>Wing facets</b><span>11 triangles per wing, 22 in total. Adjacent triangles share an edge, so there is no gap to light through.</span></div>
    <div class="spec"><b>Centre seam</b><span>Left wings end at x=147, right wings start at x=153. The 6px between them is the body channel, and it is why the wings can hinge without clipping each other.</span></div>
    <div class="spec"><b>Body</b><span>One bezier path, a leaf from (150,92) to (150,200), filled <span class="mono">--green-dark</span>.</span></div>
    <div class="spec"><b>Antennae</b><span>Two paths from (150,86) curving out to (136,42) and (164,42). Stroked <span class="mono">--green-dark</span> at 1.8px, opacity 0.7.</span></div>
    <div class="spec"><b>Tips and head</b><span>Two circles r=3.5 at the antenna ends in <span class="mono">--green-vivid</span>, and one r=8 at (150,90) in <span class="mono">--accent</span>. That ember is the only orange in the mark.</span></div>
    <div class="spec"><b>Seam fix</b><span>Every polygon is stroked in its own fill at 0.5px. With <span class="mono">shape-rendering</span> set on the root it removes the hairline artifacts that otherwise show between adjacent triangles.</span></div>

    <hr class="rule">
    <h2 class="sec">The facet law</h2>
    <p class="sec-note">No two adjacent facets share a colour, so the wing reads as faceted rather than as a shape with texture. The outlines are exact mirrors about the body axis; the asymmetry lives entirely in the fills.</p>
    <div class="two">
      <div>
        <div class="keys">
          <span class="key"><i style="background: %s"></i>DK &middot; --green-dark</span>
          <span class="key"><i style="background: %s"></i>B &middot; --green-brand</span>
          <span class="key"><i style="background: %s"></i>V &middot; --green-vivid</span>
        </div>
        <p class="why" style="font-size:0.9rem; line-height:1.55; color: var(--text-2); margin:0">Slots %s and %s carry the whole asymmetry: the right wing swaps B and DK where the left does not. It is the one hand-made thing in an otherwise mirrored object, and it is why a wing cannot be produced by flipping the other one in a drawing tool. The generator that built this artboard counts the swapped slots and refuses to build if the number changes.</p>
      </div>
      <table class="slots">
        <tr><th>Slot</th><th>Left</th><th>Right</th><th></th></tr>
%s      </table>
    </div>

    <hr class="rule">
    <div class="facts">
      <div><h3>It breathes</h3><p>At rest the wings open and close on a long, calm loop while the core bobs. Nothing about the colour changes; breath is rotation and translation only. The Motion artboard runs it.</p></div>
      <div><h3>It beats on arrival</h3><p>Hovering a card the mark signs makes the wings beat wide and settle. The beat rides on the breath rather than replacing it, because each wing has two nested boxes and nested rotations compose.</p></div>
      <div><h3>Three layers, one source</h3><p>The page ships the flat SVG inside a <span class="mono">&lt;plepic-mark&gt;</span> host. The script re-stacks what it finds into left wing, right wing and core; it never draws geometry of its own, so the flat mark is always the truth.</p></div>
    </div>
  </div>""" % (
    mark_at(300, ".mark-display", "Declared, not yet placed."),
    mark_at(120, ".mark-art", "Declared, not yet placed."),
    mark_at(30, ".mark-nav", "The header lockup's size. Still a static copy there."),
    mark_at(15, ".tt-setglyph", "Set glyph on a card name. The only live placement."),
    VB_W, VB_H, VB_W, VB_H,
    T["--green-dark"], T["--green-brand"], T["--green-vivid"],
    SWAPS[0], SWAPS[1],
    "".join(
        "        <tr%s><td>%d</td><td>%s</td><td>%s</td><td>%s</td></tr>\n"
        % (" class=\"sw\"" if l != r else "", i, l, r, "fill swap" if l != r else "")
        for i, l, r in SLOTS),
)

(OUT / "Mark.dc.html").write_text(page(mark_body, mark_css))

# --- Voice ------------------------------------------------------------------
# The words are visual. The slogan, the headline pattern and the copy rules
# belong here for the same reason the greens do: one home, checked in one
# place. What never belongs here is a volatile value, and saying so is half
# the artboard's job.
voice_css = """    .slogan { font-family: var(--font-display); font-style: italic;
              font-weight: 500; font-size: 1.75rem; line-height: normal;
              color: var(--green-brand); margin: 0 0 0.6rem; }
    .mission { font-family: var(--font-display); font-weight: 700; font-size: 2.2rem;
               line-height: 1.2; letter-spacing: -0.012em; color: var(--text);
               margin: 0; max-width: 24ch; }
    .mission em { font-style: normal; color: var(--green-brand); }
    .decoder { display: flex; align-items: baseline; gap: 4px;
               font-family: var(--font-display); font-weight: 700;
               font-size: 2.6rem; line-height: 1.15; letter-spacing: -0.01em;
               margin: 0 0 6px; }
    .decoder .lit { color: var(--text); }
    .decoder .dim { color: var(--text-3); font-weight: 400; }
    .decoder .g { color: var(--green-brand); }
    .decode-note { font-size: 0.9rem; line-height: 1.5; color: var(--text-2);
                   margin: 0; max-width: 56ch; }
    .slogan-note { font-size: 0.9rem; line-height: 1.5; color: var(--text-3);
                   margin: 14px 0 0; max-width: 60ch; }
    .langs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .lang .tag { font-family: var(--font-mono); font-size: 9.5px;
                 letter-spacing: 0.16em; text-transform: uppercase;
                 color: var(--text-3); margin: 0 0 8px; }
    .lang .line { font-family: var(--font-display); font-weight: 700;
                  font-size: 1.5rem; line-height: 1.2; color: var(--text);
                  margin: 0 0 8px; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .say h3, .dont h3 { font-family: var(--font-mono); font-size: 9.5px;
                        letter-spacing: 0.16em; text-transform: uppercase;
                        margin: 0 0 12px; font-weight: 400; }
    .say h3 { color: var(--green-brand); }
    .dont h3 { color: var(--accent); }
    .ex { font-family: var(--font-display); font-weight: 700; font-size: 1.5rem;
          line-height: 1.2; margin: 0 0 8px; color: var(--text); }
    .ex em { font-style: normal; color: var(--green-brand); }
    .ex-all { color: var(--green-brand); }
    .why { font-size: 0.88rem; line-height: 1.5; color: var(--text-2); margin: 0; }
    .rules { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 40px; }
    .rule-row { display: grid; grid-template-columns: 150px 1fr; gap: 16px;
                padding: 12px 0; border-top: 1px solid var(--border); }
    .rule-row b { font-family: var(--font-display); font-weight: 700;
                  font-size: 0.95rem; color: var(--text); }
    .rule-row span { font-size: 0.88rem; line-height: 1.5; color: var(--text-2); }
    .never { background: var(--bg-alt); padding: 22px 26px; }
    .never p { font-size: 0.9rem; line-height: 1.55; color: var(--text-2);
               margin: 0 0 10px; }
    .never ul { margin: 0; padding-left: 18px; }
    .never li { font-size: 0.88rem; line-height: 1.6; color: var(--text-2); }
"""

voice_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Voice</h1>
    <p class="lede">The words are as fixed as the greens. A tagline that decodes the name and only works in English, an Estonian line that stands in its place, a category line that says what is sold, and one headline pattern. Everything else is written fresh, against the rules at the bottom.</p>

    <h2 class="sec">The sentence everything serves</h2>
    <p class="sec-note">Brand first, pixels second. Every rule on this canvas exists to make this one claim credible.</p>
    <p class="mission">Plepic helps a software engineer become an <em>agentic engineer</em>.</p>

    <hr class="rule">
    <h2 class="sec">The tagline, and why it is those four words</h2>
    <p class="sec-note">It is the name's decoder ring. PLEPIC is PL(ay) plus EPIC, and each half of the tagline names one half of the name. That is the whole reason it cannot be reworded.</p>
    <p class="decoder"><span class="g">PL</span><span class="dim">(ay)</span><span class="g">EPIC</span></p>
    <p class="decode-note">"Curious play" names the <span class="mono" style="font-size:0.95em">PL</span>. "Epic growth" names the <span class="mono" style="font-size:0.95em">EPIC</span>. Change either half and the name stops explaining itself.</p>
    <p class="slogan" style="margin-top: 26px">Curious play. Epic growth.</p>
    <p class="slogan-note">Bitter italic 500 in <span class="mono" style="font-size:0.95em">--green-brand</span> when it is given room. In the footer it sits at 0.75rem in the quieter ink and warms to green on hover, which is the only easter egg on the site. It is a tagline, not a heading, so it is the one line allowed to be green all the way through.</p>

    <hr class="rule">
    <h2 class="sec">What Estonian carries instead</h2>
    <p class="sec-note">The wordplay lives inside an English name, so the tagline only works in English. Estonian does not attempt it and does not translate it; it carries a different line that does a different job.</p>
    <div class="langs">
      <div class="lang">
        <p class="tag">EN</p>
        <p class="line" style="font-style: italic; font-weight: 500; color: var(--green-brand)">Curious play. Epic growth.</p>
        <p class="why">The tagline is the line. Nothing stands in for it, because nothing else decodes the name.</p>
      </div>
      <div class="lang">
        <p class="tag">ET</p>
        <p class="line">Tulemusp&otilde;hine digimuutus</p>
        <p class="why">Names the outcome, because an Estonian buyer is justifying a spend and the pun is unavailable. Never a translation of the tagline, and never presented as one.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">The category line</h2>
    <p class="sec-note">Separate from both of the above, and the only one of the three that says what Plepic sells. It is the training page&rsquo;s own headline, so it can be checked against a live page rather than against a design file.</p>
    <p class="ex" style="font-size: 2rem"><em>Agentic engineering</em> for dev teams</p>
    <p class="why">Engineering, not coding: the training is about directing agents to ship production work, which is more than writing code. It also shows the headline pattern doing its job, with green on the phrase the page is about.</p>

    <hr class="rule">
    <h2 class="sec">The headline pattern</h2>
    <p class="sec-note">A heading is ink, and at most one phrase inside it carries green. The green phrase is the claim, not the decoration.</p>
    <div class="pair">
      <div class="say">
        <h3>This</h3>
        <p class="ex"><em>Practitioners</em>, not trainers</p>
        <p class="why">Green marks the word the page is about; ink carries the qualification. Take the green away and the heading still reads, which is the test.</p>
      </div>
      <div class="dont">
        <h3>Never this</h3>
        <p class="ex ex-all">Practitioners, not trainers</p>
        <p class="why">A fully green heading spends the brand colour on a whole sentence, so nothing inside it is emphasised and the next green phrase on the page has nothing left to earn.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Rules that travel</h2>
    <p class="sec-note">They hold in a heading, a slide, an email and a proposal. None of them is a house style; each one prevents a specific failure.</p>
    <div class="rules">
      <div class="rule-row"><b>No em-dashes</b><span>Not in anything a customer reads. Commas, colons and full stops carry the same joins and survive every mail client.</span></div>
      <div class="rule-row"><b>Cohort, not squad</b><span>The word changed on 2026-08-31. Older records keep the old one; nothing new does.</span></div>
      <div class="rule-row"><b>One green phrase</b><span>Per heading, and never the whole of it. Green is a claim, not a colour scheme.</span></div>
      <div class="rule-row"><b>Sentence, then proof</b><span>The supporting line is set in the quieter ink. If it is not quieter, the heading is not carrying.</span></div>
    </div>

    <hr class="rule">
    <div class="never">
      <p><b>What never enters this canvas.</b> Volatile values live in the page that states them, so one edit changes one place and the claims gate can see it. If you need one, read it off the live page, never off a design file.</p>
      <ul>
        <li>Prices, discounts and any figure with a currency on it</li>
        <li>Cohort dates, deadlines and anything counted in weeks from today</li>
        <li>Seat counts, developers trained, ratings, any number that grows</li>
        <li>Names of people who have not signed</li>
      </ul>
    </div>
  </div>"""

(OUT / "Voice.dc.html").write_text(page(voice_body, voice_css))

# --- Logo -------------------------------------------------------------------
# The header lockup is a SECOND inlining of the mark, at crispEdges rather than
# geometricPrecision, so it is extracted separately and never retyped.
LOGO_MARK = re.search(r'<svg class="logo-butterfly".*?</svg>', INDEX, re.S).group(0)
if LOGO_MARK.count("<polygon") != 22:
    raise SystemExit("logo mark geometry is not 22 facets")
# The size is set on the artboard, not inherited from the page's own attributes.
LOGO_MARK_BARE = re.sub(r'\s(width|height)="[0-9]+"', "", LOGO_MARK)


def lockup(wordmark_colour, stacked=False):
    """Wordmark 1.5rem, mark 30px: one size, because the canon sizes the mark to
    the wordmark's ascender rather than to a number of its own."""
    return ("        <span class=\"lock%s\">\n"
            "          <span class=\"lock-word\" style=\"color: %s\">Plepic</span>\n"
            "          <span class=\"lock-mark\">%s</span>\n"
            "        </span>\n"
            % (" lock--stacked" if stacked else "", wordmark_colour, LOGO_MARK_BARE))


logo_css = """    .locks { display: flex; align-items: flex-start; gap: 56px; flex-wrap: wrap; }
    .lockbox { }
    .lock { display: inline-flex; align-items: center; gap: 0.5rem;
            line-height: normal; padding: 16px 20px; }
    .lock--stacked { flex-direction: column-reverse; align-items: center;
                     gap: 0.3rem; }
    .lock-word { font-family: var(--font-display); font-weight: 600;
                 font-size: 1.5rem; letter-spacing: 0.01em; line-height: normal; }
    .lock-mark { width: 30px; flex: none; }
    .lock-mark svg { display: block; width: 100%; height: auto; }
    .cap { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
           text-transform: uppercase; color: var(--text-3); margin: 14px 0 0; }
    .cap-note { font-size: 0.85rem; line-height: 1.5; color: var(--text-2);
                margin: 4px 0 0; max-width: 26ch; }
    .ctxs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .ctxbox { padding: 26px 24px; }
    .ctxbox p { margin: 14px 0 0; font-size: 0.85rem; line-height: 1.5; }
    .never3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
              border-top: 1.5px solid var(--text); padding-top: 16px; }
    .never3 h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                 margin: 0 0 6px; }
    .never3 p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
"""

logo_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Logo</h1>
    <p class="lede">Wordmark left, butterfly right, half a space between them. The mark is sized to the wordmark&rsquo;s ascender, not to a number of its own, so the pair scales as one object. Bitter 600 at 1.5rem is the wordmark; nothing else is. The cut was locked on 2026-04-07 and has not moved since.</p>

    <h2 class="sec">Two lockups</h2>
    <p class="sec-note">Horizontal is the default and the only form a header uses. Stacked is the same geometry at the same sizes, laid out with flex-direction: column-reverse, for a narrow or centred hole.</p>
    <div class="locks">
      <div class="lockbox">
%s        <p class="cap">Horizontal</p>
        <p class="cap-note">Header, footer, email signature. Gap 0.5rem.</p>
      </div>
      <div class="lockbox">
%s        <p class="cap">Stacked &middot; .logo-lockup--stacked</p>
        <p class="cap-note">Narrow or centred contexts. Gap 0.3rem, mark above.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Three grounds, three wordmarks</h2>
    <p class="sec-note">The mark itself never changes. Only the wordmark answers the ground it stands on.</p>
    <div class="ctxs">
      <div class="ctxbox" style="background: var(--bg); outline: 1px solid var(--border); outline-offset: -1px;">
%s        <p style="color: var(--text-2)"><b>On light.</b> <span class="mono" style="font-size:0.92em">--green-brand</span>. The default everywhere.</p>
      </div>
      <div class="ctxbox" style="background: var(--dark);">
%s        <p style="color: var(--text-on-dark-2)"><b>On dark.</b> <span class="mono" style="font-size:0.92em">--green-vivid</span>. The brand green goes muddy on ink, so the facet green takes over.</p>
      </div>
      <div class="ctxbox" style="background: var(--green-surface);">
%s        <p style="color: var(--text-2)"><b>On brand.</b> <span class="mono" style="font-size:0.92em">--text</span>. Green on green is never legible, so the wordmark drops to ink.</p>
      </div>
    </div>

    <hr class="rule">
    <div class="never3">
      <div><h3>Never redraw it</h3><p>Twenty-two facets, one body, two antennae, one ember. The page ships the SVG; nothing hand-draws a polygon, and no module carries a coordinate.</p></div>
      <div><h3>Never recolour it</h3><p>Not to match a slide, not for a partner deck, not in one colour. A single-colour Plepic butterfly does not exist.</p></div>
      <div><h3>Never stretch it</h3><p>The viewBox owns the ratio, so size the host and let the mark follow. Four host widths exist and no fifth: 300, 120, 30 and 15px.</p></div>
    </div>
  </div>""" % (
    lockup("var(--green-brand)"),
    lockup("var(--green-brand)", stacked=True),
    lockup("var(--green-brand)"),
    lockup("var(--green-vivid)"),
    lockup("var(--text)"),
)

(OUT / "Logo.dc.html").write_text(page(logo_body, logo_css))

# --- Motion -----------------------------------------------------------------
# The artboards are live HTML, so motion is shown moving rather than described.
# Every keyframe below is lifted from css/styles.css verbatim; the demos differ
# from the site only in what triggers them.
def keyframes(*names):
    out = []
    for n in names:
        m = re.search(r'@keyframes\s+' + n + r'\s*\{(?:[^{}]|\{[^{}]*\})*\}', CSS)
        if not m:
            raise SystemExit("missing @keyframes " + n)
        out.append("    " + m.group(0).replace("\n", "\n    "))
    return "\n".join(out) + "\n"




def hinged(px, beat=False):
    """The mark the module builds: each wing inside its own hinge box, because
    the breath and the beat cannot share one."""
    svg = ('<svg class="mk-layer mk-%s" viewBox="0 0 %g %g" '
           'xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" '
           'aria-hidden="true">%s</svg>')
    return ("      <span class=\"mk%s\" style=\"width: %dpx\">"
            "<span class=\"mk-hinge mk-hinge--left\">%s</span>"
            "<span class=\"mk-hinge mk-hinge--right\">%s</span>%s</span>\n" % (
        " mk--beat" if beat else "", px,
        svg % ("left", VB_W, VB_H, "".join(_left)),
        svg % ("right", VB_W, VB_H, "".join(_right)),
        svg % ("core", VB_W, VB_H, "".join(_core)),
    ))


DURATIONS = [
    ("--dur-fast", T["--dur-fast"], "State response: a colour, an opacity, a link waking up"),
    ("--dur-base", T["--dur-base"], "The default. A hover lift, a border appearing"),
    ("--dur-settle", T["--dur-settle"], "Something assembling: the crystalline hero, a wing"),
    ("--dur-entrance", T["--dur-entrance"], "The hero's own arrival, once per page"),
]
CYCLE = 2400  # ms; every track restarts together so the four can be compared


def track(token, value, note):
    ms = int(value.replace("ms", ""))
    pct = ms / CYCLE * 100
    key = "run-" + token.strip("-")
    css = ("    @keyframes %s { 0%% { left: 0; } "
           "%.4f%%, 100%% { left: calc(100%% - 14px); } }\n" % (key, pct))
    html = ("      <div class=\"trk\">\n"
            "        <div class=\"trk-meta\"><span class=\"trk-tok mono\">%s</span>"
            "<span class=\"trk-val mono\">%s</span></div>\n"
            "        <div class=\"trk-rail\"><span class=\"trk-dot\" "
            "style=\"animation-name: %s\"></span></div>\n"
            "        <p class=\"trk-note\">%s</p>\n"
            "      </div>\n" % (token, value, key, note))
    return css, html


_tracks = [track(*d) for d in DURATIONS]

motion_css = """    .trk { display: grid; grid-template-columns: 210px 1fr 300px;
           align-items: center; gap: 24px; padding: 14px 0;
           border-top: 1px solid var(--border); }
    .trk-meta { display: flex; flex-direction: column; }
    .trk-tok { font-size: 11px; color: var(--text); letter-spacing: 0.02em; }
    .trk-val { font-size: 10.5px; color: var(--text-3); letter-spacing: 0.02em;
               margin-top: 2px; }
    .trk-rail { position: relative; height: 14px;
                border-bottom: 1px solid var(--border); }
    .trk-dot { position: absolute; bottom: -4px; left: 0; width: 14px; height: 14px;
               background: var(--green-brand);
               animation-duration: %dms; animation-timing-function: %s;
               animation-iteration-count: infinite; }
    .trk-note { font-size: 0.85rem; line-height: 1.45; color: var(--text-2); margin: 0; }
    .eases { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .ease h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
               margin: 0 0 2px; }
    .ease .mono { font-size: 10.5px; color: var(--text-3); }
    .ease p { font-size: 0.85rem; line-height: 1.45; color: var(--text-2);
              margin: 8px 0 0; }
    .ease .trk-rail { margin-top: 14px; }
    .ease .trk-dot { animation-name: run-ease; }
    @keyframes run-ease { 0%% { left: 0; }
      29.1667%%, 100%% { left: calc(100%% - 14px); } }
    .rev { display: flex; gap: 16px; }
    .rev span { display: block; width: 132px; height: 62px; background: var(--bg-alt);
                border-top: 1.5px solid var(--text);
                animation: rev-loop 3s var(--ease-settle) infinite; }
    .rev span:nth-child(2) { animation-delay: 100ms; }
    .rev span:nth-child(3) { animation-delay: 200ms; }
    @keyframes rev-loop {
      0%% { opacity: 0; transform: translateY(20px); }
      20%%, 88%% { opacity: 1; transform: translateY(0); }
      100%% { opacity: 0; transform: translateY(20px); }
    }
    .marks { display: flex; align-items: flex-end; gap: 64px; }
    .mk { position: relative; display: block; aspect-ratio: %g / %g;
          perspective: calc(160px * 3); }
    .mk-layer { position: absolute; inset: 0; width: 100%%; height: 100%%;
                transform-origin: 50%% 50%%; }
    .mk-hinge { position: absolute; inset: 0; transform-origin: 50%% 50%%;
                transform-style: preserve-3d; }
    .mk .mk-hinge--left  { animation: mark-breath-left var(--breath-period) var(--ease-calm) infinite; }
    .mk .mk-hinge--right { animation: mark-breath-right var(--breath-period) var(--ease-calm) var(--breath-offset) infinite; }
    .mk .mk-core  { animation: mark-bob var(--breath-period) var(--ease-calm) infinite; }
    .mk--beat:hover .mk-left  { animation: mark-wingbeat-left var(--wingbeat-dur) var(--ease-settle) infinite; }
    .mk--beat:hover .mk-right { animation: mark-wingbeat-right var(--wingbeat-dur) var(--ease-settle) infinite; }
%s    .lift { display: flex; gap: 40px; align-items: flex-start; }
    .liftbox { width: 200px; height: 120px; background: var(--bg-alt);
               border-top: 1.5px solid var(--text); position: relative;
               transition: transform var(--tilt-dur) var(--ease-settle); }
    .liftbox::before { content: ""; position: absolute; z-index: -1; inset: 0;
                       background: var(--surface); opacity: 0;
                       transition: opacity var(--dur-base) var(--ease-settle),
                                   box-shadow var(--dur-base) var(--ease-settle); }
    .liftseat:hover .liftbox { transform: translateY(calc(-1 * var(--lift-height))); }
    .liftseat:hover .liftbox::before { opacity: 1; box-shadow: var(--card-shadow-hover); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 48px; }
    .kv { display: grid; grid-template-columns: 130px 1fr; gap: 16px; padding: 11px 0;
          border-top: 1px solid var(--border); }
    .kv b { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem;
            color: var(--text); }
    .kv span { font-size: 0.85rem; line-height: 1.5; color: var(--text-2); }
    .stop { background: var(--bg-alt); padding: 22px 26px; }
    .stop p { font-size: 0.9rem; line-height: 1.55; color: var(--text-2); margin: 0; }
""" % (CYCLE, T["--ease-settle"], VB_W, VB_H,
       keyframes("mark-breath-left", "mark-breath-right", "mark-bob",
                 "mark-wingbeat-left", "mark-wingbeat-right")) + "".join(c for c, _ in _tracks)

motion_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Motion</h1>
    <p class="lede">Everything on this artboard is running. Weight, lift, tilt and breath are the whole register, and each one is a duration and an ease, never a new colour. Hover where it says to.</p>

    <h2 class="sec">Four durations</h2>
    <p class="sec-note">All four dots restart together every 2.4 seconds, so what you are comparing is how soon each one arrives.</p>
%s
    <hr class="rule">
    <h2 class="sec">Two eases, and no third</h2>
    <p class="sec-note">One for anything that arrives, one for anything that never stops. A linear ease is a bug.</p>
    <div class="eases">
      <div class="ease">
        <h3>Arriving</h3><span class="mono">--ease-settle &middot; %s</span>
        <div class="trk-rail"><span class="trk-dot"></span></div>
        <p>Fast off the mark, long settle. Every hover, lift, reveal and entrance uses it. It is why the site feels like it is putting things down rather than moving them.</p>
      </div>
      <div class="ease">
        <h3>Idling</h3><span class="mono">--ease-calm &middot; %s</span>
        <div class="trk-rail"><span class="trk-dot" style="animation-timing-function: %s"></span></div>
        <p>Symmetrical, so a loop has no beginning. Only perpetual motion uses it: the breath, the bob, the antennae.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">The reveal</h2>
    <p class="sec-note">Twenty pixels up and into view over 600ms, staggered 100ms per sibling. Content is visible by default and only hidden once the script has proved it can run, so a failed script shows the page rather than a blank one.</p>
    <div class="rev"><span></span><span></span><span></span></div>

    <hr class="rule">
    <h2 class="sec">The breath, and the beat</h2>
    <p class="sec-note">The mark is hinged into three layers: two wings and a core. At rest the wings open to %s over %s, a third of a second out of phase, while the core bobs %s. Hover the right-hand one.</p>
    <div class="marks">
      <div>
%s        <p class="trk-note" style="margin-top:14px">At rest. Breath only.</p>
      </div>
      <div>
%s        <p class="trk-note" style="margin-top:14px">Hover me. The beat opens to %s in %s on top of the breath, not instead of it. Each wing sits in its own hinge box: the hinge breathes, the wing inside beats, and nested rotations compose. One box for both meant the later animation took the transform outright and the wing snapped to zero on hover.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Weight and lift</h2>
    <p class="sec-note">A card rises %s and prints a sheet beneath it, in %s. On a fine pointer it also tilts up to %s and %s toward the cursor. Hover it.</p>
    <div class="lift">
      <div class="liftseat"><div class="liftbox"></div>
        <p class="trk-note" style="margin-top:14px">Rest, then lift. The shadow belongs to the sheet, never to the card.</p></div>
    </div>

    <hr class="rule">
    <h2 class="sec">The signature, and what owns it</h2>
    <p class="sec-note">On the homepage a crystalline caterpillar crawls, cocoons and unfurls into the locked mark while the code line beneath it becomes the agentic loop. Developer becomes agentic engineer, told twice at once; the synced code line is what makes the arc a domain claim rather than a transformation clich&eacute;.</p>
    <div class="two">
      <div class="kv"><b>Movements</b><span>Crawl 4.6s, gather 2.6s, chrysalis 3.0s, unfurl 3.4s, then rest. 13.6s in all. The 22 facets are constant throughout; matter reorganises, geometry never changes.</span></div>
      <div class="kv"><b>Trigger</b><span>One replay 3000ms after boot, then the visitor owns it: hover or tap the resting mark. It fires only from rest, so a replay never restarts mid-flight and never queues. No scroll trigger, no auto-loop, no button.</span></div>
      <div class="kv"><b>Springs, not tweens</b><span>A deadband snap and a shader rest gate land the rest pose byte-exact on the locked mark, which then breathes.</span></div>
      <div class="kv"><b>One locked unit</b><span>The animation and its code block ship together and are retimed together, never one side alone.</span></div>
      <div class="kv"><b>Fallback</b><span>Reduced motion, 900px or narrower, Save-Data, deviceMemory under 2 or no WebGL2: nothing downloads, a static poster and the finished line render instead. Init failure, context loss or sustained slow frames do the same, never freezing mid-refactor.</span></div>
    </div>

    <hr class="rule">
    <h2 class="sec">Two rules that outrank any effect</h2>
    <div class="two">
      <div class="kv"><b>Mark-motion</b><span>Choreographed motion that resolves to the locked mark is sanctioned. Static effects &mdash; glow, gradient, drop-shadow, per-facet opacity, outline-only wings &mdash; stay banned. Motion animates the mark; it never restyles it.</span></div>
      <div class="kv"><b>Reduced motion</b><span>Every animation has a prefers-reduced-motion branch that lands on the static end state instantly. Shipping without one is a defect, not a polish item.</span></div>
    </div>

    <hr class="rule">
    <div class="stop">
      <p><b>Reduced motion stops all of it.</b> Every loop, every reveal, every tilt. What it never does is hide something: a reveal that cannot animate shows its content immediately, and the hero holds its from-state fully legible. Motion is the last thing added and the first thing taken away.</p>
    </div>
  </div>""" % (
    "".join(h for _, h in _tracks),
    T["--ease-settle"], T["--ease-calm"], T["--ease-calm"],
    T["--breath-open"], T["--breath-period"], T["--breath-bob"],
    hinged(160), hinged(160, beat=True), T["--wingbeat-open"], T["--wingbeat-dur"],
    T["--lift-height"], T["--dur-base"], T["--tilt-x"], T["--tilt-y"],
)

(OUT / "Motion.dc.html").write_text(page(motion_body, motion_css))

# --- Components -------------------------------------------------------------
# Three sizes by three variants, which the first draft of this artboard got
# wrong by calling it "two buttons and no third". Sizes and variants are
# orthogonal on purpose: a variant sets colour and never touches the box.
BTN_SIZES = [
    ("btn-lg", "1.15rem &middot; 0.95rem 1.9rem &middot; radius 12px", "Heroes"),
    ("btn", "1.05rem &middot; 0.7rem 1.4rem &middot; radius 10px", "The default"),
    ("btn-sm", "0.9rem &middot; 0.5rem 1rem &middot; radius 8px", "Nav, dense UIs"),
]
BTN_VARIANTS = [
    ("btn-primary", "Book a free call"),
    ("btn-outline", "View curriculum"),
    ("btn-ghost", "Learn more"),
]

comp_css = """    .demo { display: flex; align-items: flex-start; gap: 40px; flex-wrap: wrap; }
    .demo-cap { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
                text-transform: uppercase; color: var(--text-3); margin: 12px 0 0; }
    .demo-note { font-size: 0.85rem; line-height: 1.45; color: var(--text-2);
                 margin: 4px 0 0; max-width: 30ch; }
    .btn { display: inline-flex; align-items: center; justify-content: center;
           gap: 0.5rem; font-family: var(--font-body); font-weight: 600;
           font-size: 1.05rem; line-height: normal; padding: 0.7rem 1.4rem;
           border-radius: 10px; border: 1.5px solid transparent; cursor: pointer;
           text-decoration: none;
           transition: filter var(--transition-fast), background var(--transition-fast),
                       color var(--transition-fast); }
    .btn-lg { font-size: 1.15rem; padding: 0.95rem 1.9rem; border-radius: 12px; }
    .btn-sm { font-size: 0.9rem; padding: 0.5rem 1rem; border-radius: 8px; }
    .btn-primary { background: var(--accent); color: var(--text); }
    .btn-primary:hover { filter: brightness(0.92); }
    .btn-outline { background: transparent; border-color: var(--text); color: var(--text); }
    .btn-outline:hover { background: var(--green-surface); border-color: var(--green-brand);
                         color: var(--green-dark); filter: none; }
    .btn-ghost { background: transparent; border-color: transparent; color: var(--text);
                 text-decoration: underline; text-underline-offset: 3px;
                 padding-left: 0.5rem; padding-right: 0.5rem; }
    .btn-ghost:hover { background: var(--green-surface); color: var(--green-dark);
                       filter: none; }
    .btn-focus { outline: 2px solid var(--green-dark); outline-offset: 2px; }
    .btnrow { display: grid; grid-template-columns: 120px 1fr 250px;
              gap: 24px; align-items: center; padding: 14px 0;
              border-top: 1px solid var(--border); }
    .btnrow-name { font-family: var(--font-mono); font-size: 11px; color: var(--text);
                   letter-spacing: 0.02em; }
    .btnrow-set { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .btnrow-spec { font-family: var(--font-mono); font-size: 10px; line-height: 1.6;
                   color: var(--text-3); letter-spacing: 0.02em; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .pair h3 { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
               text-transform: uppercase; margin: 0 0 14px; font-weight: 400; }
    .pair .yes { color: var(--green-brand); }
    .pair .no { color: var(--accent); }
    .pair .why { font-size: 0.88rem; line-height: 1.5; color: var(--text-2);
                 margin: 14px 0 0; }
    .badge { display: inline-flex; align-items: center; gap: 0.35rem;
             padding: 0.2rem 0.65rem; font-size: 0.75rem; font-weight: 600;
             line-height: normal; border-radius: 20px 4px 16px;
             background: var(--surface); color: var(--text-2);
             border: 1px solid var(--border); }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%;
                 background: var(--green-vivid); flex-shrink: 0; }
    .badge-urgency .badge-dot { background: var(--accent); }
    .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
    .pbox { padding: 26px; }
    .pbox--onCream { background: var(--bg); }
    .pbox--onWhite { background: var(--surface); }
    .panel-white { background: var(--surface); border: 1px solid var(--border);
                   border-radius: 14px; padding: var(--space-xl); }
    .panel-cream { background: var(--bg); border: 1px solid var(--border);
                   border-radius: 14px; padding: var(--space-xl); }
    .panel-header { font-family: var(--font-mono); font-size: 0.75rem;
                    text-transform: uppercase; letter-spacing: 0.12em;
                    color: var(--green-dark); font-weight: 600; margin: 0 0 10px; }
    .panel-white p, .panel-cream p { font-size: 1rem; line-height: 1.55;
                                     color: var(--text-2); margin: 0; }
    .faq { max-width: 460px; }
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-row { display: flex; justify-content: space-between; align-items: center;
               gap: var(--space-md); padding: var(--space-lg) 0; font-weight: 600;
               font-size: var(--fs-faq-q); color: var(--text); }
    .faq-row::after { content: '+'; font-size: 1.25rem; color: var(--green-brand);
                      flex-shrink: 0; font-weight: 400; line-height: 1; }
    .faq-item--open .faq-row::after { content: '\\2212'; }
    .faq-body { font-size: 1rem; line-height: 1.55; color: var(--text-2);
                margin: 0 0 var(--space-lg); }
    .navdemo { display: flex; align-items: center; gap: 2rem; }
    .navdemo a { font-size: 1rem; line-height: normal; color: var(--text-2);
                 text-decoration: none; font-weight: 500; }
    .navdemo a.cur { color: var(--green-brand); text-decoration: underline;
                     text-underline-offset: 6px; text-decoration-thickness: 1.5px; }
    .navdemo a.ext::after { content: "\\2197"; margin-left: 0.25em;
                            font-size: 0.85em; opacity: 0.55; }
    .codeb { font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.7;
             border-radius: 8px; padding: 0.75rem 1rem;
             box-shadow: 0 2px 8px rgba(28, 28, 26, 0.04);
             background: var(--surface); color: var(--text-2); max-width: 360px; }
    .codeb .cm { color: var(--text-3); }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .grid3 h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .grid3 p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
"""


def btn_row(cls, spec, use):
    size = "" if cls == "btn" else " " + cls
    return ("    <div class=\"btnrow\">\n"
            "      <span class=\"btnrow-name\">.%s</span>\n"
            "      <span class=\"btnrow-set\">%s</span>\n"
            "      <span class=\"btnrow-spec\">%s<br>%s</span>\n"
            "    </div>\n" % (
                cls,
                "".join("<a class=\"btn%s %s\" href=\"#\">%s</a>" % (size, v, label)
                        for v, label in BTN_VARIANTS),
                spec, use))


comp_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Components</h1>
    <p class="lede">The furniture every page uses. Anything a page needs that is not here is a page&rsquo;s own problem, and does not become a component until a second page wants it.</p>

    <h2 class="sec">The button system</h2>
    <p class="sec-note">Three sizes by three variants, and the two axes never touch: a variant sets colour and nothing else, a size sets the box and nothing else. On light, outline and ghost are ink, and hover fills them with <span class="mono" style="font-size:0.92em">--green-surface</span> under <span class="mono" style="font-size:0.92em">--green-dark</span> text. Hover any of them.</p>
%s
    <div class="demo" style="margin-top: 24px">
      <div>
        <a class="btn btn-outline btn-focus" href="#">Keyboard focus</a>
        <p class="demo-cap">Focus ring</p>
        <p class="demo-note">2px <span class="mono" style="font-size:0.92em">--green-dark</span>, offset 2px. Never removed, never restyled per control.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Primary plus ghost, never two solids</h2>
    <p class="sec-note">The hero pairing, and the reason the ghost variant exists: do this, or just look first.</p>
    <div class="pair">
      <div>
        <h3 class="yes">This</h3>
        <div class="btnrow-set"><a class="btn btn-primary" href="#">Book a free call</a><a class="btn btn-ghost" href="#">View curriculum &rarr;</a></div>
        <p class="why">One thing to do and one thing to read. The eye lands on the solid, and the link is there for the visitor who is not ready.</p>
      </div>
      <div>
        <h3 class="no">Never this</h3>
        <div class="btnrow-set"><a class="btn btn-primary" href="#">Book a free call</a><a class="btn btn-outline" href="#">View curriculum</a></div>
        <p class="why">Two solid-looking buttons compete and neither wins. Use <span class="mono" style="font-size:0.92em">.btn-outline</span> only where no primary shares the row.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Panels, never same on same</h2>
    <p class="sec-note">White on cream, cream on white. Always a full 1px border, 14px radius. The green surface marks a favoured option and nothing else.</p>
    <div class="panels">
      <div class="pbox pbox--onCream">
        <div class="panel-white">
          <p class="panel-header">What you leave with</p>
          <p>A working agent setup in your own repository, and the judgement to know when to reach for one.</p>
        </div>
        <p class="demo-cap">.panel-white on cream &middot; the default</p>
      </div>
      <div class="pbox pbox--onWhite">
        <div class="panel-cream" data-demo="panel-cream">
          <p class="panel-header">What you leave with</p>
          <p>A working agent setup in your own repository, and the judgement to know when to reach for one.</p>
        </div>
        <p class="demo-cap">.panel-cream on white &middot; the inverse</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Badges, rows, code and nav</h2>
    <p class="sec-note">The badge radius is the signature: 20px, 4px, 16px, the one shape on the site deliberately not a rounded rectangle. Inline code carries the only resting shadow anywhere.</p>
    <div class="demo">
      <div>
        <span class="badge"><span class="badge-dot"></span>Cohort open</span>
        <p class="demo-cap">Default</p>
        <p class="demo-note">Green dot. A state that is simply true, and the badge&rsquo;s only green.</p>
      </div>
      <div>
        <span class="badge badge-urgency"><span class="badge-dot"></span>Closing soon</span>
        <p class="demo-cap">Urgency</p>
        <p class="demo-note">The dot goes ember, and it spends the viewport&rsquo;s one accent. It never appears while a CTA button is visible.</p>
      </div>
      <div>
        <div class="codeb"><span class="cm"># the shape of a session</span><br>claude --resume</div>
        <p class="demo-cap">Code &middot; 8px radius</p>
        <p class="demo-note">The one resting shadow: 0 2px 8px at 4 percent ink.</p>
      </div>
    </div>
    <div class="demo" style="margin-top: 28px">
      <div>
        <div class="faq">
          <div class="faq-item faq-item--open">
            <div class="faq-row">Do I need to know Python?</div>
            <p class="faq-body">No. You need two years of shipping something, in any language.</p>
          </div>
          <div class="faq-item"><div class="faq-row">How much of it is hands on keyboard?</div></div>
        </div>
        <p class="demo-cap">Row &middot; open and closed</p>
        <p class="demo-note">Two hairlines and the space between them. No box, no radius, no shadow.</p>
      </div>
      <div>
        <nav class="navdemo">
          <a href="#" class="cur">Training</a><a href="#">Scopeful</a><a href="#">Jobs</a><a href="#" class="ext">Skill Tree</a>
        </nav>
        <p class="demo-cap">Navigation</p>
        <p class="demo-note">Quieter ink at rest, full ink on hover, green and underlined for the page you are on. An external link earns an arrow and nothing else.</p>
      </div>
    </div>

    <hr class="rule">
    <div class="grid3">
      <div><h3>Sizes and variants are orthogonal</h3><p>Three by three, not nine components. A variant that changes the box is a new size pretending to be a colour.</p></div>
      <div><h3>State, not decoration</h3><p>A border, a shadow, a surface and a green fill are all states. At rest a component owns as few of them as it can.</p></div>
      <div><h3>The box is optional</h3><p>Most things are a rule and some space. Reach for a panel only when the content genuinely has to be lifted off the page.</p></div>
    </div>
  </div>""" % "".join(btn_row(c, spec, use) for c, spec, use in BTN_SIZES)

(OUT / "Components.dc.html").write_text(page(comp_body, comp_css))

# --- Layout -----------------------------------------------------------------
SPACES = ["--space-xs", "--space-sm", "--space-md", "--space-lg", "--space-xl",
          "--space-2xl", "--space-3xl", "--space-4xl"]
SPACE_USE = {
    "--space-xs": "A gap inside a chip",
    "--space-sm": "Wordmark to mark; label to value",
    "--space-md": "Paragraph to paragraph",
    "--space-lg": "A row's padding",
    "--space-xl": "A panel's padding; the card grid's gutter",
    "--space-2xl": "Heading to the block under it",
    "--space-3xl": "A block to the next block",
    "--space-4xl": "A section to the next section",
}
RADII = [("4px", "The badge's tight corner"), ("8px", "Code"),
         ("10px", "Buttons"), ("16px", "Panels"), ("20px", "The badge's wide corner")]
BREAKS = [
    ("640px", "Below: the type ramp bottoms out"),
    ("768px", "Below: one column, nav collapses to the toggle"),
    ("900px", "Below: the hero's butterfly stage is hidden entirely"),
    ("901 to 1014px", "The hero runs two columns while the page is still narrower than the container, so the headline ramps rather than arriving at its cap"),
]

layout_css = """    .sp { display: grid; grid-template-columns: 130px 92px 1fr 320px;
          align-items: center; gap: 20px; padding: 9px 0;
          border-top: 1px solid var(--border); }
    .sp-tok { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.02em;
              color: var(--text); }
    .sp-val { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); }
    .sp-bar { height: 14px; background: var(--green-brand); }
    .sp-use { font-size: 0.85rem; line-height: 1.45; color: var(--text-2); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .kv { display: grid; grid-template-columns: 150px 1fr; gap: 16px; padding: 10px 0;
          border-top: 1px solid var(--border); }
    .kv b { font-family: var(--font-mono); font-size: 11px; font-weight: 400;
            color: var(--text); letter-spacing: 0.02em; }
    .kv span { font-size: 0.85rem; line-height: 1.45; color: var(--text-2); }
    .rad { display: flex; gap: 28px; align-items: flex-end; }
    .rad-box { width: 74px; height: 74px; background: var(--bg-alt);
               border: 1px solid var(--border); }
    .rad-cap { font-family: var(--font-mono); font-size: 10.5px; color: var(--text);
               margin: 8px 0 0; }
    .rad-use { font-size: 0.8rem; line-height: 1.4; color: var(--text-3);
               margin: 2px 0 0; max-width: 15ch; }
    .cont { position: relative; background: var(--bg-alt); height: 92px;
            display: flex; align-items: center; justify-content: center; }
    .cont-inner { background: var(--green-surface); height: 100%;
                  border-left: 1.5px solid var(--green-brand);
                  border-right: 1.5px solid var(--green-brand);
                  display: flex; align-items: center; justify-content: center;
                  font-family: var(--font-mono); font-size: 10.5px; color: var(--green-dark); }
"""

layout_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Layout</h1>
    <p class="lede">One scale, one container, one section rhythm. Vertical space is the only thing that separates most blocks, so the scale below is doing more work than any component on this canvas.</p>

    <h2 class="sec">The space scale</h2>
    <p class="sec-note">Eight steps, each roughly a third larger than the last. A value not on this list is a mistake, not a nuance. The rhythm is tight groupings and generous separations: the same spacing everywhere reads as a wireframe nobody finished.</p>
%s
    <hr class="rule">
    <h2 class="sec">The container</h2>
    <p class="sec-note">%s wide at most, with a 2rem gutter that never collapses. The container has never changed; when a page feels empty the emptiness is vertical.</p>
    <div class="cont"><div class="cont-inner" style="width: 79.4%%">%s content track &middot; 2rem gutter either side</div></div>

    <hr class="rule">
    <div class="two">
      <div>
        <h2 class="sec">Rhythm</h2>
        <p class="sec-note">Four measurements set the whole page.</p>
        <div class="kv"><b>--space-4xl</b><span>Section padding, top and bottom. The only reason two sections read as separate things.</span></div>
        <div class="kv"><b>--space-3xl</b><span>Block to block inside a section.</span></div>
        <div class="kv"><b>--header-height</b><span>%s. The header is fixed, so anchored content pads by this plus --space-3xl.</span></div>
        <div class="kv"><b>backdrop-filter</b><span>12px blur behind the header at 90%% page ground, so content passes under it legibly.</span></div>
      </div>
      <div>
        <h2 class="sec">Breakpoints</h2>
        <p class="sec-note">Four, and each one exists because something measurably broke.</p>
%s      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Two rules about arrangement</h2>
    <div class="two" style="margin-bottom: 32px">
      <div class="kv"><b>Asymmetric</b><span>1.4fr / 0.6fr, never 50/50. A page split down the middle presents two equal options and argues for neither. The hero, the comparison blocks and the panel rows all lean.</span></div>
      <div class="kv"><b>Not centred</b><span>No centred-everything layouts on desktop. Centring is for one short thing, not for a page of them.</span></div>
    </div>

    <h2 class="sec">Radii</h2>
    <p class="sec-note">Five values, each with one owner. The card and every rule-based block have no radius at all.</p>
    <div class="rad">
%s    </div>
  </div>""" % (
    "".join(
        "    <div class=\"sp\"><span class=\"sp-tok\">%s</span>"
        "<span class=\"sp-val\">%s &middot; %dpx</span>"
        "<span class=\"sp-bar\" style=\"width: %dpx\"></span>"
        "<span class=\"sp-use\">%s</span></div>\n"
        % (s, T[s], round(float(T[s].replace("rem", "")) * 16),
           round(float(T[s].replace("rem", "")) * 16), SPACE_USE[s])
        for s in SPACES),
    T["--max-width"], T["--max-width"], T["--header-height"],
    "".join("        <div class=\"kv\"><b>%s</b><span>%s</span></div>\n" % (b, n)
            for b, n in BREAKS),
    "".join("      <div><div class=\"rad-box\" style=\"border-radius: %s\"></div>"
            "<p class=\"rad-cap\">%s</p><p class=\"rad-use\">%s</p></div>\n" % (r, r, u)
            for r, u in RADII),
)

(OUT / "Layout.dc.html").write_text(page(layout_body, layout_css))

# --- Hero -------------------------------------------------------------------
# A wireframe, not a screenshot. Every measurement is the real one; every
# volatile value is left as a marked slot, because a screenshot of the live
# hero would smuggle a price, a cohort state, a headcount and a rating into
# the design system as pixels, where the claims gate cannot see them.
hero_css = """    .hgrid { display: grid; grid-template-columns: 1.4fr 0.6fr; gap: 2rem;
             align-items: end; padding: 26px 0 10px; }
    .htext { max-width: 580px; }
    .hh1 { font-family: var(--font-display); font-weight: 700; font-size: 4.8rem;
           line-height: 1.05; letter-spacing: -0.025em; margin: 0 0 2rem;
           color: var(--text); }
    .hh1 .highlight { color: var(--green-brand); }
    .hdesc { font-size: var(--fs-body-lg); line-height: 1.6; color: var(--text-2);
             max-width: 480px; margin: 0 0 2.5rem; }
    .hdesc strong { color: var(--text); font-weight: 600; }
    .hctas { display: flex; align-items: center; gap: 1.5rem; }
    .hbtn { display: inline-flex; align-items: center; justify-content: center;
            gap: 0.5rem; font-family: var(--font-body); font-weight: 600;
            font-size: 1.05rem; padding: 0.7rem 1.4rem; border-radius: 10px;
            border: 1.5px solid transparent; text-decoration: none; }
    .hbtn--p { background: var(--accent); color: var(--text); }
    .hbtn--t { color: var(--text); text-decoration: underline;
               text-underline-offset: 4px; font-weight: 600; }
    .hqual { margin: 0.5rem 0 0; font-size: 0.9rem; line-height: normal;
             color: var(--text-3); letter-spacing: 0.01em; }
    .slot { display: inline-block; padding: 0.2rem 0.6rem;
            outline: 1px dashed var(--accent); outline-offset: -1px;
            font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.04em;
            color: var(--accent); }
    .hvis { display: flex; flex-direction: column; align-items: center;
            justify-content: flex-end; align-self: end; }
    .hstage { width: 100%; aspect-ratio: 22 / 15; background: var(--bg-alt);
              display: flex; align-items: center; justify-content: center;
              text-align: center; padding: 20px; }
    .hstage p { font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.7;
                letter-spacing: 0.04em; color: var(--text-3); margin: 0; }
    .hcode { font-family: var(--font-mono); font-size: 0.75rem; line-height: normal;
             color: var(--green-dark); margin: 0.5rem 0 0; white-space: nowrap; }
    .htrust { display: flex; align-items: center; gap: 20px; margin-top: 30px;
              border-top: 1px solid var(--border); padding-top: 16px; }
    .htrust-label { font-family: var(--font-mono); font-size: 9.5px;
                    letter-spacing: 0.16em; text-transform: uppercase;
                    color: var(--text-3); flex: none; }
    .htrust-line { flex: 1; border-top: 1px solid var(--border); }
    .anno { display: grid; grid-template-columns: 150px 1fr; gap: 16px;
            padding: 11px 0; border-top: 1px solid var(--border); }
    .anno b { font-family: var(--font-mono); font-size: 11px; font-weight: 400;
              color: var(--text); letter-spacing: 0.02em; }
    .anno span { font-size: 0.88rem; line-height: 1.5; color: var(--text-2); }
    .cant { background: var(--bg-alt); padding: 22px 26px; }
    .cant p { font-size: 0.9rem; line-height: 1.55; color: var(--text-2); margin: 0 0 10px; }
    .cant p:last-child { margin: 0; }
"""

hero_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Hero</h1>
    <p class="lede">One composition, used on every page that has a hero. It is a wireframe here on purpose: the real hero carries four values that change, and a screenshot would hide them in pixels where nothing can check them. Dashed slots are those values.</p>

    <div class="hgrid">
      <div class="htext">
        <p style="margin: 0 0 0.75rem"><span class="slot">cohort state &middot; engineers trained &middot; rating</span></p>
        <h2 class="hh1"><span class="highlight">Practitioners</span>,<br>not trainers</h2>
        <p class="hdesc">The engineers who teach our cohorts ship production code every week. Every pattern we teach ran on a real codebase before it reached a slide.<br><span class="slot" style="margin-top:0.5rem">price &middot; subsidy share</span></p>
        <div class="hctas">
          <a class="hbtn hbtn--p" href="#">Talk to Kaido</a>
          <a class="hbtn hbtn--t" href="#">View the full program &rarr;</a>
        </div>
        <p class="hqual"><span class="slot">experience floor &middot; cohort size</span></p>
      </div>
      <div class="hvis">
        <div class="hstage"><p>the crystalline mark<br>440px stage<br>WebGL</p></div>
        <p class="hcode">{ explore &rarr; act &rarr; verify }|</p>
      </div>
    </div>
    <div class="htrust">
      <span class="htrust-label">Trusted by</span><span class="htrust-line"></span>
      <span class="htrust-label" style="letter-spacing:0.04em; text-transform:none">client wordmarks, one row, ink at rest</span>
    </div>

    <hr class="rule">
    <h2 class="sec">What the composition fixes</h2>
    <p class="sec-note">Every number here is in the stylesheet. The hero is the one place the type scale is overridden, so these are the values to check first when it looks wrong.</p>
    <div class="anno"><b>grid</b><span>1.4fr / 0.6fr, 2rem gap, aligned to the BOTTOM. The headline and the butterfly share a baseline, which is what makes the two columns read as one object.</span></div>
    <div class="anno"><b>h1</b><span>clamp(3rem, 2.5rem + 3.5vw, 4.8rem) at -0.025em and 1.05 line height. Its own ramp, not the page's --fs-h2. The break after the comma is a hard rule in the markup, never a wrap.</span></div>
    <div class="anno"><b>text track</b><span>580px maximum, and the supporting sentence 480px. Below 1015px the headline ramps rather than sitting at its cap, because the stage holds a hard 440px and the two would collide.</span></div>
    <div class="anno"><b>stage</b><span>440px, hidden entirely below 900px. The page loses the butterfly rather than shrinking it.</span></div>
    <div class="anno"><b>accent</b><span>The viewport&rsquo;s one accent element is the hero body CTA. The nav CTA is an ink outline so it does not compete, and an urgency badge never appears while that CTA is visible.</span></div>
    <div class="anno"><b>entrance</b><span>A settle, not an arrival: content starts 6px low and fully legible, and rises over 600ms once the fonts have landed. No load-bearing element ever starts invisible.</span></div>

    <hr class="rule">
    <div class="cant">
      <p><b>The butterfly itself does not travel.</b> The hero mark is a WebGL metamorphosis, about 69 KB of module, with a rest pose the animation lands on byte-exact and a still poster behind it for anything that cannot run WebGL. It cannot be an artboard and should not be redrawn as one.</p>
      <p>What lives here is the composition and the rules around it. The geometry and the choreography live in <span class="mono" style="font-size:0.95em">js/crystalline-metamorphosis.js</span>, and that module is the only thing that may change them.</p>
    </div>
  </div>"""

(OUT / "Hero.dc.html").write_text(page(hero_body, hero_css))

# --- Rules ------------------------------------------------------------------
# Section 9 of the canon page, which had no home on the canvas at all. These
# are the rules that say NO, and they are the half of a design system that
# actually holds: a palette can be re-derived from a stylesheet, a prohibition
# cannot. Each one names the failure it prevents rather than stating a taste.
DO = [
    ("--green-brand for text on light", "It clears AA on cream. It is the only green that does."),
    ("--green-dark for body needing AAA", "The step below brand, for long reading."),
    ("--green-vivid for decoration only", "Facets, dark-mode links and labels. Never a paragraph."),
    ("--accent for exactly one element", "Per viewport. A CTA button, or an urgency badge, or an accent dot."),
    ("Asymmetric grids", "1.4fr / 0.6fr, never 50/50. A page split down the middle has no argument."),
    ("Spacing rhythm", "Tight groupings, generous separations. Never the same spacing everywhere."),
    ("line-height: normal on compact components", "Buttons, badges, labels. The Line-Height Trap is a body value inherited into a control."),
    ("Light mode, every page", "Dark sections are emphasis, never a toggle."),
]
DONT = [
    ("--green-vivid as text on light", "2.5:1 on cream. It fails AA and always will."),
    ("Two accent elements in one viewport", "One CTA button or one urgency badge or one accent dot. Never two."),
    ("Accent hover variants", "Use opacity for states. A second orange is a second brand."),
    ("Cyan, neon, glassmorphism, gradient text, glow", "None of it. No SVG blur or glow filters either."),
    ("All-caps headings", "Except mono labels and the trust bar."),
    ("Centred-everything layouts on desktop", "Centring is for a single short thing, not a page."),
    ("AI slop aesthetics", "The generic 2024-2025 look. If it could be any company, it is not this one."),
    ("#8a8a80 as readable text", "--text-3 at #6b6b60 is the floor."),
    ("HUD", "No dark surface, no glow, no XP or power bars. The tabletop earns its play in physics and feedback, never by relaxing a rule."),
    ("Sound on a marketing page", "Reserved for the cohort loadout builder."),
    ("Tiers or power numbers on people", "It ranks a real person in public, and the number behind the rank cannot be verified."),
]
SHADOWS = [
    ("Code ambient", "0 2px 8px rgba(28,28,26,0.04)", "The one resting shadow on the whole site, under inline code."),
    ("Hover lift", "0 8px 24px rgba(28,28,26,0.06)", "With translateY(-2px). Interactive cards, on hover only."),
    ("Tooltip", "0 8px 24px rgba(28,28,26,0.1)", "Floating layers."),
    ("Featured glow", "0 4px 24px rgba(0,198,56,0.1)", "The featured pricing card. At most one per page."),
    ("Accent pulse", "rgba(226,108,69,0.3) to transparent", "A keyframed ring. The CTA heartbeat, 3s loop."),
    ("Card sheet", T["--card-shadow-hover"], "Under a sheet of --surface behind the column. Hover and focus only; CI fails a resting box-shadow on any .tt-* rule."),
]
BOUGHT = [
    ("A photograph of a person is not raw material",
     "Triangulating three faces into facets did not make them art direction, it made them distorted, and the person in the photograph is the one who has to live with it. Crop it, grade it, or replace it. Do not redraw it."),
    ("Judge a flourish at the count it ships at",
     "A grain tile, a shard backdrop and a foil band each read as craft on one specimen. Printed three times across a row they are the loudest thing in the section and the faces are the quietest."),
    ("A resting shadow is the flat rule broken by habit",
     "The offset was not argued for, it arrived with the genre. When a card needs separation the answer is a rule or a tint; elevation waits for a pointer."),
    ("One grade for a set, never a correction per face",
     "Three shots under three white balances are fixed the way a press run fixes them, by sending every plate through the same chain. The moment one face gets its own numbers the set stops being a set. CI enforces this one."),
]

rules_css = """    .dd { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .dd h3 { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
             text-transform: uppercase; margin: 0 0 14px; font-weight: 400; }
    .dd .do-h { color: var(--green-brand); }
    .dd .no-h { color: var(--accent); }
    .r { padding: 10px 0; border-top: 1px solid var(--border); }
    .r b { display: block; font-family: var(--font-display); font-weight: 700;
           font-size: 0.95rem; line-height: 1.25; color: var(--text); }
    .r span { display: block; font-size: 0.85rem; line-height: 1.45;
              color: var(--text-2); margin-top: 3px; }
    .flat { background: var(--bg-alt); padding: 24px 28px; }
    .flat p { font-size: 0.95rem; line-height: 1.6; color: var(--text-2); margin: 0 0 10px; }
    .flat p:last-child { margin: 0; }
    .sh { display: grid; grid-template-columns: 150px 320px 1fr; gap: 20px;
          padding: 11px 0; border-top: 1px solid var(--border); align-items: baseline; }
    .sh b { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; }
    .sh code { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.02em;
               color: var(--text-3); }
    .sh span { font-size: 0.85rem; line-height: 1.45; color: var(--text-2); }
    .bought { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 40px; }
    .bought h4 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                 margin: 0 0 6px; color: var(--text); }
    .bought p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
"""

rules_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Rules</h1>
    <p class="lede">The half of a design system that actually holds. A palette can be re-derived from a stylesheet; a prohibition cannot. Every line here names the failure it prevents, because a rule whose reason is lost is the first one somebody argues away.</p>

    <div class="dd">
      <div>
        <h3 class="do-h">Do</h3>
%s      </div>
      <div>
        <h3 class="no-h">Never</h3>
%s      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Flat by default</h2>
    <div class="flat">
      <p>A resting element that needs separation gets a 1px or 1.5px full border, or a tint. Never a shadow. Shadows are state &mdash; hover, floating &mdash; or the one featured exception per page. The ghost-card pattern, a border plus a wide resting shadow, is prohibited outright.</p>
      <p>The living tabletop claimed an exception here once and lost it. The Card carried a printed ink offset under it at rest until 2026-09-08, and what replaced it is the rule kept rather than bent: a column with no shadow at all until a pointer arrives.</p>
    </div>

    <h2 class="sec" style="margin-top: 32px">The whole shadow vocabulary</h2>
    <p class="sec-note">Six, and no seventh. If a new surface needs depth, it is using one of these or it is not getting depth.</p>
%s
    <hr class="rule">
    <h2 class="sec">Four rules the trading card bought</h2>
    <p class="sec-note">The first instructor card was rejected on four counts at once on 2026-09-08. Each one generalises past that card, which is why each is a rule here rather than a note in a record.</p>
    <div class="bought">
%s    </div>
  </div>""" % (
    "".join("        <div class=\"r\"><b>%s</b><span>%s</span></div>\n" % (a, b) for a, b in DO),
    "".join("        <div class=\"r\"><b>%s</b><span>%s</span></div>\n" % (a, b) for a, b in DONT),
    "".join("    <div class=\"sh\"><b>%s</b><code>%s</code><span>%s</span></div>\n"
            % (a, b, c) for a, b, c in SHADOWS),
    "".join("      <div><h4>%s</h4><p>%s</p></div>\n" % (a, b) for a, b in BOUGHT),
)

(OUT / "Rules.dc.html").write_text(page(rules_body, rules_css))

# --- canvas.json ------------------------------------------------------------
# One plane, no page groups. Eleven artboards a reader pans between beats three
# tabs a reader has to remember the names of; the structure was mine, not the
# system's, and a design system that needs a table of contents is one nobody
# reads twice. Reading order runs left to right, top to bottom.
# Frames are fixed and surplus frame is harmless while clipping is not, so each
# height is the measured content height plus about five percent. Re-measure at
# 1120px wide after any content change.
BOARDS = [
    ("Main.dc.html", "Foundations", 1950),
    ("Type.dc.html", "Type", 1770),
    ("Voice.dc.html", "Voice", 2490),
    ("Logo.dc.html", "Logo", 1210),
    ("Mark.dc.html", "The mark", 2130),
    ("Layout.dc.html", "Layout", 1900),
    ("Motion.dc.html", "Motion \u00b7 live", 2950),
    ("Components.dc.html", "Components \u00b7 live", 2360),
    ("Card.dc.html", "The card \u00b7 live", 3100),
    ("Hero.dc.html", "Hero", 1790),
    ("Rules.dc.html", "Rules", 2250),
]
INTERACTIVE = {"Motion.dc.html", "Components.dc.html", "Card.dc.html"}
COLS, COL_W, COL_GAP, ROW_GAP = 3, 1120, 120, 160

artboards = []
y = 0
for row_start in range(0, len(BOARDS), COLS):
    row = BOARDS[row_start:row_start + COLS]
    for n, (fname, title, h) in enumerate(row):
        entry = {"file": fname, "x": n * (COL_W + COL_GAP), "y": y,
                 "w": COL_W, "h": h, "title": title, "print": "flow"}
        if fname in INTERACTIVE:
            entry["is_interactive"] = True
        artboards.append(entry)
    y += max(h for _, _, h in row) + ROW_GAP

canvas = {
    "artboards": artboards,
    "annotations": [
        {"id": "source-of-truth", "x": 0, "y": -400, "w": 900,
         "text": "The Plepic design system. Generated from css/styles.css and index.html "
                 "by design-canvas/build.py: change the site, re-run the script, re-seed. "
                 "If a value here disagrees with the stylesheet, the stylesheet is right "
                 "and this canvas is stale. No artboard carries a price, a date or any "
                 "other value that moves; Voice lists what stays in the page instead."},
        {"id": "live-boards", "x": 2480, "y": -400, "w": 480,
         "text": "Three artboards run: Motion, Components and The card. Open one with the "
                 "play button above its frame to watch it at full size \u2014 at canvas "
                 "zoom the mark's breath is a few pixels and reads as still. Then hover "
                 "the buttons, the card, and the right-hand butterfly."},
    ],
    "launch": {"view": "canvas"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2) + "\n")

for f in sorted(OUT.glob("*.dc.html")) + [OUT / "canvas.json"]:
    print("%-22s %6d bytes" % (f.name, f.stat().st_size))
