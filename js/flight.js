/**
 * Flight: the companions over the homepage hero.
 *
 * Two or three small Plepic marks fly the hero's open paper. They flap in
 * short bursts, glide, land, breathe where they land and take off again. A
 * pointer that comes close sends a resting one up and turns a flying one
 * aside. Curious play, at the size of a pictogram.
 *
 * Each companion is a <plepic-mark> around a clone of the header mark, so the
 * page keeps one copy of the locked geometry and this file holds none of it.
 * js/plepic-mark.js hinges the wings; this module moves the host and turns
 * the two hinges.
 *
 * INTEGRATION CONTRACT
 *   <script type="module" src="/js/plepic-mark.js"></script>
 *   <script type="module" src="/js/flight.js"></script>
 *   The page carries .hero, the header's .logo-butterfly and the --flight-*
 *   and --breath-* tokens. The module appends div.flight to .hero.
 *
 * Nothing is built under prefers-reduced-motion. The flock waits for the load
 * event and an idle moment, so it never competes with the first paint, and
 * the loop runs only while the hero is on screen. A frame writes transforms
 * and reads no layout.
 */

const TAU = Math.PI * 2;

// The nearest companion flies at full size and speed; the others are smaller
// and slower, which reads as distance.
const DEPTHS = [1, 0.8, 0.66];

// Destinations never fall on the copy: a companion may cross a line of text
// but never settles on one. Text is kept out line by line, not by its block,
// because a stacked phone hero is all blocks and its open paper lies beside
// the short lines.
const COPY_TEXT = '.hero-tagline, .hero h1, .hero-desc, .hero-qualifier, .hero-code';
const COPY_BOXES = '.hero .badge-base, .hero .btn-group > *, .hero-bottom';

// The metamorphosis stage also pushes a flying companion away, so nothing
// ever crosses the signature.
const STAGE = '.meta-stage';

const hero = document.querySelector('.hero');
const source = document.querySelector('.header .logo-butterfly');
const narrow = window.matchMedia('(max-width: 900px)').matches;

const random = (low, high) => low + Math.random() * (high - low);
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const world = { width: 0, height: 0, top: 0, copy: [], stage: null, pageLeft: 0, pageTop: 0 };
const pointer = { x: 0, y: 0, at: -Infinity };

const measure = () => {
  const box = hero.getBoundingClientRect();
  const relative = (r) => ({ left: r.left - box.left, top: r.top - box.top, right: r.right - box.left, bottom: r.bottom - box.top });
  world.width = box.width;
  world.height = box.height;
  world.top = document.querySelector('.header').offsetHeight + 12;
  const lines = [...hero.querySelectorAll(COPY_TEXT)].flatMap((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()];
  });
  const boxes = [...hero.querySelectorAll(COPY_BOXES)].map((element) => element.getBoundingClientRect());
  world.copy = [...lines, ...boxes].map(relative).filter((r) => r.right > r.left);
  const stage = hero.querySelector(STAGE);
  const stageBox = stage && relative(stage.getBoundingClientRect());
  world.stage = stageBox && stageBox.right > stageBox.left ? stageBox : null;
  world.pageLeft = box.left + window.scrollX;
  world.pageTop = box.top + window.scrollY;
};

const inside = (r, x, y, pad) => x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
const open = (x, y) => !world.copy.some((r) => inside(r, x, y, 18)) && !(world.stage && inside(world.stage, x, y, 24));

// The best of a few dozen open points, preferring one about a hop away.
const destination = (c) => {
  let best = { x: c.x, y: c.y };
  let bestScore = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const x = random(28, world.width - 28);
    const y = random(world.top, world.height - 28);
    if (!open(x, y)) continue;
    const score = Math.abs(Math.hypot(x - c.x, y - c.y) - c.hop) + random(0, 90);
    if (score < bestScore) {
      best = { x, y };
      bestScore = score;
    }
  }
  return best;
};

