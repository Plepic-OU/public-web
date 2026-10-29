#!/usr/bin/env python3
"""Generate the Plepic design system, a Claude Design System artifact, from the site.

Every value is read from css/styles.css and index.html at build time. The rules
are the nine brand-book pages boards.py generates (ported from the canvas);
each is published as a showcase page and, through pagemd.py, as a Markdown
section agents read. The output is design-system/build/project/, the file
tree the artifact serves.

The build refuses rather than lies. It stops on a :root token with no usage
note, a volatile value in the README or a component card, a mark that is not
22 facets split 11/11 with exactly two swapped slots, an asset whose upload is
not recorded in system.json, or logo files older than the lockup they show.

To update the published system after a change to the site or to these sources:

  1. python3 design-system/build.py
  2. If it says the lockup changed, run node design-system/export-logos.mjs.
  3. If it names an asset to upload, publish that file to the system's url with
     the Artifact tool (asset: true), record the returned blob id, size and
     sha256 under "blobs" in system.json, and run step 1 again.
  4. Publish to the SAME url in system.json with the Artifact tool:
     root design-system/build, file_path build/project/design-system.json,
     files every other path under build/project/ except the uploads. A new
     url is a second system.

The system is synced from code ("editing": "code"), so its page is read-only:
a change made anywhere but this repository is overwritten by the next publish.
"""
import datetime
import hashlib
import json
import pathlib
import re
import runpy
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERE = ROOT / "design-system"
OUT = HERE / "build" / "project"
CSS = (ROOT / "css" / "styles.css").read_text()
INDEX = (ROOT / "index.html").read_text()
SYSTEM = json.loads((HERE / "system.json").read_text())
TITLE = "Plepic"

# Same pattern as scripts/check-claims.mjs: a price or a date belongs on the
# page that states it, where the claims gate can see it.
CLAIM_PAT = re.compile(r"(€[0-9][0-9.,]*|[0-9][0-9.,]* ?€|&euro;|[0-9][0-9.,]* ?EUR|[0-9][0-9.,]*%|"
                       r"20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]|[0-9]+\.[0-9]+\.20[0-9][0-9])")


def no_claims(label, text):
    m = CLAIM_PAT.search(text)
    if m:
        raise SystemExit("%s carries a volatile value: %s" % (label, m.group(0)))
    return text


def rule(selector, prop):
    m = re.search(r"^" + re.escape(selector) + r"\s*\{([^}]*)\}", CSS, re.M)
    if not m:
        raise SystemExit("missing rule " + selector)
    v = re.search(r"(?:^|[;\s])" + re.escape(prop) + r":\s*([^;]+);", m.group(1))
    if not v:
        raise SystemExit("missing %s in %s" % (prop, selector))
    return v.group(1).strip()


def clamp_cap(value):
    m = re.fullmatch(r"clamp\((.+),\s*([^,]+)\)", value)
    return m.group(2).strip() if m else value


# --- the token block ---------------------------------------------------------
ROOT_BLOCK = re.search(r"^:root \{\n(.*?)\n\}\n", CSS, re.S | re.M)
PROPS = re.findall(r"^\s*--([a-z0-9-]+):\s*(.+?);", ROOT_BLOCK.group(1), re.M)
VALUE = dict(PROPS)

