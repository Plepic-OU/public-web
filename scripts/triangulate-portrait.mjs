#!/usr/bin/env node
/**
 * Crystalline portrait pipeline for the living tabletop cards.
 *
 * Turns a photograph into a low-poly SVG whose facet language is the
 * butterfly's: the person keeps the photo's own colours, and everything the
 * source treats as background becomes a shard from the green palette, so the
 * card art reads as the same crystal as the mark. Offline and deterministic:
 * the SVGs are generated once, committed, and served as plain `<img>` files.
 * Nothing here ships to the browser.
 *
 * Usage:
 *   node scripts/triangulate-portrait.mjs --in images/joosep.png \
 *        --out images/portraits/joosep.svg
 *
 * Flags, with the defaults that were used unless a generated file's own
 * header comment says otherwise:
 *   --in           source image, any format sharp reads       (required)
 *   --out          destination .svg                           (required)
 *   --points       points sampled inside the square           (default 700)
 *   --seed         PRNG seed; the only source of randomness   (default 20260906)
 *   --edge-weight  share of --points drawn by the edge-weighted sampler,
 *                  the rest being a uniform fill              (default 0.72)
 *   --size         working resolution in pixels               (default 800)
 *
 * The same flags always produce byte-identical output: every random draw comes
 * from a seeded mulberry32, `Math.random` is never called, and every scan of
 * the pixel buffer walks a fixed stride. Each generated file records the exact
 * flags in a comment, so a portrait can be regenerated without guesswork.
 *
 * File size is a straight line through --points: a point costs two facets and
 * a facet costs about 69 bytes, so the default 700 lands near 95 KB and misses
 * the 90 KB budget the cards hold assets to. Every portrait therefore ships at
 * a lowered --points that its own header records. Read the flags from the file
 * being replaced, never from the defaults here.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import Delaunator from 'delaunator';

const DEFAULTS = {
  points: 700,
  seed: 20260906,
  edgeWeight: 0.72,
  size: 800,
};

// The output viewBox. Fixed at 400 because the card's art window reserves a
// 400x400 box in CSS; the working size is independent of it.
const VIEW = 400;

// Background detection. A pixel is background when it is transparent, or when
// it is near-white, low-saturation AND connected to the image border (see
// buildBackgroundMask for why connectivity carries the weight here).
const ALPHA_BG = 16;
const WHITE_MEAN = 195;
const WHITE_DELTA = 32;
// A source counts as a cut-out, and is masked by alpha alone, once this much
// of it is transparent.
const CUTOUT_TRANSPARENT_FRACTION = 0.05;
// A triangle is background when this share of its sampled pixels is masked.
// Above a half so a facet that straddles the silhouette keeps the person's
// colour, which reads as a cleaner edge than a shard biting into a shoulder.
const BG_FRACTION = 0.55;

// Sobel magnitudes are clipped at this percentile, taken over the subject
// alone, before they become sampling weights. Clipping at the maximum instead
// spends the whole budget on the silhouette, which is a far stronger gradient
// than an eye, and leaves the face a flat blob. Below the ninetieth the
// clothing folds start to saturate and compete with the features.
const EDGE_CLIP_PERCENTILE = 0.92;
// Minimum spacing between points, as a fraction of the mean spacing an even
// distribution would have. Edge-weighted sampling otherwise stacks a dozen
// points on one jaw line and triangulates them into unusable slivers.
const MIN_DIST_FACTOR = 0.5;
// The spacing is not constant, because a portrait's information is not evenly
// spread. Two thirds of the frame is backdrop that carries nothing, and at one
// flat spacing it takes two thirds of the budget while an eye, about 40
// working pixels wide, gets two points and the face reads as a blob. So the
// minimum distance is multiplied: BG_SPACING behind the subject, FLAT_SPACING
// over a plain cheek or a shirt, falling to FEATURE_SPACING as the edge
// magnitude rises. Every point the backdrop does not need is spent on a face.
const BG_SPACING = 4.4;
const FLAT_SPACING = 1.45;
const FEATURE_SPACING = 0.35;
// Attempts per wanted point before the sampler gives up. Rejection sampling
// has no upper bound on its own, and a portrait with very little edge energy
// would otherwise spin.
const MAX_ATTEMPTS_PER_POINT = 240;

// Pixels read per triangle. Enough for a stable mean, capped so one background
// facet spanning half the image does not scan a quarter of a million pixels.
const MAX_TRIANGLE_SAMPLES = 2048;

// Facets grow by this much, in viewBox units, away from their own centroid, so
// that every pair of neighbours overlaps slightly. Two triangles that share an
// edge exactly are antialiased independently on each side of it, and the two
// coverages do not sum to one, so the page shows through as a hairline seam
// along every shared edge. 0.4 of a 400-unit viewBox is a quarter of a pixel
// at the card's render size, invisible, and still enough at 400.
const EXPAND = 0.4;

// Shard palette, canon greens from design-system.html section 3, with the
// proportions from the spec: --green-light 40, --green-surface 30,
// --green-brand 15, --green-dark 10, --green-vivid 5.
const SHARDS = [
  { hex: '#c5f6d3', weight: 40 },
  { hex: '#edfcf1', weight: 30 },
  { hex: '#137b30', weight: 15 },
  { hex: '#0d5822', weight: 10 },
  { hex: '#00c638', weight: 5 },
];

/** Seeded PRNG. Same seed, same sequence, on every machine and every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Position-keyed hash. A triangle's shard must not depend on the order the
 * triangulation happened to emit it in, so the shard is picked from the
 * centroid, quantised to whole working pixels before hashing so that neither
 * the expansion nor the scale to the viewBox can change the answer.
 */
