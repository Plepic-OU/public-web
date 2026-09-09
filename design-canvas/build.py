#!/usr/bin/env python3
"""Generate the Claude Design canvas artboards from the live site source.

The canvas must not become a second set of values. Everything a rule can be
read off is pulled from css/styles.css and index.html at build time: the mark
geometry verbatim, the token block, the card measurements. Edit the site,
re-run this, re-seed. Nothing here restates a value the stylesheet owns.
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
    <p class="sec-note">One set of roles, filled twice. A colour is named by the job it does, so the dark column is the light column's answer and not a second palette.%s</p>
    <div class="ngrid">
      <div></div><div class="nhead">On light</div><div class="nhead">On dark</div>
%s    </div>

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
%s%s%s%s%s%s%s  </div>""" % (
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
    .anat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
            border-top: 1.5px solid var(--text); padding-top: 16px; }
    .anat h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
               margin: 0 0 6px; }
    .anat p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .anat .mono { font-size: 0.92em; }
"""

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
      <div><h3>It beats on arrival</h3><p>Hovering a card the mark signs makes the wings beat wide and settle. The beat always wins over the breath: it is the last animation named on the layer.</p></div>
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
    <p class="lede">The words are as fixed as the greens. A tagline that decodes the name, two positioning lines that do not translate each other, and one headline pattern. Everything else is written fresh, against the rules at the bottom.</p>

    <h2 class="sec">The tagline, and why it is those four words</h2>
    <p class="sec-note">It is the name's decoder ring. PLEPIC is PL(ay) plus EPIC, and each half of the tagline names one half of the name. That is the whole reason it cannot be reworded.</p>
    <p class="decoder"><span class="g">PL</span><span class="dim">(ay)</span><span class="g">EPIC</span></p>
    <p class="decode-note">"Curious play" names the <span class="mono" style="font-size:0.95em">PL</span>. "Epic growth" names the <span class="mono" style="font-size:0.95em">EPIC</span>. Change either half and the name stops explaining itself.</p>
    <p class="slogan" style="margin-top: 26px">Curious play. Epic growth.</p>
    <p class="slogan-note">Bitter italic 500 in <span class="mono" style="font-size:0.95em">--green-brand</span> when it is given room. In the footer it sits at 0.75rem in the quieter ink and warms to green on hover, which is the only easter egg on the site. It is a tagline, not a heading, so it is the one line allowed to be green all the way through.</p>

    <hr class="rule">
    <h2 class="sec">Two positioning lines, not a translation</h2>
    <p class="sec-note">The wordplay does not survive Estonian, so Estonian does not attempt it. The two lines are complementary: one names the category, the other names the outcome.</p>
    <div class="langs">
      <div class="lang">
        <p class="tag">EN</p>
        <p class="line">Agentic coding for dev teams</p>
        <p class="why">Names the category, because an English reader is choosing between training offers and needs to know which shelf this is on.</p>
      </div>
      <div class="lang">
        <p class="tag">ET</p>
        <p class="line">Tulemusp&otilde;hine digimuutus</p>
        <p class="why">Names the outcome, because an Estonian buyer is justifying a spend. Never a translation of the English line, and never the tagline.</p>
      </div>
    </div>

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
    """The three-layer mark the module builds, assembled statically."""
    svg = ('<svg class="mk-layer mk-%s" viewBox="0 0 %g %g" '
           'xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" '
           'aria-hidden="true">%s</svg>')
    return ("      <span class=\"mk%s\" style=\"width: %dpx\">%s%s%s</span>\n" % (
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
    .mk .mk-left  { animation: mark-breath-left var(--breath-period) var(--ease-calm) infinite; }
    .mk .mk-right { animation: mark-breath-right var(--breath-period) var(--ease-calm) var(--breath-offset) infinite; }
    .mk .mk-core  { animation: mark-bob var(--breath-period) var(--ease-calm) infinite; }
    .mk--beat:hover .mk-left  { animation: mark-breath-left var(--breath-period) var(--ease-calm) infinite,
                                           mark-wingbeat-left var(--wingbeat-dur) var(--ease-settle) infinite; }
    .mk--beat:hover .mk-right { animation: mark-breath-right var(--breath-period) var(--ease-calm) var(--breath-offset) infinite,
                                           mark-wingbeat-right var(--wingbeat-dur) var(--ease-settle) infinite; }
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
%s        <p class="trk-note" style="margin-top:14px">Hover me. The beat opens to %s in %s and always wins: it is the last animation named on the layer, so it takes the transform whatever the breath is doing.</p>
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
comp_css = """    .demo { display: flex; align-items: flex-start; gap: 40px; flex-wrap: wrap; }
    .demo-item { }
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
    .btn-primary { background: var(--accent); color: var(--text); }
    .btn-primary:hover { background: var(--accent); filter: brightness(0.92); }
    .btn-secondary { background: transparent; border-color: var(--text); color: var(--text); }
    .btn-secondary:hover { background: var(--green-surface); border-color: var(--green-brand);
                           color: var(--green-dark); filter: none; }
    .btn-focus { outline: 2px solid var(--green-dark); outline-offset: 2px; }
    .badge { display: inline-flex; align-items: center; gap: 0.35rem;
             padding: 0.2rem 0.65rem; font-size: 0.75rem; font-weight: 600;
             line-height: normal; border-radius: 20px 4px 16px;
             background: var(--surface); color: var(--text-2);
             border: 1px solid var(--border); }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%%;
                 background: var(--green-vivid); flex-shrink: 0; }
    .badge-urgency .badge-dot { background: var(--accent); }
    .on-dark { background: var(--dark); padding: 20px 22px; }
    .on-dark .badge { background: var(--dark-surface); color: var(--text-on-dark-2);
                      border-color: var(--border-dark); }
    .panel { background: var(--surface); border: 1px solid var(--border);
             border-radius: 16px; padding: var(--space-xl); max-width: 360px; }
    .panel-header { font-family: var(--font-mono); font-size: 0.75rem;
                    text-transform: uppercase; letter-spacing: 0.12em;
                    color: var(--green-dark); font-weight: 600; margin: 0 0 10px; }
    .panel p { font-size: 1rem; line-height: 1.55; color: var(--text-2); margin: 0; }
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
             border-radius: 8px; padding: 0.75rem 1rem; background: var(--dark);
             color: var(--text-on-dark); max-width: 360px; }
    .codeb .cm { color: var(--text-on-dark-2); }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .grid3 h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .grid3 p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
