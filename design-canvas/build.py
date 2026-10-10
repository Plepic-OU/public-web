#!/usr/bin/env python3
"""Generate the Claude Design canvas artboards from the live site source.

The canvas must not become a second set of values. Everything a rule can be
read off is pulled from css/styles.css, index.html and training/index.html at
build time: both inlinings of the mark verbatim, the token block, the card
measurements, the animation keyframes, the facet slot table, the shadow list,
the hero and the category line. Nothing here restates a value the repository
owns.

The build refuses rather than lies. It stops unless the mark is 22 facets, the
hinge partition is 11/11, and exactly two facet slots are swapped. Add a check
here whenever you add a claim a value could falsify.

Nine artboards in one row: Foundations, Type, Voice, The mark, Layout,
Motion, Components, The card and Hero. Motion, Components and The card are
live; hovering does on the canvas what it does on the site.

To update the published canvas after a design change:

  1. python3 design-canvas/build.py
  2. Seed a fresh page from the bundled `design` skill's template:

     node "<skill dir>/seed-canvas.mjs" \
       --template "<skill dir>/payload.template.html" \
       --out plepic-design-system.html --title "Plepic Design System" \
       --artboard Main.dc.html   --artboard Type.dc.html \
       --artboard Voice.dc.html  --artboard Mark.dc.html \
       --artboard Layout.dc.html --artboard Motion.dc.html \
       --artboard Components.dc.html --artboard Card.dc.html \
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
TRAINING = (ROOT / "training" / "index.html").read_text()

# --- values lifted from the stylesheet, never typed twice -------------------
def token(name):
    m = re.search(r"^\s*" + re.escape(name) + r":\s*(.+?);", CSS, re.M)
    if not m:
        raise SystemExit("missing token " + name)
    return m.group(1).strip()

# Copy read off a page must never carry a volatile value onto the canvas, where
# the claims gate does not look. Same pattern as scripts/check-claims.mjs.
CLAIM_PAT = re.compile(r"(€[0-9][0-9.,]*|[0-9][0-9.,]* ?€|&euro;|[0-9][0-9.,]* ?EUR|[0-9][0-9.,]*%|"
                       r"20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]|[0-9]+\.[0-9]+\.20[0-9][0-9])")


def no_claims(label, text):
    if CLAIM_PAT.search(text):
        raise SystemExit("%s carries a volatile value: %s" % (label, CLAIM_PAT.search(text).group(0)))
    return text

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
    "--accent", "--bg", "--bg-alt", "--surface",
    "--text", "--text-2", "--text-3", "--border",
    "--font-display", "--font-body", "--font-mono",
    "--fs-body", "--fs-body-lg", "--fs-h2", "--fs-h3", "--fs-h4", "--fs-faq-q",
    "--rounded-xs", "--rounded-sm", "--rounded-md", "--rounded-lg", "--rounded-xl",
    "--rounded-2xl", "--rounded-badge", "--rounded-pill",
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
    ("--green-surface", "Ground for a block that must lift off the page"),
    ("--green-light", "Quiet fill behind a green statement"),
    ("--green-vivid", "Facet light and decoration. Never text"),
    ("--green-brand", "Text on light: links and the one green phrase. The only green that clears AA on cream"),
    ("--green-dark", "Body green needing AAA; facet shadow, mark body"),
]
ACCENT = ("--accent", "The ember at the mark's head, and one call to action")

# Neutrals: one role, one value, because the site has one mode.
NEUTRALS = [
    ("Ground", "--bg", "What the page is made of"),
    ("Recessed", "--bg-alt", "A well cut into the ground"),
    ("Raised", "--surface", "A sheet lifted off it"),
    ("Hairline", "--border", "The only line the page draws"),
    ("Ink", "--text", "Body and every heading"),
    ("Ink, quieter", "--text-2", "The supporting sentence"),
    ("Ink, label", "--text-3", "Eyebrow, caption, token. The floor: nothing lighter carries readable text"),
]
INK_ROLES = {"Ink", "Ink, quieter", "Ink, label"}


def brand_swatch(name, role):
    return ("      <div class=\"sw\">\n"
            "        <div class=\"chip\" style=\"background: %s\"></div>\n"
            "        <p class=\"sw-name mono\">%s</p>\n"
            "        <p class=\"sw-hex mono\">%s</p>\n"
            "        <p class=\"sw-role\">%s</p>\n"
            "      </div>\n" % (T[name], name, T[name], role))


def nrow(role, name, note):
    ink = " style=\"color: %s\"" % T[name] if role in INK_ROLES else ""
    return ("      <div class=\"nrole\"><span class=\"nrole-name\">%s</span>"
            "<span class=\"nrole-note\">%s</span></div>\n"
            "      <div class=\"ncell\">\n"
            "        <span class=\"nchip\" style=\"background: %s\"></span>\n"
            "        <span class=\"ntok mono\"%s>%s</span>\n"
            "        <span class=\"nhex mono\">%s</span>\n"
            "      </div>\n" % (role, note, T[name], ink, name, T[name]))


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
    .ngrid { display: grid; grid-template-columns: 236px 1fr;
             align-items: stretch; }
    .nrole { display: flex; flex-direction: column; justify-content: center;
             padding: 11px 20px 11px 0; }
    .nrole-name { font-family: var(--font-display); font-weight: 700;
                  font-size: 0.95rem; line-height: 1.2; color: var(--text); }
    .nrole-note { font-size: 0.8rem; line-height: 1.4; color: var(--text-3);
                  margin-top: 2px; }
    .ncell { display: flex; align-items: center; gap: 12px; padding: 11px 16px;
             border-bottom: 1px solid var(--border); }
    .nchip { width: 26px; height: 26px; flex: none;
             outline: 1px solid rgba(128, 128, 122, 0.35); outline-offset: -1px; }
    .ntok { font-size: 11px; letter-spacing: 0.02em; flex: 1; color: var(--text); }
    .nhex { font-size: 10.5px; letter-spacing: 0.02em; color: var(--text-3); }
    .canon { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .canon .mono { font-size: 0.92em; }
    .canon h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .canon p { font-size: 0.9rem; line-height: 1.55; color: var(--text-2); margin: 0; }
"""