USAGE = {
    "green-vivid": "Facet light and decoration. Never text on bg, bg-alt or surface: 2.5:1 on cream fails AA.",
    "green-brand": "Text on bg, bg-alt and surface: links and the one green phrase in a heading. The only green that clears AA on cream.",
    "green-dark": "Body green that needs AAA on bg and surface; the facet shadow, the mark's body, the focus ring.",
    "green-light": "Quiet fill behind a green statement.",
    "green-surface": "Ground for a block that must lift off the page; the hover fill of outline and ghost buttons.",
    "accent": "The ember at the mark's head and one call to action. One accent element per viewport.",
    "bg": "Ground: what the page is made of.",
    "bg-alt": "Recessed: a well cut into the ground, and the plate behind a card portrait.",
    "surface": "Raised: a sheet lifted off the ground. White panels sit on bg, cream panels on surface.",
    "text": "Ink: body copy and every heading, on bg, bg-alt and surface.",
    "text-2": "Quieter ink: the supporting sentence, on bg, bg-alt and surface.",
    "text-3": "Label ink: eyebrow, caption, token. The floor: nothing lighter carries readable text.",
    "border": "Hairline: the only line the page draws, 1px.",
    "fs-body": "Running text. Does not ramp with the viewport.",
    "fs-body-lg": "The lead paragraph under a section heading.",
    "fs-h2": "Section headings; ramps with the viewport up to its cap.",
    "fs-h3": "Subsection headings; at its minimum it equals body, so weight carries it.",
    "fs-h4": "Minor headings; same size as body, set apart by Bitter 700.",
    "fs-faq-q": "The question line of an FAQ row.",
    "space-xs": "A gap inside a chip.",
    "space-sm": "Wordmark to mark; label to value.",
    "space-md": "Paragraph to paragraph.",
    "space-lg": "A row's padding.",
    "space-xl": "A panel's padding; the card grid's gutter; the container's side gutter.",
    "space-2xl": "Heading to the block under it.",
    "space-3xl": "A block to the next block inside a section.",
    "space-4xl": "Section padding, top and bottom.",
    "rounded-xs": "Badge-sized tight corner.",
    "rounded-sm": "Code blocks and the small button.",
    "rounded-md": "The default button.",
    "rounded-lg": "The large button.",
    "rounded-xl": "Panels.",
    "rounded-2xl": "Content cards; the cap. Nothing rounds further except a pill.",
    "rounded-pill": "Pills.",
    "card-shadow-hover": "The sheet behind a lifted card, on hover and focus only. Never at rest.",
    "dur-fast": "State response: a colour, an opacity, a link waking up.",
    "dur-base": "The default transition: a hover lift, a border appearing.",
    "dur-settle": "Something assembling: the crystalline hero, a wing.",
    "dur-entrance": "The hero's own arrival, once per page.",
    "tilt-dur": "A card's tilt following the pointer.",
    "breath-period": "One full breath of the mark's wings at rest.",
    "breath-offset": "The delay between the two wings' breath.",
    "wingbeat-dur": "The wing beat a card's mark plays on hover, on top of the breath.",
    "ease-settle": "Arriving: every hover, lift, reveal and entrance. Fast off the mark, long settle.",
    "ease-calm": "Idling: perpetual loops (the breath, the bob, the antennae). Symmetrical, so a loop has no beginning.",
    "max-width": "The content track. The container never grows past it; emptiness is vertical.",
    "header-height": "The fixed header. Anchors pad by this plus space-3xl.",
}


def family_of(name, value):
    if re.fullmatch(r"#[0-9a-f]{6}", value):
        return "color"
    if name.startswith("font-"):
        return "font"
    if name.startswith("fs-"):
        return "fontSize"
    if name.startswith("space-"):
        return "spacing"
    if name.startswith("rounded-") and " " not in value:
        return "radius"
    if name == "card-shadow-hover":
        return "shadow"
    if re.fullmatch(r"[0-9.]+m?s", value):
        return "duration"
    if name.startswith("ease-"):
        return "easing"
    if name in ("max-width", "header-height"):
        return "size"
    return None


FAMILY = {n: family_of(n, v) for n, v in PROPS}
for n, f in FAMILY.items():
    if f not in (None, "font") and n not in USAGE:
        raise SystemExit("token --%s has no usage note in design-system/build.py" % n)


def entries(family):
    return [{"name": n, "value": VALUE[n], "usage": USAGE[n]} for n, _ in PROPS if FAMILY[n] == family]


