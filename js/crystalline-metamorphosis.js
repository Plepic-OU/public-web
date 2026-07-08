/**
 * Crystalline Metamorphosis — the Plepic 3D hero.
 *
 * A crystalline caterpillar crawls, cocoons, and unfurls into the exact
 * Plepic butterfly mark, then breathes at rest. The 22 wing facets are the
 * constant: one continuous crystal skin, parameterized per corner by
 * (a = position along the body, r = distance from the wing root, side),
 * reorganizes through every movement. Matter is conserved structurally,
 * not choreographically.
 *
 * Motion doctrine: forces, not tweens. Every rendered corner is a damped
 * spring particle (one per LOGICAL corner — corners shared between facets
 * share one particle, so the crystal stays watertight). Pose fields set
 * spring TARGETS only; gravity, ground pins, a silk constraint, pressure
 * springs, and an integrated pendulum do the moving. The logo is where
 * the physics settles: a deadband snap lands particles on the exact
 * Appendix-A coordinates, and the shader's rest gate collapses all
 * lighting to the exact locked hex for face-on, settled facets.
 *
 * INTEGRATION CONTRACT
 *   import { init } from './js/crystalline-metamorphosis.js';
 *   const hero = init(stageEl, { onLive, onFallback, startAtRest });
 *   hero.replay();   // explicit user trigger only — no auto-replay
 *   hero.destroy();  // full teardown, releases all GPU resources
 *
 *   opts.startAtRest: true → mount at the settled breathing butterfly and
 *     never auto-play the arc; the host drives it via replay() (e.g. after
 *     a delay so the visitor reads the headline first).
 *
 *   - stageEl contains the static poster (the exact mark SVG), visible by
 *     default. onLive() fires one frame AFTER the first presented WebGL
 *     frame; the host then cross-fades poster → canvas.
 *   - The canvas is aria-hidden, pointer-events: none, opaque cream
 *     (#faf7f2, byte-exact against the page background).
 *   - prefers-reduced-motion, missing WebGL2, saveData, low deviceMemory,
 *     failed init, and context loss all land on the poster (onFallback).
 *     Reduced motion never runs the physics timeline.
 *   - Loads started > 2.5s ago (slow networks) skip the story and settle
 *     directly into the breathing rest state, so the poster→canvas swap
 *     is seamless instead of regressing butterfly → caterpillar.
 *
 * COLOR EXACTNESS (do not change casually)
 *   THREE.ColorManagement is disabled module-wide; the renderer uses
 *   NoToneMapping + SRGBColorSpace; every material is a raw ShaderMaterial
 *   with no tonemapping/colorspace chunks; facet colors travel as
 *   normalized Uint8 attributes. This is safe ONLY because the scene uses
 *   exclusively custom shaders. The spec's ACES-Filmic line was traded up
 *   for Definition-of-Done #2 (pixel-faithful rest): ACES cannot
 *   round-trip #00c638 at 8 bits.
 *
 * PERFORMANCE BUDGET
 *   - 30 spring particles drive 22 facet prisms in ONE dynamic draw call;
 *     body, head, 2 antennae, 2 tips, silk, contact shadow ≈ 7 small draws.
 *   - No postprocessing (no bloom, no DoF); all light-play is in-shader.
 *   - DPR ≤ 2 (≤ 1.5 coarse pointers); loop pauses offscreen and on
 *     hidden tabs; zero per-frame allocations in the render loop.
 *   - Transferred weight: pinned three.module.min.js ≈ 87 KB gzip via the
 *     page import map + this module (~19 KB gzip). Zero external assets.
 *
 * QUALITY TIER LADDER (steps down automatically, never up)
 *   T0  full: DPR cap, 2 substeps (120 Hz physics), dispersion+tremor+sweep
 *   T1  DPR × 0.8
 *   T2  DPR × 0.66 (min 1), 1 substep (60 Hz), dispersion off
 *   T3  tremor off, light sweep off
 *   T4  stop the loop, restore the poster (onFallback('perf'))
 *   Trigger: frame-time EMA > 21 ms sustained ~90 frames.
 *
 * SPEC DEVIATIONS (owner sign-offs, see integration note)
 *   (a) ACES → NoToneMapping (above). (b) Prisms are shallow (depth 5) and
 *   un-beveled; side faces are pre-darkened toward deep green. (c) The
 *   poster SVG uses geometricPrecision so the poster/canvas swap is
 *   invisible. (d) Contact shadow uses DESIGN.md's own shadow ink
 *   rgba(28,28,26,·) at ≤ 8%. (e) Gait wave travels tail→head (biology and
 *   the spec's own "head leads" beat its "head-to-tail" line). (f) Rest
 *   breathing is a post-spring display rotation (asymmetric shaped sine
 *   about the wing hinge), not the pressure springs idling: springs must
 *   fully settle for the deadband snap and byte-exact rest gate to hold.
 */

import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

// ---------------------------------------------------------------------------
// 1. CONSTANTS — palette, canonical geometry, timeline
// ---------------------------------------------------------------------------

const PAL = {
  vivid: '#00c638',
  brand: '#137b30',
  deep:  '#0d5822',
  ember: '#e26c45',
  cream: '#faf7f2',
  ink:   '#1c1c1a',
};

// Appendix A — canonical settled butterfly, viewBox 0 0 300 280.
// [ax, ay, bx, by, cx, cy, palKey]; left wing 0–10, right wing 11–21.
const FACETS = [
  [147,105, 110,68,  55,48,   'deep' ],
  [147,105, 55,48,   20,72,   'vivid'],
  [147,105, 20,72,   15,108,  'brand'],
  [147,130, 147,105, 15,108,  'vivid'],
  [147,130, 15,108,  28,150,  'deep' ],
  [147,165, 147,130, 28,150,  'vivid'],
  [147,165, 28,150,  50,178,  'brand'],
  [147,178, 50,178,  82,195,  'deep' ],
  [147,178, 82,195,  75,220,  'vivid'],
  [147,195, 75,220,  100,240, 'brand'],
  [147,195, 100,240, 135,232, 'deep' ],
  [153,105, 190,68,  245,48,  'deep' ],
  [153,105, 245,48,  280,72,  'vivid'],
  [153,105, 280,72,  285,108, 'brand'],
  [153,130, 153,105, 285,108, 'vivid'],
  [153,130, 285,108, 272,150, 'deep' ],
  [153,165, 153,130, 272,150, 'vivid'],
  [153,165, 272,150, 250,178, 'deep' ],
  [153,178, 250,178, 218,195, 'brand'],
  [153,178, 218,195, 225,220, 'vivid'],
  [153,195, 225,220, 200,240, 'brand'],
  [153,195, 200,240, 165,232, 'deep' ],
];
const N_FACETS = FACETS.length;

// Body leaf: M150,92 C158,120 158,150 150,200 (right edge; left mirrors)
const BODY_TOP = 92, BODY_BOT = 200, BODY_N = 20;
// Antennae: cubic beziers, exact
const ANT_L = [150,86, 146,72, 140,55, 136,42];
const ANT_R = [150,86, 154,72, 160,55, 164,42];
const ANT_SAMPLES = 9, ANT_WIDTH = 1.8;
const HEAD = { x: 150, y: 90, r: 8 };
const TIP_R = 3.5;

// Design→world: worldY = 280 − designY (flip at data level, never in camera)
const dY = (y) => 280 - y;
const HEAD_REST = { x: HEAD.x, y: dY(HEAD.y) };      // (150, 190)

// Framing: world units = design units; frustum centers on the mark.
// The crawl ground sits at the level where the butterfly's body will end
// (design y=200 → world 80), so the caterpillar crawls along the line it
// will eventually rest on. The silk drops in from beyond the top edge.
// VIEW_H is mirrored by the poster CSS: .meta-poster svg height must equal
// 280/VIEW_H of stage height (82.35% at 340) or the swap shows a scale pop.
const VIEW_CY = 140, VIEW_H = 340;
const GROUND_Y = 58;
const SILK_ANCHOR = { x: 150, y: 336 };
const CRAWL_START = 128;               // head x at t=0; tail stays in frame

// Timeline (seconds)
const T_CRAWL = 4.6, T_GATHER = 2.6, T_CHRYS = 3.0, T_UNFURL = 3.4;
const PHASE = { CRAWL: 0, GATHER: 1, CHRYSALIS: 2, UNFURL: 3, REST: 4 };

// Physics
const PHYS_DT = 1 / 120;
const GRAVITY = 400;                    // px/s² (springs ω14 → ~2px sag)
const GAIT_T = 1.55;                    // seconds per gait cycle
const BODY_LEN = 205;                   // caterpillar rest arc length
const WAVE_AMP = 0.4;                   // local compression depth
const ARCH_H = 17;                      // hump lift under the wave
const PRESS = { omega: 1.55, zeta: 0.62, rightDelay: 0.35 };
const CRUMPLE = { foldDeg: 62, jitter: 0.35, wrinklePx: 10 };
const BLOOM_MAX = 5 * Math.PI / 180;    // cap past-flat bloom at 5°
const BREATHE_AMP = 2.1 * Math.PI / 180;