main_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Foundations</h1>
    <p class="lede">Colour names a role and holds it; the register is weight, lift, tilt and breath. Every value here is read from <span class="mono" style="font-size:0.95em">css/styles.css</span>, so nothing on this canvas is a second opinion.</p>

    <h2 class="sec">Brand</h2>
    <p class="sec-note">One ramp, lightest to darkest, and one colour that is not green.</p>
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
    <p class="sec-note">Named by the job, not the hue. The site has one mode, light, so each role has one value.</p>
    <div class="ngrid">
%s    </div>

    <hr class="rule">
    <h2 class="sec">Six laws</h2>
    <p class="sec-note">Why the palette holds these values. A new need takes an existing step, never a new colour.</p>
    <div class="canon">
      <div><h3>The 73%% rule</h3><p>Every green is hue 137&deg; at 73%% saturation; vivid alone runs at 100%%. The accent sits at hue 15&deg;, matched to 73%%, so orange and green look mixed by one hand.</p></div>
      <div><h3>One accent per viewport</h3><p>A CTA button, an urgency badge or an accent dot. Never two: the mobile sticky CTA yields, and states use opacity, never a second orange.</p></div>
      <div><h3>The vivid text ban</h3><p><span class="mono">--green-vivid</span> is never text on light: 2.5:1 on cream fails AA. It is facet light and decoration.</p></div>
      <div><h3>One mode</h3><p>Light on every page. No dark section, no dark token, no dark hex; a guard fails any production page that reaches for one.</p></div>
      <div><h3>Headings are ink</h3><p>At most one green phrase carries the sentence. A fully green heading is off-canon in any medium.</p></div>
      <div><h3>Nothing shines</h3><p>No cyan, neon, glassmorphism, gradient text, glow or blur. If it could be any company, it is not this one.</p></div>
    </div>
  </div>""" % (
    "".join(brand_swatch(n, r) for n, r in BRAND),
    T[ACCENT[0]], ACCENT[0], T[ACCENT[0]], ACCENT[1],
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
    <h2 class="sec">What the scale assumes</h2>
    <div class="canon">
      <div><h3>Display is hero-only</h3><p>A non-hero h1 uses clamp(2rem, 2rem + 3vw, 3.5rem). The hero ramp on an interior page makes every page a landing page.</p></div>
      <div><h3>Weight carries the bottom</h3><p>At clamp minimums h3, h4 and body are one size; weight separates them, so an h3 is never 400.</p></div>
      <div><h3>Two namespaces</h3><p><span class="mono">--fs-</span> is size, <span class="mono">--text-</span> is colour. A token that sets both is wrong for one of them.</p></div>
      <div><h3>The Line-Height Trap</h3><p>A control that inherits the body&rsquo;s 1.7 grows a box nobody asked for. Buttons, badges and labels set <span class="mono">line-height: normal</span>.</p></div>
      <div><h3>No all-caps headings</h3><p>Uppercase belongs to mono labels and the trust bar, never to a heading.</p></div>
    </div>
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
    .anat { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
            border-top: 1.5px solid var(--text); padding-top: 16px; }
    .anat h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
               margin: 0 0 6px; }
    .anat p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .anat .mono { font-size: 0.92em; }
"""

