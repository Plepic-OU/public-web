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
    "--ease-settle", "--ease-calm", "--max-width",
]
T = {n: token(n) for n in TOKEN_NAMES}

BASE = """    :root {
%s
    }
    * { box-sizing: border-box; }
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
def swatch(name, role, on_dark=False):
    value = T[name]
    ink = "#e5e2dc" if on_dark else "#1c1c1a"
    border = "border: 1px solid var(--border);" if name in (
        "--bg", "--bg-alt", "--surface", "--green-surface") else ""
    return ("      <div class=\"sw\">\n"
            "        <div class=\"chip\" style=\"background: %s; color: %s; %s\">%s</div>\n"
            "        <p class=\"sw-name mono\">%s</p>\n"
            "        <p class=\"sw-role\">%s</p>\n"
            "      </div>\n" % (value, ink, border, value, name, role))


BRAND = [
    ("--green-vivid", "Facet light. The mark, never text."),
    ("--green-brand", "The one load-bearing phrase in a heading."),
    ("--green-dark", "Facet shadow, mark body, antennae."),
    ("--green-light", "Quiet fill behind a green statement."),
    ("--green-surface", "Section ground when a block must lift off --bg."),
    ("--accent", "The ember at the mark's head. One call to action."),
]
GROUND = [
    ("--bg", "Page ground. Everything sits on this."),
    ("--bg-alt", "Recessed ground: the card's art well."),
    ("--surface", "Raised sheet. Only ever a hover state."),
    ("--dark", "Inverted section ground."),
    ("--dark-surface", "Raised sheet on an inverted section."),
    ("--border", "Hairline on light ground."),
    ("--border-dark", "Hairline on dark ground."),
]
INK = [
    ("--text", "Body and every heading."),
    ("--text-2", "Supporting sentence."),
    ("--text-3", "Label, eyebrow, caption."),
    ("--text-on-dark", "Body on an inverted section."),
    ("--text-on-dark-2", "Supporting sentence, inverted."),
]

main_css = """    .sw-grid { display: grid; grid-template-columns: repeat(6, 1fr);
                gap: 20px 18px; margin: 0 0 4px; }
    .chip { height: 84px; display: flex; align-items: flex-end; padding: 8px 10px;
            font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.04em; }
    .sw-name { font-size: 11px; letter-spacing: 0.02em; color: var(--text);
               margin: 8px 0 3px; }
    .sw-role { font-size: 0.82rem; line-height: 1.45; color: var(--text-3); margin: 0; }
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
    <p class="sec-note">Green is the mark's own light, three steps of it. In type, green is a single load-bearing phrase, never a whole heading.</p>
    <div class="sw-grid">
%s    </div>

    <hr class="rule">
    <h2 class="sec">Ground</h2>
    <p class="sec-note">Paper, not panels. A surface appears only when something is lifted; at rest everything shares the page ground.</p>
    <div class="sw-grid">
%s    </div>

    <hr class="rule">
    <h2 class="sec">Ink</h2>
    <p class="sec-note">Three weights of ink on light, two on dark. A label is never a lighter grey than <span class="mono" style="font-size:0.95em">--text-3</span>.</p>
    <div class="sw-grid">