function hashPosition(seed, x, y) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (x + 0x165667b1), 0xc2b2ae35);
  h = Math.imul(h ^ (y + 0x27d4eb2f), 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function shardFor(seed, cx, cy) {
  const total = SHARDS.reduce((sum, s) => sum + s.weight, 0);
  let pick = hashPosition(seed, Math.round(cx), Math.round(cy)) * total;
  for (const shard of SHARDS) {
    pick -= shard.weight;
    if (pick < 0) return shard.hex;
  }
  return SHARDS[SHARDS.length - 1].hex;
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS, in: null, out: null };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--in') opts.in = value;
    else if (flag === '--out') opts.out = value;
    else if (flag === '--points') opts.points = Number(value);
    else if (flag === '--seed') opts.seed = Number(value);
    else if (flag === '--edge-weight') opts.edgeWeight = Number(value);
    else if (flag === '--size') opts.size = Number(value);
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!opts.in || !opts.out) throw new Error('--in and --out are required');
  if (!(opts.edgeWeight >= 0 && opts.edgeWeight <= 1)) throw new Error('--edge-weight must be 0..1');
  return opts;
}

/**
 * Square crop centred on head and shoulders, then the working resolution.
 *
 * `cover` with `position: 'top'` keeps the top of the frame, which is where a
 * head-and-shoulders portrait puts the head; it is a no-op on the three square
 * sources and takes the upper 500 of kaido.png's 568 rows. sharp's `attention`
 * strategy would crop better in theory, but its saliency model is free to
 * change with libvips, and a crop that moves on an upgrade breaks the promise
 * that the same flags regenerate the same file.
 */