PARTS = [
    ("Seat", ".tt-seat",
     "An unmoving wrapper that owns the hover and the tilt hook, because a transformed card chases its own hover box out from under the pointer."),
    ("Column", ".tt-card",
     "A flex column at 18px 24px padding that fills the track it is given; the homepage grid caps that track at 300px."),
    ("Sheet", ".tt-card::before",
     "The white surface and its hover shadow live on ::before, because a background would paint under both rules and hide them."),
    ("Standing head", ".tt-type",
     "Mono 9.5px uppercase in --text-3, warming on hover, at line-height normal. It carries the 1.5px ink rule on its own top edge. Names the role, never a number."),
    ("Byline", ".tt-name",
     "Display 700 at 1.4rem on a baseline flex row, so the name and the set glyph print as one line."),
    ("Set glyph", ".tt-setglyph",
     "The mark at 15px, held by flex: none. Its ember belongs to the locked mark and spends no accent."),
    ("Plate", ".tt-art",
     "A square on --bg-alt with no frame: the multiply below pulls the cream into the photograph, the last step of the grade."),
    ("Ink wrapper", ".tt-ink",
     "Carries mix-blend-mode: multiply apart from the filter, because the two on one node render differently across engines."),
    ("Photograph", ".tt-portrait",
     "A real photograph under --photo-grade. One chain for every face; framing is per person, as geometry, never colour."),
    ("Day-job line", ".tt-role",
     "Present tense on --text-2, employer in ink. flex: 1 takes the spare height, so the closing rule aligns across a row."),
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
    <p class="lede">A graded editorial column. A rule opens it above the eyebrow, a rule closes it under the role, and nothing else draws a box. One grade for the set, so three faces read as one deck.</p>

    <h2 class="sec">The set at rest</h2>
    <p class="sec-note">Three 300px columns, 32px apart, one height, on the page ground.</p>
    <div class="row">
%s%s%s    </div>

    <hr class="rule">
    <h2 class="sec">Rest and lift</h2>
    <p class="sec-note">Only hover prints a sheet: the column rises 5px over a white surface and a soft shadow. On a fine pointer it also tilts up to 9&deg; and 11&deg;, which this artboard does not run.</p>
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
    <p class="sec-note">Ten parts in source order. Each answers something that broke; drop one and the break returns.</p>
%s
    <hr class="rule">
    <h2 class="sec">What a card never does</h2>
    <div class="anat">
      <div><h3>Rest elevated</h3><p>Two rules at rest. The sheet and its shadow exist only under a pointer or focus.</p></div>
      <div><h3>Rank a person</h3><p>No tier, score or power bar on a face. The number behind a rank cannot be verified.</p></div>
      <div><h3>Spend the accent</h3><p>Its only warm pixel is the ember inside the mark, so a row of three leaves the viewport&rsquo;s accent unspent.</p></div>
      <div><h3>Redraw a face</h3><p>A photograph is not raw material. Crop it, grade it or replace it; never triangulate a person.</p></div>
      <div><h3>Need the script</h3><p>The lift is CSS, the tilt JavaScript. Without the module, on touch or under reduced motion, it still rises.</p></div>
      <div><h3>Grade one face</h3><p>Every portrait takes the same <span class="mono">--photo-grade</span>. If a face needs its own number, the grade is wrong, and CI fails it.</p></div>
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


mark_css = """    .locks { display: flex; align-items: flex-start; gap: 56px; flex-wrap: wrap; }
    .lock { display: inline-flex; align-items: center; gap: 0.5rem;
            line-height: normal; padding: 16px 20px; }
    .lock--stacked { flex-direction: column-reverse; align-items: center;
                     gap: 0.3rem; }
    .lock-word { font-family: var(--font-display); font-weight: 600;
                 font-size: 1.5rem; letter-spacing: 0.01em; line-height: normal; }
    .lock-mark { width: 30px; flex: none; }
    .lock-mark svg { display: block; width: 100%; height: auto; }
    .lcap { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
           text-transform: uppercase; color: var(--text-3); margin: 14px 0 0; }
    .lcap-note { font-size: 0.85rem; line-height: 1.5; color: var(--text-2);
                margin: 4px 0 0; max-width: 26ch; }
    .ctxs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .ctxbox { padding: 26px 24px; }
    .ctxbox p { margin: 14px 0 0; font-size: 0.85rem; line-height: 1.5; }
    .sizes { display: flex; align-items: flex-end; gap: 60px; padding: 8px 0 0; }
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
    <p class="lede">One locked cut at every size: twenty-two facets, a leaf body, two antennae and one ember. Copy the geometry; never redraw, re-facet, stretch or recolour it, not even in one colour.</p>

    <h2 class="sec">The lockup</h2>
    <p class="sec-note">Wordmark left, butterfly right, sized to the wordmark&rsquo;s ascender so the pair scales as one. Bitter 600 at 1.5rem is the wordmark. Stacked is the same pair, mark above, for a narrow or centred hole.</p>
    <div class="locks">
      <div>
%s        <p class="lcap">Horizontal &middot; header, footer, signature</p>
      </div>
      <div>
%s        <p class="lcap">Stacked &middot; .logo-lockup--stacked</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Two grounds</h2>
    <p class="sec-note">The mark never changes; only the wordmark answers its ground.</p>
    <div class="ctxs">
      <div class="ctxbox" style="background: var(--bg); outline: 1px solid var(--border); outline-offset: -1px;">
%s        <p style="color: var(--text-2)"><b>On light.</b> <span class="mono" style="font-size:0.92em">--green-brand</span>, the default.</p>
      </div>
      <div class="ctxbox" style="background: var(--green-surface);">
%s        <p style="color: var(--text-2)"><b>On brand.</b> <span class="mono" style="font-size:0.92em">--text</span>, because green on green is illegible.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Four host widths, and no fifth</h2>
    <p class="sec-note">The viewBox owns the ratio: size the host and the mark follows.</p>
    <div class="sizes">
%s%s%s%s    </div>

    <hr class="rule">
    <h2 class="sec">Construction</h2>
    <p class="sec-note">Every number is in the page&rsquo;s markup, listed to check a placement, never to retype one.</p>
    <div class="spec"><b>viewBox</b><span>0 0 %g %g.</span></div>
    <div class="spec"><b>Wing facets</b><span>11 triangles per wing, 22 in all, sharing edges so no light shows through.</span></div>
    <div class="spec"><b>Centre seam</b><span>Left wings end at x=147, right begin at x=153; the 6px channel lets the wings hinge without clipping.</span></div>
    <div class="spec"><b>Body</b><span>One bezier leaf from (150,92) to (150,200) in <span class="mono">--green-dark</span>.</span></div>
    <div class="spec"><b>Antennae</b><span>Two paths from (150,86) to (136,42) and (164,42), <span class="mono">--green-dark</span> at 1.8px, opacity 0.7.</span></div>
    <div class="spec"><b>Tips and head</b><span>Two r=3.5 circles in <span class="mono">--green-vivid</span>; one r=8 ember at (150,90) in <span class="mono">--accent</span>, the mark&rsquo;s only orange.</span></div>
    <div class="spec"><b>Seam fix</b><span>Each polygon is stroked in its own fill at 0.5px; with <span class="mono">shape-rendering</span> on the root, no hairline shows between triangles.</span></div>

    <hr class="rule">
    <h2 class="sec">The facet law</h2>
    <p class="sec-note">No two adjacent facets share a colour. The outlines mirror exactly; the asymmetry lives in the fills.</p>
    <div class="two">
      <div>
        <div class="keys">
          <span class="key"><i style="background: %s"></i>DK &middot; --green-dark</span>
          <span class="key"><i style="background: %s"></i>B &middot; --green-brand</span>
          <span class="key"><i style="background: %s"></i>V &middot; --green-vivid</span>
        </div>
        <p class="why" style="font-size:0.9rem; line-height:1.55; color: var(--text-2); margin:0">Slots %s and %s carry it: the right wing swaps B and DK. That one hand-made swap is why a wing cannot be made by flipping the other, and the build refuses to run if the count changes.</p>
      </div>
      <table class="slots">
        <tr><th>Slot</th><th>Left</th><th>Right</th><th></th></tr>
%s      </table>
    </div>

    <hr class="rule">
    <div class="facts">
      <div><h3>It breathes</h3><p>The wings open and close on a long, calm loop while the core bobs: rotation and translation only, never colour.</p></div>
      <div><h3>It beats on arrival</h3><p>Hovering a card it signs beats the wings wide on top of the breath, because nested rotations compose.</p></div>
      <div><h3>Three layers, one source</h3><p>The page ships the flat SVG in a <span class="mono">&lt;plepic-mark&gt;</span> host; the script re-stacks it into two wings and a core and draws nothing of its own.</p></div>
    </div>
  </div>""" % (
    lockup("var(--green-brand)"),
    lockup("var(--green-brand)", stacked=True),
    lockup("var(--green-brand)"),
    lockup("var(--text)"),
    mark_at(300, ".mark-display", "Display"),
    mark_at(120, ".mark-art", "Art"),
    mark_at(30, ".mark-nav", "The header lockup"),
    mark_at(15, ".tt-setglyph", "Set glyph on a card name"),
    VB_W, VB_H,
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
    .decoder { display: flex; align-items: baseline; gap: 4px;
               font-family: var(--font-display); font-weight: 700;
               font-size: 2.6rem; line-height: 1.15; letter-spacing: -0.01em;
               margin: 0 0 6px; }
    .decoder .lit { color: var(--text); }
    .decoder .dim { color: var(--text-3); font-weight: 400; }
    .decoder .g { color: var(--green-brand); }
    .slogan-note { font-size: 0.9rem; line-height: 1.5; color: var(--text-3);
                   margin: 14px 0 0; max-width: 60ch; }
    .langs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .lang .line em { font-style: normal; }
    .g { color: var(--green-brand); }
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

# The category line is the training page's own headline, read rather than typed.
_cat = re.search(r'<h1 class="hero-entrance[^"]*">(.*?)</h1>', TRAINING, re.S)
if not _cat:
    raise SystemExit("training page h1 not found")
CATEGORY = no_claims("category line", _cat.group(1)).replace('<span class="highlight">', "<em>").replace("</span>", "</em>")

voice_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Voice</h1>
    <p class="lede">Words are as fixed as the greens. Write like a practitioner: calm, exact, a little playful, and never longer than the thought.</p>

    <h2 class="sec">Who the words are for</h2>
    <p class="sec-note">Plepic Strategy owns the mission sentence. This is what it asks of a line.</p>
    <div class="langs">
      <div class="lang">
        <p class="tag">The engineer</p>
        <p class="line">becoming an <em class="g">agentic engineer</em></p>
        <p class="why">Show the craft: real code, real checks, the engineer directing and verifying. Never promise the agent does the job.</p>
      </div>
      <div class="lang">
        <p class="tag">The entrepreneurial lead</p>
        <p class="line">ready to be <em class="g">paid for results</em>, not hours</p>
        <p class="why">A founder or team lead. Show the outcome and the arithmetic, and make the relationship worth starting.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">The tone</h2>
    <p class="sec-note">Five qualities, each heard on the live site.</p>
    <div class="rules">
      <div class="rule-row"><b>Professional</b><span>Exact nouns and checked numbers. A boast becomes a fact or goes.</span></div>
      <div class="rule-row"><b>A little playful</b><span>One small image or a turn of rhythm; no puns, no exclamation marks. &ldquo;This page is a cocoon.&rdquo; (404)</span></div>
      <div class="rule-row"><b>Invites experiment</b><span>Low-stakes verbs: try, sketch, break, undo. &ldquo;&hellip;we&rsquo;ll sketch what an agent would do with it.&rdquo;</span></div>
      <div class="rule-row"><b>Grounded</b><span>The engineer is the subject; agents are directed and checked, never partners or minds; your checks decide when the work is done.</span></div>
      <div class="rule-row"><b>Inspiring</b><span>Name the after-state, not the tool. &ldquo;In six weeks you build it into how your team works.&rdquo;</span></div>
      <div class="rule-row"><b>Never</b><span>Revolutionise, 10x, magic, supercharge, autonomy as a selling point, a wellbeing promise.</span></div>
    </div>

    <hr class="rule">
    <h2 class="sec">The tagline decodes the name</h2>
    <p class="sec-note">PLEPIC is PL(ay) plus EPIC, and each half of the tagline names one half. That is why it cannot be reworded.</p>
    <p class="decoder"><span class="g">PL</span><span class="dim">(ay)</span><span class="g">EPIC</span></p>
    <p class="slogan" style="margin-top: 18px">Curious play. Epic growth.</p>
    <p class="slogan-note">Bitter italic 500 in <span class="mono" style="font-size:0.95em">--green-brand</span> when given room; in the footer, quiet ink that warms to green on hover. The one line allowed to be green throughout. Estonian pages carry it untranslated, as a signature, because the pun lives in an English name.</p>

    <hr class="rule">
    <h2 class="sec">The category line</h2>
    <p class="sec-note">Read from the training page&rsquo;s headline at build time, so it cannot drift. It names what Plepic sells.</p>
    <p class="ex" style="font-size: 2rem">%s</p>

    <hr class="rule">
    <h2 class="sec">The headline pattern</h2>
    <p class="sec-note">A heading is ink, and at most one phrase inside it carries green. The green phrase is the claim.</p>
    <div class="pair">
      <div class="say">
        <h3>This</h3>
        <p class="ex"><em>Practitioners</em>, not trainers</p>
        <p class="why">Green marks what the page is about; ink carries the rest. Remove the green and the heading still reads.</p>
      </div>
      <div class="dont">
        <h3>Never this</h3>
        <p class="ex ex-all">Practitioners, not trainers</p>
        <p class="why">A fully green heading emphasises nothing and leaves the next green phrase nothing to earn.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Rules that travel</h2>
    <p class="sec-note">They hold in a heading, a slide, an email and a proposal.</p>
    <div class="rules">
      <div class="rule-row"><b>No em-dashes</b><span>Not in anything a customer reads. Commas, colons and full stops carry the same joins.</span></div>
      <div class="rule-row"><b>Cohort, not squad</b><span>Older records keep the old word; nothing new does.</span></div>
      <div class="rule-row"><b>Sentence, then proof</b><span>The supporting line sits in the quieter ink. If it is not quieter, the heading is not carrying.</span></div>
      <div class="rule-row"><b>Never longer</b><span>A rewrite earns its music by losing words; it never outgrows the line it replaces.</span></div>
    </div>

    <hr class="rule">
    <div class="never">
      <p><b>What never enters this canvas.</b> A volatile value lives in the page that states it, where the claims gate can see it.</p>
      <ul>
        <li>Prices, discounts and any figure with a currency on it</li>
        <li>Cohort dates, deadlines and anything counted in weeks from today</li>
        <li>Seat counts, developers trained, ratings, any number that grows</li>
        <li>Names of people who have not signed</li>
      </ul>
    </div>
  </div>""" % CATEGORY

(OUT / "Voice.dc.html").write_text(page(voice_body, voice_css))

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
""" % (CYCLE, T["--ease-settle"], VB_W, VB_H,
       keyframes("mark-breath-left", "mark-breath-right", "mark-bob",
                 "mark-wingbeat-left", "mark-wingbeat-right")) + "".join(c for c, _ in _tracks)

motion_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Motion</h1>
    <p class="lede">Everything here runs. Play lives in weight, lift, tilt and breath: each a duration and an ease, never a colour or a score bar. Sound belongs to the cohort loadout builder alone. Hover where it says.</p>

    <h2 class="sec">Four durations</h2>
    <p class="sec-note">All four dots restart together every 2.4 seconds; compare how soon each arrives.</p>
%s
    <hr class="rule">
    <h2 class="sec">Two eases, and no third</h2>
    <p class="sec-note">One for arriving, one for never stopping. A linear ease is a bug.</p>
    <div class="eases">
      <div class="ease">
        <h3>Arriving</h3><span class="mono">--ease-settle &middot; %s</span>
        <div class="trk-rail"><span class="trk-dot"></span></div>
        <p>Fast off the mark, long settle: every hover, lift, reveal and entrance. It puts things down rather than moving them.</p>
      </div>
      <div class="ease">
        <h3>Idling</h3><span class="mono">--ease-calm &middot; %s</span>
        <div class="trk-rail"><span class="trk-dot" style="animation-timing-function: %s"></span></div>
        <p>Symmetrical, so a loop has no beginning: the breath, the bob, the antennae.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">The reveal</h2>
    <p class="sec-note">Twenty pixels up over 600ms, 100ms apart. Content shows by default and hides only once the script has proved it runs, so a failed script still shows the page.</p>
    <div class="rev"><span></span><span></span><span></span></div>

    <hr class="rule">
    <h2 class="sec">The breath, and the beat</h2>
    <p class="sec-note">Two wings and a core. At rest the wings open to %s over %s, a third of a second apart, while the core bobs %s. Hover the right one.</p>
    <div class="marks">
      <div>
%s        <p class="trk-note" style="margin-top:14px">At rest. Breath only.</p>
      </div>
      <div>
%s        <p class="trk-note" style="margin-top:14px">Hover me. The beat opens to %s in %s on top of the breath: the hinge breathes, the wing inside beats, and nested rotations compose.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Weight and lift</h2>
    <p class="sec-note">A card rises %s and a sheet prints beneath it in %s; on a fine pointer it tilts up to %s and %s. Hover it.</p>
    <div class="lift">
      <div class="liftseat"><div class="liftbox"></div>
        <p class="trk-note" style="margin-top:14px">The shadow belongs to the sheet, never the card.</p></div>
    </div>

    <hr class="rule">
    <h2 class="sec">The signature, and what owns it</h2>
    <p class="sec-note">On the homepage a crystalline caterpillar crawls, cocoons and unfurls into the locked mark while the code line becomes the agentic loop: developer becomes agentic engineer, told twice at once.</p>
    <div class="two">
      <div class="kv"><b>Movements</b><span>Crawl 4.6s, gather 2.6s, chrysalis 3.0s, unfurl 3.4s, then rest: 13.6s. The 22 facets stay constant; matter reorganises, geometry never changes.</span></div>
      <div class="kv"><b>Trigger</b><span>One replay 3000ms after boot, then the visitor owns it: hover or tap the resting mark. It fires only from rest; no scroll trigger, no loop, no button.</span></div>
      <div class="kv"><b>Springs, not tweens</b><span>A deadband snap and a shader rest gate land the pose byte-exact on the locked mark.</span></div>
      <div class="kv"><b>One locked unit</b><span>The animation and its code line ship and retime together.</span></div>
      <div class="kv"><b>Fallback</b><span>Reduced motion, 900px or narrower, Save-Data, deviceMemory under 2 or no WebGL2: nothing downloads; a static poster and the finished line render. A failure mid-run, context loss or sustained slow frames land there too.</span></div>
    </div>

    <hr class="rule">
    <h2 class="sec">Two rules that outrank any effect</h2>
    <div class="two">
      <div class="kv"><b>Mark-motion</b><span>Motion that resolves to the locked mark is sanctioned. Static effects (glow, gradient, drop shadow, per-facet opacity, outline wings) stay banned: motion animates the mark, never restyles it.</span></div>
      <div class="kv"><b>Reduced motion</b><span>Every loop, reveal and tilt has a branch that lands on its end state instantly and hides nothing; the hero holds its from-state legible. Shipping without one is a defect.</span></div>
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
    ("btn-primary", "Talk to Kaido"),
    ("btn-outline", "View curriculum"),
    ("btn-ghost", "Learn more"),
]
_panel = re.search(r"^\.panel-white \{[^}]*?border-radius:\s*([^;]+);", CSS, re.S | re.M)
if not _panel:
    raise SystemExit("missing .panel-white radius")
PANEL_RADIUS = _panel.group(1).strip()

# The whole shadow vocabulary. The build refuses if the stylesheet carries a
# box-shadow that is not on this list, or if a listed value has left it.
SHADOWS = [
    ("Code ambient", "0 2px 8px rgba(28, 28, 26, 0.04)", "The one resting shadow, under inline code."),
    ("Hover lift", "0 8px 24px rgba(28, 28, 26, 0.06)", "Interactive cards on hover, with a 2px rise."),
    ("Tooltip", "0 8px 24px rgba(28, 28, 26, 0.1)", "A floating layer."),
    ("Instructor slide", "0 20px 50px rgba(28, 28, 26, 0.16)", "The slide floating over the team row."),
    ("Accent pulse", "0 0 0 0 rgba(226, 108, 69, 0.3)", "The CTA ring, keyframed to transparent."),
    ("Card sheet", T["--card-shadow-hover"], "Behind a lifted card, on hover and focus."),
]
_shadow_ok = {v for _, v, _ in SHADOWS} | {"0 0 0 8px rgba(226, 108, 69, 0)", "none", "none !important",
                                         "var(--card-shadow-hover)"}
for _v in re.findall(r"box-shadow:\s*([^;]+);", CSS):
    if " ".join(_v.split()) not in _shadow_ok:
        raise SystemExit("box-shadow outside the vocabulary: " + _v)
for _, _v, _ in SHADOWS[:-1]:
    if _v not in CSS:
        raise SystemExit("listed shadow not in the stylesheet: " + _v)

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
                   border-radius: var(--rounded-xl); padding: var(--space-xl); }
    .panel-cream { background: var(--bg); border: 1px solid var(--border);
                   border-radius: var(--rounded-xl); padding: var(--space-xl); }
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
    .grid3 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .grid3 h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .grid3 p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .sh { display: grid; grid-template-columns: 150px 320px 1fr; gap: 20px;
          padding: 11px 0; border-top: 1px solid var(--border); align-items: baseline; }
    .sh b { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; }
    .sh code { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.02em;
               color: var(--text-3); }
    .sh span { font-size: 0.85rem; line-height: 1.45; color: var(--text-2); }
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
    <p class="lede">The furniture every page shares. A one-page need stays on its page until a second page wants it.</p>

    <h2 class="sec">The button system</h2>
    <p class="sec-note">Three sizes by three variants; a variant sets colour, a size sets the box. Outline and ghost are ink and hover to <span class="mono" style="font-size:0.92em">--green-surface</span> under <span class="mono" style="font-size:0.92em">--green-dark</span>.</p>