// ---------------------------------------------------------------------------
// 2. UTILS — seeded noise, springs
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(137);

const NOISE_N = 256;
const noiseTab = new Float32Array(NOISE_N);
for (let i = 0; i < NOISE_N; i++) noiseTab[i] = rand() * 2 - 1;
function noise1(x) {
  const xi = Math.floor(x), xf = x - xi;
  const a = noiseTab[xi & (NOISE_N - 1)], b = noiseTab[(xi + 1) & (NOISE_N - 1)];
  const s = xf * xf * (3 - 2 * xf);
  return a + (b - a) * s;
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v) => clamp(v, 0, 1);
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Damped spring field with gravity, pins, and a deadband snap.
 * Layout: 3 floats per particle. Semi-implicit Euler, stable at PHYS_DT.
 */
class SpringField {
  constructor(nParticles, omega, zeta) {
    this.n = nParticles;
    this.pos = new Float32Array(nParticles * 3);
    this.vel = new Float32Array(nParticles * 3);
    this.target = new Float32Array(nParticles * 3);
    this.pinned = new Uint8Array(nParticles);
    this.omega = omega; this.zeta = zeta;
    this.gravity = 0;
    this.settleT = 0;
    this.settled = false;
  }
  snap() { this.pos.set(this.target); this.vel.fill(0); this.settled = true; this.settleT = 1; }
  wake() { this.settled = false; this.settleT = 0; }
  /** Returns excitation: max normalized (error, speed) over particles. */
  step(dt) {
    const { pos, vel, target, pinned } = this;
    const k = this.omega * this.omega;
    const c = 2 * this.zeta * this.omega;
    const g = this.gravity;
    let exc = 0, maxErr = 0, maxVel = 0;
    for (let p = 0; p < this.n; p++) {
      const i = p * 3;
      if (pinned[p]) {
        pos[i] = target[i]; pos[i + 1] = target[i + 1]; pos[i + 2] = target[i + 2];
        vel[i] = vel[i + 1] = vel[i + 2] = 0;
        continue;
      }
      for (let d = 0; d < 3; d++) {
        const j = i + d;
        let a = k * (target[j] - pos[j]) - c * vel[j];
        if (d === 1) a -= g;
        vel[j] += a * dt;
        pos[j] += vel[j] * dt;
        const e = Math.abs(target[j] - pos[j]), s = Math.abs(vel[j]);
        if (e > maxErr) maxErr = e;
        if (s > maxVel) maxVel = s;
      }
    }
    // Deadband snap: springs converge asymptotically; the logo must land
    // EXACTLY. 0.5s inside the deadband → hard-set to targets.
    if (g === 0 && maxErr < 0.1 && maxVel < 0.02) {
      this.settleT += dt;
      if (this.settleT > 0.5 && !this.settled) this.snap();
    } else {
      this.settleT = 0; this.settled = false;
    }
    exc = clamp01(maxErr * 0.05 + maxVel * 0.033);
    return this.settled ? 0 : exc;
  }
}

/** Scalar underdamped spring (wing pressure). */
class ScalarSpring {
  constructor(omega, zeta) { this.x = 0; this.v = 0; this.t = 0; this.omega = omega; this.zeta = zeta; }
  step(dt) {
    const a = this.omega * this.omega * (this.t - this.x) - 2 * this.zeta * this.omega * this.v;
    this.v += a * dt; this.x += this.v * dt;
  }
}

// ---------------------------------------------------------------------------
// 3. CORNER POOL — one spring particle per logical corner, shared by facets
// ---------------------------------------------------------------------------

const pool = [];                      // corner metadata
const poolIdx = new Map();            // "x,y" → pool index
const facetCorner = [];               // facetCorner[f][k] = pool index

for (let f = 0; f < N_FACETS; f++) {
  const F = FACETS[f];
  const idx = [];
  for (let k = 0; k < 3; k++) {
    const x = F[k * 2], y = F[k * 2 + 1];
    const key = x + ',' + y + ',' + (f < 11 ? 'L' : 'R');
    if (!poolIdx.has(key)) {
      const left = f < 11;
      const hingeX = left ? 147 : 153;
      const r = Math.abs(x - hingeX) / 132;          // 0 root .. 1 margin
      const a = clamp01((y - 41) / (240 - 41));      // 0 head-end .. 1 tail-end
      const hind = a > 0.62;
      poolIdx.set(key, pool.length);
      pool.push({
        x, yw: dY(y), left, hingeX, r, a, hind,
        lag: Math.min(0.85, r * 0.5 + (hind ? 0.3 : 0)),
        wrinklePhase: rand() * Math.PI * 2,
        wrinkleSign: pool.length % 2 === 0 ? 1 : -1,
        foldJitter: 1 + CRUMPLE.jitter * (rand() * 2 - 1),
        jx: (rand() * 2 - 1) * 2.2,                  // seeded crumple jitter, px
        jy: (rand() * 2 - 1) * 2.2,
      });
    }
    idx.push(poolIdx.get(key));
  }
  facetCorner.push(idx);
}
const N_POOL = pool.length;           // 30 logical corners

// ---------------------------------------------------------------------------
// 4. POSE FIELDS — write spring TARGETS for every particle
// ---------------------------------------------------------------------------

/**
 * The rig: spring fields + phase machine + the physical sub-systems
 * (gait wave, silk constraint, pendulum, pressure springs).
 */
function createRig() {
  const rig = {
    time: 0, phase: PHASE.CRAWL, tPhase: 0,
    corners: new SpringField(N_POOL, 14, 0.72),
    body: new SpringField(BODY_N, 16, 0.8),
    head: new SpringField(1, 10, 0.75),
    ant: [new SpringField(4, 6, 0.35), new SpringField(4, 6, 0.35)],
    // gait state
    gait: { headS: CRAWL_START, tailS: CRAWL_START - BODY_LEN, phase: 0.001, A: new Float32Array(N_POOL) },
    allowPin: true,   // false during resetRig so pins never grab stale positions
    // pendulum (chrysalis sway about the head pin), ICs inherited from the drop
    pend: { on: false, ang: 0, vel: 0 },
    twitchTimes: [0.9, 2.1],
    breathKick: 0,
    pressL: new ScalarSpring(PRESS.omega, PRESS.zeta),
    pressR: new ScalarSpring(PRESS.omega, PRESS.zeta),
    gScale: 1,
    consolidate: 0,
    silkA: 0, silkTarget: 0, silkLen: 0,
    shadowA: 0, shadowTarget: 0,
    excite: 1,
    tremorOn: true,
    // scratch for spine stations
    spineX: new Float32Array(25), spineY: new Float32Array(25), spineA: new Float32Array(25),
  };
  return rig;
}

// --- Spine sampling (crawl + gather) ---------------------------------------
const N_ST = 25;                       // spine stations, a = j/(N_ST-1)

/** Gait wave amplitude at body param a; wave center travels tail→head. */
function waveA(a, waveC) {
  const d = a - waveC;
  if (d < -0.25 || d > 0.25) return 0;
  return Math.pow(Math.cos(2 * Math.PI * d * 1.0), 2.5);
}

/** Caterpillar flank radius profile along the body. */
function rho(a) {
  const t = clamp(a, 0.03, 0.97);
  return 21 * (0.52 + 0.48 * Math.sin(Math.PI * t)) * (1 - 0.22 * a);
}

/**
 * CRAWL — compute spine stations with emergent locomotion:
 * the wave compresses local spacing; the anchor alternates (head planted
 * while the rear gathers, tail planted while the front extends), so net
 * advance is the integral of the wave. waveC 1.25→−0.25 per cycle.
 */
function crawlSpine(rig, waveAmpK) {
  const g = rig.gait;
  const waveC = 1.25 - (g.phase % 1) * 1.5;
  const da = 1 / (N_ST - 1);
  // arc-length spacings under compression
  let sum = 0;
  for (let j = 0; j < N_ST; j++) {
    const A = waveA(j * da, waveC) * waveAmpK;
    rig.spineA[j] = A;
    if (j > 0) sum += BODY_LEN * da * (1 - WAVE_AMP * 0.5 * (A + rig.spineA[j - 1]));
  }
  // alternating anchor
  if (waveC > 0.5) g.tailS = g.headS - sum;
  else g.headS = g.tailS + sum;
  // positions: head at a=0
  let x = g.headS;
  for (let j = 0; j < N_ST; j++) {
    const a = j * da;
    const A = rig.spineA[j];
    if (j > 0) x -= BODY_LEN * da * (1 - WAVE_AMP * 0.5 * (A + rig.spineA[j - 1]));
    rig.spineX[j] = x;
    rig.spineY[j] = GROUND_Y + rho(a) * 0.8 + 2 + ARCH_H * Math.pow(A, 1.5);
  }
  return waveC;
}