const build = (layer, depth, index, tokens) => {
  const host = document.createElement('plepic-mark');
  host.className = 'flier';
  host.style.width = `${(tokens.size * depth).toFixed(1)}px`;
  const mark = source.cloneNode(true);
  mark.removeAttribute('class');
  mark.removeAttribute('width');
  mark.removeAttribute('height');
  mark.setAttribute('shape-rendering', 'geometricPrecision');
  host.append(mark);
  layer.append(host);

  const fromLeft = index % 2 === 0;
  const c = {
    host,
    left: host.querySelector('.mark-hinge--left'),
    right: host.querySelector('.mark-hinge--right'),
    half: (tokens.size * depth) / 2,
    depth,
    cruise: tokens.cruise * depth,
    beat: tokens.beat * (0.75 + 0.25 * depth),
    hop: narrow ? 150 : 280,
    wait: index * 2.4,
    x: fromLeft ? -40 : world.width + 40,
    y: random(world.top + 20, world.height * 0.55),
    heading: fromLeft ? 0 : Math.PI,
    turn: 0,
    rot: (fromLeft ? 0 : Math.PI) + Math.PI / 2,
    speed: tokens.cruise * depth,
    mode: 'flap',
    beats: 6,
    phase: random(0, 1),
    timer: 0,
    wingLeft: 0,
    wingRight: 0,
    alt: 1,
    landing: false,
    seed: random(0, TAU),
    clock: 0,
  };
  c.target = destination(c);
  render(c, 0);
  return c;
};

const render = (c, lift) => {
  const scale = 0.88 + 0.12 * c.alt + 0.04 * lift * c.alt;
  c.host.style.transform = `translate3d(${(c.x - c.half).toFixed(2)}px, ${(c.y - c.half).toFixed(2)}px, 0) rotate(${c.rot.toFixed(4)}rad) scale(${scale.toFixed(4)})`;
  c.left.style.transform = `rotateY(${clamp(c.wingLeft, -10, 85).toFixed(2)}deg)`;
  c.right.style.transform = `rotateY(${(-clamp(c.wingRight, -10, 85)).toFixed(2)}deg)`;
};

const step = (c, dt, t, tokens) => {
  if (c.wait > 0) {
    c.wait -= dt;
    return;
  }

  const sincePointer = t - pointer.at;
  const pointerDistance = Math.hypot(pointer.x - c.x, pointer.y - c.y);
  let wingLeft;
  let wingRight;
  let lift = 0;

  if (c.mode === 'perch') {
    c.clock += dt;
    c.timer -= dt;
    c.alt = Math.max(0, c.alt - dt * 2.5);
    const breath = (clock) => tokens.breathOpen * (0.5 - 0.5 * Math.cos(TAU * clock / tokens.breathPeriod));
    wingLeft = breath(c.clock);
    wingRight = breath(Math.max(0, c.clock - tokens.breathOffset));
    const startled = sincePointer < 1.5 && pointerDistance < 70;
    if (c.timer <= 0 || startled) {
      c.mode = 'flap';
      c.beats = Math.round(random(5, 8));
      c.phase = 0;
      c.landing = false;
      c.hop = startled ? (narrow ? 220 : 380) : (narrow ? 150 : 280);
      c.target = destination(c);
      c.heading = startled ? Math.atan2(c.y - pointer.y, c.x - pointer.x) : Math.atan2(c.target.y - c.y, c.target.x - c.x);
      c.speed = startled ? c.cruise * 1.8 : c.cruise * 0.4;
    }
  } else {
    const dx = c.target.x - c.x;
    const dy = c.target.y - c.y;
    const distance = Math.hypot(dx, dy);

    // A real butterfly never flies a straight line: two slow sines meander
    // the course, and every downstroke below adds a small kick.
    let desired = Math.atan2(dy, dx)
      + (distance > 50 ? 1 : 0.3) * (0.38 * Math.sin(t * 0.9 + c.seed) + 0.2 * Math.sin(t * 2.3 + c.seed * 2));
    if (world.stage && inside(world.stage, c.x, c.y, 30)) {
      desired = Math.atan2(c.y - (world.stage.top + world.stage.bottom) / 2, c.x - (world.stage.left + world.stage.right) / 2);
    }
    if (sincePointer < 1.5 && pointerDistance < 110) {
      desired = Math.atan2(c.y - pointer.y, c.x - pointer.x);
    }

    const before = c.heading;
    c.heading = wrap(c.heading + clamp(wrap(desired - c.heading), -2.6 * dt, 2.6 * dt));
    c.turn += (wrap(c.heading - before) / dt - c.turn) * Math.min(1, dt * 6);

    const approach = c.landing ? clamp(distance / 70, 0.18, 1) : 1;
    const cruise = c.cruise * (c.mode === 'flap' ? 1.12 : 0.7) * approach;
    c.speed += (cruise - c.speed) * Math.min(1, dt * (c.mode === 'flap' ? 2.2 : 0.9));
    c.x += Math.cos(c.heading) * c.speed * dt;
    c.y += Math.sin(c.heading) * c.speed * dt;
    c.alt = Math.min(1, c.alt + dt * 2);

    // The downstroke is the shorter 45% of a beat and the body rises on it.
    const down = 0.45;
    const top = tokens.beatOpen;
    const bottom = tokens.glideOpen - 14;
    if (c.mode === 'flap') {
      const previous = c.phase;
      c.phase += dt / (c.beat * (c.landing ? 1.5 : 1));
      if (previous < down && c.phase >= down) {
        c.beats -= 1;
        if (c.beats <= 0) {
          c.mode = 'glide';
          c.timer = random(0.35, 1.0);
          c.phase = down;
        }
      }
      if (c.phase >= 1) {
        c.phase -= 1;
        c.heading += random(-0.22, 0.22);
      }
      if (c.mode === 'flap') {
        if (c.phase < down) {
          const u = c.phase / down;
          wingLeft = top + (bottom - top) * ease(u);
          lift = Math.sin(Math.PI * u);
        } else {
          wingLeft = bottom + (top - bottom) * ease((c.phase - down) / (1 - down));
        }
      }
    }
    if (c.mode === 'glide') {
      wingLeft = tokens.glideOpen;
      c.timer -= dt;
      if (c.timer <= 0) {
        c.mode = 'flap';
        c.beats = Math.round(random(3, 7));
      }
    }

    if (distance < (c.landing ? 5 : 26)) {
      if (c.landing) {
        c.mode = 'perch';
        c.timer = narrow ? random(4, 9) : random(3, 7);
        c.clock = 0;
      } else {
        c.landing = Math.random() < (narrow ? 0.6 : 0.35);
        c.target = destination(c);
      }
    }
    c.rot += wrap(c.heading + Math.PI / 2 - c.rot) * Math.min(1, dt * 7);
    // Roll into a turn: the outer wing rides higher than the inner one.
    const bank = clamp(c.turn * 6, -9, 9);
    wingRight = wingLeft - bank;
    wingLeft += bank;
  }

  const follow = Math.min(1, dt * (c.mode === 'flap' ? 60 : 9));
  c.wingLeft += (wingLeft - c.wingLeft) * follow;
  c.wingRight += (wingRight - c.wingRight) * follow;
  render(c, lift);
};