%s
    <div class="demo" style="margin-top: 24px">
      <div>
        <a class="btn btn-outline btn-focus" href="#">Keyboard focus</a>
        <p class="demo-cap">Focus ring</p>
        <p class="demo-note">2px <span class="mono" style="font-size:0.92em">--green-dark</span>, offset 2px. Never removed or restyled per control.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Primary plus ghost, never two solids</h2>
    <p class="sec-note">The hero pairing: do this, or look first.</p>
    <div class="pair">
      <div>
        <h3 class="yes">This</h3>
        <div class="btnrow-set"><a class="btn btn-primary" href="#">Talk to Kaido</a><a class="btn btn-ghost" href="#">View the full program &rarr;</a></div>
        <p class="why">One thing to do, one to read; the link waits for the visitor not yet ready.</p>
      </div>
      <div>
        <h3 class="no">Never this</h3>
        <div class="btnrow-set"><a class="btn btn-primary" href="#">Talk to Kaido</a><a class="btn btn-outline" href="#">View the full program</a></div>
        <p class="why">Two solid-looking buttons compete and neither wins. Use <span class="mono" style="font-size:0.92em">.btn-outline</span> only where no primary shares the row.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Panels, never same on same</h2>
    <p class="sec-note">White on cream, cream on white. A full 1px border and a %s radius; the green surface marks a favoured option only.</p>
    <div class="panels">
      <div class="pbox pbox--onCream">
        <div class="panel-white">
          <p class="panel-header">What you leave with</p>
          <p>A working agent setup in your own repo.</p>
        </div>
        <p class="demo-cap">.panel-white on cream &middot; the default</p>
      </div>
      <div class="pbox pbox--onWhite">
        <div class="panel-cream" data-demo="panel-cream">
          <p class="panel-header">What you leave with</p>
          <p>A working agent setup in your own repo.</p>
        </div>
        <p class="demo-cap">.panel-cream on white &middot; the inverse</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Badges, rows, code and nav</h2>
    <p class="sec-note">The badge corner, %s, is the signature: the one shape that is not a rounded rectangle.</p>
    <div class="demo">
      <div>
        <span class="badge"><span class="badge-dot"></span>Cohort open</span>
        <p class="demo-cap">Default</p>
        <p class="demo-note">A plain true state; the badge&rsquo;s only green.</p>
      </div>
      <div>
        <span class="badge badge-urgency"><span class="badge-dot"></span>Closing soon</span>
        <p class="demo-cap">Urgency</p>
        <p class="demo-note">The ember dot spends the viewport&rsquo;s one accent; no CTA shares its view.</p>
      </div>
      <div>
        <div class="codeb"><span class="cm"># the shape of a session</span><br>claude --resume</div>
        <p class="demo-cap">Code &middot; 8px radius</p>
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
        <p class="demo-note">Two hairlines and space. No box, no radius, no shadow.</p>
      </div>
      <div>
        <nav class="navdemo">
          <a href="#" class="cur">Training</a><a href="#">Scopeful</a><a href="#">Jobs</a><a href="#" class="ext">Skill Tree</a>
        </nav>
        <p class="demo-cap">Navigation</p>
        <p class="demo-note">Quieter ink at rest, full ink on hover, green and underlined for the current page. An external link earns an arrow, nothing more.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Flat by default, and six shadows</h2>
    <p class="sec-note">At rest, separation is a 1px or 1.5px border or a tint; a border plus a wide resting shadow is banned. Only inline code rests on a shadow; the rest are states, and the build refuses a seventh.</p>