async function loadPixels(file, size) {
  const { data, info } = await sharp(readFileSync(file))
    .resize(size, size, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/**
 * One background mask per image, built before anything is sampled.
 *
 * The spec calls background "mostly transparent OR mostly near-white with low
 * saturation". Read as an unconditional OR it dissolves the subject twice
 * over: kaido.png is 21.4% opaque near-white, all of it the white shirt, and a
 * near-white threshold loose enough to catch kaido.jpg's off-white corner at
 * 213,189,187 (delta 26) also catches a lit forehead. So the two tests are
 * kept, and each is applied where it is the one that knows the answer:
 *
 *  - A cut-out states its background exactly in the alpha channel. Use it, and
 *    nothing else, so the white shirt stays a shirt.
 *  - An opaque photograph has no such statement, so the near-white test stands
 *    in, restricted to what a flood fill can reach from the image border. That
 *    border connectivity is what keeps interior highlights, a white collar and
 *    the white of a badge out of the mask.
 */
function buildBackgroundMask(pixels) {
  const { data, width, height, channels } = pixels;
  const count = width * height;
  const mask = new Uint8Array(count);

  let transparent = 0;
  for (let i = 0; i < count; i += 1) if (data[i * channels + 3] < ALPHA_BG) transparent += 1;

  if (transparent / count > CUTOUT_TRANSPARENT_FRACTION) {
    for (let i = 0; i < count; i += 1) mask[i] = data[i * channels + 3] < ALPHA_BG ? 1 : 0;
    return { mask, kind: 'alpha', coverage: transparent / count };
  }

  const isPaper = (i) => {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (r + g + b) / 3 >= WHITE_MEAN && max - min <= WHITE_DELTA;
  };

  // Breadth-first from every paper-coloured border pixel. A plain stack of
  // indices is enough; the mask itself is the visited set.
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (mask[i] || !isPaper(i)) return;
    mask[i] = 1;
    queue[tail] = i;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head];
    head += 1;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (y > 0) push(i - width);
    if (y < height - 1) push(i + width);
  }

  let covered = 0;
  for (let i = 0; i < count; i += 1) covered += mask[i];
  return { mask, kind: 'flood', coverage: covered / count };
}

/**
 * Sobel magnitude over the greyscale, used as the sampling weight.
 *
 * Masked pixels are read as paper white rather than as their own colour: the
 * RGB under a transparent pixel is undefined and is black in both cut-outs, so
 * leaving it in would put the strongest gradient in the image around the
 * silhouette and nowhere else. Flattening the background to white gives the
 * cut-outs the same silhouette gradient a white-background photograph has.
 */
function edgeMagnitude(pixels, mask) {
  const { data, width, height, channels } = pixels;
  const grey = new Float32Array(width * height);
  for (let i = 0; i < grey.length; i += 1) {
    if (mask[i]) {
      grey[i] = 255;
      continue;
    }
    const o = i * channels;
    grey[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }

  const mag = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const tl = grey[i - width - 1];
      const tc = grey[i - width];
      const tr = grey[i - width + 1];
      const ml = grey[i - 1];
      const mr = grey[i + 1];
      const bl = grey[i + width - 1];
      const bc = grey[i + width];
      const br = grey[i + width + 1];
      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl);
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr);
      mag[i] = Math.hypot(gx, gy);
    }
  }

  // Clip at a percentile of the subject's own gradients, not at the maximum
  // and not over the whole frame: two thirds of these images are flat backdrop
  // whose zeros would drag any percentile down. Sorting is a few milliseconds
  // on a few hundred thousand floats and happens once per portrait.
  const subject = Float32Array.from(mag.filter((_, i) => !mask[i])).sort();
  const clip = subject[Math.floor((subject.length - 1) * EDGE_CLIP_PERCENTILE)] || 1;
  // The backdrop is weighted to zero rather than to its own gradient. A
  // silhouette reads from the subject side alone, and points spent on the
  // outside of it are points not spent on a face.
  for (let i = 0; i < mag.length; i += 1) mag[i] = mask[i] ? 0 : Math.min(1, mag[i] / clip);
  return mag;
}

/**
 * The point set: edge-weighted samples, a uniform fill, then the eight fixed
 * points that pin the square. The fill is what keeps a flat cheek or a flat
 * background from being one enormous facet; the fixed points are what keeps
 * the triangulation's convex hull equal to the frame, so no corner is left
 * uncovered.
 */