# --- type --------------------------------------------------------------------
FONT_FACES = re.findall(r"@font-face \{[^}]*url\(\"\.\./fonts/[^\"]+\"\)[^}]*\}", CSS)
FONTS = []
for face in FONT_FACES:
    FONTS.append({
        "family": re.search(r"font-family:\s*\"?([^\";]+)\"?;", face).group(1),
        "file": "fonts/" + re.search(r"\.\./fonts/([^\"]+)\"", face).group(1),
        "weight": re.search(r"font-weight:\s*([^;]+);", face).group(1),
        "style": re.search(r"font-style:\s*([^;]+);", face).group(1),
    })

HEADING_LH = rule("h1, h2, h3, h4, h5, h6", "line-height")
HEADING_LS = rule("h1, h2, h3, h4, h5, h6", "letter-spacing")
HEADING_W = int(rule("h1, h2, h3, h4, h5, h6", "font-weight"))
BODY_LH = rule("body", "line-height")


def style(name, size, lh, weight, sample, usage, ls=None):
    s = {"name": name, "fontSize": clamp_cap(size), "lineHeight": lh, "fontWeight": weight,
         "sample": sample, "usage": usage}
    # tokens.json reads a length or a unitless number here; "normal" would drop.
    if lh == "normal":
        del s["lineHeight"]
        s["usage"] += " Line height normal, so a control never inherits body's 1.7."
    if size.startswith("clamp"):
        s["usage"] += " Fluid: %s; shown at its cap." % size
    if ls:
        s["letterSpacing"] = ls
    return s


HERO_H1 = rule(".hero h1", "font-size")
TYPE = {
    "fonts": FONTS,
    "families": {"display": VALUE["font-display"], "body": VALUE["font-body"], "mono": VALUE["font-mono"]},
    "groups": [
        {"name": "Display", "family": "display", "note": "Bitter carries every heading, always ink.", "styles": [
            style("display-hero", HERO_H1, rule(".hero h1", "line-height"), HEADING_W,
                  "Practitioners, not trainers", "The hero headline only.", rule(".hero h1", "letter-spacing")),
            style("display-h1", rule("h1", "font-size"), HEADING_LH, HEADING_W,
                  "Agentic Engineering & Claude Code", "An interior page's h1. Never the hero ramp.", HEADING_LS),
            style("heading-h2", VALUE["fs-h2"], HEADING_LH, HEADING_W,
                  "Learn the craft from people who ship", "Section headings.", HEADING_LS),
            style("heading-h3", VALUE["fs-h3"], HEADING_LH, HEADING_W,
                  "Three instructors, one tabletop", "Subsections. Never weight 400.", HEADING_LS),
            style("heading-h4", VALUE["fs-h4"], HEADING_LH, HEADING_W,
                  "What a cohort actually covers", "Minor headings.", HEADING_LS),
            style("card-name", rule(".tt-name", "font-size"), HEADING_LH, HEADING_W,
                  "Joosep Simm", "The byline on an instructor card.", HEADING_LS),
        ]},
        {"name": "Text", "family": "body", "note": "Hanken Grotesk carries every sentence.", "styles": [
            style("body", VALUE["fs-body"], BODY_LH, 400,
                  "An engineer arrives able to write code and leaves able to direct agents that write it.",
                  "Running text."),
            style("body-lg", VALUE["fs-body-lg"], BODY_LH, 400,
                  "In six weeks you build it into how your team works.", "The lead paragraph under a section heading."),
            style("body-ui", rule(".tt-role", "font-size"), rule(".tt-role", "line-height"), 400,
                  "Ships code at Gridraven.", "UI text and the card's day-job line, in text-2."),
        ]},
        {"name": "Label", "family": "mono", "note": "JetBrains Mono carries every label and every line of code.", "styles": [
            style("label", rule(".label", "font-size"), rule(".label", "line-height"), int(rule(".label", "font-weight")),
                  "WHAT YOU LEAVE WITH", "Section labels in text, panel headers in green-dark. Uppercase belongs here, never to a heading.",
                  rule(".label", "letter-spacing")),
            style("card-eyebrow", rule(".tt-type", "font-size"), rule(".tt-type", "line-height"), 400,
                  "INSTRUCTOR · PRACTITIONER", "The instructor card's standing head, in text-3. Too small for any other use.",
                  rule(".tt-type", "letter-spacing")),
            style("mono-code", rule(".code-block", "font-size"), rule(".code-block", "line-height"), 400,
                  "claude --resume", "Code blocks, at their natural tracking."),
        ]},
    ],
}