%s
    <hr class="rule">
    <div class="grid3">
      <div><h3>The box is optional</h3><p>Most things are a rule and some space. Use a panel only when content must lift off the page.</p></div>
      <div><h3>Judge a flourish at its count</h3><p>Craft on one specimen is noise across a row. Judge a flourish at the number it ships.</p></div>
    </div>
  </div>""" % (
    "".join(btn_row(c, spec, use) for c, spec, use in BTN_SIZES),
    PANEL_RADIUS, T["--rounded-badge"],
    "".join("    <div class=\"sh\"><b>%s</b><code>%s</code><span>%s</span></div>\n"
            % (a, b, c) for a, b, c in SHADOWS),
)

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
RADII = [("--rounded-xs", "Badge, tight corner"), ("--rounded-sm", "Code, small button"),
         ("--rounded-md", "Button"), ("--rounded-lg", "Large button"),
         ("--rounded-xl", "Panel"), ("--rounded-2xl", "Content card, the cap"),
         ("--rounded-badge", "The badge"), ("--rounded-pill", "Pill")]
BREAKS = [
    ("640px", "Below: the type ramp bottoms out"),
    ("768px", "Below: one column, nav collapses to the toggle"),
    ("900px", "Below: the hero's butterfly stage is hidden entirely"),
    ("901 to 1014px", "Two hero columns while narrower than the container; the headline ramps"),
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
    .rad { display: flex; gap: 22px; align-items: flex-end; flex-wrap: wrap; }
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
    <p class="lede">One scale, one container, one rhythm. Vertical space separates most blocks, so the scale does more work than any component.</p>

    <h2 class="sec">The space scale</h2>
    <p class="sec-note">Eight steps, each about a third larger. A value off this list is a mistake. Group tight, separate generously; even spacing everywhere reads as an unfinished wireframe.</p>
%s
    <hr class="rule">
    <h2 class="sec">The container</h2>
    <p class="sec-note">%s wide at most, with a 2rem gutter that never collapses. When a page feels empty, the emptiness is vertical.</p>
    <div class="cont"><div class="cont-inner" style="width: 79.4%%">%s content track &middot; 2rem gutter either side</div></div>

    <hr class="rule">
    <div class="two">
      <div>
        <h2 class="sec">Rhythm</h2>
        <p class="sec-note">Four measurements set the page.</p>
        <div class="kv"><b>--space-4xl</b><span>Section padding, top and bottom: why two sections read as two.</span></div>
        <div class="kv"><b>--space-3xl</b><span>Block to block inside a section.</span></div>
        <div class="kv"><b>--header-height</b><span>%s. The header is fixed, so anchors pad by this plus --space-3xl.</span></div>
        <div class="kv"><b>backdrop-filter</b><span>12px blur at 90%% page ground, so content passes under the header legibly.</span></div>
      </div>
      <div>
        <h2 class="sec">Breakpoints</h2>
        <p class="sec-note">Four, each because something measurably broke.</p>
%s      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Two rules about arrangement</h2>
    <div class="two" style="margin-bottom: 32px">
      <div class="kv"><b>Asymmetric</b><span>1.4fr / 0.6fr, never 50/50. A page split down the middle argues for neither side; the hero, comparisons and panel rows lean.</span></div>
      <div class="kv"><b>Not centred</b><span>On desktop, centring is for one short thing, never a page of them.</span></div>
    </div>

    <h2 class="sec">Radii</h2>
    <p class="sec-note">Eight tokens and their intended owners. The card and every rule-based block have no radius.</p>
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
            "<p class=\"rad-cap\">%s</p><p class=\"rad-use\">%s</p></div>\n" % (T[r], T[r], u)
            for r, u in RADII),
)

(OUT / "Layout.dc.html").write_text(page(layout_body, layout_css))

# --- Hero -------------------------------------------------------------------
# A wireframe, not a screenshot. Every measurement is the real one; every
# volatile value is left as a marked slot, because a screenshot of the live
# hero would smuggle a price, a cohort state, a headcount and a rating into
# the design system as pixels, where the claims gate cannot see them.
_h1 = re.search(r'<h1 class="hero-entrance hero-entrance-2">(.*?)</h1>', INDEX, re.S)
_desc = re.search(r'<p class="hero-desc[^"]*">\s*(.*?)<br>', INDEX, re.S)
_ctas = re.search(r'<div class="btn-group hero-entrance[^"]*">(.*?)</div>', INDEX, re.S)
if not (_h1 and _desc and _ctas):
    raise SystemExit("homepage hero markup not found")
HERO_H1 = no_claims("hero headline", _h1.group(1))
HERO_DESC = no_claims("hero sentence", " ".join(_desc.group(1).split()))
HERO_CTA = re.findall(r'<a [^>]*>(.*?)</a>', _ctas.group(1))
if len(HERO_CTA) != 2:
    raise SystemExit("expected two hero CTAs, found %d" % len(HERO_CTA))

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
    <p class="lede">One composition for every page with a hero. The words are read from the homepage at build time; the four values that change are dashed slots, because pixels would hide them from every check.</p>

    <div class="hgrid">
      <div class="htext">
        <p style="margin: 0 0 0.75rem"><span class="slot">cohort state &middot; engineers trained &middot; rating</span></p>
        <h2 class="hh1">%s</h2>
        <p class="hdesc">%s<br><span class="slot" style="margin-top:0.5rem">price &middot; subsidy share</span></p>
        <div class="hctas">
          <a class="hbtn hbtn--p" href="#">%s</a>
          <a class="hbtn hbtn--t" href="#">%s</a>
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
    <p class="sec-note">Every number is in the stylesheet. The hero overrides the type scale, so check these first when it looks wrong.</p>
    <div class="anno"><b>grid</b><span>1.4fr / 0.6fr, 2rem gap, aligned to the bottom, so headline and butterfly share a baseline and read as one object.</span></div>
    <div class="anno"><b>h1</b><span>clamp(3rem, 2.5rem + 3.5vw, 4.8rem) at -0.025em and 1.05. Its own ramp; the break after the comma is markup, never a wrap.</span></div>
    <div class="anno"><b>text track</b><span>580px, the sentence 480px. Below 1015px the headline ramps, because the 440px stage would collide with it.</span></div>
    <div class="anno"><b>stage</b><span>440px, gone below 900px: the page loses the butterfly rather than shrink it.</span></div>
    <div class="anno"><b>accent</b><span>The body CTA spends the viewport&rsquo;s accent. The nav CTA is an ink outline, and no urgency badge shares the view.</span></div>
    <div class="anno"><b>entrance</b><span>A settle: content starts 6px low and fully legible, and rises over 600ms once the fonts land. Nothing load-bearing starts invisible.</span></div>

    <hr class="rule">
    <div class="cant">
      <p><b>The butterfly does not travel.</b> The hero mark is a WebGL metamorphosis with a byte-exact rest pose and a still poster for anything without WebGL, so it is never redrawn as an artboard. Its geometry and choreography belong to <span class="mono" style="font-size:0.95em">js/crystalline-metamorphosis.js</span> alone.</p>
    </div>
  </div>""" % (HERO_H1, HERO_DESC, HERO_CTA[0], HERO_CTA[1])