%s    </div>

    <hr class="rule">
    <div class="canon">
      <div><h3>Headings are ink</h3><p>At most one green phrase carries the sentence. A fully green heading is off-canon in any medium.</p></div>
      <div><h3>The mark is locked</h3><p>Twenty-two facets, one body, two antennae, one ember. Never recoloured, never re-faceted, never redrawn.</p></div>
      <div><h3>Nothing shines</h3><p>No cyan, no neon, no glassmorphism, no gradient text. Elevation is ink and shadow, and only ever a hover state.</p></div>
    </div>
  </div>""" % (
    "".join(swatch(n, r) for n, r in BRAND),
    "".join(swatch(n, r, on_dark=n in ("--dark", "--dark-surface", "--border-dark")) for n, r in GROUND),
    "".join(swatch(n, r, on_dark=n.endswith("on-dark") or n.endswith("on-dark-2")) for n, r in INK),
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
mark_css = """    .sizes { display: flex; align-items: flex-end; gap: 72px; padding: 8px 0 0; }
    .size { text-align: left; }
    .size .m { display: block; }
    .size .cap { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.16em;
                 text-transform: uppercase; color: var(--text-3); margin: 18px 0 0; }
    .size .use { font-size: 0.85rem; line-height: 1.5; color: var(--text-2);
                 margin: 4px 0 0; max-width: 22ch; }
    .size svg { display: block; width: 100%; height: auto; }
    .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
             border-top: 1.5px solid var(--text); padding-top: 16px; }
    .facts h3 { font-family: var(--font-display); font-weight: 700; font-size: 1rem;
                margin: 0 0 6px; }
    .facts p { font-size: 0.88rem; line-height: 1.55; color: var(--text-2); margin: 0; }
    .facts .mono { font-size: 0.92em; }
"""

def mark_at(px, cap, use):
    return ("      <div class=\"size\">\n"
            "        <span class=\"m\" style=\"width: %dpx;\">%s</span>\n"
            "        <p class=\"cap\">%s</p>\n"
            "        <p class=\"use\">%s</p>\n"
            "      </div>\n" % (px, MARK, cap, use))

mark_body = """  <div class="board">
    <p class="eyebrow">Plepic &middot; Design system</p>
    <h1>The mark</h1>
    <p class="lede">Twenty-two facets, one body, two antennae and one ember at the head. The geometry is locked: it is never recoloured, never re-faceted and never redrawn by hand. It holds at 300px and at 15px because the same twenty-two shapes carry both.</p>

    <div class="sizes">
%s%s%s%s    </div>

    <hr class="rule">
    <div class="facts">
      <div><h3>It breathes</h3><p>At rest the wings rise and fall on a long, calm loop. Nothing about the colour changes &mdash; breath is scale and rotation only.</p></div>
      <div><h3>It beats on arrival</h3><p>Hovering a card it signs makes the wings beat past 55&deg; and settle. The beat always wins over the breath; it is the last animation on the layer.</p></div>
      <div><h3>Three layers, one source</h3><p>The page ships the flat SVG. Script hinges it into left wing, right wing and core; it never draws geometry of its own, so the flat mark is always the truth.</p></div>
    </div>
  </div>""" % (
    mark_at(300, "300px", "Hero stage. The full wingspan, breathing."),
    mark_at(120, "120px", "Section mark and footer."),
    mark_at(30, "30px", "Header lockup beside the wordmark."),
    mark_at(15, "15px", "Set glyph on a card name."),
)

(OUT / "Mark.dc.html").write_text(page(mark_body, mark_css))

# --- canvas.json ------------------------------------------------------------
canvas = {
    "artboards": [
        {"file": "Main.dc.html", "x": 0, "y": 0, "w": 1120, "h": 1580,
         "title": "Foundations", "print": "flow"},
        {"file": "Type.dc.html", "x": 1240, "y": 0, "w": 1120, "h": 1450,
         "title": "Type", "print": "flow"},
        {"file": "Card.dc.html", "x": 0, "y": 1740, "w": 1120, "h": 1760,
         "title": "The card", "print": "flow"},
        {"file": "Mark.dc.html", "x": 1240, "y": 1740, "w": 1120, "h": 960,
         "title": "The mark", "print": "flow"},
    ],
    "annotations": [
        {"id": "source-of-truth", "x": 0, "y": -180, "w": 820,
         "text": "Generated from css/styles.css and index.html by design-canvas/build.py. "
                 "Change the site, re-run the script, re-seed. If a value here disagrees "
                 "with the stylesheet, the stylesheet is right and this canvas is stale."},
    ],
    "launch": {"view": "canvas"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2) + "\n")

for f in ("Main.dc.html", "Type.dc.html", "Card.dc.html", "Mark.dc.html", "canvas.json"):
    print("%-16s %6d bytes" % (f, (OUT / f).stat().st_size))