# --- the mark ----------------------------------------------------------------
MARK = re.search(r'<svg class="logo-butterfly".*?</svg>', INDEX, re.S).group(0)
if MARK.count("<polygon") != 22:
    raise SystemExit("mark geometry is not 22 facets")
VB_W = float(re.search(r'viewBox="0 0 ([0-9.]+) [0-9.]+"', MARK).group(1))
_polys = re.findall(r"<polygon[^>]*/>", MARK)
_x = [float(re.search(r'points="([0-9.]+),', p).group(1)) for p in _polys]
_left = [p for p, x in zip(_polys, _x) if x < VB_W / 2]
_right = [p for p, x in zip(_polys, _x) if x > VB_W / 2]
if len(_left) != 11 or len(_right) != 11:
    raise SystemExit("hinge partition is not 11/11: %d/%d" % (len(_left), len(_right)))
_fill = lambda p: re.search(r'fill="([^"]+)"', p).group(1)
SWAPS = [i for i, (l, r) in enumerate(zip(_left, _right)) if _fill(l) != _fill(r)]
if len(SWAPS) != 2:
    raise SystemExit("expected 2 swapped facet slots, found %d" % len(SWAPS))

# --- build -------------------------------------------------------------------
if OUT.parent.exists():
    shutil.rmtree(OUT.parent)
(OUT / "fonts").mkdir(parents=True)
BOARDS = runpy.run_path(str(HERE / "boards.py"))["BOARDS"]
to_markdown = runpy.run_path(str(HERE / "pagemd.py"))["to_markdown"]


def write(path, text):
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


for f in FONTS:
    shutil.copy(ROOT / f["file"], OUT / f["file"])
for src in sorted((HERE / "assets").rglob("*")):
    if src.is_file():
        (OUT / src.relative_to(HERE)).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, OUT / src.relative_to(HERE))
# The one icon set: the curriculum pictograms, one file each, drawn in ink.
TRAINING = (ROOT / "training" / "index.html").read_text()
SPRITE = re.search(r'<svg class="svg-sprite".*?</svg>', TRAINING, re.S).group(0)
ICONS = re.findall(r'<symbol id="i-([a-z]+)" viewBox="0 0 24 24">(.*?)</symbol>', SPRITE, re.S)
ICON_ATTRS = 'fill="none" stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="%s"' % (
    VALUE["text"], rule(".cpath-icon", "stroke-width"), rule(".cpath-icon", "stroke-linecap"),
    rule(".cpath-icon", "stroke-linejoin"))