function samplePoints(mag, mask, opts, rand) {
  const { size, points, edgeWeight } = opts;
  const wanted = Math.max(0, Math.round(points));
  const wantedEdge = Math.round(wanted * edgeWeight);
  const wantedFill = wanted - wantedEdge;

  const minDist = MIN_DIST_FACTOR * Math.sqrt((size * size) / Math.max(1, wanted));
  const radiusAt = (i) => {
    if (mask[i]) return minDist * BG_SPACING;
    return minDist * (FLAT_SPACING - (FLAT_SPACING - FEATURE_SPACING) * mag[i]);
  };

  // Buckets are one largest-radius wide, so a candidate's whole exclusion disc
  // is inside the nine buckets around it however small its own radius is.
  const cell = Math.max(1, minDist * BG_SPACING);
  const cols = Math.ceil(size / cell) + 1;
  const grid = new Map();

  const accepted = [];
  const radii = [];
  const farEnough = (x, y, radius) => {
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const bucket = grid.get((gy + dy) * cols + (gx + dx));
        if (!bucket) continue;
        for (const j of bucket) {
          const p = accepted[j];
          // The larger of the two radii wins, so a dense feature point never
          // lands inside a sparse background point's disc.
          if (Math.hypot(p[0] - x, p[1] - y) < Math.max(radius, radii[j])) return false;
        }
      }
    }
    return true;
  };
  const keep = (x, y, radius) => {
    const key = Math.floor(y / cell) * cols + Math.floor(x / cell);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(accepted.length);
    accepted.push([x, y]);
    radii.push(radius);
  };

  const indexOf = (x, y) =>
    Math.min(size - 1, Math.floor(y)) * size + Math.min(size - 1, Math.floor(x));

  let attempts = wantedEdge * MAX_ATTEMPTS_PER_POINT;
  let taken = 0;
  while (taken < wantedEdge && attempts > 0) {
    attempts -= 1;
    const x = rand() * size;
    const y = rand() * size;
    const i = indexOf(x, y);
    // The clipped magnitude is the acceptance probability directly. The
    // uniform fill already answers for flat areas, so this pass is left to
    // concentrate on the features that carry a likeness.
    if (rand() > mag[i]) continue;
    const radius = radiusAt(i);
    if (!farEnough(x, y, radius)) continue;
    keep(x, y, radius);
    taken += 1;
  }

  attempts = wantedFill * MAX_ATTEMPTS_PER_POINT;
  taken = 0;
  while (taken < wantedFill && attempts > 0) {
    attempts -= 1;
    const x = rand() * size;
    const y = rand() * size;
    const i = indexOf(x, y);
    const radius = radiusAt(i);
    if (!farEnough(x, y, radius)) continue;
    keep(x, y, radius);
    taken += 1;
  }

  const half = size / 2;
  for (const fixed of [
    [0, 0], [half, 0], [size, 0], [size, half],
    [size, size], [half, size], [0, size], [0, half],
  ]) {
    accepted.push(fixed);
  }
  return accepted;
}

/**
 * Mean colour of the pixels a triangle covers, and how much of it is
 * background. Both come from one strided walk of the bounding box: the stride
 * grows with the triangle so a large facet costs no more reads than a small
 * one. Masked pixels are counted but never averaged, because the RGB behind a
 * transparent pixel is black and would drag the mean of any facet that
 * straddles the silhouette towards a bruise.
 */
