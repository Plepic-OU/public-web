/**
 * The living tabletop's pointer tilt.
 *
 * Every [data-tilt] element follows the pointer: the edge nearest the
 * pointer is pushed away from the viewer, so a card reads as a physical
 * object being pressed on a table rather than a picture leaning toward you.
 *
 * The module writes four custom properties and nothing else, because
 * css/styles.css owns the transform. That split is the whole point: the
 * hover lift and the ink shadow are CSS rules, so they still work under
 * reduced motion, on touch, and before this file loads, with the module
 * doing nothing at all.
 *
 * INTEGRATION CONTRACT
 *   <script type="module" src="/js/tabletop.js"></script>
 *   <article class="tt-card" data-tilt data-foil>…</article>
 *
 *   Reads   --tilt-enabled (0 switches this element off), --tilt-x, --tilt-y
 *   Writes  --tt-rx, --tt-ry, --tt-foil-x, --tt-foil-y, inline, per element,
 *           cleared on pointer leave so the :root defaults take over and the
 *           card settles back through the CSS transition.
 */

const CHANNELS = ['--tt-rx', '--tt-ry', '--tt-foil-x', '--tt-foil-y'];

// How far the foil band travels, in background-position percent, at full
// pointer offset. Its tile is 260% of the card, so a quarter of the
// positioning area sweeps the glint right across the face without ever
// walking it off the card.
const FOIL_TRAVEL = 24;

const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

// NaN, from a zero-sized box, falls through to -1 instead of writing
// "NaNdeg" into the style attribute.
const clamp = (value) => (value > 1 ? 1 : value > -1 ? value : -1);

const degrees = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const bind = (element) => {
  let frame = 0;
  let box = null;
  let capX = 0;
  let capY = 0;
  let nx = 0;
  let ny = 0;

  const paint = () => {
    frame = 0;
    // Sign convention: the pointer presses the surface. CSS rotateX is
    // positive when the top edge goes away from the viewer and rotateY is
    // positive when the right edge does, so negating ny and keeping nx
    // pushes the corner under the pointer down and away. The opposite
    // convention, tipping the near corner up toward the pointer, reads as
    // the card chasing the mouse.
    element.style.setProperty('--tt-rx', `${(-ny * capX).toFixed(2)}deg`);
    element.style.setProperty('--tt-ry', `${(nx * capY).toFixed(2)}deg`);
    element.style.setProperty('--tt-foil-x', `${(nx * FOIL_TRAVEL).toFixed(2)}%`);
    element.style.setProperty('--tt-foil-y', `${(ny * FOIL_TRAVEL).toFixed(2)}%`);
  };

  const track = (event) => {
    nx = clamp(((event.clientX - box.left) / box.width) * 2 - 1);
    ny = clamp(((event.clientY - box.top) / box.height) * 2 - 1);
    // One frame's worth of work, however many moves the pointer reports.
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const enter = (event) => {
    if (reduced.matches) return;
    const style = getComputedStyle(element);
    // Read on every enter, never once at load. --tilt-enabled is switched by
    // a media query (the career slide covers the team grid from 1024px up),
    // so a resize has to change the answer without a reload.
    if (style.getPropertyValue('--tilt-enabled').trim() === '0') return;
    capX = degrees(style.getPropertyValue('--tilt-x'));
    capY = degrees(style.getPropertyValue('--tilt-y'));
    // Measured once, while the card is still flat. getBoundingClientRect
    // reports the TRANSFORMED box, so re-measuring mid-hover would feed the
    // tilt back into its own input and the card would chase itself.
    box = element.getBoundingClientRect();
    element.addEventListener('pointermove', track);
    track(event);
  };

  const leave = () => {
    element.removeEventListener('pointermove', track);
    // A queued frame would write the channels back after the clear.
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    for (const channel of CHANNELS) element.style.removeProperty(channel);
  };

  element.addEventListener('pointerenter', enter);
  element.addEventListener('pointerleave', leave);
};

const start = () => {
  for (const element of document.querySelectorAll('[data-tilt]')) bind(element);
};

// Nothing is bound at all on a coarse pointer: there is no hover state to
// hang the tilt on, and pointerenter fires on a tap, which would leave a
// card stuck mid-rotation until the next tap somewhere else.
if (fine.matches) {
  // A module script normally runs after parsing, but load order must not
  // matter: a page that loads this earlier still gets its cards.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