for name, body in ICONS:
    write("assets/Icons/%s.svg" % name,
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" %s>%s</svg>\n' % (ICON_ATTRS, body.strip()))
shutil.copy(ROOT / "images" / "joosep.webp", OUT / "assets/Portraits/joosep.webp")


def blob(path):
    b = SYSTEM["blobs"].get(path)
    data = (OUT / "assets" / path).read_bytes()
    if not b or b["sha256"] != hashlib.sha256(data).hexdigest():
        raise SystemExit("upload design-system/build/project/assets/%s and record it in system.json" % path)
    return b


# The logo files are exported from the header lockup; they go stale when it changes.
LOCKUP = re.search(r'<a href="/" class="logo-lockup".*?</a>', INDEX, re.S).group(0)
LOGO_RULES = "".join(re.search(r"^" + re.escape(sel) + r"\s*\{[^}]*\}", CSS, re.M).group(0)
                     for sel in (".logo-lockup", ".logo-lockup--stacked", ".logo-wordmark",
                                 ".on-brand .logo-wordmark", ".logo-butterfly"))
LOGO_INPUTS = hashlib.sha256((LOCKUP + LOGO_RULES).encode() + (ROOT / "fonts" / "bitter.woff2").read_bytes()).hexdigest()
if SYSTEM["logos"] != LOGO_INPUTS:
    raise SystemExit("the lockup changed since the logo files were exported: run node design-system/export-logos.mjs, "
                     "upload design-system/assets/Logos/, and set \"logos\" in system.json to " + LOGO_INPUTS)

# The brand-book pages: each is a showcase page and, converted, a Markdown section.
for i, (fname, comp, title, height) in enumerate(BOARDS, 1):
    doc = (OUT.parent / "boards" / fname).read_text()
    for who in re.findall(r'src="([a-z]+)\.jpg"', doc):
        doc = doc.replace('src="%s.jpg"' % who, 'src="/_blob/%s"' % blob("Portraits/%s.jpg" % who)["blob"])
    write("components/%s/preview.html" % comp,
          '<!-- @dsCard group="Brand book" height=%d width=1120 page -->\n' % height + doc)
    write("%02d-%s.md" % (i, re.sub(r"[^a-z]+", "-", title.lower()).strip("-")), to_markdown(doc))

# Template slots in the README and the component cards: values read at build time.
SEAT = re.search(r'<div class="tt-seat" data-tilt>.*?</article>\s*</div>', INDEX, re.S).group(0)
NAV = re.search(r'<nav class="nav">.*?</nav>', INDEX, re.S).group(0)
FAQ = "\n".join(re.findall(r'<details class="faq-item".*?</details>', INDEX, re.S)[:2])
SLOTS = {
    "{{lockup}}": LOCKUP,
    "{{mark_id}}": blob("Logos/plepic-mark.svg")["blob"],
    "{{nav}}": NAV,
    "{{faq}}": FAQ,
    "{{pictograms}}": SPRITE + "".join(
        '<figure><svg class="cpath-icon"><use href="#i-%s"/></svg><figcaption>%s</figcaption></figure>' % (n, n)
        for n, _ in ICONS),
    "{{card}}": SEAT.replace('src="images/joosep.webp"', 'src="/_blob/%s"' % blob("Portraits/joosep.webp")["blob"]),
}


def fill(label, text):
    for k, v in SLOTS.items():
        text = text.replace(k, v)
    if "{{" in text:
        raise SystemExit("%s has an unfilled slot" % label)
    if label.endswith(".html"):
        no_claims(label, re.sub(r"<style[\s\S]*?</style>|<[^>]+>", " ", text))
        return text
    return no_claims(label, text)


write("README.md", fill("README.md", (HERE / "docs" / "README.md").read_text()))
for src in sorted((HERE / "components").rglob("*")):
    if src.is_file():
        rel = src.relative_to(HERE)
        write(str(rel), fill(str(rel), src.read_text()))

SHA = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"],
                     capture_output=True, text=True, check=True).stdout.strip()
NOW = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

tokens = {
    "name": TITLE, "version": 1,
    "meta": {"source": "github", "repo": "Plepic-OU/public-web", "ref": "main@" + SHA,
             "paths": {"tokens": ["css/styles.css"], "fonts": ["fonts/"], "docs": ["design-system/"]},
             "synced": NOW[:10]},
    "color": {"themes": [{"id": "light", "name": "Light"}], "tokens": entries("color")},
    "type": TYPE,
    "spacing": {"tokens": entries("spacing")},
    "radius": {"tokens": entries("radius")},
    "shadow": {"tokens": entries("shadow")},
    "fontSize": {"note": "The --fs- size namespace; --text- is colour.", "tokens": entries("fontSize")},
    "duration": {"tokens": entries("duration")},
    "easing": {"note": "Two eases, and no third. A linear ease is a bug.", "tokens": entries("easing")},
    "size": {"tokens": entries("size")},
}
write("tokens.json", json.dumps(tokens, indent=2, ensure_ascii=False) + "\n")