const boot = async () => {
  await customElements.whenDefined('plepic-mark');
  const css = getComputedStyle(document.documentElement);
  const token = (name) => parseFloat(css.getPropertyValue(name));
  const tokens = {
    size: token('--flight-size'),
    beat: token('--flight-beat') / 1000,
    beatOpen: token('--flight-beat-open'),
    glideOpen: token('--flight-glide-open'),
    cruise: token('--flight-cruise'),
    breathOpen: token('--breath-open'),
    breathPeriod: token('--breath-period'),
    breathOffset: token('--breath-offset'),
  };

  measure();
  const layer = document.createElement('div');
  layer.className = 'flight';
  layer.setAttribute('aria-hidden', 'true');
  hero.append(layer);
  const flock = DEPTHS.slice(0, narrow ? 2 : 3).map((depth, index) => build(layer, depth, index, tokens));

  const track = (event) => {
    pointer.x = event.pageX - world.pageLeft;
    pointer.y = event.pageY - world.pageTop;
    pointer.at = performance.now() / 1000;
  };
  window.addEventListener('pointermove', track, { passive: true });
  window.addEventListener('pointerdown', track, { passive: true });
  new ResizeObserver(measure).observe(hero);

  // A resumed loop's first rAF timestamp can predate the performance.now()
  // that resumed it, so a step never runs on a zero or negative dt.
  let handle = 0;
  let last = 0;
  const frame = (now) => {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    if (dt > 0) for (const c of flock) step(c, dt, now / 1000, tokens);
    handle = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(handle);
    if (!entry.isIntersecting) return;
    last = performance.now();
    handle = requestAnimationFrame(frame);
  }).observe(hero);
};

const idle = (callback) => {
  // Safari has no requestIdleCallback.
  if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout: 3000 });
  else window.setTimeout(callback, 1200);
};

if (hero && source && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if (document.readyState === 'complete') idle(boot);
  else window.addEventListener('load', () => idle(boot), { once: true });
}