(OUT / "Hero.dc.html").write_text(page(hero_body, hero_css))

# --- canvas.json ------------------------------------------------------------
# One plane, no page groups. Nine artboards a reader pans between beats three
# tabs a reader has to remember the names of; the structure was mine, not the
# system's, and a design system that needs a table of contents is one nobody
# reads twice. Reading order runs left to right, top to bottom.
#
# ONE ROW. Kaido asked for a single horizontal strip and asked twice; the
# packing arithmetic prefers six across (fit-zoom 15% against 11.6%) but that
# is an optimisation nobody wanted. A strip reads as one continuous system and
# pans left to right, which is the gesture, and no artboard is ever hidden
# under another row. Nine reference sheets cannot be READ at once at any
# zoom regardless: the overview is for seeing the shape and opening one.
# Frames are fixed and surplus frame is harmless while clipping is not, so each
# height is the measured content height plus about five percent. Re-measure at
# 1120px wide after any content change.
HEIGHTS = {"Main": 1670, "Type": 1780, "Voice": 2270, "Mark": 2550, "Layout": 1800,
           "Motion": 2530, "Components": 2670, "Card": 2620, "Hero": 1560}
BOARDS = [
    ("Main.dc.html", "Foundations", HEIGHTS["Main"]),
    ("Type.dc.html", "Type", HEIGHTS["Type"]),
    ("Voice.dc.html", "Voice", HEIGHTS["Voice"]),
    ("Mark.dc.html", "The mark", HEIGHTS["Mark"]),
    ("Layout.dc.html", "Layout", HEIGHTS["Layout"]),
    ("Motion.dc.html", "Motion \u00b7 live", HEIGHTS["Motion"]),
    ("Components.dc.html", "Components \u00b7 live", HEIGHTS["Components"]),
    ("Card.dc.html", "The card \u00b7 live", HEIGHTS["Card"]),
    ("Hero.dc.html", "Hero", HEIGHTS["Hero"]),
]
INTERACTIVE = {"Motion.dc.html", "Components.dc.html", "Card.dc.html"}
COLS, COL_W, COL_GAP, ROW_GAP = 9, 1120, 120, 160

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
         "text": "The Plepic design system. Generated from css/styles.css, index.html and "
                 "training/index.html by design-canvas/build.py: change the site, re-run the "
                 "script, re-seed. If a value here disagrees with the stylesheet, the "
                 "stylesheet is right. No artboard carries a price, a date or any value "
                 "that moves; Voice lists what stays in the page."},
        {"id": "live-boards", "x": 2480, "y": -400, "w": 480,
         "text": "Three artboards run: Motion, Components and The card. Open one with the "
                 "play button above its frame to watch it full size; at canvas zoom the "
                 "breath is a few pixels. Then hover the buttons, the card and the "
                 "right-hand butterfly."},
    ],
    "launch": {"view": "canvas"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2) + "\n")

for f in sorted(OUT.glob("*.dc.html")) + [OUT / "canvas.json"]:
    print("%-22s %6d bytes" % (f.name, f.stat().st_size))
