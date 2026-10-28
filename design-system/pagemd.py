"""Turn a brand-book page into the Markdown section agents read: headings, prose, lists and tables, no specimens."""
import re
from html.parser import HTMLParser

SKIP = {"style", "script", "svg", "head", "title"}
VOID = {"br", "hr", "img", "meta", "link", "input"}
BLOCK = {"h1", "h2", "h3", "h4", "p", "div", "table", "tr", "ul", "ol", "li", "section", "nav", "article", "main", "body", "html", "header", "footer"}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.kids = tag, dict(attrs), parent, []


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node("root", [], None)

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.kids.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.kids.append(data)


def inline(n):
    if isinstance(n, str):
        return n
    if n.tag in SKIP:
        return ""
    if n.tag == "br":
        return " "
    parts, prev = [], None
    for k in n.kids:
        t = inline(k)
        # Adjacent classed elements are a specimen's parts: keep them apart.
        part = not isinstance(k, str) and k.attrs.get("class") not in (None, "mono")
        if part and prev and t.strip():
            t = " · " + t
        if t.strip() or not isinstance(k, str):
            prev = part and bool(t.strip()) or (prev and not t.strip() and not isinstance(k, str))
        parts.append(t)
    t = "".join(parts)
    cls = n.attrs.get("class") or ""
    if n.tag == "code" or "mono" in cls.split():
        t = t.strip()
        return "`%s`" % t if t else ""
    if n.tag in ("b", "strong") and t.strip():
        return "**%s** " % t.strip()
    return t


def clean(t):
    return re.sub(r"\s+", " ", t).strip()


def has_block(n):
    return any(not isinstance(k, str) and k.tag not in SKIP and (k.tag in BLOCK or has_block(k)) for k in n.kids)


def block(n, out):
    if isinstance(n, str):
        t = clean(n)
        if t:
            out.append(t)
        return
    if n.tag in SKIP:
        return
    if n.tag in ("h1", "h2", "h3", "h4"):
        out.append("#" * int(n.tag[1]) + " " + clean(inline(n)))
        return
    if n.tag == "table":
        rows = []
        for tr in [k for k in walk(n) if k.tag == "tr"]:
            rows.append([clean(inline(c)) or " " for c in tr.kids if not isinstance(c, str) and c.tag in ("td", "th")])
        if rows:
            w = max(len(r) for r in rows)
            rows = [r + [" "] * (w - len(r)) for r in rows]
            out.append("\n".join(["| " + " | ".join(rows[0]) + " |", "|" + " --- |" * w] + ["| " + " | ".join(r) + " |" for r in rows[1:]]))
        return
    if n.tag in ("p", "li"):
        t = clean(inline(n))
        if t:
            out.append(("- " if n.tag == "li" else "") + t)
        return
    if n.tag in ("div", "span", "a", "nav") and not has_block(n):
        t = clean(inline(n))
        if t:
            out.append("- " + t)
        return
    # A specimen: a container of short leaf blocks reads as one line.
    leaves = [k for k in n.kids if not isinstance(k, str) and k.tag not in SKIP]
    # A two-column grid (label cell, value cell, label cell...) reads as one line per pair.
    classes = [k.attrs.get("class") for k in leaves]
    if n.tag == "div" and len(leaves) >= 4 and len(leaves) % 2 == 0 and all(not has_block(k) for k in leaves) \
            and len(set(classes[0::2])) == 1 and len(set(classes[1::2])) == 1 and classes[0] != classes[1]:
        for a, b in zip(leaves[0::2], leaves[1::2]):
            out.append("- " + clean(inline(a)) + " · " + clean(inline(b)))
        return
    if n.tag == "div" and leaves and all(not has_block(k) for k in leaves) and len(leaves) <= 6 \
            and sum(len(clean(inline(k))) for k in leaves) < 320:
        parts = [clean(inline(k)) for k in leaves]
        t = " · ".join(p for p in parts if p)
        if t:
            out.append("- " + t)
        return
    for k in n.kids:
        block(k, out)


def walk(n):
    for k in n.kids:
        if not isinstance(k, str):
            yield k
            yield from walk(k)


def to_markdown(doc):
    t = Tree()
    t.feed(doc)
    out = []
    block(t.root, out)
    out = [line for line in out if line != "Plepic · Design system"]
    # Join consecutive list items; blank line between everything else.
    md = []
    for line in out:
        if md and line.startswith("- ") and md[-1].startswith("- "):
            md[-1] += "\n" + line
        else:
            md.append(line)
    return "\n\n".join(md) + "\n"