function triangleFill(pixels, mask, tri, seed) {
  const { data, width, height, channels } = pixels;
  const [ax, ay] = tri[0];
  const [bx, by] = tri[1];
  const [cx, cy] = tri[2];

  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
  const box = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
  const stride = Math.max(1, Math.ceil(Math.sqrt(box / MAX_TRIANGLE_SAMPLES)));

  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  const inside = (x, y) => {
    if (area === 0) return false;
    const w0 = ((bx - ax) * (y - ay) - (x - ax) * (by - ay)) / area;
    const w1 = ((cx - bx) * (y - by) - (x - bx) * (cy - by)) / area;
    const w2 = ((ax - cx) * (y - cy) - (x - cx) * (ay - cy)) / area;
    return w0 >= 0 && w1 >= 0 && w2 >= 0;
  };

  let seen = 0;
  let masked = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  let lit = 0;
  for (let y = minY; y <= maxY; y += stride) {
    for (let x = minX; x <= maxX; x += stride) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const i = y * width + x;
      seen += 1;
      if (mask[i]) {
        masked += 1;
        continue;
      }
      const o = i * channels;
      r += data[o];
      g += data[o + 1];
      b += data[o + 2];
      lit += 1;
    }
  }

  // A sliver thinner than the stride can miss every sample point; its centroid
  // is inside it by definition, so read that one pixel instead.
  if (seen === 0) {
    const px = Math.min(width - 1, Math.max(0, Math.round((ax + bx + cx) / 3)));
    const py = Math.min(height - 1, Math.max(0, Math.round((ay + by + cy) / 3)));
    const i = py * width + px;
    seen = 1;
    if (mask[i]) masked = 1;
    else {
      const o = i * channels;
      r = data[o];
      g = data[o + 1];
      b = data[o + 2];
      lit = 1;
    }
  }

  if (lit === 0 || masked / seen >= BG_FRACTION) {
    return {
      hex: shardFor(seed, (ax + bx + cx) / 3, (ay + by + cy) / 3),
      background: true,
    };
  }
  const hex = `#${[r / lit, g / lit, b / lit]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;
  return { hex, background: false };
}

/** One decimal, with the decimal point dropped when it would read `.0`. */
const round1 = (v) => String(Math.round(v * 10) / 10);

/** Push each vertex EXPAND units away from the triangle's own centroid. */
function expand(tri) {
  const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
  const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
  return tri.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy);
    if (d === 0) return [x, y];
    const k = (d + EXPAND) / d;
    return [cx + (x - cx) * k, cy + (y - cy) * k];
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const rand = mulberry32(opts.seed);

  const pixels = await loadPixels(opts.in, opts.size);
  const { mask, kind, coverage } = buildBackgroundMask(pixels);
  const mag = edgeMagnitude(pixels, mask);
  const points = samplePoints(mag, mask, opts, rand);

  const delaunay = Delaunator.from(points);
  const scale = VIEW / opts.size;

  const body = [];
  let shards = 0;
  for (let t = 0; t < delaunay.triangles.length; t += 3) {
    const tri = [
      points[delaunay.triangles[t]],
      points[delaunay.triangles[t + 1]],
      points[delaunay.triangles[t + 2]],
    ];
    const { hex, background } = triangleFill(pixels, mask, tri, opts.seed);
    if (background) shards += 1;
    const pts = expand(tri.map(([x, y]) => [x * scale, y * scale]))
      .map(([x, y]) => `${round1(x)},${round1(y)}`)
      .join(' ');
    body.push(`<polygon points="${pts}" fill="${hex}"/>`);
  }

  // The flags are recorded without their leading dashes because XML forbids a
  // double hyphen inside a comment: written as typed, the header would make
  // the whole file a parse error and the `<img>` would render nothing.
  const flags = [
    `in=${opts.in}`,
    `out=${opts.out}`,
    `points=${opts.points}`,
    `seed=${opts.seed}`,
    `edge-weight=${opts.edgeWeight}`,
    `size=${opts.size}`,
  ].join(' ');
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Generated by scripts/triangulate-portrait.mjs, do not edit by hand.',
    '     Regenerate byte-identically by passing these flags, each dash-dash prefixed:',
    `     ${flags}`,
    `     ${body.length} facets, ${shards} of them shard background. -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${VIEW}" height="${VIEW}" shape-rendering="geometricPrecision">`,
    ...body,
    '</svg>',
    '',
  ].join('\n');

  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, svg);
  const kb = (Buffer.byteLength(svg) / 1024).toFixed(1);
  console.log(
    `${opts.out}: ${points.length} points, ${body.length} facets, ${shards} shards, ` +
      `mask ${kind} ${(coverage * 100).toFixed(1)}%, ${kb} KB`
  );
}

main().catch((err) => {
  console.error(`triangulate-portrait: ${err.message}`);
  process.exit(1);
});