const ROLL = 0.62;                     // camera-ward roll of the body (rad)
const cosR = Math.cos(ROLL), sinR = Math.sin(ROLL);

/** Wrap a pool corner onto the caterpillar skin at spine station frame. */
function wrapCrawl(rig, c, out, o, waveC) {
  const s = c.a * (N_ST - 1);
  const j = Math.min(N_ST - 2, Math.floor(s)), f = s - j;
  const sx = lerp(rig.spineX[j], rig.spineX[j + 1], f);
  const sy = lerp(rig.spineY[j], rig.spineY[j + 1], f);
  // tangent (head is at lower j and larger x, so T ≈ (+1, slope))
  let tx = rig.spineX[j] - rig.spineX[j + 1], ty = rig.spineY[j] - rig.spineY[j + 1];
  const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
  const ux = -ty, uy = tx;                           // up-ish normal
  const A = waveA(c.a, waveC);
  // hard taper over the last 15% so tail plates tuck into the tip
  const tailTaper = 1 - 0.62 * Math.max(0, (c.a - 0.85) / 0.15);
  const rr = rho(c.a) * (1 + 0.16 * A) * tailTaper;
  // ring frame rolled toward camera: e1 = U·cosR + ẑ·sinR, e2 = ẑ·cosR − U·sinR
  // tail corners ride higher on the ring so end plates hug the body
  const phi = 0.45 + c.r * 1.9 + 2.4 * Math.max(0, c.a - 0.84);
  const cp = Math.cos(phi), sp = Math.sin(phi) * (c.left ? 1 : -1);
  const ex = ux * cosR, ey = uy * cosR, ez = sinR;
  const fx = -ux * sinR, fy = -uy * sinR, fz = cosR;
  out[o] = sx + rr * (ex * cp + fx * sp);
  out[o + 1] = Math.max(GROUND_Y + 0.5, sy + rr * (ey * cp + fy * sp));
  out[o + 2] = rr * (ez * cp + fz * sp);
}

/**
 * Crumple wrap — chrysalis := crumple(P=0). Per corner: offset from the
 * wing hinge, radially compressed, wrinkled, folded about the hinge axis
 * by θfold(fill). fill releases root-first as pressure rises; overshoot
 * past P=1 becomes the bloom (a small past-flat bow). The transition
 * CHRYSALIS→UNFURL is nothing but the pressure spring being released.
 *
 * ax/ay: assembly anchor (head pin), pendAng: swung frame angle.
 */
function wrapCrumple(rig, c, out, o, P, ax, ay, pendAng, breathS) {
  const fill = sstep(c.lag, 1, Math.min(P, 1));
  const inv = 1 - fill;
  // radial compression toward the hinge line + vertical squeeze to ovoid;
  // unfilled regions stay small so the pump reads as real inflation
  const s = (0.42 + 0.58 * fill) * breathS;
  let dx = (c.x - c.hingeX) * s;
  let dyc = (c.yw - 145) * (0.55 + 0.45 * fill) * breathS;
  // wrinkle: alternating z ripple + seeded in-plane jitter, fades with fill
  const wAmp = CRUMPLE.wrinklePx * Math.pow(inv, 1.3);
  let dz = wAmp * c.wrinkleSign * (0.6 + 0.4 * Math.sin(c.wrinklePhase + rig.time * 0.7));
  dx += c.jx * inv; dyc += c.jy * inv;
  // fold about the vertical hinge axis (per-corner jitter, monotone unfold)
  const bloom = clamp((P - 1) * (45 * Math.PI / 180), 0, BLOOM_MAX);
  const fold = (CRUMPLE.foldDeg * Math.PI / 180) * inv * c.foldJitter - bloom;
  const b = (c.left ? 1 : -1) * fold;
  const cb = Math.cos(b), sb = Math.sin(b);
  const rx = dx * cb + dz * sb, rz = -dx * sb + dz * cb;
  // assemble at the anchor in the swung (pendulum) frame
  const hx = c.hingeX - 150, hy = 145 - HEAD_REST.y;  // hinge relative to head
  let px = hx + rx, py = hy + dyc;
  if (pendAng !== 0) {
    const cpn = Math.cos(pendAng), spn = Math.sin(pendAng);
    const qx = px * cpn - py * spn, qy = px * spn + py * cpn;
    px = qx; py = qy;
  }
  out[o] = ax + px;
  out[o + 1] = ay + py;
  out[o + 2] = rz + 0.001 * (o / 9);                  // z-layer within wings
}

/** Breathe waveform: opens slow, closes a touch faster (asymmetric sine). */
function breatheShape(ph) {
  const s = Math.sin(ph);
  return s > 0 ? Math.pow(s, 1.25) : -Math.pow(-s, 0.85);
}

// --- Phase target computers -------------------------------------------------

function targetsCrawl(rig, dt) {
  const g = rig.gait;
  g.phase += dt / GAIT_T;
  const waveC = crawlSpine(rig, 1);
  const T = rig.corners.target;
  for (let p = 0; p < N_POOL; p++) {
    const c = pool[p];
    // ground pins: belly corners grip while the wave is away (hysteresis)
    const A = waveA(c.a, waveC);
    const wasPinned = rig.corners.pinned[p];
    if (c.r > 0.72 && rig.allowPin) {
      if (!wasPinned && A < 0.35) {
        // engage at the CURRENT position (an instant baseline snap reads
        // as a teleport); the grounded foot settles below at a bounded rate
        rig.corners.pinned[p] = 1;
        T[p * 3] = rig.corners.pos[p * 3];
        T[p * 3 + 1] = rig.corners.pos[p * 3 + 1];
        T[p * 3 + 2] = rig.corners.pos[p * 3 + 2];
        continue;
      }
      if (wasPinned && A < 0.6) {
        // pinned: x frozen (grip), y squashes toward the baseline ≤120 u/s
        const ty = T[p * 3 + 1];
        if (ty > GROUND_Y + 0.5) T[p * 3 + 1] = Math.max(GROUND_Y + 0.5, ty - 120 * dt);
        continue;
      }
      rig.corners.pinned[p] = 0;
    }
    wrapCrawl(rig, c, T, p * 3, waveC);
  }
  // body: belly strip along the spine, tucked behind the near flank
  for (let j = 0; j < BODY_N; j++) {
    const a = j / (BODY_N - 1);
    const s = a * (N_ST - 1), j0 = Math.min(N_ST - 2, Math.floor(s)), f = s - j0;
    setV3(rig.body.target, j,
      lerp(rig.spineX[j0], rig.spineX[j0 + 1], f),
      Math.max(GROUND_Y + 1, lerp(rig.spineY[j0], rig.spineY[j0 + 1], f) - rho(a) * 0.72),
      1.5);
  }
  rig.bodyWidthMode = 0;
  // head gem leads at the front, slightly lifted; antenna horns forward
  const hx = g.headS + 4, hy = rig.spineY[0] + 2;
  setV3(rig.head.target, 0, hx, hy, 3.5);
  antennaHorns(rig, hx, hy, rig.time);
  rig.shadowTarget = 0.08;
  rig.silkTarget = 0;
}

function targetsGather(rig, k) {
  const g = rig.gait;
  // freeze the wave; the body rears up and wraps, head leads to the pin
  const kRear = sstep(0, 0.45, k);
  const kWrapAll = sstep(0.12, 0.95, k);
  crawlSpine(rig, 1 - kRear);                        // wave dies out

  // head spring target → the pin (its final rest position, never moves after)
  setV3(rig.head.target, 0, lerp(g.headS + 9, HEAD_REST.x, smooth(kRear)),
    lerp(rig.spineY[0] + 3, HEAD_REST.y, smooth(kRear)), 3.5);

  const hxNow = rig.head.pos[0], hyNow = rig.head.pos[1];
  const T = rig.corners.target;
  let comX = 0, comN = 0;
  for (let p = 0; p < N_POOL; p++) {
    const c = pool[p];
    // stagger: head-end wraps first, tail last; each corner ≤ 0.4s window
    const w = sstep(0, 0.32, kWrapAll - c.a * 0.55);
    if (w > 0) rig.corners.pinned[p] = 0;            // release as it wraps
    if (w <= 0) {
      // still grounded: pinned corners keep their frozen target (rewriting
      // it would teleport them, since pins copy target → position)
      if (rig.corners.pinned[p]) { comX += T[p * 3]; comN++; continue; }
      wrapCrawl(rig, c, T, p * 3, -1); comX += T[p * 3]; comN++; continue;
    }
    wrapCrawl(rig, c, _scratch, 0, -1);
    wrapCrumple(rig, c, _scratch, 3, 0, hxNow, hyNow, rig.pend.ang, 1);
    T[p * 3] = lerp(_scratch[0], _scratch[3], w);
    T[p * 3 + 1] = lerp(_scratch[1], _scratch[4], w);
    T[p * 3 + 2] = lerp(_scratch[2], _scratch[5], w);
    comX += T[p * 3]; comN++;
  }
  // pendulum ICs inherited from the drop: once most of the body hangs,
  // start the ODE from the center-of-mass offset
  if (!rig.pend.on && kWrapAll > 0.75) {
    rig.pend.on = true;
    rig.pend.ang = Math.atan2((comX / comN) - HEAD_REST.x, 60) * 0.8;
    rig.pend.vel = 0.12;
  }
  // body: seam strip collapsing into the shell
  for (let j = 0; j < BODY_N; j++) {
    const a = j / (BODY_N - 1);
    const w = sstep(0, 0.32, kWrapAll - a * 0.55);
    const s = a * (N_ST - 1), j0 = Math.min(N_ST - 2, Math.floor(s)), f = s - j0;
    const gx = lerp(rig.spineX[j0], rig.spineX[j0 + 1], f);
    const gy = Math.max(GROUND_Y + 1, lerp(rig.spineY[j0], rig.spineY[j0 + 1], f) - rho(a) * 0.72);
    setV3(rig.body.target, j,
      lerp(gx, hxNow, w * 0.98),
      lerp(gy, hyNow - 10 - a * 62 * 0.55, w),
      lerp(1.5, -2, w));
  }
  rig.bodyWidthMode = kWrapAll;
  antennaHorns(rig, rig.head.pos[0], rig.head.pos[1], rig.time, 1 - kRear);
  rig.shadowTarget = 0.08 * (1 - kRear);
  rig.silkTarget = sstep(0.15, 0.5, k) * 0.35;
  rig.silkLen = sstep(0.1, 0.45, k);
}
const _scratch = new Float32Array(6);