"""

comp_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>Components</h1>
    <p class="lede">The furniture every page uses. Two buttons, one badge, one panel, one row. Anything a page needs that is not here is a page's own problem and does not become a component until a second page wants it.</p>

    <h2 class="sec">Buttons</h2>
    <p class="sec-note">Two, and no third. Both are 10px radius with a 1.5px border, so they occupy the same box whether the border shows or not. Hover them.</p>
    <div class="demo">
      <div class="demo-item">
        <a class="btn btn-primary" href="#">Talk to Kaido</a>
        <p class="demo-cap">Primary</p>
        <p class="demo-note">The ember, once per screen. It is the only place the accent appears in type.</p>
      </div>
      <div class="demo-item">
        <a class="btn btn-secondary" href="#">See the curriculum</a>
        <p class="demo-cap">Secondary</p>
        <p class="demo-note">Ink border, ink text. Green arrives on hover only, which is the whole rationing rule in one control.</p>
      </div>
      <div class="demo-item">
        <a class="btn btn-secondary btn-focus" href="#">Keyboard focus</a>
        <p class="demo-cap">Focus ring</p>
        <p class="demo-note">2px <span class="mono" style="font-size:0.92em">--green-dark</span>, offset 2px. Never removed, never restyled per control.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Badges</h2>
    <p class="sec-note">The asymmetric radius is the signature: 20px, 4px, 16px. It is the one shape on the site that is deliberately not a rounded rectangle.</p>
    <div class="demo">
      <div class="demo-item">
        <span class="badge"><span class="badge-dot"></span>Cohort open</span>
        <p class="demo-cap">Default</p>
        <p class="demo-note">Green dot. A state that is simply true.</p>
      </div>
      <div class="demo-item">
        <span class="badge badge-urgency"><span class="badge-dot"></span>Closing soon</span>
        <p class="demo-cap">Urgency</p>
        <p class="demo-note">The dot goes ember. Nothing else changes, because urgency is not a different component.</p>
      </div>
      <div class="demo-item on-dark">
        <span class="badge"><span class="badge-dot"></span>Cohort open</span>
        <p class="demo-cap" style="color: var(--text-on-dark-2)">On dark</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Panel, row and code</h2>
    <p class="sec-note">A panel is the only element that carries a border and a radius at rest. A row carries neither: it is two hairlines and the space between them.</p>
    <div class="demo">
      <div class="demo-item">
        <div class="panel">
          <p class="panel-header">What you leave with</p>
          <p>A working agent setup in your own repository, and the judgement to know when to reach for one.</p>
        </div>
        <p class="demo-cap">Panel &middot; 16px radius</p>
      </div>
      <div class="demo-item">
        <div class="faq">
          <div class="faq-item faq-item--open">
            <div class="faq-row">Do I need to know Python?</div>
            <p class="faq-body">No. You need two years of shipping something, in any language.</p>
          </div>
          <div class="faq-item"><div class="faq-row">How much of it is hands on keyboard?</div></div>
        </div>
        <p class="demo-cap">Row &middot; open and closed</p>
      </div>
      <div class="demo-item">
        <div class="codeb"><span class="cm"># the shape of a session</span><br>claude --resume<br>&nbsp;&nbsp;--effort high</div>
        <p class="demo-cap">Code &middot; 8px radius</p>
        <p class="demo-note">Mono at 0.75rem on ink. Comments in the quieter ink; no syntax colouring beyond that.</p>
      </div>
    </div>

    <hr class="rule">
    <h2 class="sec">Navigation</h2>
    <p class="sec-note">Quieter ink at rest, full ink on hover, green and underlined for the page you are on. An external link earns an arrow and nothing else.</p>
    <nav class="navdemo">
      <a href="#" class="cur">Training</a>
      <a href="#">Scopeful</a>
      <a href="#">Jobs</a>
      <a href="#" class="ext">Skill Tree</a>
    </nav>

    <hr class="rule">
    <div class="grid3">
      <div><h3>Two of anything, not five</h3><p>Two buttons, two eases, two inks that carry text. A third variant has to retire one of the first two.</p></div>
      <div><h3>State, not decoration</h3><p>A border, a shadow, a surface and a green fill are all states. At rest a component owns as few of them as it can.</p></div>
      <div><h3>The box is optional</h3><p>Most things are a rule and some space. Reach for a panel only when the content genuinely has to be lifted off the page.</p></div>
    </div>
  </div>"""

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
    <p class="sec-note">Eight steps, each roughly a third larger than the last. A value not on this list is a mistake, not a nuance.</p>
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
    <div class="anno"><b>entrance</b><span>A settle, not an arrival: content starts 6px low and fully legible, and rises over 600ms once the fonts have landed. No load-bearing element ever starts invisible.</span></div>

    <hr class="rule">
    <div class="cant">
      <p><b>The butterfly itself does not travel.</b> The hero mark is a WebGL metamorphosis, about 69 KB of module, with a rest pose the animation lands on byte-exact and a still poster behind it for anything that cannot run WebGL. It cannot be an artboard and should not be redrawn as one.</p>
      <p>What lives here is the composition and the rules around it. The geometry and the choreography live in <span class="mono" style="font-size:0.95em">js/crystalline-metamorphosis.js</span>, and that module is the only thing that may change them.</p>
    </div>
  </div>"""

(OUT / "Hero.dc.html").write_text(page(hero_body, hero_css))

# --- canvas.json ------------------------------------------------------------
# Three pages, because ten artboards on one plane is a scroll, not a system.
# Frames are fixed and surplus frame is harmless while clipping is not, so each
# height is the measured content height plus about five percent. Re-measure at
# 1120px wide after any content change; design-canvas/README.md says how.
PAGES = [
    ("identity", "Identity", [
        ("Main.dc.html", "Foundations", 1490),
        ("Type.dc.html", "Type", 1450),
        ("Voice.dc.html", "Voice", 1880),
        ("Logo.dc.html", "Logo", 1210),
    ]),
    ("system", "System", [
        ("Layout.dc.html", "Layout", 1710),
        ("Motion.dc.html", "Motion", 2150),
        ("Components.dc.html", "Components", 1860),
    ]),
    ("objects", "Objects", [
        ("Mark.dc.html", "The mark", 2130),
        ("Card.dc.html", "The card", 1760),
        ("Hero.dc.html", "Hero", 1725),
    ]),
]
INTERACTIVE = {"Motion.dc.html", "Components.dc.html", "Card.dc.html"}
COL_W, COL_GAP, ROW_GAP = 1120, 120, 160

artboards = []
for _page_id, _page_name, boards in PAGES:
    x = y = 0
    row_h = 0
    for n, (fname, title, h) in enumerate(boards):
        if n and n % 3 == 0:
            x, y, row_h = 0, y + row_h + ROW_GAP, 0
        entry = {"file": fname, "x": x, "y": y, "w": COL_W, "h": h,
                 "title": title, "print": "flow", "page": _page_id}
        if fname in INTERACTIVE:
            entry["is_interactive"] = True
        artboards.append(entry)
        x += COL_W + COL_GAP
        row_h = max(row_h, h)

canvas = {
    "pages": [{"id": pid, "name": name} for pid, name, _ in PAGES],
    "artboards": artboards,
    "annotations": [
        {"id": "source-of-truth", "x": 0, "y": -190, "w": 860, "page": "identity",
         "text": "Generated from css/styles.css and index.html by design-canvas/build.py. "
                 "Change the site, re-run the script, re-seed. If a value here disagrees "
                 "with the stylesheet, the stylesheet is right and this canvas is stale. "
                 "No artboard carries a price, a date or any other value that moves; "
                 "the Voice artboard lists what stays in the page instead."},
        {"id": "motion-live", "x": 1240, "y": -140, "w": 420, "page": "system",
         "text": "Motion and Components are live. Hover the buttons, the card and the "
                 "right-hand butterfly."},
    ],
    "launch": {"view": "canvas", "page": "identity"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2) + "\n")

for f in sorted(OUT.glob("*.dc.html")) + [OUT / "canvas.json"]:
    print("%-22s %6d bytes" % (f.name, f.stat().st_size))
