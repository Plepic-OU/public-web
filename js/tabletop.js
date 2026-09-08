/**
 * The living tabletop's pointer tilt.
 *
 * Every [data-tilt] element is a SEAT: an untransformed wrapper whose child
 * card follows the pointer, the edge nearest it pushed away from the viewer,
 * so the card reads as a physical object being pressed on a table rather than
 * a picture leaning toward you. The seat exists because a transformed element
 * is hit-tested against its transformed box, so a card that tracked its own
 * hover chased itself out from under a resting pointer. The seat never moves,
 * which is what makes both the hover and the measurement below trustworthy.
 *
 * The module writes four custom properties and nothing else, because
 * css/styles.css owns the transform. That split is the whole point: the
 * hover lift and the ink shadow are CSS rules, so they still work under
 * reduced motion, on touch, and before this file loads, with the module
 * doing nothing at all.
 *
 * INTEGRATION CONTRACT
 *   <script type="module" src="/js/tabletop.js"></script>
 *   <div class="tt-seat" data-tilt><article class="tt-card">…</article></div>
 *
 *   Reads   --tilt-enabled (0 switches this seat off), --tilt-x, --tilt-y
 *   Writes  --tt-rx and --tt-ry, inline, on the seat. Custom properties
 *           inherit, so the card one level down reads them without this
 *           module ever touching it. They are cleared on pointer leave so the
 *           :root defaults take over and the card settles back through the
 *           CSS transition.
 */

const CHANNELS = ['--tt-rx', '--tt-ry'];

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
  let pointerX = 0;
  let pointerY = 0;
  let tracking = false;

  const paint = () => {
    frame = 0;
    // Measured per frame, not once per hover. The seat carries no transform,
    // so its box is always its real one and reading it here costs a layout
    // that the pointer has already dirtied. Caching it on pointerenter looked
    // cheaper and was wrong: scrolling the wheel while hovering moves the seat
    // under a pointer that never fires pointerenter again, and the card then
    // tilts from an origin 100px away from where it actually sits.
    box = element.getBoundingClientRect();
    nx = clamp(((pointerX - box.left) / box.width) * 2 - 1);
    ny = clamp(((pointerY - box.top) / box.height) * 2 - 1);
    // Sign convention: the pointer presses the surface. CSS rotateX is
    // positive when the top edge goes away from the viewer and rotateY is
    // positive when the right edge does, so negating ny and keeping nx
    // pushes the corner under the pointer down and away. The opposite
    // convention, tipping the near corner up toward the pointer, reads as
    // the card chasing the mouse.
    element.style.setProperty('--tt-rx', `${(-ny * capX).toFixed(2)}deg`);
    element.style.setProperty('--tt-ry', `${(nx * capY).toFixed(2)}deg`);
  };

  const track = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    // One frame's worth of work, however many moves the pointer reports.
    if (!frame) frame = requestAnimationFrame(paint);
  };

  // A wheel over a hovered card moves the seat, not the pointer, and fires no
  // pointer event at all. Re-paint from the last known pointer position so the
  // tilt follows the card down the page instead of freezing.
  const reflow = () => {
    if (tracking && !frame) frame = requestAnimationFrame(paint);
  };

  const enter = (event) => {
    // The media query above asks about the PRIMARY pointer, so a laptop with a
    // touchscreen answers "fine" and binds these listeners. A finger then fires
    // pointerenter and never a pointerleave, which would leave the card tilted
    // and stuck until the next mouse gesture. Judge the pointer that actually
    // arrived, not the one the device advertises.
    if (event.pointerType === 'touch') return;
    if (reduced.matches) return;
    const style = getComputedStyle(element);
    // Read on every enter, never once at load. --tilt-enabled is switched by
    // a media query (the career slide covers the team grid from 1024px up),
    // so a resize has to change the answer without a reload.
    if (style.getPropertyValue('--tilt-enabled').trim() === '0') return;
    capX = degrees(style.getPropertyValue('--tilt-x'));
    capY = degrees(style.getPropertyValue('--tilt-y'));
    tracking = true;
    element.addEventListener('pointermove', track);
    window.addEventListener('scroll', reflow, { passive: true });
    track(event);
  };

  const leave = () => {
    tracking = false;
    element.removeEventListener('pointermove', track);
    window.removeEventListener('scroll', reflow);
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
