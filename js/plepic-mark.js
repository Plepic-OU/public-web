/**
 * <plepic-mark>: the Plepic butterfly, breathing at rest.
 *
 * Progressive enhancement, never a renderer. The page inlines the exact
 * locked mark inside the element (22 wing polygons, body, two antennae with
 * their tips, head), and that inline SVG is the whole component with
 * JavaScript off and under prefers-reduced-motion. This module only
 * re-stacks the nodes it finds into three layers so CSS can hinge the wings
 * on the body axis. It carries no coordinate of its own: every node is
 * cloned from the page, so the geometry guard in tests/design-guard.spec.ts
 * governs the one copy of the mark and this module cannot drift from it.
 *
 * INTEGRATION CONTRACT
 *   <script type="module" src="/js/plepic-mark.js"></script>
 *   <plepic-mark class="tt-setglyph" aria-hidden="true">
 *     <svg class="mark-flat" viewBox="0 0 300 280" ...>…22 polygons + core…</svg>
 *   </plepic-mark>
 *
 *   Enhanced, the host gains class mark-live and three sibling <svg> layers
 *   with the source viewBox: mark-layer--left (the 11 polygons whose first
 *   point sits left of the body axis), mark-layer--right (the other 11) and
 *   mark-layer--core (everything that is not a polygon, each antenna wrapped
 *   with its tip circle in g.mark-antenna). The source SVG stays in the DOM
 *   and keeps the layout box; css/styles.css hides it with visibility:
 *   hidden and stacks the layers over it.
 *
 *   The only style this module writes is --mark-perspective on the host.
 *   Every animation is CSS, which is what lets prefers-reduced-motion stop
 *   the mark dead without a line of JavaScript running.
 *
 *   It degrades to the flat mark, silently and correctly, under reduced
 *   motion, when there is no child <svg>, and when the wing partition is not
 *   11 and 11. A future geometry edit therefore ships a static mark instead
 *   of half a butterfly.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// The body axis is x=150 in the 300-wide viewBox, so the first point of a
// wing polygon (147 or 153) already says which wing owns it.
const BODY_AXIS = 150;
const WING_FACETS = 11;

// The antennae are told apart by where their curve ends, and each one owns
// the tip circle standing at the same x. Left ends at 136, right at 164; the
// body path ends back on the axis, which is how it stays out of both groups.
const ANTENNAE = [
  { endX: 136, modifier: 'mark-antenna--l' },
  { endX: 164, modifier: 'mark-antenna--r' },
];

// CSS perspective is a length, so it has to follow the rendered size: one
// fixed value hinges flat on the 15px set glyph and folds the 300px display
// mark in half. Three widths is the depth the breath was designed against.
const PERSPECTIVE_RATIO = 3;

const clone = (node) => node.cloneNode(true);

// parseFloat stops at the first separator, so a polygon's list of vertices
// yields the x of its first one, and a circle's centre attribute yields
// itself. No coordinate is written here: the guard bans a second copy of the
// locked geometry in this file, prose included, and it is right to.
const firstNumber = (node, attribute) => parseFloat(node.getAttribute(attribute));

// The end of a path is its last coordinate PAIR, so the x is the
// second-to-last number in d.
const pathEndX = (node) => {
  const numbers = (node.getAttribute('d') || '').match(/-?[\d.]+/g);
  return numbers ? Number(numbers[numbers.length - 2]) : NaN;
};

const isTip = (node) => node.localName === 'circle'
  && ANTENNAE.some((antenna) => antenna.endX === firstNumber(node, 'cx'));

// Core nodes in source order, with each antenna path and its tip circle
// wrapped in one group so CSS can idle them about the antenna root. Nothing
// else is regrouped, and the head still paints last.
const buildCore = (nodes) => {
  const built = [];
  for (const node of nodes) {
    const antenna = node.localName === 'path'
      && ANTENNAE.find((candidate) => candidate.endX === pathEndX(node));
    if (!antenna) {
      // Tips travel with their antenna below; skipping them here is what
      // keeps them from being drawn twice.
      if (!isTip(node)) built.push(clone(node));
      continue;
    }
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', `mark-antenna ${antenna.modifier}`);
    group.append(clone(node));
    const tip = nodes.find((candidate) => isTip(candidate)
      && firstNumber(candidate, 'cx') === antenna.endX);
    if (tip) group.append(clone(tip));
    built.push(group);
  }
  return built;
};

const buildLayer = (source, name, nodes) => {
  const layer = document.createElementNS(SVG_NS, 'svg');
  layer.setAttribute('viewBox', source.getAttribute('viewBox'));
  layer.setAttribute('shape-rendering', 'geometricPrecision');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('class', `mark-layer mark-layer--${name}`);
  for (const node of nodes) layer.append(node);
  return layer;
};

class PlepicMark extends HTMLElement {
  connectedCallback() {
    // The parser inserts an element, and so runs this, before it has parsed
    // a single child, and this one is nothing without them. While the
    // document is still loading the children are always suspect, so wait for
    // the one moment they are all known to be there. A module script runs
    // after parsing, so the marks on a normal page take the direct path.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.enhance(), { once: true });
      return;
    }
    this.enhance();
  }

  enhance() {
    // Re-entrancy is read off the DOM rather than an instance flag:
    // cloneNode(true) on a live mark hands back an element that already
    // carries mark-live and its layers, and a flag would let it grow three
    // more on upgrade.
    if (this.classList.contains('mark-live')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const source = this.querySelector(':scope > svg');
    if (!source) return;

    const nodes = [...source.children];
    const polygons = nodes.filter((node) => node.localName === 'polygon');
    const left = polygons.filter((node) => firstNumber(node, 'points') < BODY_AXIS);
    const right = polygons.filter((node) => firstNumber(node, 'points') > BODY_AXIS);
    // Refuse anything but the locked partition. An edit that changes the
    // facet count leaves the authored SVG untouched and still correct.
    if (polygons.length !== WING_FACETS * 2) return;
    if (left.length !== WING_FACETS || right.length !== WING_FACETS) return;

    this.append(
      buildLayer(source, 'left', left.map(clone)),
      buildLayer(source, 'right', right.map(clone)),
      buildLayer(source, 'core', buildCore(nodes.filter((node) => node.localName !== 'polygon'))),
    );
    // The stylesheet hides the source through .mark-flat, and this module is
    // what decides a source exists, so this module puts the class on. A page
    // that inlines the mark without it would otherwise paint the flat butterfly
    // and the three layers on top of each other, which reads as a slightly
    // bolder mark rather than as a bug.
    source.classList.add('mark-flat');
    this.classList.add('mark-live');

    this.measure();
    // The observer and the host reference each other, so a removed mark is
    // collected as one cycle; there is nothing to tear down on disconnect,
    // and a mark that is only moved keeps working.
    new ResizeObserver(() => this.measure()).observe(this);
  }

  measure() {
    // offsetWidth, not getBoundingClientRect: the rect is the TRANSFORMED box,
    // and a set glyph rides inside a card that tilts and foreshortens, so the
    // rect would hand the perspective a width that shrinks as the card turns.
    // The layout width is the one the hinge was designed against.
    const width = this.offsetWidth;
    // Zero width means not laid out yet, or hidden. The :root default holds
    // until the ResizeObserver reports a real box.
    if (width > 0) {
      this.style.setProperty('--mark-perspective', `${(width * PERSPECTIVE_RATIO).toFixed(1)}px`);
    }
  }
}

// Defining the name twice throws, and a cache-busted query string is enough
// to have the browser evaluate this module more than once.
if (!customElements.get('plepic-mark')) customElements.define('plepic-mark', PlepicMark);