function targetsChrysalis(rig, dt, t) {
  // pendulum ODE: ωp 1.8, ζp 0.05; twitches kick both the angle and springs
  const P = rig.pend;
  const acc = -1.8 * 1.8 * Math.sin(P.ang) - 2 * 0.05 * 1.8 * P.vel;
  P.vel += acc * dt; P.ang += P.vel * dt;
  if (rig.twitchTimes.length && t >= rig.twitchTimes[0]) {
    rig.twitchTimes.shift();
    P.vel += (rig.twitchTimes.length % 2 ? -1 : 1) * 0.22;
    rig.breathKick = 1;
    kickSprings(rig.corners, 6);
  }
  rig.breathKick = Math.max(0, rig.breathKick - dt * 2.0);
  const breath = 1 + 0.016 * Math.sin(t * 1.75) + 0.02 * rig.breathKick;

  const hx = rig.head.pos[0], hy = rig.head.pos[1];
  const T = rig.corners.target;
  for (let p = 0; p < N_POOL; p++) {
    wrapCrumple(rig, pool[p], T, p * 3, 0, hx, hy, P.ang, breath);
  }
  const cpn = Math.cos(P.ang), spn = Math.sin(P.ang);
  for (let j = 0; j < BODY_N; j++) {
    const a = j / (BODY_N - 1);
    const ly = (-10 - a * 34) * breath;               // seam, in the swung frame
    setV3(rig.body.target, j, hx - ly * spn, hy + ly * cpn, -2);
  }
  rig.bodyWidthMode = 1;
  setV3(rig.head.target, 0, HEAD_REST.x, HEAD_REST.y, 3.5);
  antennaHorns(rig, hx, hy, rig.time, 0.15);
  rig.shadowTarget = 0;
  rig.silkTarget = 0.35;
  rig.consolidate = Math.min(1, rig.consolidate + dt * 1.2);
}

function kickSprings(field, amp) {
  for (let p = 0; p < field.n; p++) {
    field.vel[p * 3] += noise1(p * 3.7) * amp;
    field.vel[p * 3 + 1] += noise1(p * 5.1 + 40) * amp;
  }
}

function targetsButterfly(rig, dt, t, resting) {
  // pressure springs: left leads, right a beat later
  if (!resting) {
    if (t > 0.35) rig.pressL.t = 1;
    if (t > 0.35 + PRESS.rightDelay) rig.pressR.t = 1;
  }
  rig.pressL.step(dt); rig.pressR.step(dt);
  // pendulum decays hard once the wings pump (silk released)
  const P = rig.pend;
  if (P.on) {
    const acc = -1.8 * 1.8 * Math.sin(P.ang) - 2 * 0.45 * 1.8 * P.vel;
    P.vel += acc * dt; P.ang += P.vel * dt;
    if (Math.abs(P.ang) < 0.002 && Math.abs(P.vel) < 0.004) { P.on = false; P.ang = 0; P.vel = 0; }
  }
  rig.gScale = resting ? 0 : Math.max(0, 1 - t / 1.5);

  const T = rig.corners.target;
  for (let p = 0; p < N_POOL; p++) {
    const c = pool[p];
    const pw = c.left ? rig.pressL.x : rig.pressR.x;
    if (resting && rig.corners.settled) {
      // targets are already exact; nothing to recompute
      T[p * 3] = c.x; T[p * 3 + 1] = c.yw; T[p * 3 + 2] = 0;
      continue;
    }
    wrapCrumple(rig, c, T, p * 3, pw, HEAD_REST.x, HEAD_REST.y, P.ang, 1);
    // as fill completes the crumple formula converges to the rest pose;
    // blend the last 2% to the EXACT coordinates so the snap lands true
    const fill = sstep(c.lag, 1, Math.min(pw, 1));
    if (fill > 0.98 && Math.abs(pw - 1) < 0.02 && !P.on) {
      T[p * 3] = c.x; T[p * 3 + 1] = c.yw; T[p * 3 + 2] = 0;
    }
  }

  // body: the exact leaf
  for (let j = 0; j < BODY_N; j++) {
    const a = j / (BODY_N - 1);
    setV3(rig.body.target, j, 150, dY(lerp(BODY_TOP, BODY_BOT, a)), 1.5);
  }
  rig.bodyWidthMode = 2;
  setV3(rig.head.target, 0, HEAD_REST.x, HEAD_REST.y, 3.5);

  // antennae deploy when pressure crosses 0.5 — their own springs bounce once
  const deploy = resting ? 1 : sstep(0.45, 0.75, rig.pressL.x);
  antennaDeploy(rig, deploy);

  rig.shadowTarget = 0;
  rig.silkTarget = resting ? 0 : Math.max(0, 0.35 - t * 0.45);
  rig.silkLen = Math.max(0, 1 - t * 0.8);
  rig.consolidate = Math.max(0, rig.consolidate - dt * 1.4);
}

/** Antenna targets: tucked horns (crawl/chrysalis). */
function antennaHorns(rig, hx, hy, time, len = 1) {
  for (let side = 0; side < 2; side++) {
    const dzs = side === 0 ? 2 : -2;
    for (let cp = 0; cp < 4; cp++) {
      const ext = (cp / 3) * (4 + 8 * len);
      setV3(rig.ant[side].target, cp, hx + 2 + ext, hy + 2 + ext * 0.8, 3.5 + dzs * (cp / 3));
    }
  }
}

/** Antenna targets: exact rest beziers, scaled by deploy. */
function antennaDeploy(rig, deploy) {
  for (let side = 0; side < 2; side++) {
    const B = side === 0 ? ANT_L : ANT_R;
    for (let cp = 0; cp < 4; cp++) {
      const rx = B[cp * 2], ry = dY(B[cp * 2 + 1]);
      // fold toward the head when not deployed
      setV3(rig.ant[side].target, cp,
        lerp(HEAD_REST.x + (side === 0 ? -2 : 2), rx, deploy),
        lerp(HEAD_REST.y + 4, ry, deploy),
        2.5);
    }
  }
}