# tokens.css as the page would compile it, so previews and consumers share one block.
def decl(family):
    return "".join("  --%s: %s;\n" % (n, VALUE[n]) for n, _ in PROPS if FAMILY[n] == family)


def type_class(s, family):
    css = "  font-family: var(--font-%s);\n  font-size: %s;\n  line-height: %s;\n  font-weight: %s;\n" % (
        family, s["fontSize"], s.get("lineHeight", "normal"), s["fontWeight"])
    if "letterSpacing" in s:
        css += "  letter-spacing: %s;\n" % s["letterSpacing"]
    return ".%s {\n%s}\n" % (s["name"], css)


tokens_css = "/* %s — generated from tokens.json */\n" % TITLE
tokens_css += ':root, [data-theme="light"] {\n%s%s}\n' % (decl("color"), decl("shadow"))
tokens_css += ":root {\n%s%s%s%s%s%s%s}\n" % (decl("spacing"), decl("radius"), decl("fontSize"),
                                            decl("duration"), decl("easing"), decl("size"), decl("font"))
tokens_css += "".join(type_class(s, g["family"]) for g in TYPE["groups"] for s in g["styles"])
tokens_css += "".join(face.replace('url("../fonts/', 'url("fonts/') + "\n" for face in FONT_FACES)
write("tokens.css", tokens_css)

# bundle.css is the site stylesheet minus what tokens.css now declares.
residual = "".join("  --%s: %s;\n" % (n, v) for n, v in PROPS if FAMILY[n] is None)
bundle = CSS.replace(ROOT_BLOCK.group(0), ":root {\n" + residual + "}\n")
for face in FONT_FACES:
    bundle = bundle.replace(face, "")
if "</style" in bundle.lower() or "url(" in bundle:
    raise SystemExit("bundle.css carries </style or a url() a preview cannot load")
write("components/bundle.css", bundle)

# Every asset file is an upload the index names; a group's README stays a file.
groups = {}
for f in sorted((OUT / "assets").rglob("*")):
    if f.is_file() and f.suffix != ".md":
        group, name = str(f.relative_to(OUT / "assets")).split("/", 1)
        b = blob(group + "/" + name)
        g = groups.setdefault(group, {"name": group, "tile": {"Logos": "l", "Icons": "s"}.get(group, "m"),
                                      "order": [], "files": {}})
        g["order"].append(name)
        g["files"][name] = {"name": name, "blob": b["blob"], "size": b["size"], "type": b["type"]}
groups = {k: groups[k] for k in ("Logos", "Icons", "Portraits")}

index = {
    "v": 3, "layout": "files", "createdOnFiles": SYSTEM["createdOnFiles"],
    "title": TITLE, "namespace": TITLE, "libraries": [], "editing": "code",
    "sections": {}, "groups": list(groups), "assetGroups": groups, "blobs": {},
    "docs": {"readme": "project/README.md", "sections": []},
    "lastChange": {"by": "Kaido Koort", "at": NOW, "via": "Claude Code · Plepic-OU/public-web@" + SHA,
                   "note": "Generated from css/styles.css by design-system/build.py"},
}
write("design-system.json", json.dumps(index, indent=2, ensure_ascii=False) + "\n")

for p in sorted(OUT.rglob("*")):
    if p.is_file():
        print("%-48s %8d bytes" % (p.relative_to(OUT), p.stat().st_size))