function setV3(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

// --- Phase machine ----------------------------------------------------------

function stepRig(rig, dt) {
  rig.time += dt;
  rig.tPhase += dt;
  switch (rig.phase) {
    case PHASE.CRAWL:
      rig.gScale = 1;
      targetsCrawl(rig, dt);
      if (rig.tPhase >= T_CRAWL) { rig.phase = PHASE.GATHER; rig.tPhase = 0; }
      break;
    case PHASE.GATHER:
      rig.gScale = 1;
      targetsGather(rig, rig.tPhase / T_GATHER);
      if (rig.tPhase >= T_GATHER) {
        rig.phase = PHASE.CHRYSALIS; rig.tPhase = 0;
        rig.corners.pinned.fill(0);
      }
      break;
    case PHASE.CHRYSALIS:
      rig.gScale = 1;
      targetsChrysalis(rig, dt, rig.tPhase);
      if (rig.tPhase >= T_CHRYS) { rig.phase = PHASE.UNFURL; rig.tPhase = 0; }
      break;
    case PHASE.UNFURL:
      targetsButterfly(rig, dt, rig.tPhase, false);
      if (rig.tPhase >= T_UNFURL) { rig.phase = PHASE.REST; rig.tPhase = 0; }
      break;
    default:
      targetsButterfly(rig, dt, rig.tPhase, true);
  }
  const g = GRAVITY * rig.gScale;
  rig.corners.gravity = g; rig.body.gravity = g * 0.6; rig.head.gravity = 0;
  let exc = rig.corners.step(dt);
  exc = Math.max(exc, rig.body.step(dt));
  rig.head.step(dt);
  rig.ant[0].step(dt); rig.ant[1].step(dt);
  rig.silkA += (rig.silkTarget - rig.silkA) * Math.min(1, dt * 5);
  rig.shadowA += (rig.shadowTarget - rig.shadowA) * Math.min(1, dt * 5);
  rig.excite = rig.excite * 0.92 + exc * 0.08;
  if (rig.corners.settled && rig.body.settled) rig.excite = 0;
}

function resetRig(rig, startAtRest) {
  rig.time = 0; rig.tPhase = 0;
  rig.consolidate = 0; rig.breathKick = 0;
  rig.pend.on = false; rig.pend.ang = 0; rig.pend.vel = 0;
  rig.twitchTimes = [0.9, 2.1];
  rig.gait.phase = 0.001; rig.gait.headS = CRAWL_START; rig.gait.tailS = CRAWL_START - BODY_LEN;
  rig.corners.pinned.fill(0);
  rig.corners.wake(); rig.body.wake();
  rig.silkA = 0; rig.silkTarget = 0; rig.shadowA = 0; rig.shadowTarget = 0;
  if (startAtRest) {
    rig.phase = PHASE.REST; rig.tPhase = 10;
    rig.pressL.x = 1; rig.pressL.v = 0; rig.pressL.t = 1;
    rig.pressR.x = 1; rig.pressR.v = 0; rig.pressR.t = 1;
    rig.gScale = 0;
    targetsButterfly(rig, PHYS_DT, 10, true);
    rig.corners.snap(); rig.body.snap(); rig.head.snap();
    rig.ant[0].snap(); rig.ant[1].snap();
    rig.excite = 0;
  } else {
    rig.phase = PHASE.CRAWL; rig.tPhase = 0;
    rig.pressL.x = 0; rig.pressL.v = 0; rig.pressL.t = 0;
    rig.pressR.x = 0; rig.pressR.v = 0; rig.pressR.t = 0;
    rig.gScale = 1;
    rig.excite = 1;
    // pins disabled for this pose write: a pin grabs the CURRENT particle
    // position, which on replay() is still the settled butterfly
    rig.allowPin = false;
    targetsCrawl(rig, PHYS_DT);
    rig.corners.snap(); rig.body.snap(); rig.head.snap();
    rig.ant[0].snap(); rig.ant[1].snap();
    rig.corners.wake(); rig.body.wake();
    rig.allowPin = true;
  }
}

// ---------------------------------------------------------------------------
// 5. SHADERS — raw materials, sRGB in = sRGB out, rest gate for exactness
// ---------------------------------------------------------------------------

const crystalVert = /* glsl */ `
  attribute vec3 aColor;
  attribute float aGem;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vGem;
  void main() {
    vColor = aColor;
    vNormal = normalize(normalMatrix * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vGem = aGem;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const crystalFrag = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vGem;
  uniform float uTime;
  uniform float uSweep;        // light-shift band position (parked at -1000)
  uniform float uConsolidate;  // chrysalis darkening 0..1 (brightness only)
  uniform float uExcite;       // rig excitation: 0 = settled exact
  uniform float uDispersion;   // quality tier switch
  const vec3 VIVID = vec3(0.0, 0.77647, 0.21961);
  const vec3 BRAND = vec3(0.07451, 0.48235, 0.18824);
  const vec3 DEEP  = vec3(0.05098, 0.34510, 0.13333);
  void main() {
    // Normals are authored camera-facing in JS (caps forced nz > 0), so no
    // gl_FrontFacing flip: the mirrored right wing winds clockwise and a
    // flip would force the rest gate open on one wing only.
    vec3 n = normalize(vNormal);
    float facing = clamp(n.z, 0.0, 1.0);
    float tilt = 1.0 - facing;

    // REST GATE: face-on AND settled → k = 0 → the exact locked hex.
    // The ±2° breathe keeps tilt under 6.1e-4, inside the gate floor.
    float k = max(smoothstep(0.0015, 0.05, tilt), uExcite);

    // stylized crystal lighting (soft-clipped delta, key + fresnel)
    vec3 K = normalize(vec3(-0.42, 0.55, 0.72));
    float kd = dot(n, K) - K.z;
    float delta = kd * 0.55;
    delta = delta / (1.0 + abs(delta));
    vec3 lit = vColor * (1.0 + delta);
    float fres = pow(tilt, 3.0);
    lit = mix(lit, VIVID * (0.9 + 0.35 * fres), fres * 0.5);
    if (uDispersion > 0.5) {
      float shim = sin(n.x * 6.0 + n.y * 4.0 + uTime * 1.3);
      lit = mix(lit, mix(BRAND, DEEP, 0.5 + 0.5 * shim), tilt * 0.22);
    }
    lit += vGem * 0.06 * vColor;      // gems: slight emissive lift in motion

    vec3 col = mix(vColor, lit, k);

    // light-shift: brightness-only band; exact ×1.0 while parked
    float band = max(0.0, 1.0 - abs(vWorld.x + vWorld.y * 0.35 - uSweep) / 46.0);
    col *= 1.0 + 0.14 * band * band;

    col *= 1.0 - uConsolidate * 0.13;
    gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
  }
`;

const flatVert = /* glsl */ `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const flatFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(uColor, uOpacity); }
`;

const shadowVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// DESIGN.md's own shadow ink (rgba(28,28,26,·)) — not a new color
const shadowFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uOpacity;
  void main() {
    float d = length((vUv - 0.5) * 2.0);
    float a = smoothstep(1.0, 0.2, d) * uOpacity;
    gl_FragColor = vec4(0.10980, 0.10980, 0.10196, a);
  }
`;

function srgbBytes(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------------------------------------------------------------------------
// 6. GEOMETRY — dynamic prisms from the corner pool
// ---------------------------------------------------------------------------
// Per facet: top cap 3v + bottom cap 3v + 3 side quads 18v = 24 verts.
// Un-beveled shallow prisms (depth 5). Side + bottom verts are pre-darkened
// toward deep green; invisible head-on, they read as cut depth in motion.

const VPF = 24;
const PRISM_DEPTH = 5;

function buildWingGeometry() {
  const vc = N_FACETS * VPF;
  const geo = new THREE.BufferGeometry();
  const col = new Uint8Array(vc * 3);
  const gem = new Float32Array(vc);
  for (let f = 0; f < N_FACETS; f++) {
    const [r, g, b] = srgbBytes(PAL[FACETS[f][6]]);
    for (let v = 0; v < VPF; v++) {
      const o = (f * VPF + v) * 3;
      const dark = v < 3 ? 1 : 0.74;                  // top cap exact, rest darker
      col[o] = Math.round(r * dark); col[o + 1] = Math.round(g * dark); col[o + 2] = Math.round(b * dark);
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vc * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3, true));
  geo.setAttribute('aGem', new THREE.BufferAttribute(gem, 1));
  return geo;
}

// scratch (no per-frame allocation)
const _ax = new Float64Array(3), _ay = new Float64Array(3), _az = new Float64Array(3);

/**
 * Rebuild facet prisms from sprung pool corners + post-spring display
 * transforms (breathe + tremor rotate about the wing hinge; exact at
 * zero crossings, gated off entirely once settled with amp 0).
 */
function updateWingGeometry(geo, rig, breatheL, breatheR, tremL, tremR) {
  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  const P = rig.corners.pos;
  let o = 0;
  for (let f = 0; f < N_FACETS; f++) {
    const left = f < 11;
    const beta = (left ? 1 : -1) * ((left ? breatheL : breatheR) + (left ? tremL : tremR));
    const hx = left ? 147 : 153;
    const cb = Math.cos(beta), sb = Math.sin(beta);
    for (let k = 0; k < 3; k++) {
      const pi = facetCorner[f][k] * 3;
      const dx = P[pi] - hx, z = P[pi + 2];
      _ax[k] = hx + dx * cb + z * sb;
      _ay[k] = P[pi + 1];
      _az[k] = -dx * sb + z * cb;
    }
    // miter-inflate 0.25 units from the centroid: the WebGL twin of the
    // SVG's 0.5 same-color stroke, closing hairline seams between facets.
    // The tiny per-facet z bias makes paint order deterministic where
    // inflated edges overlap (invisible under ortho, < prism half-depth).
    const cxm = (_ax[0] + _ax[1] + _ax[2]) / 3, cym = (_ay[0] + _ay[1] + _ay[2]) / 3;
    const zBias = f * 0.004;
    for (let k = 0; k < 3; k++) {
      const vx = _ax[k] - cxm, vy = _ay[k] - cym;
      const vl = Math.hypot(vx, vy) || 1;
      _ax[k] += (vx / vl) * 0.25;
      _ay[k] += (vy / vl) * 0.25;
      _az[k] += zBias;
    }
    // face normal (toward camera)
    const e1x = _ax[1] - _ax[0], e1y = _ay[1] - _ay[0], e1z = _az[1] - _az[0];
    const e2x = _ax[2] - _ax[0], e2y = _ay[2] - _ay[0], e2z = _az[2] - _az[0];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const dxp = nx * PRISM_DEPTH, dyp = ny * PRISM_DEPTH, dzp = nz * PRISM_DEPTH;

    // top cap
    o = putTri(pos, nor, o, _ax[0], _ay[0], _az[0], _ax[1], _ay[1], _az[1], _ax[2], _ay[2], _az[2], nx, ny, nz);
    // bottom cap (reversed)
    o = putTri(pos, nor, o,
      _ax[2] - dxp, _ay[2] - dyp, _az[2] - dzp,
      _ax[1] - dxp, _ay[1] - dyp, _az[1] - dzp,
      _ax[0] - dxp, _ay[0] - dyp, _az[0] - dzp, -nx, -ny, -nz);
    // sides
    for (let e = 0; e < 3; e++) {
      const i0 = e, i1 = (e + 1) % 3;
      const sx = _ay[i1] - _ay[i0], sy0 = _ax[i0] - _ax[i1];   // 2D edge normal-ish
      const el = Math.hypot(sx, sy0) || 1;
      const snx = sx / el, sny = sy0 / el;
      o = putTri(pos, nor, o,
        _ax[i0], _ay[i0], _az[i0], _ax[i1], _ay[i1], _az[i1],
        _ax[i1] - dxp, _ay[i1] - dyp, _az[i1] - dzp, snx, sny, 0);
      o = putTri(pos, nor, o,
        _ax[i0], _ay[i0], _az[i0], _ax[i1] - dxp, _ay[i1] - dyp, _az[i1] - dzp,
        _ax[i0] - dxp, _ay[i0] - dyp, _az[i0] - dzp, snx, sny, 0);
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
}

function putTri(pos, nor, o, x0, y0, z0, x1, y1, z1, x2, y2, z2, nx, ny, nz) {
  pos[o] = x0; pos[o + 1] = y0; pos[o + 2] = z0;
  pos[o + 3] = x1; pos[o + 4] = y1; pos[o + 5] = z1;
  pos[o + 6] = x2; pos[o + 7] = y2; pos[o + 8] = z2;
  for (let k = 0; k < 9; k += 3) { nor[o + k] = nx; nor[o + k + 1] = ny; nor[o + k + 2] = nz; }
  return o + 9;
}

// Body leaf: half-width profile sampled from the canonical bezier
const BODY_HALFW = new Float32Array(BODY_N);
for (let j = 0; j < BODY_N; j++) {
  const t = j / (BODY_N - 1);
  const mt = 1 - t;
  const x = mt * mt * mt * 150 + 3 * mt * mt * t * 158 + 3 * mt * t * t * 158 + t * t * t * 150;
  BODY_HALFW[j] = x - 150;                            // 0 at tips, ~6 mid
}

function buildBodyGeometry() {
  const triCount = (BODY_N - 1) * 8;
  const vc = triCount * 3;
  const geo = new THREE.BufferGeometry();
  const col = new Uint8Array(vc * 3);
  const [r, g, b] = srgbBytes(PAL.deep);
  for (let v = 0; v < vc; v++) { col[v * 3] = r; col[v * 3 + 1] = g; col[v * 3 + 2] = b; }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vc * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3, true));
  geo.setAttribute('aGem', new THREE.BufferAttribute(new Float32Array(vc), 1));
  return geo;
}

function bodyHalfW(j, mode) {
  const t = j / (BODY_N - 1);
  const rest = BODY_HALFW[j];
  const belly = 8 * (0.5 + 0.5 * Math.sin(Math.PI * clamp(t, 0.03, 0.97)));
  const seam = 4.5 * (0.55 + 0.45 * Math.sin(Math.PI * t));
  if (mode < 1) return lerp(belly, seam, mode);
  if (mode < 2) return lerp(seam, rest, mode - 1);
  return rest;
}

function updateBodyGeometry(geo, rig) {
  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  const S = rig.body.pos;
  const mode = rig.bodyWidthMode;
  const Z = 1.0;                                       // half thickness
  let o = 0;
  for (let j = 0; j < BODY_N - 1; j++) {
    const x0 = S[j * 3], y0 = S[j * 3 + 1], z0 = S[j * 3 + 2];
    const x1 = S[(j + 1) * 3], y1 = S[(j + 1) * 3 + 1], z1 = S[(j + 1) * 3 + 2];
    let tx = x1 - x0, ty = y1 - y0;
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const px = -ty, py = tx;
    const w0 = bodyHalfW(j, mode), w1 = bodyHalfW(j + 1, mode);
    const ax = x0 + px * w0, ay2 = y0 + py * w0;
    const bx = x0 - px * w0, by2 = y0 - py * w0;
    const cx = x1 + px * w1, cy2 = y1 + py * w1;
    const dx = x1 - px * w1, dy2 = y1 - py * w1;
    // front
    o = putTri(pos, nor, o, ax, ay2, z0 + Z, bx, by2, z0 + Z, cx, cy2, z1 + Z, 0, 0, 1);
    o = putTri(pos, nor, o, bx, by2, z0 + Z, dx, dy2, z1 + Z, cx, cy2, z1 + Z, 0, 0, 1);
    // back
    o = putTri(pos, nor, o, cx, cy2, z1 - Z, bx, by2, z0 - Z, ax, ay2, z0 - Z, 0, 0, -1);
    o = putTri(pos, nor, o, cx, cy2, z1 - Z, dx, dy2, z1 - Z, bx, by2, z0 - Z, 0, 0, -1);
    // rims
    o = putTri(pos, nor, o, ax, ay2, z0 + Z, cx, cy2, z1 + Z, cx, cy2, z1 - Z, px, py, 0);
    o = putTri(pos, nor, o, ax, ay2, z0 + Z, cx, cy2, z1 - Z, ax, ay2, z0 - Z, px, py, 0);
    o = putTri(pos, nor, o, dx, dy2, z1 + Z, bx, by2, z0 + Z, bx, by2, z0 - Z, -px, -py, 0);
    o = putTri(pos, nor, o, dx, dy2, z1 + Z, bx, by2, z0 - Z, dx, dy2, z1 - Z, -px, -py, 0);
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
}

/**
 * Gem: circular front silhouette (48-seg disc, exact circle head-on) with
 * a faceted back ring — reads as a cut cabochon in motion, a perfect
 * circle at rest.
 */
function buildGemGeometry(radius, hex) {
  const SEG = 48, RING = 12;
  const tris = [];
  const zf = radius * 0.55;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    tris.push([0, 0, zf, radius * Math.cos(a0), radius * Math.sin(a0), zf, radius * Math.cos(a1), radius * Math.sin(a1), zf]);
  }
  for (let i = 0; i < RING; i++) {
    const a0 = (i / RING) * Math.PI * 2, a1 = ((i + 1) / RING) * Math.PI * 2;
    const r2 = radius * 0.55, zb = -radius * 0.5;
    tris.push([radius * Math.cos(a0), radius * Math.sin(a0), zf, r2 * Math.cos(a0), r2 * Math.sin(a0), zb, radius * Math.cos(a1), radius * Math.sin(a1), zf]);
    tris.push([radius * Math.cos(a1), radius * Math.sin(a1), zf, r2 * Math.cos(a0), r2 * Math.sin(a0), zb, r2 * Math.cos(a1), r2 * Math.sin(a1), zb]);
  }
  const vc = tris.length * 3;
  const pos = new Float32Array(vc * 3);
  const nor = new Float32Array(vc * 3);
  const col = new Uint8Array(vc * 3);
  const gem = new Float32Array(vc).fill(1);
  const [r, g, b] = srgbBytes(hex);
  tris.forEach((t, ti) => {
    const e1x = t[3] - t[0], e1y = t[4] - t[1], e1z = t[5] - t[2];
    const e2x = t[6] - t[0], e2y = t[7] - t[1], e2z = t[8] - t[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    for (let v = 0; v < 3; v++) {
      const o = (ti * 3 + v) * 3;
      pos[o] = t[v * 3]; pos[o + 1] = t[v * 3 + 1]; pos[o + 2] = t[v * 3 + 2];
      nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      col[o] = r; col[o + 1] = g; col[o + 2] = b;
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3, true));
  geo.setAttribute('aGem', new THREE.BufferAttribute(gem, 1));
  return geo;
}

/** Camera-facing ribbon along a cubic bezier (antennae, silk). */
function buildRibbonGeometry(samples) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((samples - 1) * 2 * 9), 3).setUsage(THREE.DynamicDrawUsage));
  return geo;
}

function updateRibbonGeometry(geo, ctrl, samples, width) {
  const pos = geo.attributes.position.array;
  const hw = width / 2;
  let o = 0;
  for (let s = 0; s < samples - 1; s++) {
    const t0 = s / (samples - 1), t1 = (s + 1) / (samples - 1);
    bez3(ctrl, t0, _b0); bez3(ctrl, t1, _b1);
    let dx = _b1[0] - _b0[0], dy = _b1[1] - _b0[1];
    const dl = Math.hypot(dx, dy) || 1;
    const px = (-dy / dl) * hw, py = (dx / dl) * hw;
    pos[o++] = _b0[0] + px; pos[o++] = _b0[1] + py; pos[o++] = _b0[2];
    pos[o++] = _b0[0] - px; pos[o++] = _b0[1] - py; pos[o++] = _b0[2];
    pos[o++] = _b1[0] + px; pos[o++] = _b1[1] + py; pos[o++] = _b1[2];
    pos[o++] = _b0[0] - px; pos[o++] = _b0[1] - py; pos[o++] = _b0[2];
    pos[o++] = _b1[0] - px; pos[o++] = _b1[1] - py; pos[o++] = _b1[2];
    pos[o++] = _b1[0] + px; pos[o++] = _b1[1] + py; pos[o++] = _b1[2];
  }
  geo.attributes.position.needsUpdate = true;
}
const _b0 = new Float64Array(3), _b1 = new Float64Array(3);

function bez3(c, t, out) {
  const mt = 1 - t;
  const w0 = mt * mt * mt, w1 = 3 * mt * mt * t, w2 = 3 * mt * t * t, w3 = t * t * t;
  out[0] = w0 * c[0] + w1 * c[3] + w2 * c[6] + w3 * c[9];
  out[1] = w0 * c[1] + w1 * c[4] + w2 * c[7] + w3 * c[10];
  out[2] = w0 * c[2] + w1 * c[5] + w2 * c[8] + w3 * c[11];
}

// ---------------------------------------------------------------------------
// 7. INIT / RENDER SHELL
// ---------------------------------------------------------------------------

export function init(stage, opts = {}) {
  const onLive = opts.onLive || (() => {});
  const onFallback = opts.onFallback || (() => {});
  const noop = { replay() {}, destroy() {}, setQuality() {} };

  // --- Gates: the poster is the fallback state -----------------------------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) { onFallback('reduced-motion'); return noop; }
  if (navigator.connection && navigator.connection.saveData) { onFallback('save-data'); return noop; }
  if (navigator.deviceMemory && navigator.deviceMemory < 2) { onFallback('low-memory'); return noop; }
  const probe = document.createElement('canvas');
  const glProbe = probe.getContext('webgl2');
  if (!glProbe) { onFallback('no-webgl2'); return noop; }
  const lose = glProbe.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();

  // --- Renderer: opaque cream, byte-exact against the page background ------
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const dprCap = coarse ? 1.5 : 2;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (e) { onFallback('webgl-init-failed'); return noop; }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xfaf7f2, 1);               // exact: ColorManagement off
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.pointerEvents = 'none';
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -60, 60);
  camera.position.set(150, VIEW_CY, 0);

  // --- Materials ------------------------------------------------------------
  const crystalMat = new THREE.ShaderMaterial({
    vertexShader: crystalVert,
    fragmentShader: crystalFrag,
    uniforms: {
      uTime: { value: 0 },
      uSweep: { value: -1000 },
      uConsolidate: { value: 0 },
      uExcite: { value: 1 },
      uDispersion: { value: 1 },
    },
    side: THREE.DoubleSide,
  });
  const antMat = new THREE.ShaderMaterial({
    vertexShader: flatVert, fragmentShader: flatFrag,
    uniforms: { uColor: { value: new THREE.Vector3(13 / 255, 88 / 255, 34 / 255) }, uOpacity: { value: 0.7 } },
    transparent: true, depthWrite: false,
  });
  const silkMat = new THREE.ShaderMaterial({
    vertexShader: flatVert, fragmentShader: flatFrag,
    uniforms: { uColor: { value: new THREE.Vector3(13 / 255, 88 / 255, 34 / 255) }, uOpacity: { value: 0 } },
    transparent: true, depthWrite: false,
  });
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: shadowVert, fragmentShader: shadowFrag,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true, depthWrite: false,
  });

  // --- Meshes ----------------------------------------------------------------
  const wingGeo = buildWingGeometry();
  const wingMesh = new THREE.Mesh(wingGeo, crystalMat);
  wingMesh.frustumCulled = false;
  scene.add(wingMesh);

  const bodyGeo = buildBodyGeometry();
  const bodyMesh = new THREE.Mesh(bodyGeo, crystalMat);
  bodyMesh.frustumCulled = false;
  scene.add(bodyMesh);

  const headGeo = buildGemGeometry(HEAD.r, PAL.ember);
  const headMesh = new THREE.Mesh(headGeo, crystalMat);
  scene.add(headMesh);

  const tipGeo = buildGemGeometry(TIP_R, PAL.vivid);
  const tipL = new THREE.Mesh(tipGeo, crystalMat);
  const tipR = new THREE.Mesh(tipGeo, crystalMat);
  scene.add(tipL, tipR);

  const antGeoL = buildRibbonGeometry(ANT_SAMPLES);
  const antGeoR = buildRibbonGeometry(ANT_SAMPLES);
  const antMeshL = new THREE.Mesh(antGeoL, antMat);
  const antMeshR = new THREE.Mesh(antGeoR, antMat);
  antMeshL.frustumCulled = antMeshR.frustumCulled = false;
  antMeshL.renderOrder = antMeshR.renderOrder = 2;
  scene.add(antMeshL, antMeshR);

  const silkGeo = buildRibbonGeometry(ANT_SAMPLES);
  const silkMesh = new THREE.Mesh(silkGeo, silkMat);
  silkMesh.frustumCulled = false;
  silkMesh.renderOrder = 1;
  scene.add(silkMesh);

  const shadowGeo = new THREE.PlaneGeometry(170, 26);
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.renderOrder = 0;
  shadowMesh.position.set(0, GROUND_Y - 3, -30);
  scene.add(shadowMesh);

  // --- Rig --------------------------------------------------------------------
  const rig = createRig();
  // Start at rest when the host asks (e.g. to hold the finished mark and
  // play the arc later via replay()), or on slow loads so the poster→canvas
  // swap doesn't regress butterfly→caterpillar. Fresh fast loads play the
  // full arc immediately unless startAtRest is set.
  const fresh = performance.now() < 2500;
  const startAtRest = opts.startAtRest === true || !fresh;
  resetRig(rig, startAtRest);

  // --- Sizing -------------------------------------------------------------------
  // Framing controls (all optional; defaults reproduce the original full-frame
  // centred mark). The mark spans design 0..300 wide, 0..280 tall.
  //   markPx: target on-screen mark WIDTH in CSS px. The frustum zooms so the
  //     300-unit mark renders at exactly this width, however wide the canvas
  //     box is. Lets a wide box (crawl room) hold a small resting mark.
  //   markRightPx: distance in CSS px from the canvas RIGHT edge to the mark's
  //     right edge. With markPx this fully places the mark; the extra canvas
  //     to the left renders opaque cream (= page bg) and is invisible.
  const markPx = opts.markPx > 0 ? opts.markPx : 0;
  const markRightPx = typeof opts.markRightPx === 'number' ? opts.markRightPx : 0;
  let tier = 0;
  function applySize() {
    const w = stage.clientWidth || 640, h = stage.clientHeight || 460;
    const tierScale = tier === 0 ? 1 : tier === 1 ? 0.8 : 0.66;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap) * tierScale);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    let hw, viewH;
    if (markPx > 0) {
      // px per design unit so the 300-wide mark == markPx on screen
      const pxPerUnit = markPx / 300;
      hw = (w / 2) / pxPerUnit;                 // half frustum width, design units
      viewH = h / pxPerUnit;                    // frustum height matches box aspect
      // mark right edge (design x=300) should sit markRightPx from canvas right;
      // canvas right maps to camera.right (relative to camera at x=150).
      const rightUnits = markRightPx / pxPerUnit;   // gap in design units
      camera.right = 150 + rightUnits;
      camera.left = camera.right - 2 * hw;
      camera.top = viewH / 2; camera.bottom = -viewH / 2;
    } else {
      const aspect = w / h;
      hw = (VIEW_H * aspect) / 2;
      camera.left = -hw; camera.right = hw;
      camera.top = VIEW_H / 2; camera.bottom = -VIEW_H / 2;
      viewH = VIEW_H;
    }
    camera.updateProjectionMatrix();
  }
  applySize();
  const ro = new ResizeObserver(() => applySize());
  ro.observe(stage);

  // --- Loop ------------------------------------------------------------------
  let raf = 0, running = false, visible = false, pageVisible = !document.hidden;
  let last = 0, acc = 0, emaFrame = 16, badFrames = 0, presented = false, dead = false;
  const perf = { phys: 0, geom: 0, render: 0, n: 0 };   // EMA-free budget probes
  const silkCtrl = new Float32Array(12);
  const antCtrl = new Float32Array(12);

  function frame(now) {
    raf = 0;
    if (!running) return;
    const rawDt = last ? (now - last) / 1000 : PHYS_DT * 2;
    last = now;
    const dt = Math.min(rawDt, 0.05);

    // fixed-substep physics
    const tp0 = performance.now();
    const stepSize = tier >= 2 ? PHYS_DT * 2 : PHYS_DT;
    acc = Math.min(acc + dt, stepSize * 5);
    while (acc >= stepSize) { stepRig(rig, stepSize); acc -= stepSize; }
    const tp1 = performance.now();

    // post-spring display transforms (exact at zero crossings, 0 when off)
    const resting = rig.phase === PHASE.REST;
    const unfurl = rig.phase === PHASE.UNFURL || resting;
    let breatheL = 0, breatheR = 0, tremL = 0, tremR = 0;
    if (unfurl) {
      const bt = rig.time * (Math.PI * 2 / 4.2);
      const bAmp = BREATHE_AMP * (resting ? 1 : clamp01(rig.tPhase - 2.2));
      breatheL = breatheShape(bt) * bAmp;
      breatheR = breatheShape(bt + 0.35) * bAmp;
      if (rig.tremorOn) {
        const aL = clamp01(Math.abs(rig.pressL.v) / 1.5) * 0.017;
        const aR = clamp01(Math.abs(rig.pressR.v) / 1.5) * 0.017;
        tremL = (noise1(rig.time * 4) + 0.5 * noise1(rig.time * 7 + 31)) * aL;
        tremR = (noise1(rig.time * 4 + 57) + 0.5 * noise1(rig.time * 7 + 83)) * aR;
      }
    }

    updateWingGeometry(wingGeo, rig, breatheL, breatheR, tremL, tremR);
    updateBodyGeometry(bodyGeo, rig);
    headMesh.position.set(rig.head.pos[0], rig.head.pos[1], rig.head.pos[2]);

    // antennae: sprung control points → ribbons; tips ride the ends
    for (let side = 0; side < 2; side++) {
      const A = side === 0 ? rig.ant[0] : rig.ant[1];
      for (let cp = 0; cp < 4; cp++) {
        antCtrl[cp * 3] = A.pos[cp * 3];
        antCtrl[cp * 3 + 1] = A.pos[cp * 3 + 1];
        antCtrl[cp * 3 + 2] = A.pos[cp * 3 + 2];
      }
      updateRibbonGeometry(side === 0 ? antGeoL : antGeoR, antCtrl, ANT_SAMPLES, ANT_WIDTH);
      const tip = side === 0 ? tipL : tipR;
      tip.position.set(A.pos[9], A.pos[10] + 1, 3.0);
    }
    // idle: the faintest antenna sway at rest, applied to tips + last ctrl
    if (resting) {
      const sway = noise1(rig.time * 0.5) * 0.9;
      tipL.position.x += sway; tipR.position.x += sway;
    }

    // silk: from the head area up to the anchor
    if (rig.silkA > 0.003) {
      silkMesh.visible = true;
      const hx = rig.head.pos[0], hy = rig.head.pos[1] + 4;
      const ex = lerp(hx, SILK_ANCHOR.x, rig.silkLen), ey = lerp(hy, SILK_ANCHOR.y, rig.silkLen);
      silkCtrl[0] = hx; silkCtrl[1] = hy; silkCtrl[2] = -6;
      silkCtrl[3] = lerp(hx, ex, 0.4); silkCtrl[4] = lerp(hy, ey, 0.36); silkCtrl[5] = -6;
      silkCtrl[6] = lerp(hx, ex, 0.72); silkCtrl[7] = lerp(hy, ey, 0.7); silkCtrl[8] = -6;
      silkCtrl[9] = ex; silkCtrl[10] = ey; silkCtrl[11] = -6;
      updateRibbonGeometry(silkGeo, silkCtrl, ANT_SAMPLES, 1.4);
      silkMat.uniforms.uOpacity.value = rig.silkA;
    } else silkMesh.visible = false;

    // shadow under the crawling body
    if (rig.shadowA > 0.003) {
      shadowMesh.visible = true;
      shadowMesh.position.x = (rig.gait.headS + rig.gait.tailS) / 2;
      shadowMat.uniforms.uOpacity.value = rig.shadowA;
    } else shadowMesh.visible = false;

    // uniforms
    crystalMat.uniforms.uTime.value = rig.time;
    crystalMat.uniforms.uConsolidate.value = rig.consolidate;
    crystalMat.uniforms.uExcite.value = rig.excite;
    crystalMat.uniforms.uDispersion.value = tier < 2 ? 1 : 0;
    if (tier < 3) {
      // light-shift: 2.2s traverse each 7s cycle, parked exactly between
      const ct = rig.time % 7;
      crystalMat.uniforms.uSweep.value = ct < 2.2 ? lerp(-60, 460, ct / 2.2) : -1000;
    } else crystalMat.uniforms.uSweep.value = -1000;

    const tp2 = performance.now();
    renderer.render(scene, camera);
    const tp3 = performance.now();
    perf.phys += tp1 - tp0; perf.geom += tp2 - tp1; perf.render += tp3 - tp2; perf.n++;

    // reveal one frame AFTER the first presented frame
    if (!presented) { presented = true; requestAnimationFrame(() => onLive()); }

    // Adaptive quality: gaps ≥ 80ms are browser scheduling (occlusion
    // throttling, background windows), not GPU load — never count them,
    // or a backgrounded tab on a fast machine demotes itself to poster.
    const gapMs = rawDt * 1000;
    if (gapMs < 80) {
      emaFrame = emaFrame * 0.95 + gapMs * 0.05;
      if (emaFrame > 21) { if (++badFrames > 90) { badFrames = 0; stepDown(); } }
      else badFrames = 0;
    }

    raf = requestAnimationFrame(frame);
  }

  function stepDown() {
    tier++;
    if (tier >= 4) { stop(); dead = true; onFallback('perf'); return; }
    if (tier <= 2) applySize();
    rig.tremorOn = tier < 3;
    emaFrame = 16;
  }

  function start() {
    if (running || dead) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function maybeRun() { if (visible && pageVisible) start(); else stop(); }

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting; maybeRun();
  }, { threshold: 0.05 });
  io.observe(stage);
  const onVis = () => { pageVisible = !document.hidden; maybeRun(); };
  document.addEventListener('visibilitychange', onVis);
  const onReduce = () => { if (reduced.matches) { api.destroy(); onFallback('reduced-motion'); } };
  reduced.addEventListener('change', onReduce);
  const onLost = (e) => { e.preventDefault(); stop(); dead = true; onFallback('context-lost'); };
  canvas.addEventListener('webglcontextlost', onLost);

  // --- Public API ---------------------------------------------------------------
  const api = {
    /** Current movement + seconds into it. phase: 0 crawl, 1 gather,
        2 chrysalis, 3 unfurl, 4 rest. For host-side choreography (the
        code snippet derives its text from this, never from wall clock). */
    phaseInfo() { return { phase: rig.phase, tPhase: rig.tPhase, time: rig.time }; },
    replay() {
      if (dead) return;
      canvas.style.transition = 'opacity 200ms ease-in-out';
      canvas.style.opacity = '0';
      setTimeout(() => {
        resetRig(rig, false);
        canvas.style.opacity = '';
      }, 220);
    },
    setQuality(t) { tier = clamp(t, 0, 3); applySize(); rig.tremorOn = tier < 3; },
    destroy() {
      stop(); dead = true;
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduced.removeEventListener('change', onReduce);
      canvas.removeEventListener('webglcontextlost', onLost);
      [wingGeo, bodyGeo, headGeo, tipGeo, antGeoL, antGeoR, silkGeo, shadowGeo].forEach((g) => g.dispose());
      [crystalMat, antMat, silkMat, shadowMat].forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      canvas.remove();
    },
    _rig: rig,                                        // test hook
    _state() {
      const n = perf.n || 1;
      return { tier, dead, running, visible, pageVisible, emaFrame,
        msPhys: perf.phys / n, msGeom: perf.geom / n, msRender: perf.render / n };
    },
    _parkIdles() {                                    // test hook: exactness CI
      rig.phase = PHASE.REST; rig.tPhase = 10;
      targetsButterfly(rig, PHYS_DT, 10, true);
      rig.corners.snap(); rig.body.snap(); rig.head.snap();
      rig.ant[0].snap(); rig.ant[1].snap();
      rig.excite = 0; rig.time = 3.0;                 // sweep parked at 3.0s
    },
  };
  return api;
}
