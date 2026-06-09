/**
 * Video Publishing Pipeline
 *
 * Single-file pipeline that takes a raw video (iPhone vlog or Mac screen-recorded
 * tutorial), transcribes it, removes filler words and long pauses, generates
 * SEO-ready metadata and a thumbnail, and publishes to YouTube + prepares a
 * LinkedIn handoff folder. Sub-project 2 of the YouTube automation spec.
 *
 * Usage:
 *   npx ts-node scripts/video-publish.ts ~/Documents/plepic-video/inbox/IMG_1234.MOV
 *   npx ts-node scripts/video-publish.ts <file> --interactive   (pause between phases)
 *   npx ts-node scripts/video-publish.ts <file> --plan <path>   (explicit W11 plan)
 *   npx ts-node scripts/video-publish.ts <file> --dry-run       (skip YT upload)
 *   npx ts-node scripts/video-publish.ts <file> --unlisted      (upload as unlisted)
 *   npx ts-node scripts/video-publish.ts <file> --force         (override idempotency; archive prior workdir)
 *   npx ts-node scripts/video-publish.ts <file> --no-captions   (skip caption burn-in)
 *   npx ts-node scripts/video-publish.ts <file> --thumbnail-time 2047   (grab thumbnail frame at 2047s)
 *   npx ts-node scripts/video-publish.ts <file> --captions-only (reuse existing workdir; re-burn captions + end card only)
 *   npx ts-node scripts/video-publish.ts <file> --no-open       (suppress VLC preview at end)
 *   npx ts-node scripts/video-publish.ts --clean                (archive workdirs older than 7 days; no source file needed)
 *
 * Mock mode env switches (for contract tests + offline iteration):
 *   WHISPER_MOCK=1         read transcript from _fixtures/mock-responses/transcript.json
 *   CLAUDE_MOCK=1          read metadata from _fixtures/mock-responses/metadata.json
 *   CLAUDE_CHUNK_MOCK=1    read cue chunks from _fixtures/mock-responses/cue-chunks.json
 *   YT_MOCK=1              skip the YouTube upload, emit a fake video id
 *   LI_MOCK=1              prepareLinkedIn writes a minimal folder without trim
 *
 * Requires: ffmpeg + ffprobe on PATH (with drawtext, subtitles, silencedetect),
 * OPENAI_API_KEY, ANTHROPIC_API_KEY, YT_* env vars.
 */

import "dotenv/config";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";
import { execFileSync, spawnSync } from "child_process";
import { google, youtube_v3 } from "googleapis";

// ---------- constants & paths ----------

const VIDEO_ROOT = path.join(os.homedir(), "Documents", "plepic-video");
const INBOX_DIR = path.join(VIDEO_ROOT, "inbox");
const WORK_ROOT = path.join(VIDEO_ROOT, "work");
const ARCHIVE_DIR = path.join(VIDEO_ROOT, "archive");

const REPO_ROOT = path.join(__dirname, "..");
const VIDEO_ARTIFACTS_ROOT = path.join(REPO_ROOT, "analytics", "video");
const VIDEO_PLANS_DIR = path.join(REPO_ROOT, "analytics", "video-plans");
const FIXTURES_DIR = path.join(VIDEO_ARTIFACTS_ROOT, "_fixtures");
const MOCKS_DIR = path.join(FIXTURES_DIR, "mock-responses");
// Zilla Slab is the heading face (used for thumbnail title cards). Body
// captions use Plus Jakarta Sans Bold (shipped under scripts/fonts/) which
// libass discovers via the fontsdir filter arg in edit().
const FONT_PATH = path.join(__dirname, "fonts", "ZillaSlab-Bold.ttf");

// Caption typography for 1080×1920 vertical short-form. Per-caption pill
// positioned in the top third (Alignment=8). Caption styling mirrors the
// public-web .badge-default pattern (css/styles.css): var(--bg) cream pill
// behind, var(--text) body text on top, var(--green-brand) emphasis. Mixing
// the cream pill with the body --text token gives strong text-vs-emphasis
// contrast that --green-dark text alone wouldn't.
const CAPTION_COLOR_BODY = "#1c1c1a";     // var(--text). Brand near-black. Strong contrast on the cream pill, leaves room for green emphasis to pop.
const CAPTION_COLOR_EMPHASIS = "#137b30"; // var(--green-brand). Same as .highlight on the site. AA on cream.
const CAPTION_BG_COLOR = "#faf7f2";       // var(--bg). Cream pill behind text.
const CAPTION_BORDER_COLOR = "#c5f6d3";   // var(--green-light). Soft shadow accent under the pill.
const CAPTION_FONT_SIZE_VLOG = 100;       // base for 1920px-tall reference; scales with actual video height. Sized up to use the top-third room.
const CAPTION_BOX_PADDING = 28;           // ASS Outline value when BorderStyle=3. Pixels of pill around text on each side.
const CAPTION_BOX_SHADOW = 6;             // subtle drop shadow under the pill. Separates from busy backgrounds.
const CAPTION_MAX_WORDS_PER_CUE = 3;
const CAPTION_MAX_CUE_DURATION = 1.0;
const CAPTION_TOP_MARGIN_PCT = 0.14;      // caption top offset (fraction of height); places the pill in the top third with Alignment=8.

// End-card overlay (vlog only). Height fraction = bottom slice of frame
// reserved for the wordmark + butterfly; 1/3 keeps the speaker's face clear
// when the end card slides in. END_CARD_SECONDS = window during which the
// overlay renders and captions are suppressed.
const END_CARD_HEIGHT_FRACTION = 1 / 3;
const END_CARD_SECONDS = 5;
const OUTRO_SECONDS = 3;   // full-frame outro card (screenshot + logo + link) window when --outro-image is given.
const END_CARD_LOGO_SVG = path.join(REPO_ROOT, "images", "favicon.svg");

// Tokens that should pop in brand-green. Numerals are matched separately by
// regex; this set covers spelled-out numbers + Plepic-specific brand vocab.
const NUMBER_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty",
  "sixty", "seventy", "eighty", "ninety", "hundred", "thousand",
]);
const BRAND_EMPHASIS = new Set([
  "squad", "plepic", "töötukassa", "claude", "friday", "september",
  "august", "monday", "tuesday", "wednesday", "thursday", "saturday",
  "sunday", "nps", "ai",
]);

const FILLER_WORDS = new Set([
  "um",
  "uh",
  "like",
  "you know",
  "so",
  "basically",
  "right",
  "okay",
  "well",
]);

const MIN_PAUSE_SEC = 2.0;    // only trim pauses longer than this; shorter "thinking" gaps stay (gentler cuts, avoids clipping words Whisper mis-timed).
const PAUSE_KEEP_SEC = 0.6;   // breath retained on each side of a trimmed long pause, so big gaps don't hard-cut straight into the next line.
const SILENCE_NOISE_DB = "-30dB";
const SILENCE_MIN_DUR_SEC = 0.5;

const WHISPER_MAX_BYTES = 24 * 1024 * 1024;
const CHUNK_OVERLAP_SEC = 2;

const YT_QUOTA_COST_UPLOAD = 1600;
const YT_MAX_TITLE = 100;
const YT_MAX_DESCRIPTION = 5000;
const YT_MAX_TAGS_CHARS = 500;

const LI_MAX_MINUTES = 10;
const LI_MAX_BYTES = 200 * 1024 * 1024;
const LI_TEASER_MAX_SEC = 120;

// Plepic brand colors — match css/styles.css tokens
const BRAND_GREEN_DARK = "#0d5822";
const BRAND_CREAM = "#faf7f2";

// Default macOS app for previewing the rendered video. VLC handles big 4K
// vertical files without dropping frames; Quick Look stutters. String form so
// future override (env var or per-platform) stays easy.
const OPEN_PREVIEW_WITH = "VLC";

// ---------- types ----------

type Format = "vlog" | "long";

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

interface Cue {
  start: number;
  end: number;
  words: TranscriptWord[];
  // Set of indices into `words` that should render in brand-green emphasis.
  // Populated by alignTranscriptToScript when --plan is provided; absent
  // for the Claude-chunking + heuristic-emphasis fallback path.
  emphasisIndices?: Set<number>;
}

interface Transcript {
  words: TranscriptWord[];
  language: string;
  duration: number;
  srtText: string;
  fullText: string;
}

interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  chapters: Array<{ timestamp: string; title: string }>;
  pinnedComment: string;
  slug: string;
}

interface PublishLog {
  slug: string;
  format: Format;
  source_path: string;
  started_at: string;
  finished_at?: string;
  phases_completed: string[];
  youtube: {
    video_id: string | null;
    url: string | null;
    studio_url: string | null;
    upload_session_url: string | null;
    privacy: string;
  } | null;
  linkedin: {
    assets_path: string;
    post_url: string | null;
  } | null;
  quota_units_used: number;
  duration_seconds: number | null;
  errors: string[];
}

interface CliOptions {
  sourceFile: string;
  interactive: boolean;
  planPath: string | null;
  unlisted: boolean;
  dryRun: boolean;
  force: boolean;
  noCaptions: boolean;
  captionsOnly: boolean;
  noOpen: boolean;
  clean: boolean;
  thumbnailTime: number | null;
  outroImage: string | null;   // screenshot -> full-frame outro card (with logo + link)
  link: string | null;         // e.g. "skill.plepic.com" -> bottom URL strip + outro-card link
  noCuts: boolean;             // keep the full take (no filler/pause trimming); still captions/strip/outro
}

// ---------- CLI parsing ----------

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const clean = args.includes("--clean");
  const captionsOnly = args.includes("--captions-only");

  // --clean is standalone; needs no source file.
  if (clean && args.length === 1) {
    return {
      sourceFile: "",
      interactive: false,
      planPath: null,
      unlisted: false,
      dryRun: false,
      force: false,
      noCaptions: false,
      captionsOnly: false,
      noOpen: false,
      clean: true,
      thumbnailTime: null,
      outroImage: null,
      link: null,
      noCuts: false,
    };
  }

  if (args.length === 0 || args[0].startsWith("--")) {
    throw new Error(
      "Usage: video-publish.ts <file> [--interactive] [--plan <path>] " +
        "[--dry-run] [--unlisted] [--force] [--no-captions] [--captions-only] [--no-open] | --clean"
    );
  }
  const sourceFile = path.resolve(args[0]);
  // --captions-only typically targets a source whose original file has been
  // archived by a prior full run, so the existence check is bypassed there
  // (the workdir is found by basename, not by file contents).
  if (!fs.existsSync(sourceFile) && !captionsOnly) {
    throw new Error(`Source video not found: ${sourceFile}`);
  }
  const planIdx = args.indexOf("--plan");
  const outroIdx = args.indexOf("--outro-image");
  const linkIdx = args.indexOf("--link");
  const thumbIdx = args.indexOf("--thumbnail-time");
  const thumbnailTime = thumbIdx !== -1 ? parseFloat(args[thumbIdx + 1]) : null;
  if (thumbnailTime !== null && !Number.isFinite(thumbnailTime)) {
    throw new Error(`--thumbnail-time must be a number of seconds, got "${args[thumbIdx + 1]}"`);
  }
  return {
    sourceFile,
    interactive: args.includes("--interactive"),
    planPath: planIdx !== -1 ? path.resolve(args[planIdx + 1]) : null,
    unlisted: args.includes("--unlisted"),
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    noCaptions: args.includes("--no-captions"),
    captionsOnly,
    noOpen: args.includes("--no-open"),
    clean,
    thumbnailTime,
    outroImage: outroIdx !== -1 ? path.resolve(args[outroIdx + 1]) : null,
    link: linkIdx !== -1 ? args[linkIdx + 1] : null,
    noCuts: args.includes("--no-cuts"),
  };
}

// ---------- utilities ----------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(s: string): string {
  return stripLeadingDate(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60),
  );
}

// Work dirs and repo artifact dirs already prepend today(), so a slug that
// starts with YYYY-MM-DD- would produce a doubled date (e.g.
// 2026-05-11-2026-05-11-three-agents-walking). Defensive: strip any leading
// ISO date so the prefix only appears once regardless of how the source
// filename or plan slug is written.
function stripLeadingDate(slug: string): string {
  return slug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

async function pauseIfInteractive(
  interactive: boolean,
  label: string
): Promise<void> {
  if (!interactive) return;
  const ok = await promptYesNo(`[PAUSE ${label}] Continue? (y/N) `);
  if (!ok) {
    console.log("Aborted by user.");
    process.exit(0);
  }
}

function fmtTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtSrtTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.floor((total - Math.floor(total)) * 1000);
  return (
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:` +
    `${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`
  );
}

function redactSecrets(s: string): string {
  // Keep logs safe of tokens/keys/bearers. Widely-overlapping patterns.
  return s
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***")
    .replace(/Authorization:\s*[^\s]+/gi, "Authorization: ***")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-***")
    .replace(/GOCSPX-[A-Za-z0-9_-]{10,}/g, "GOCSPX-***")
    .replace(/"(refresh_token|access_token|client_secret)":\s*"[^"]*"/g, '"$1": "***"');
}

function writePublishLog(workDir: string, log: PublishLog): void {
  const p = path.join(workDir, "publish-log.json");
  const safe = JSON.parse(JSON.stringify(log));
  fs.writeFileSync(p, JSON.stringify(safe, null, 2));
}

function readPublishLogIfExists(workDir: string): PublishLog | null {
  const p = path.join(workDir, "publish-log.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// ---------- ffmpeg / ffprobe wrappers ----------

function runFfmpeg(args: string[], opts: { silent?: boolean } = {}): void {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", ...args], {
    stdio: opts.silent ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (r.status !== 0) {
    const err = (r.stderr ?? "").toString().slice(-2000);
    throw new Error(`ffmpeg failed (status ${r.status}):\n${err}`);
  }
}

function runFfprobe(args: string[]): string {
  const r = spawnSync("ffprobe", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`ffprobe failed: ${r.stderr}`);
  }
  return r.stdout;
}

function probeVideoInfo(
  file: string
): { width: number; height: number; duration: number } {
  const out = runFfprobe([
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,duration:stream_side_data=rotation:format=duration",
    "-of",
    "json",
    file,
  ]);
  const data = JSON.parse(out);
  const stream = data.streams?.[0] ?? {};
  let width = stream.width ?? 0;
  let height = stream.height ?? 0;
  // iPhone vertical recordings store raw pixels as 3840×2160 with rotation=-90
  // in side_data_list. Swap dims so downstream aspect-ratio detection sees
  // the display orientation (2160×3840 = 9:16 vertical).
  const rot = (stream.side_data_list ?? []).find(
    (sd: { rotation?: number }) => sd.rotation !== undefined
  )?.rotation;
  if (typeof rot === "number" && Math.abs(rot) % 180 === 90) {
    [width, height] = [height, width];
  }
  const duration =
    parseFloat(stream.duration) ||
    parseFloat(data.format?.duration ?? "0");
  return { width, height, duration };
}

// ---------- phase: detectFormat ----------

function detectFormat(file: string, planSlug?: string): Format {
  const info = probeVideoInfo(file);
  const aspect = info.width / Math.max(info.height, 1);
  const format: Format = aspect < 1 ? "vlog" : "long";
  console.log(
    `detectFormat: ${info.width}×${info.height} (aspect ${aspect.toFixed(2)}) → ${format}`
  );
  if (planSlug) {
    const plan = readPlanFile(planSlug);
    if (plan && plan.format && plan.format !== format) {
      throw new Error(
        `Plan specifies format ${plan.format} but video is ${format} — aborting.`
      );
    }
  }
  return format;
}

// ---------- phase: transcribe (Whisper) ----------

async function transcribe(
  audioSourceFile: string,
  workDir: string
): Promise<Transcript> {
  if (process.env.WHISPER_MOCK === "1") {
    const mock = path.join(MOCKS_DIR, "transcript.json");
    console.log(`transcribe: WHISPER_MOCK=1, reading ${mock}`);
    const mockData = JSON.parse(fs.readFileSync(mock, "utf8")) as {
      words: TranscriptWord[];
      language?: string;
      duration?: number;
      fullText?: string;
    };
    const words = mockData.words;
    const language = mockData.language ?? "english";
    const duration = mockData.duration ?? 0;
    const fullText =
      mockData.fullText ?? words.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
    const srtText = wordsToSrt(words);
    fs.writeFileSync(
      path.join(workDir, "transcript.json"),
      JSON.stringify({ words, language, duration, fullText }, null, 2)
    );
    fs.writeFileSync(path.join(workDir, "transcript.srt"), srtText);
    return { words, language, duration, fullText, srtText };
  }

  const audioFile = path.join(workDir, "audio.ogg");
  console.log("transcribe: extracting mono 16kHz ogg/opus...");
  runFfmpeg(
    [
      "-i",
      audioSourceFile,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "libopus",
      "-b:a",
      "32k",
      audioFile,
    ],
    { silent: true }
  );

  const size = fs.statSync(audioFile).size;
  console.log(`transcribe: audio ${(size / 1024 / 1024).toFixed(1)} MB`);

  let words: TranscriptWord[] = [];
  let language = "";
  let duration = 0;

  if (size <= WHISPER_MAX_BYTES) {
    const res = await callWhisper(audioFile);
    words = res.words;
    language = res.language;
    duration = res.duration;
  } else {
    console.log("transcribe: chunking on silence boundaries...");
    const chunks = await chunkAudio(audioFile, workDir);
    console.log(`transcribe: ${chunks.length} chunks`);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `transcribe: chunk ${i + 1}/${chunks.length} (offset ${chunk.offset.toFixed(1)}s)`
      );
      const res = await callWhisper(chunk.file);
      for (const w of res.words) {
        words.push({
          text: w.text,
          start: w.start + chunk.offset,
          end: w.end + chunk.offset,
        });
      }
      if (!language) language = res.language;
      duration = Math.max(duration, chunk.offset + res.duration);
    }
    // Remove duplicate words from 2-second overlaps: keep the earliest occurrence
    // of any word whose start is within 0.5s of a previously-seen matching token.
    words = dedupeOverlap(words);
  }

  const fullText = words.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
  const srtText = wordsToSrt(words);

  fs.writeFileSync(
    path.join(workDir, "transcript.json"),
    JSON.stringify({ words, language, duration, fullText }, null, 2)
  );
  fs.writeFileSync(path.join(workDir, "transcript.srt"), srtText);

  console.log(
    `transcribe: ${words.length} words, ${duration.toFixed(1)}s, lang ${language}`
  );
  return { words, language, duration, srtText, fullText };
}

async function callWhisper(
  audioFile: string
): Promise<{ words: TranscriptWord[]; language: string; duration: number }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const buf = fs.readFileSync(audioFile);
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buf)], { type: "audio/ogg" }),
    path.basename(audioFile)
  );
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(`Whisper API ${r.status}: ${msg.slice(0, 500)}`);
  }
  const data = (await r.json()) as {
    words?: Array<{ word?: string; start: number; end: number }>;
    language?: string;
    duration?: number;
  };
  const words = (data.words ?? []).map((w) => ({
    text: w.word ?? "",
    start: w.start,
    end: w.end,
  }));
  return {
    words,
    language: data.language ?? "unknown",
    duration: data.duration ?? 0,
  };
}

async function chunkAudio(
  audioFile: string,
  workDir: string
): Promise<Array<{ file: string; offset: number }>> {
  // Use silencedetect to find split points, then produce chunks of <24MB each.
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      audioFile,
      "-af",
      `silencedetect=noise=${SILENCE_NOISE_DB}:d=${SILENCE_MIN_DUR_SEC}`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  );
  const logLines = (r.stderr ?? "").split("\n");
  const silenceStarts: number[] = [];
  for (const line of logLines) {
    const m = line.match(/silence_start:\s*(\d+\.?\d*)/);
    if (m) silenceStarts.push(parseFloat(m[1]));
  }

  const total = probeVideoInfo(audioFile).duration;
  // Convert silence points to chunk boundaries that keep each chunk <24MB.
  // Rough bytes/sec from total size:
  const bytesPerSec = fs.statSync(audioFile).size / Math.max(total, 1);
  const maxSecPerChunk = WHISPER_MAX_BYTES / Math.max(bytesPerSec, 1);

  const boundaries: number[] = [];
  let lastBoundary = 0;
  for (const s of silenceStarts) {
    if (s - lastBoundary >= maxSecPerChunk * 0.7) {
      // prefer splitting at silence if we're within a reasonable range
      boundaries.push(s);
      lastBoundary = s;
    }
  }
  // Fill any remaining gap with forced splits
  while (lastBoundary + maxSecPerChunk < total) {
    lastBoundary += maxSecPerChunk;
    boundaries.push(lastBoundary);
  }
  boundaries.push(total);

  const chunksDir = path.join(workDir, "audio-chunks");
  ensureDir(chunksDir);
  const chunks: Array<{ file: string; offset: number }> = [];
  let start = 0;
  for (let i = 0; i < boundaries.length; i++) {
    const end = boundaries[i];
    const dur = end - start;
    if (dur <= 0.1) {
      start = end;
      continue;
    }
    const file = path.join(chunksDir, `chunk-${String(i).padStart(3, "0")}.ogg`);
    runFfmpeg(
      [
        "-ss",
        String(Math.max(0, start - CHUNK_OVERLAP_SEC)),
        "-t",
        String(dur + CHUNK_OVERLAP_SEC),
        "-i",
        audioFile,
        "-c:a",
        "copy",
        file,
      ],
      { silent: true }
    );
    chunks.push({ file, offset: Math.max(0, start - CHUNK_OVERLAP_SEC) });
    start = end;
  }
  return chunks;
}

function dedupeOverlap(words: TranscriptWord[]): TranscriptWord[] {
  const sorted = words.slice().sort((a, b) => a.start - b.start);
  const out: TranscriptWord[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (
      last &&
      last.text.toLowerCase() === w.text.toLowerCase() &&
      Math.abs(last.start - w.start) < 0.5
    ) {
      continue;
    }
    out.push(w);
  }
  return out;
}

function wordsToSrt(words: TranscriptWord[]): string {
  if (words.length === 0) return "";
  // Group words into subtitle cues of up to 7 words / 3 seconds.
  const cues: Array<{ start: number; end: number; text: string }> = [];
  let buf: TranscriptWord[] = [];
  for (const w of words) {
    if (
      buf.length > 0 &&
      (buf.length >= 7 ||
        w.start - buf[0].start > 3 ||
        /[.!?]$/.test(buf[buf.length - 1].text))
    ) {
      cues.push({
        start: buf[0].start,
        end: buf[buf.length - 1].end,
        text: buf.map((x) => x.text).join(" "),
      });
      buf = [];
    }
    buf.push(w);
  }
  if (buf.length > 0) {
    cues.push({
      start: buf[0].start,
      end: buf[buf.length - 1].end,
      text: buf.map((x) => x.text).join(" "),
    });
  }
  return cues
    .map(
      (c, i) =>
        `${i + 1}\n${fmtSrtTime(c.start)} --> ${fmtSrtTime(c.end)}\n${c.text}\n`
    )
    .join("\n");
}

// ---------- ASS caption generation (vlog burn-in) ----------

function fmtAssTime(seconds: number): string {
  // ASS format: H:MM:SS.cc (centiseconds, no leading zero on hour).
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total - Math.floor(total)) * 100);
  return (
    `${h}:${m.toString().padStart(2, "0")}:` +
    `${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`
  );
}

function hexToBgr(hex: string): string {
  // BGR-ordered hex (no &H prefix). Used by both ASS style + override forms.
  const m = hex.replace(/^#/, "").toUpperCase();
  const r = m.slice(0, 2);
  const g = m.slice(2, 4);
  const b = m.slice(4, 6);
  return `${b}${g}${r}`;
}

function hexToAssStyleColor(hex: string): string {
  // Style block uses &HAABBGGRR (alpha 00 = opaque).
  return `&H00${hexToBgr(hex)}`;
}

function hexToAssOverride(hex: string): string {
  // Inline \c override uses &HBBGGRR& (no alpha, trailing `&`).
  return `&H${hexToBgr(hex)}&`;
}

function shouldEmphasize(token: string): boolean {
  const stripped = token.replace(/[^A-Za-zÀ-ÿ0-9%]/g, "").toLowerCase();
  if (stripped.length === 0) return false;
  if (/\d/.test(stripped)) return true;
  if (NUMBER_WORDS.has(stripped)) return true;
  if (BRAND_EMPHASIS.has(stripped)) return true;
  return false;
}

function groupCues(words: TranscriptWord[]): Cue[] {
  const cues: Cue[] = [];
  let buf: TranscriptWord[] = [];
  const flush = (): void => {
    if (buf.length === 0) return;
    cues.push({ start: buf[0].start, end: buf[buf.length - 1].end, words: buf });
    buf = [];
  };
  for (const w of words) {
    const wouldOverflow =
      buf.length >= CAPTION_MAX_WORDS_PER_CUE ||
      (buf.length > 0 && w.end - buf[0].start > CAPTION_MAX_CUE_DURATION);
    if (wouldOverflow) flush();
    buf.push(w);
    // Sentence boundary: flush after the punctuated word so the next cue
    // starts fresh, preventing run-on grouping across thoughts.
    if (/[.!?]$/.test(w.text)) flush();
  }
  flush();
  return cues;
}

// ---------- Whisper post-normalization ----------

// Run once after Whisper, before any downstream phase, when a script is
// available. Fixes the predictable Whisper artifacts: decimals split into two
// digit tokens, percent/currency suffix dropped, off-script trailing improv.
// Gating against the script means we never apply unconstrained merges (e.g.
// merging stray `8` + `7` into `8.7` when the speaker just said two numbers).
export function normalizeWhisperOutput(
  words: TranscriptWord[],
  scriptTokens: ScriptToken[]
): TranscriptWord[] {
  if (scriptTokens.length === 0) return words.slice();
  // Coarse alignment to know which Whisper indices anchor to script positions.
  const alignment = alignScriptToWhisper(scriptTokens, words);
  // Reverse map: whisperIdx -> scriptIdx (first hit wins).
  const whisperToScript = new Map<number, number>();
  for (let i = 0; i < alignment.length; i++) {
    const wIdx = alignment[i];
    if (wIdx !== null && !whisperToScript.has(wIdx)) {
      whisperToScript.set(wIdx, i);
    }
  }

  // For each Whisper index, expectedScriptIdx is the script position it
  // most plausibly fills — either the direct alignment hit, or the gap
  // between the last-anchored and next-anchored script positions.
  const expectedScript: Array<number | null> = new Array(words.length).fill(null);
  let lastAnchorScript = -1;
  for (let i = 0; i < words.length; i++) {
    const direct = whisperToScript.get(i);
    if (direct !== undefined) {
      expectedScript[i] = direct;
      lastAnchorScript = direct;
      continue;
    }
    let nextAnchorScript: number | null = null;
    for (let j = i + 1; j < words.length; j++) {
      const a = whisperToScript.get(j);
      if (a !== undefined) {
        nextAnchorScript = a;
        break;
      }
    }
    const candidate =
      nextAnchorScript === null
        ? lastAnchorScript + 1
        : Math.max(lastAnchorScript + 1, nextAnchorScript - (lastAnchorScript === -1 ? 0 : 1));
    if (candidate >= 0 && candidate < scriptTokens.length) {
      expectedScript[i] = candidate;
    }
  }

  const result: TranscriptWord[] = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    const next = words[i + 1];
    const scriptIdx = expectedScript[i];
    const scriptText = scriptIdx !== null ? scriptTokens[scriptIdx].text : "";
    const stripped = scriptText.replace(/[^a-z0-9.€$%]/gi, "").toLowerCase();
    const wText = w.text.replace(/[.,!?]$/, "").trim();
    const nextText = next ? next.text.replace(/[.,!?]$/, "").trim() : "";

    // Decimal merge: Whisper "8" + "7" against script "8.7".
    if (next && /^\d+$/.test(wText) && /^\d+$/.test(nextText)) {
      const decimalMatch = stripped.match(/^(\d+)\.(\d+)$/);
      if (decimalMatch && decimalMatch[1] === wText && decimalMatch[2] === nextText) {
        result.push({
          text: `${decimalMatch[1]}.${decimalMatch[2]}`,
          start: w.start,
          end: next.end,
        });
        i += 2;
        continue;
      }
    }

    // Percent append: Whisper "80" against script "80%".
    if (/^\d+$/.test(wText) && /^\d+%$/.test(stripped)) {
      const numPart = stripped.slice(0, -1);
      if (numPart === wText) {
        result.push({ text: `${wText}%`, start: w.start, end: w.end });
        i += 1;
        continue;
      }
    }

    // Currency append: Whisper "500" against script "500€" or "500$".
    const currencyMatch = stripped.match(/^(\d+)([€$])$/);
    if (currencyMatch && /^\d+$/.test(wText) && currencyMatch[1] === wText) {
      result.push({
        text: `${currencyMatch[1]}${currencyMatch[2]}`,
        start: w.start,
        end: w.end,
      });
      i += 1;
      continue;
    }

    result.push(w);
    i += 1;
  }

  // Trailing improv trim: re-align the merged result against the script,
  // then drop any words past the last matched index. Re-aligning lets the
  // newly-merged tokens (8.7, 80%, 500€) anchor against their script
  // positions; the original alignment couldn't see them.
  const realignment = alignScriptToWhisper(scriptTokens, result);
  let lastMatchedWhisper = -1;
  for (const v of realignment) {
    if (v !== null && v > lastMatchedWhisper) lastMatchedWhisper = v;
  }
  if (lastMatchedWhisper >= 0 && lastMatchedWhisper < result.length - 1) {
    return result.slice(0, lastMatchedWhisper + 1);
  }
  return result;
}

// ---------- plan-aligned captions ----------

interface ScriptToken {
  text: string;
  emphasized: boolean;
  // Index of the spoken line this token belongs to (one cue candidate per line).
  lineIdx: number;
}

// Walk the plan markdown, keep only spoken text, and tokenize line-by-line.
// Tolerant: skips frontmatter, HTML comments, headings, code fences, italic
// stage directions (`*[...]*`), and emphasized-but-bracketed beat marks. Also
// skips body under non-speech headings (filming notes, "when done", pipeline
// instructions) by matching common markers.
// Bold spans (`**foo**`) survive as `emphasized` flags on their tokens.
export function parseSpokenScriptTokens(planMarkdown: string): ScriptToken[] {
  const lines = planMarkdown.split(/\r?\n/);
  const out: ScriptToken[] = [];
  let lineIdx = 0;
  let inFrontmatter = false;
  let inCodeFence = false;
  // After we see a heading like "Filming notes" / "When done" / "What the
  // pipeline...", every subsequent line is non-speech until either EOF or
  // another `---` separator. The list mirrors the conventions in
  // analytics/video-plans/. Add to it when new conventions emerge.
  const nonSpeechHeading = /^#{1,6}\s+(filming|when done|what the pipeline|notes|instructions)/i;
  let inNonSpeech = false;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];

    // Frontmatter: leading `---` opens, next bare `---` closes.
    if (i === 0 && /^---\s*$/.test(raw)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (/^---\s*$/.test(raw)) inFrontmatter = false;
      continue;
    }

    if (/^```/.test(raw)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    // Strip HTML comments inline (single-line). Multi-line comments are rare
    // in plan markdown; not worth a state machine for one expected case.
    raw = raw.replace(/<!--[\s\S]*?-->/g, "");

    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Plain `---` separator inside the body (not frontmatter): closes any
    // active non-speech section. Otherwise skip.
    if (/^---+\s*$/.test(trimmed)) {
      inNonSpeech = false;
      continue;
    }
    // Markdown headings: detect non-speech sections. Speech-side headings
    // are also skipped, just don't flip the non-speech flag.
    if (/^#{1,6}\s/.test(trimmed)) {
      inNonSpeech = nonSpeechHeading.test(trimmed);
      continue;
    }
    if (inNonSpeech) continue;
    // Italic-bracketed stage directions, e.g. *[short beat]*, *[matter-of-fact]*.
    if (/^\*\[[^\]]*\]\*\s*$/.test(trimmed)) continue;
    // List items beginning with `- ` are filming-notes / pipeline-instructions
    // boilerplate, not spoken content.
    if (/^[-*]\s/.test(trimmed)) continue;

    // Tokenize. Strip trailing markdown line-break markers (two spaces).
    const text = trimmed.replace(/\s+$/, "");
    // Split on bold markers, preserving them so we can flip emphasis as we go.
    const segments = text.split(/(\*\*)/);
    let emphasized = false;
    const lineTokens: ScriptToken[] = [];
    for (const seg of segments) {
      if (seg === "**") {
        emphasized = !emphasized;
        continue;
      }
      if (!seg) continue;
      const words = seg.split(/\s+/).filter(Boolean);
      for (const w of words) {
        // Skip pure-punctuation tokens that get orphaned when bold markers
        // sit immediately before punctuation, e.g. `**Friday**.` -> "." alone.
        if (!/[a-z0-9]/i.test(w)) continue;
        lineTokens.push({ text: w, emphasized, lineIdx });
      }
    }
    if (lineTokens.length > 0) {
      out.push(...lineTokens);
      lineIdx += 1;
    }
  }
  return out;
}

// Normalize a token to lowercase alphanumerics for fuzzy matching against
// Whisper output. Strips markdown/sentence punctuation but keeps internal
// digits + decimals so "8.7" matches "8.7" and the percent suffix in "80%"
// stays distinct from a bare "80".
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.%€$']/g, "")
    .replace(/\.+$/, "");
}

// Sequential alignment with small Levenshtein-style cost. For each script
// token, returns the matched Whisper word index or null if unmatched. We
// allow Whisper to insert (skip Whisper words) and to drop (skip script
// tokens) but penalize each non-equal step. The returned array has length
// `scriptTokens.length`; alignment[i] = whisper-idx | null.
export function alignScriptToWhisper(
  scriptTokens: ScriptToken[],
  whisperWords: TranscriptWord[]
): Array<number | null> {
  const n = scriptTokens.length;
  const m = whisperWords.length;
  if (n === 0 || m === 0) return new Array(n).fill(null);

  const sNorm = scriptTokens.map((t) => normalizeForMatch(t.text));
  const wNorm = whisperWords.map((w) => normalizeForMatch(w.text));

  // Standard edit-distance DP, then backtrace. Costs: match=0, sub=1,
  // skip-script=1, skip-whisper=1. n*m can be ~200*200=40k for a 30s vlog;
  // negligible.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchCost = sNorm[i - 1] === wNorm[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost,
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1
      );
    }
  }

  const alignment: Array<number | null> = new Array(n).fill(null);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const matchCost = sNorm[i - 1] === wNorm[j - 1] ? 0 : 1;
    if (dp[i][j] === dp[i - 1][j - 1] + matchCost && matchCost === 0) {
      alignment[i - 1] = j - 1;
      i--;
      j--;
    } else if (dp[i][j] === dp[i - 1][j - 1] + matchCost) {
      // substitution: count as unmatched (text differed); preferring null
      // is safer than fuzzy-mapping a wrong word onto an emphasis cue.
      i--;
      j--;
    } else if (dp[i][j] === dp[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }
  return alignment;
}

// Build cues from script lines, mapped onto Whisper words. Each script line
// becomes one cue (split into 2 if >4 words, at the nearest comma boundary).
// Emphasis indices are derived from the matched Whisper-word positions, so
// `wordsToAss` only needs `cue.emphasisIndices.has(word_index_in_cue)`.
export function alignTranscriptToScript(
  whisperWords: TranscriptWord[],
  planMarkdown: string
): { cues: Cue[]; matchRatio: number } | null {
  const scriptTokens = parseSpokenScriptTokens(planMarkdown);
  if (scriptTokens.length === 0) return null;
  const alignment = alignScriptToWhisper(scriptTokens, whisperWords);
  const matched = alignment.filter((a) => a !== null).length;
  const matchRatio = matched / scriptTokens.length;

  // Group aligned script tokens by line. A cue's words = the Whisper words
  // matched to that line, in order. Unmatched tokens drop (they didn't
  // appear in the audio, e.g. trimmed by post-normalization).
  const byLine = new Map<number, Array<{ scriptIdx: number; whisperIdx: number }>>();
  for (let i = 0; i < scriptTokens.length; i++) {
    const wIdx = alignment[i];
    if (wIdx === null) continue;
    const arr = byLine.get(scriptTokens[i].lineIdx) ?? [];
    arr.push({ scriptIdx: i, whisperIdx: wIdx });
    byLine.set(scriptTokens[i].lineIdx, arr);
  }

  const cues: Cue[] = [];
  const lineOrder = [...byLine.keys()].sort((a, b) => a - b);
  for (const lineIdx of lineOrder) {
    const matches = byLine.get(lineIdx)!;
    if (matches.length === 0) continue;
    matches.sort((a, b) => a.whisperIdx - b.whisperIdx);

    // Long lines (>4 words) split at the nearest comma in the script tokens.
    const lineSplits: Array<typeof matches> =
      matches.length > 4 ? splitAtComma(matches, scriptTokens) : [matches];

    for (const group of lineSplits) {
      if (group.length === 0) continue;
      // Display the plan's text (keeps the punctuation + capitalization the
      // script was written with) but keep Whisper's timing for the cue.
      const words = group.map((g) => ({
        text: scriptTokens[g.scriptIdx].text,
        start: whisperWords[g.whisperIdx].start,
        end: whisperWords[g.whisperIdx].end,
      }));
      const emphasisIndices = new Set<number>();
      for (let k = 0; k < group.length; k++) {
        if (scriptTokens[group[k].scriptIdx].emphasized) {
          emphasisIndices.add(k);
        }
      }
      cues.push({
        start: words[0].start,
        end: words[words.length - 1].end,
        words,
        emphasisIndices,
      });
    }
  }

  return { cues, matchRatio };
}

// Split a long matched group at the nearest script-side comma. Returns at
// most two sub-groups; if no comma found, returns the original as a single
// group (the wordsToAss path will still render it, just longer).
function splitAtComma(
  matches: Array<{ scriptIdx: number; whisperIdx: number }>,
  scriptTokens: ScriptToken[]
): Array<Array<{ scriptIdx: number; whisperIdx: number }>> {
  const mid = Math.floor(matches.length / 2);
  let bestSplit = -1;
  let bestDist = Infinity;
  for (let k = 0; k < matches.length - 1; k++) {
    if (/,$/.test(scriptTokens[matches[k].scriptIdx].text)) {
      const dist = Math.abs(k - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestSplit = k;
      }
    }
  }
  if (bestSplit === -1) return [matches];
  return [matches.slice(0, bestSplit + 1), matches.slice(bestSplit + 1)];
}

// Ask Claude Haiku to chunk words into logical phrase cues (2-4 words each),
// breaking on sentence ends, clause boundaries, and number-then-noun
// transitions. Returns null on failure so the caller can fall back to the
// mechanical chunker. The mock fixture keeps offline iteration deterministic.
function chunkCuesViaClaude(words: TranscriptWord[]): Cue[] | null {
  if (words.length === 0) return [];

  if (process.env.CLAUDE_CHUNK_MOCK === "1") {
    const mockPath = path.join(MOCKS_DIR, "cue-chunks.json");
    if (!fs.existsSync(mockPath)) {
      console.warn(`chunkCuesViaClaude: CLAUDE_CHUNK_MOCK=1 but ${mockPath} missing — falling back`);
      return null;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, "utf8")) as {
        cues: Array<{ start: number; end: number }>;
      };
      return materializeCues(words, parsed.cues);
    } catch (err) {
      console.warn(`chunkCuesViaClaude: mock parse failed: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  const indexed = words.map((w, idx) => `${idx}: ${w.text}`).join("\n");
  // The number-then-noun rule (e.g. "10 Squad") is critical: without it
  // Haiku tends to keep numerics attached to the following noun, which
  // dilutes the green-emphasis effect.
  const prompt = [
    "You are chunking video captions for a vertical short-form video. Output JSON only, no commentary.",
    "",
    "Rules:",
    "- Each cue is 2 to 4 words.",
    "- Break on natural phrase boundaries: sentence ends, clause breaks, before new subjects.",
    "- A number ending a clause (e.g. \"10\" finishing \"9 out of 10\") MUST end its cue. Never group \"10 Squad\" or similar number-then-noun crossings.",
    "- Brand terms that start a new sentence (Squad 1, Squad 2, Plepic, Yesterday's, If, The, Six, Few) typically start a new cue.",
    "- Every word must appear in exactly one cue. Cues must be in input order.",
    "",
    "Output schema:",
    "{ \"cues\": [{ \"start\": <inclusive_word_idx>, \"end\": <inclusive_word_idx> }, ...] }",
    "",
    "Input words (idx-text):",
    indexed,
    "",
    "Return ONLY the JSON object.",
  ].join("\n");

  const r = spawnSync("claude", ["-p", "--output-format", "text", "--model", "haiku"], {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.warn(`chunkCuesViaClaude: claude -p failed (status ${r.status}): ${(r.stderr ?? "").slice(0, 300)}`);
    return null;
  }
  const text = r.stdout.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    console.warn(`chunkCuesViaClaude: no JSON in response: ${text.slice(0, 200)}`);
    return null;
  }
  try {
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as {
      cues: Array<{ start: number; end: number }>;
    };
    return materializeCues(words, parsed.cues);
  } catch (err) {
    console.warn(`chunkCuesViaClaude: parse failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

function materializeCues(
  words: TranscriptWord[],
  ranges: Array<{ start: number; end: number }>
): Cue[] {
  const cues: Cue[] = [];
  for (const r of ranges) {
    if (r.start < 0 || r.end >= words.length || r.end < r.start) continue;
    const slice = words.slice(r.start, r.end + 1);
    if (slice.length === 0) continue;
    cues.push({ start: slice[0].start, end: slice[slice.length - 1].end, words: slice });
  }
  return cues;
}

function escapeAssText(s: string): string {
  // ASS treats `{` as override-block opener and `\N` as literal newline.
  return s.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function wordsToAss(
  cues: Cue[],
  videoHeight: number,
  fontSize: number
): string {
  const textStyle = hexToAssStyleColor(CAPTION_COLOR_BODY);
  const boxFillStyle = hexToAssStyleColor(CAPTION_BG_COLOR);
  const shadowStyle = hexToAssStyleColor(CAPTION_BORDER_COLOR);
  const bodyOverride = hexToAssOverride(CAPTION_COLOR_BODY);
  const emphasisOverride = hexToAssOverride(CAPTION_COLOR_EMPHASIS);
  const marginV = Math.round(CAPTION_TOP_MARGIN_PCT * videoHeight);

  // PlayResX/PlayResY define the coordinate system libass scales font sizes
  // against. We pin to the actual video resolution so Fontsize is in pixels.
  const playResX = Math.round((videoHeight * 9) / 16);
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${playResX}`,
    `PlayResY: ${videoHeight}`,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, " +
      "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, " +
      "ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, " +
      "MarginL, MarginR, MarginV, Encoding",
    // BorderStyle=3 = opaque box. In libass, the box is filled with
    // OutlineColour (slot 6), not BackColour. We put the cream pill there,
    // the near-black body text in PrimaryColour, and a green-light shadow
    // in BackColour to lift the pill off busy iPhone backgrounds.
    // Alignment=8 (top-center); with top alignment MarginV is from the top
    // edge, placing the pill in the top third.
    `Style: Default,Plus Jakarta Sans,${fontSize},${textStyle},${textStyle},` +
      `${boxFillStyle},${shadowStyle},-1,0,0,0,100,100,0,0,3,${CAPTION_BOX_PADDING},${CAPTION_BOX_SHADOW},8,80,80,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events = cues.map((c) => {
    // Spoken URL: render correctly punctuated (Whisper hears "skill plepic com").
    const urlJoin = c.words.map((w) => w.text.toLowerCase().replace(/[^a-z0-9]/g, "")).join("");
    if (urlJoin === "skillplepiccom") {
      return `Dialogue: 0,${fmtAssTime(c.start)},${fmtAssTime(c.end)},Default,,0,0,0,,{\\c${emphasisOverride}}skill.plepic.com{\\c${bodyOverride}}`;
    }
    const parts = c.words.map((w, i) => {
      const text = escapeAssText(w.text);
      const sep = i === 0 ? "" : " ";
      // Plan-aligned cues carry an explicit emphasis set from the markdown's
      // bold markers; all other paths fall back to the heuristic.
      const emphasized = c.emphasisIndices
        ? c.emphasisIndices.has(i)
        : shouldEmphasize(w.text);
      if (emphasized) {
        return `${sep}{\\c${emphasisOverride}}${text}{\\c${bodyOverride}}`;
      }
      return `${sep}${text}`;
    });
    return `Dialogue: 0,${fmtAssTime(c.start)},${fmtAssTime(c.end)},Default,,0,0,0,,${parts.join("")}`;
  });

  return [...header, ...events, ""].join("\n");
}

// Compute the keep ranges that splice the source by removing fillers and long
// pauses. Pulled out so --captions-only can recompute the same ranges from
// the persisted transcript.json without re-running the splice.
function computeKeepRanges(
  words: TranscriptWord[],
  duration: number
): Array<[number, number]> {
  const cuts: Array<[number, number]> = [];
  for (const w of words) {
    const token = w.text.toLowerCase().replace(/[^a-z\s']/g, "").trim();
    if (FILLER_WORDS.has(token)) {
      cuts.push([w.start - 0.05, w.end + 0.05]);
    }
  }
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= MIN_PAUSE_SEC) {
      // Keep a short breath on each side of a trimmed pause rather than
      // cutting to ~0s, so a long gap doesn't slam the next line in.
      cuts.push([words[i - 1].end + PAUSE_KEEP_SEC, words[i].start - PAUSE_KEEP_SEC]);
    }
  }
  return mergeAdjacent(invertCuts(cuts, duration), 0.05);
}

// ---------- phase: edit (filler removal + silence trim + splice) ----------

async function edit(
  sourceFile: string,
  transcript: Transcript,
  format: Format,
  workDir: string,
  opts: { noCaptions: boolean; planMarkdown: string | null; outroImage: string | null; link: string | null; noCuts: boolean },
  log: PublishLog
): Promise<string> {
  const duration = transcript.duration || probeVideoInfo(sourceFile).duration;
  // When a plan is provided, normalize Whisper output against it before any
  // downstream phase. Runs in-place on transcript.words so remap, captioning,
  // and metadata all see the cleaned tokens.
  if (opts.planMarkdown) {
    const scriptTokens = parseSpokenScriptTokens(opts.planMarkdown);
    if (scriptTokens.length > 0) {
      const before = transcript.words.length;
      transcript.words = normalizeWhisperOutput(transcript.words, scriptTokens);
      console.log(
        `edit: normalized Whisper output against plan (${before} → ${transcript.words.length} words)`
      );
    }
  }
  const mergedKeeps: Array<[number, number]> = opts.noCuts
    ? [[0, duration]]
    : computeKeepRanges(transcript.words, duration);
  const noCuts = mergedKeeps.length === 1 &&
    mergedKeeps[0][0] === 0 && mergedKeeps[0][1] === duration;
  console.log(
    `edit: ${mergedKeeps.length} keep segments (${duration.toFixed(1)}s total)`
  );

  // If no cuts, just copy-remux the source.
  const edited = path.join(workDir, "edited.mp4");
  if (noCuts) {
    runFfmpeg(["-i", sourceFile, "-c", "copy", edited], { silent: true });
  } else {
    await spliceConcat(sourceFile, mergedKeeps, edited, workDir);
  }

  // Caption burn-in + end-card for vlogs only (long-form uses SRT upload to
  // YouTube and has its own outro convention). ASS instead of SRT so per-word
  // brand-green emphasis renders. SRT stays on disk for the long-form
  // YouTube captions.insert path.
  if (format === "vlog") {
    const editedInfo = probeVideoInfo(edited);
    const editedDuration = editedInfo.duration || duration;
    const wantCaptions = !opts.noCaptions;
    // End-card needs at least END_CARD_SECONDS + 2s of breathing room before
    // it slides in. Anything shorter, skip — the overlay would devour the
    // whole clip.
    const outroSecs = opts.outroImage ? OUTRO_SECONDS : END_CARD_SECONDS;
    const wantEndCard = editedDuration >= outroSecs + 2;
    const endCardStart = Math.max(0, editedDuration - outroSecs);

    if (!wantEndCard) {
      console.log(
        `edit: skipping end card (edited duration ${editedDuration.toFixed(1)}s < ${END_CARD_SECONDS + 2}s minimum)`
      );
    }

    let assPath: string | null = null;
    if (wantCaptions) {
      // Scale font from the 1080×1920 reference. Falls back gracefully on
      // non-standard resolutions; height is the more stable axis for vertical.
      const fontSize = Math.max(
        24,
        Math.round(CAPTION_FONT_SIZE_VLOG * (editedInfo.height / 1920))
      );
      // Remap source-time word timestamps onto the edited timeline. Without
      // this, ASS cue starts reference uncut source positions while ffmpeg
      // burns them onto the spliced (cut) video, and drift accumulates at
      // every cut. Words that fall inside a cut range are dropped (filler
      // pads, long-pause spans). This is the key correctness invariant.
      const editedWords = remapWordsToEdited(transcript.words, mergedKeeps);
      console.log(
        `edit: remapped ${transcript.words.length} src-time words → ${editedWords.length} edited-time captionable words`
      );

      // Drop fillers before chunking so Claude doesn't waste tokens on words
      // we'd discard from the cue text anyway. Remap already removed cuts;
      // this catches fillers that fell outside any cut range.
      const captionableWords = editedWords.filter((w) => {
        const t = w.text.toLowerCase().replace(/[^a-z\s']/g, "").trim();
        return !FILLER_WORDS.has(t);
      });

      // Caption cue source, in priority order:
      //  1. Plan-aligned (--plan present, ≥80% of script tokens matched).
      //     Deterministic, emphasis comes straight from bold markers.
      //  2. Claude-chunked (LLM groups Whisper words; heuristic emphasis).
      //  3. Mechanical 3-word/1.0s grouping (offline / chunk failure).
      let cues: Cue[] | null = null;
      if (opts.planMarkdown) {
        const aligned = alignTranscriptToScript(captionableWords, opts.planMarkdown);
        if (aligned && aligned.matchRatio >= 0.8) {
          cues = aligned.cues;
          console.log(
            `edit: plan-aligned ${aligned.cues.length} cues (${(aligned.matchRatio * 100).toFixed(0)}% script match)`
          );
        } else if (aligned) {
          console.warn(
            `edit: plan alignment only ${(aligned.matchRatio * 100).toFixed(0)}% — falling back to LLM chunker`
          );
          log.errors.push(
            `plan-alignment-fallback: match ratio ${aligned.matchRatio.toFixed(2)} < 0.80`
          );
        }
      }
      if (cues === null) {
        cues = chunkCuesViaClaude(captionableWords);
        if (cues === null) {
          console.warn("edit: caption chunking via Claude unavailable — falling back to mechanical grouping");
          log.errors.push("caption-chunking-fallback: used mechanical groupCues");
          cues = groupCues(captionableWords);
        } else {
          console.log(`edit: chunked ${captionableWords.length} words into ${cues.length} cues via Claude`);
        }
      }

      // Drop cues whose start is within the end-card window. Otherwise
      // captions would render on top of the wordmark.
      if (wantEndCard) {
        const before = cues.length;
        cues = cues.filter((c) => c.start < endCardStart);
        if (before !== cues.length) {
          console.log(`edit: dropped ${before - cues.length} cues overlapping end-card window`);
        }
      }

      assPath = path.join(workDir, "captions.ass");
      fs.writeFileSync(
        assPath,
        wordsToAss(cues, editedInfo.height || 1920, fontSize)
      );
      console.log(
        `edit: burning in captions (vlog, ${cues.length} cues, font ${fontSize}px)...`
      );
    }

    if (wantCaptions || wantEndCard) {
      // Preserve the un-captioned splice so --captions-only can re-burn later
      // without re-running the concat.
      const editedNoCaptions = path.join(workDir, "edited-no-captions.mp4");
      if (!fs.existsSync(editedNoCaptions)) {
        fs.copyFileSync(edited, editedNoCaptions);
      }
      const captioned = path.join(workDir, "edited-captioned.mp4");
      await burnVlogOverlays(edited, captioned, {
        assPath,
        width: editedInfo.width,
        height: editedInfo.height,
        wantOutro: wantEndCard,
        outroStart: endCardStart,
        outroImage: opts.outroImage,
        link: opts.link,
        workDir,
      });
      fs.renameSync(captioned, edited);
    }

    // Sync gate: re-Whisper the rendered video and assert each ASS cue
    // start matches the spoken word's audio time. Catches drift bugs that
    // visually pass but are off by seconds. Only meaningful when captions
    // are present.
    if (assPath) {
      await verifySyncOrThrow(edited, assPath, workDir);
    }
  }

  return edited;
}

function invertCuts(
  cuts: Array<[number, number]>,
  duration: number
): Array<[number, number]> {
  const sorted = cuts
    .map(([a, b]) => [Math.max(0, a), Math.min(duration, b)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const c of sorted) {
    const last = merged[merged.length - 1];
    if (last && c[0] <= last[1]) {
      last[1] = Math.max(last[1], c[1]);
    } else {
      merged.push([...c]);
    }
  }
  const keeps: Array<[number, number]> = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a > cursor) keeps.push([cursor, a]);
    cursor = b;
  }
  if (cursor < duration) keeps.push([cursor, duration]);
  return keeps;
}

// Map source-time words onto the edited timeline. Each "keep" range is
// concatenated tip-to-tail in the spliced output, so a word at source time t
// inside keep i lands at editedStart[i] + (t - keepStart[i]). Words whose
// start is inside a cut (no enclosing keep) are dropped — those are the
// fillers and long-pause pads the editor removed.
function remapWordsToEdited(
  words: TranscriptWord[],
  keeps: Array<[number, number]>
): TranscriptWord[] {
  if (keeps.length === 0) return [];
  const editedStarts: number[] = [];
  let acc = 0;
  for (const [a, b] of keeps) {
    editedStarts.push(acc);
    acc += b - a;
  }
  const out: TranscriptWord[] = [];
  for (const w of words) {
    let mappedStart: number | null = null;
    let mappedEnd: number | null = null;
    for (let i = 0; i < keeps.length; i++) {
      const [a, b] = keeps[i];
      if (w.start >= a && w.start <= b) {
        mappedStart = editedStarts[i] + (w.start - a);
        // Clamp end to the keep's end if the word straddles a cut boundary.
        const clampedEnd = Math.min(w.end, b);
        mappedEnd = editedStarts[i] + (clampedEnd - a);
        break;
      }
    }
    if (mappedStart === null || mappedEnd === null) continue;
    out.push({ text: w.text, start: mappedStart, end: mappedEnd });
  }
  return out;
}

function mergeAdjacent(
  ranges: Array<[number, number]>,
  tolerance: number
): Array<[number, number]> {
  if (ranges.length === 0) return ranges;
  const out: Array<[number, number]> = [[...ranges[0]]];
  for (let i = 1; i < ranges.length; i++) {
    const last = out[out.length - 1];
    if (ranges[i][0] - last[1] <= tolerance) {
      last[1] = ranges[i][1];
    } else {
      out.push([...ranges[i]]);
    }
  }
  return out;
}

async function spliceConcat(
  sourceFile: string,
  keeps: Array<[number, number]>,
  outputFile: string,
  workDir: string
): Promise<void> {
  const clipsDir = path.join(workDir, "trimmed-clips");
  ensureDir(clipsDir);
  const clipPaths: string[] = [];
  for (let i = 0; i < keeps.length; i++) {
    const [start, end] = keeps[i];
    if (end - start < 0.1) continue;
    const clip = path.join(clipsDir, `clip-${String(i).padStart(4, "0")}.mp4`);
    runFfmpeg(
      [
        "-ss",
        String(start),
        "-t",
        String(end - start),
        "-i",
        sourceFile,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        clip,
      ],
      { silent: true }
    );
    clipPaths.push(clip);
  }
  const concatList = path.join(workDir, "concat-list.txt");
  fs.writeFileSync(
    concatList,
    clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n")
  );
  runFfmpeg(
    [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatList,
      "-c",
      "copy",
      outputFile,
    ],
    { silent: true }
  );
}

// ---------- phase: generateMetadata (Claude Haiku) ----------

async function generateMetadata(
  transcript: Transcript,
  plan: string | null,
  slug: string
): Promise<VideoMetadata> {
  if (process.env.CLAUDE_MOCK === "1") {
    const mock = path.join(MOCKS_DIR, "metadata.json");
    console.log(`generateMetadata: CLAUDE_MOCK=1, reading ${mock}`);
    return JSON.parse(fs.readFileSync(mock, "utf8"));
  }

  const voice = readVoiceMd();
  const brandContext = readBrandContext();

  // Use Claude Code CLI (`claude -p`) so we consume the user's Max subscription
  // instead of requiring a separate ANTHROPIC_API_KEY. Model defaults to haiku
  // for cost + latency; override via CLAUDE_MODEL env var if needed.
  const model = process.env.CLAUDE_MODEL ?? "haiku";
  const promptText = [
    SYSTEM_PROMPT,
    `\n## Voice authority\n\n${voice}`,
    `\n## Brand context\n\n${brandContext}`,
    plan ? `\n## Workflow 11 plan (primary seed)\n\n${plan}` : "\n## No plan provided — generate from transcript only.",
    `\n## Transcript (verbatim, noisy)\n\n${transcript.fullText.slice(0, 12000)}`,
    `\n## Detected language\n\n${transcript.language}`,
    `\n## Slug base\n\n${slug}`,
    "\n\nReturn ONLY the JSON object described in the system prompt. No markdown fences, no commentary.",
  ].join("\n");

  console.log(`generateMetadata: calling claude -p --model ${model}...`);
  const r = spawnSync(
    "claude",
    ["-p", "--output-format", "text", "--model", model],
    {
      input: promptText,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  if (r.status !== 0) {
    throw new Error(
      `claude -p failed (status ${r.status}): ${(r.stderr ?? "").slice(0, 500)}`
    );
  }
  const text = r.stdout.trim();
  const parsed = parseMetadataResponse(text, slug);
  validateMetadata(parsed);
  return parsed;
}

const SYSTEM_PROMPT = `You generate YouTube metadata for Plepic's channel @plepic-agentic.

Return JSON only, matching this schema:
{
  "title": "string, <=95 chars (buffer under YouTube's 100-char cap)",
  "description": "string, <=4800 chars. First line = hook. Include 2-3 paragraphs with concrete value, followed by a single CTA pointing to plepic.com/training with ?utm_source=youtube&utm_content=<slug> appended. End with relevant hashtags.",
  "tags": ["<=15 tags, mixed long-tail + specific, total <=450 chars"],
  "chapters": [{"timestamp": "0:00", "title": "Intro"}, ...],  // only include for videos >3 min
  "pinnedComment": "string, optional, <=500 chars: a single genuine question that invites discussion",
  "slug": "kebab-case slug <=60 chars"
}

Constraints:
- Never use "unleash", "game-changer", "revolutionize", "in this video", "don't forget to like and subscribe". Any of these fails immediately.
- Never use em-dashes (—) anywhere in title, description, or pinnedComment. Use period, comma, or colon instead. Em-dashes read as AI-generated and fail Plepic's voice check.
- Lead with the problem or the outcome, not with who Kaido is.
- Voice is Kaido's: NVC/MI-grounded, observational, specific. Follow the voice authority rules exactly.
- If a plan is provided, it is the primary seed. Transcript is secondary context. Use it to ground claims but not to structure.
- Chapters: use real timestamps from the transcript's implicit structure. Skip for short vlogs.

Return ONLY the JSON object. No markdown fences, no commentary.`;

function parseMetadataResponse(text: string, fallbackSlug: string): VideoMetadata {
  // Try to find the first JSON object in the response.
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`Claude response lacks JSON object: ${text.slice(0, 200)}`);
  }
  const jsonStr = trimmed.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonStr);
  return {
    title: stripEmDashes(String(parsed.title ?? "").trim()),
    description: stripEmDashes(String(parsed.description ?? "").trim()),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => stripEmDashes(String(t).trim())) : [],
    chapters: Array.isArray(parsed.chapters)
      ? parsed.chapters.map((c: { timestamp?: string; title?: string }) => ({
          timestamp: String(c.timestamp ?? ""),
          title: stripEmDashes(String(c.title ?? "")),
        }))
      : [],
    pinnedComment: stripEmDashes(String(parsed.pinnedComment ?? "").trim()),
    slug: slugify(String(parsed.slug ?? fallbackSlug)) || fallbackSlug,
  };
}

// Replace em-dashes with safer punctuation. ` — ` becomes `: ` (clause join);
// bare `—` (no surrounding spaces or only one side) becomes `. ` (sentence
// break). Plepic's house style bans em-dashes outright; we both prompt against
// them and post-process to catch any that slip through.
function stripEmDashes(s: string): string {
  return s
    .replace(/\s+—\s+/g, ": ")
    .replace(/—\s+/g, ". ")
    .replace(/\s+—/g, ".")
    .replace(/—/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".");
}

function validateMetadata(m: VideoMetadata): void {
  if (!m.title || m.title.length > YT_MAX_TITLE) {
    throw new Error(`Invalid title (len ${m.title.length}): ${m.title}`);
  }
  if (!m.description || m.description.length > YT_MAX_DESCRIPTION) {
    throw new Error(`Invalid description length: ${m.description.length}`);
  }
  const tagsLen = m.tags.join(",").length;
  if (tagsLen > YT_MAX_TAGS_CHARS) {
    throw new Error(`Tags total ${tagsLen} chars > ${YT_MAX_TAGS_CHARS}`);
  }
  const banned = [
    "unleash",
    "game-changer",
    "revolutionize",
    "in this video",
    "don't forget to like and subscribe",
  ];
  const lower = `${m.title} ${m.description}`.toLowerCase();
  for (const b of banned) {
    if (lower.includes(b)) {
      throw new Error(`Banned phrase "${b}" in metadata`);
    }
  }
  // Em-dashes are auto-stripped in parseMetadataResponse, so any survivor here
  // means a bug in stripEmDashes, not a model output we need to negotiate with.
  if (`${m.title} ${m.description} ${m.pinnedComment}`.includes("—")) {
    throw new Error("Em-dash leaked past stripEmDashes. Fix the helper.");
  }
}

function readVoiceMd(): string {
  const p = path.join(
    os.homedir(),
    ".claude",
    "skills",
    "invitational-communication",
    "VOICE.md"
  );
  if (!fs.existsSync(p)) return "(VOICE.md not found; use terse, observational tone)";
  return fs.readFileSync(p, "utf8");
}

function readBrandContext(): string {
  // Short inline brand summary — Plepic strategy + ICP + pillars.
  return [
    "Plepic OÜ — agentic-coding training for software agencies (10–50 employees) in Nordic-Baltic region.",
    "YouTube channel @plepic-agentic, content = tutorial / walkthrough screen recordings of Claude Code workflows, plus short vlogs.",
    "ICP: software agency owners, CEOs, senior developers. They care about winning tenders, delivering faster, credibility with enterprise clients.",
    "Content pillars (LinkedIn): Opinion (takes on incentive alignment) + Community (moments from meetups). YouTube pillar: practical how-to + agentic workflow demos.",
    "CTA target: plepic.com/training. Always append ?utm_source=youtube&utm_content=<slug>.",
    "Banned marketing clichés: listed in system prompt. Hard fail.",
  ].join("\n");
}

// ---------- sync verification gate ----------

// Re-Whisper the rendered video and compare each ASS cue's start time
// against the audio word that should land there. Asserts avg drift < 300ms
// and max drift < 1500ms; on failure writes sync-report.json and throws.
// Costs ~30s + ~$0.005/run; skipped when WHISPER_MOCK=1 (don't burn API
// budget in tests) and when there are no captions to verify.
async function verifySyncOrThrow(
  videoFile: string,
  assPath: string,
  workDir: string
): Promise<void> {
  if (process.env.WHISPER_MOCK === "1") {
    console.log("verifySync: WHISPER_MOCK=1 — skipping sync gate");
    return;
  }
  if (!fs.existsSync(assPath)) {
    console.log("verifySync: no ASS file — nothing to verify");
    return;
  }

  const audioPath = path.join(workDir, "edited-audio.ogg");
  console.log("verifySync: extracting audio from rendered video...");
  runFfmpeg(
    [
      "-i", videoFile,
      "-vn", "-ac", "1", "-ar", "16000",
      "-c:a", "libopus", "-b:a", "32k",
      audioPath,
    ],
    { silent: true }
  );

  console.log("verifySync: re-transcribing rendered audio...");
  const res = await callWhisper(audioPath);
  const editedWords = res.words;

  const ass = fs.readFileSync(assPath, "utf8");
  const cueLines = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
  const cues = cueLines.map((line) => {
    const parts = line.replace(/^Dialogue:\s*/, "").split(",");
    const start = parseAssTime(parts[1]);
    const end = parseAssTime(parts[2]);
    const text = stripAssOverrides(parts.slice(9).join(",")).trim();
    return { start, end, text };
  });

  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9.]/g, "");
  const drifts: number[] = [];
  const matchDetails: Array<{ cue_t: number; audio_t: number; drift: number; word: string }> = [];
  let unmatched = 0;

  for (const cue of cues) {
    const firstWord = cue.text.split(/\s+/)[0];
    const target = norm(firstWord);
    if (!target) continue;
    let best: { word: typeof editedWords[number]; tdiff: number } | null = null;
    for (const ew of editedWords) {
      if (norm(ew.text) !== target) continue;
      const tdiff = Math.abs(ew.start - cue.start);
      if (!best || tdiff < best.tdiff) best = { word: ew, tdiff };
    }
    if (best && best.tdiff < 5) {
      const drift = best.word.start - cue.start;
      drifts.push(drift);
      matchDetails.push({ cue_t: cue.start, audio_t: best.word.start, drift, word: firstWord });
    } else {
      unmatched++;
    }
  }

  const avgDrift = drifts.length === 0 ? 0 : drifts.reduce((s, d) => s + Math.abs(d), 0) / drifts.length;
  const maxDrift = drifts.length === 0 ? 0 : Math.max(...drifts.map((d) => Math.abs(d)));
  const matched = drifts.length;

  const report = {
    video: videoFile,
    ass: assPath,
    cues_total: cues.length,
    cues_matched: matched,
    cues_unmatched: unmatched,
    avg_drift_seconds: Number(avgDrift.toFixed(3)),
    max_drift_seconds: Number(maxDrift.toFixed(3)),
    avg_threshold: 0.3,
    max_threshold: 1.5,
    matches: matchDetails,
  };

  // Always write the report — we want it on disk on both pass and fail so
  // failures are debuggable without rerunning Whisper.
  const reportPath = path.join(workDir, "sync-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    `verifySync: ${matched}/${cues.length} cues matched, avg |drift| ${avgDrift.toFixed(3)}s, max ${maxDrift.toFixed(3)}s`
  );

  if (avgDrift >= 0.3 || maxDrift >= 1.5) {
    throw new Error(
      `caption sync drift exceeds threshold (avg ${avgDrift.toFixed(2)}s, max ${maxDrift.toFixed(2)}s). See ${reportPath}.`
    );
  }
  // Cues without any audio matches are also a failure mode — the rendered
  // audio doesn't contain the spoken text, which usually means the splice
  // dropped speech or the ASS file is for a different video.
  if (cues.length > 0 && matched === 0) {
    throw new Error(
      `caption sync: 0 of ${cues.length} cues matched any audio word. See ${reportPath}.`
    );
  }
}

function parseAssTime(s: string): number {
  const [h, m, sec] = s.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(sec);
}

function stripAssOverrides(s: string): string {
  return s.replace(/\{[^}]*\}/g, "");
}

// ---------- end-card render (Playwright one-shot) ----------

// Render the end-card PNG (cream bg + butterfly + Plepic.com wordmark) at the
// caller's exact width/height so ffmpeg overlays it 1:1 with no scaling.
// Playwright is already a dev dep here (visual regression). One-shot launch
// per pipeline invocation is fine — ~600ms overhead, runs once.
async function renderEndCard(
  width: number,
  height: number,
  outPath: string
): Promise<void> {
  if (!fs.existsSync(END_CARD_LOGO_SVG)) {
    throw new Error(`end-card SVG not found: ${END_CARD_LOGO_SVG}`);
  }
  const svgRaw = fs.readFileSync(END_CARD_LOGO_SVG, "utf8");
  // Strip width/height from the source SVG so CSS sizing wins.
  const svgInline = svgRaw.replace(/\s(width|height)="[^"]*"/g, "");

  // Scale typography off the rendered height so 1080-tall preview frames
  // and 3840-tall iPhone-4K frames both look proportional.
  const wordmarkPx = Math.round(height * 0.2);
  const butterflyPx = Math.round(height * 0.25);
  const gapPx = Math.round(height * 0.025);

  const html = `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Zilla+Slab:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #faf7f2;
    --green-brand: #137b30;
    --text: #1c1c1a;
  }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${width}px; height: ${height}px;
    background: var(--bg);
    display: flex; flex-direction: row;
    align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--text);
    gap: ${gapPx}px;
  }
  .butterfly { width: ${butterflyPx}px; height: ${butterflyPx}px; flex-shrink: 0; }
  .wordmark {
    font-family: 'Zilla Slab', serif;
    font-weight: 700;
    font-size: ${wordmarkPx}px;
    color: var(--green-brand);
    letter-spacing: 0.005em;
    line-height: 1;
  }
</style>
</head><body>
  <div class="butterfly">${svgInline}</div>
  <div class="wordmark">Plepic.com</div>
</body></html>`;

  // Lazy-require so non-vlog runs don't pay Playwright's import cost.
  const { chromium } = require("playwright") as typeof import("playwright");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.setContent(html);
    // page.evaluate runs in the browser context; cast through unknown so
    // tsconfig (Node lib only) doesn't try to resolve `document` against
    // Node's built-in types.
    await page.evaluate(
      "document.fonts.ready" as unknown as () => Promise<unknown>
    );
    await page.waitForTimeout(300);
    await page.screenshot({ path: outPath, fullPage: false });
  } finally {
    await browser.close();
  }
}

// Full-frame outro card: the result-card screenshot stacked over the Plepic
// logo + a link line, on a cream background. Shown for the last OUTRO_SECONDS
// when --outro-image is provided. Screenshot is embedded as a data URI so
// paths with spaces don't matter.
export async function renderOutroCard(
  width: number,
  height: number,
  opts: { screenshotPath: string; link: string },
  outPath: string
): Promise<void> {
  if (!fs.existsSync(END_CARD_LOGO_SVG)) {
    throw new Error(`end-card SVG not found: ${END_CARD_LOGO_SVG}`);
  }
  if (!fs.existsSync(opts.screenshotPath)) {
    throw new Error(`outro screenshot not found: ${opts.screenshotPath}`);
  }
  const svgInline = fs
    .readFileSync(END_CARD_LOGO_SVG, "utf8")
    .replace(/\s(width|height)="[^"]*"/g, "");
  const ext = path.extname(opts.screenshotPath).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  const shotUrl = `data:${mime};base64,${fs.readFileSync(opts.screenshotPath).toString("base64")}`;

  const butterflyPx = Math.round(height * 0.17);
  const linkPx = Math.round(height * 0.044);
  const gapPx = Math.round(height * 0.05);
  const padY = Math.round(height * 0.08);

  const html = `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Zilla+Slab:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg: #faf7f2; --green-brand: #137b30; --text: #1c1c1a; }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${width}px; height: ${height}px; background: var(--bg);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: ${gapPx}px; padding: ${padY}px 0; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text);
  }
  .butterfly { width: ${butterflyPx}px; height: ${butterflyPx}px; flex-shrink: 0; }
  .shot { width: 86%; border-radius: ${Math.round(height * 0.02)}px;
    box-shadow: 0 ${Math.round(height * 0.01)}px ${Math.round(height * 0.032)}px rgba(0,0,0,0.14); }
  .link { font-size: ${linkPx}px; font-weight: 800; color: var(--green-brand); letter-spacing: 0.01em; }
</style>
</head><body>
  <div class="butterfly">${svgInline}</div>
  <img class="shot" src="${shotUrl}">
  ${opts.link ? `<div class="link">${opts.link}</div>` : ""}
</body></html>`;

  const { chromium } = require("playwright") as typeof import("playwright");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.setContent(html);
    await page.evaluate("document.fonts.ready" as unknown as () => Promise<unknown>);
    await page.waitForTimeout(300);
    await page.screenshot({ path: outPath, fullPage: false });
  } finally {
    await browser.close();
  }
}

// Burn ASS captions + an optional bottom URL strip + the outro overlay onto a
// vlog. Shared by edit() and runCaptionsOnly() so the two never diverge. The
// outro is either a full-frame composed card (when outroImage is set) overlaid
// at y=0, or the legacy logo end-card on the bottom third. The URL strip is
// hidden once the outro takes over (enable lt(t,outroStart)).
async function burnVlogOverlays(
  inputVideo: string,
  outVideo: string,
  o: {
    assPath: string | null;
    width: number;
    height: number;
    wantOutro: boolean;
    outroStart: number;
    outroImage: string | null;
    link: string | null;
    workDir: string;
  }
): Promise<void> {
  const fontsDir = path.join(__dirname, "fonts");

  let overlayPng: string | null = null;
  let overlayY = 0;
  if (o.wantOutro) {
    overlayPng = path.join(o.workDir, "end-card.png");
    if (o.outroImage) {
      console.log(`  rendering outro card (screenshot + logo + link) ${o.width}×${o.height}...`);
      await renderOutroCard(o.width, o.height, { screenshotPath: o.outroImage, link: o.link ?? "" }, overlayPng);
      overlayY = 0;
    } else {
      const ecHeight = Math.round(o.height * END_CARD_HEIGHT_FRACTION);
      console.log(`  rendering end card ${o.width}×${ecHeight}...`);
      await renderEndCard(o.width, ecHeight, overlayPng);
      overlayY = o.height - ecHeight;
    }
  }

  const assStep = o.assPath
    ? `ass='${o.assPath.replace(/'/g, "\\'")}':fontsdir='${fontsDir.replace(/'/g, "\\'")}'`
    : null;

  let stripStep: string | null = null;
  if (o.link) {
    const fontFile = path.join(fontsDir, "ZillaSlab-Bold.ttf").replace(/'/g, "\\'");
    const fontSize = Math.round(o.height * 0.04);
    const barH = Math.round(o.height * 0.09);
    const cream = CAPTION_BG_COLOR.replace("#", "0x");
    const green = CAPTION_COLOR_EMPHASIS.replace("#", "0x");
    // Full-width opaque cream bar pinned to the bottom for the whole video,
    // with a thin green top rule so the strip edge reads on light backgrounds,
    // and the link centered in green. The full-frame outro card covers it at
    // the very end.
    // NOTE: in drawbox expressions `h`/`w` mean the box's own size; the frame
    // dimensions are `ih`/`iw`. (drawtext below uses `h` = frame height.)
    const bar = `drawbox=x=0:y=ih-${barH}:w=iw:h=${barH}:color=${cream}:t=fill`;
    const rule = `drawbox=x=0:y=ih-${barH}:w=iw:h=4:color=${green}:t=fill`;
    const txt =
      `drawtext=fontfile='${fontFile}':text='${o.link}':fontsize=${fontSize}:` +
      `fontcolor=${green}:x=(w-text_w)/2:y=h-${barH}+(${barH}-text_h)/2`;
    stripStep = `${bar},${rule},${txt}`;
  }

  const steps = [assStep, stripStep].filter(Boolean).join(",");
  const args = ["-i", inputVideo];
  if (overlayPng) args.push("-i", overlayPng);
  if (overlayPng) {
    const filter = [
      `[0:v]${steps || "null"}[v0]`,
      `[v0][1:v]overlay=0:${overlayY}:enable='gte(t,${o.outroStart.toFixed(2)})'[v]`,
    ].join(";");
    args.push("-filter_complex", filter, "-map", "[v]", "-map", "0:a");
  } else if (steps) {
    args.push("-vf", steps);
  }
  args.push("-c:a", "copy", outVideo);
  runFfmpeg(args, { silent: true });
}

// ---------- phase: makeThumbnail ----------

function makeThumbnail(
  sourceFile: string,
  metadata: VideoMetadata,
  format: Format,
  workDir: string,
  opts: { timestamp: number | null } = { timestamp: null }
): string {
  const outPath = path.join(workDir, "thumbnail.png");
  const [width, height] = format === "vlog" ? [1080, 1920] : [1280, 720];

  // Either pick a candidate frame via thumbnail filter (ranks frames by how
  // "interesting" they are) or seek to a specific timestamp when the caller
  // provides one (useful when the auto-pick grabs the wrong face).
  const framePath = path.join(workDir, "thumbnail-frame.png");
  if (opts.timestamp !== null) {
    console.log(`makeThumbnail: seeking to ${opts.timestamp}s for frame grab`);
    runFfmpeg(
      [
        "-ss",
        String(opts.timestamp),
        "-i",
        sourceFile,
        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
        "-frames:v",
        "1",
        framePath,
      ],
      { silent: true }
    );
  } else {
    runFfmpeg(
      [
        "-i",
        sourceFile,
        "-vf",
        `thumbnail=n=100,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
        "-frames:v",
        "1",
        framePath,
      ],
      { silent: true }
    );
  }

  // Overlay: a cream-on-brand box near the bottom, padded symmetrically.
  // Box height accounts for up to 2 lines of text + inner padding so the
  // drawtext never overflows the drawbox.
  const text = shortenForThumbnail(metadata.title, format);
  const fontSize = format === "vlog" ? 64 : 50;
  const boxMargin = format === "vlog" ? 60 : 50;
  const innerPad = format === "vlog" ? 50 : 40;
  const wrapChars = format === "vlog" ? 18 : 30;
  const lineSpacing = 8;
  const boxH = format === "vlog" ? 380 : 170;
  const boxY = height - boxH - (format === "vlog" ? 140 : 50);

  // Render one drawtext filter per wrapped line. The textfile-with-newlines
  // path renders `\n` as a tofu glyph in some ffmpeg builds, so we stack
  // per-line filters instead and compute each y coordinate explicitly.
  const lines = wrapText(text, wrapChars).split("\n");
  const drawtextFilters = lines.map((line, i) => {
    const y = boxY + innerPad + i * (fontSize + lineSpacing);
    return `drawtext=fontfile='${FONT_PATH}':text='${escFfText(line)}':fontcolor=${BRAND_GREEN_DARK}:fontsize=${fontSize}:x=${boxMargin + innerPad}:y=${y}`;
  });

  runFfmpeg(
    [
      "-i",
      framePath,
      "-vf",
      [
        `drawbox=x=${boxMargin}:y=${boxY}:w=${width - boxMargin * 2}:h=${boxH}:color=${BRAND_CREAM}@0.93:t=fill`,
        ...drawtextFilters,
      ].join(","),
      "-frames:v",
      "1",
      outPath,
    ],
    { silent: true }
  );

  console.log(`makeThumbnail: ${outPath} (${width}×${height})`);
  return outPath;
}

function shortenForThumbnail(title: string, format: Format): string {
  const cap = format === "vlog" ? 50 : 70;
  if (title.length <= cap) return title;
  const cut = title.lastIndexOf(" ", cap);
  return title.slice(0, cut > 20 ? cut : cap);
}

function escFfText(s: string): string {
  // Escape characters that have special meaning inside an ffmpeg drawtext
  // filter argument (the filter parser uses `\`, `:`, `,`, `'`, `[`, `]`).
  return s
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function wrapText(s: string, maxChars: number): string {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur: string[] = [];
  let curLen = 0;
  for (const w of words) {
    if (curLen + w.length + (cur.length ? 1 : 0) > maxChars) {
      if (cur.length) lines.push(cur.join(" "));
      cur = [w];
      curLen = w.length;
    } else {
      cur.push(w);
      curLen += w.length + (cur.length > 1 ? 1 : 0);
    }
  }
  if (cur.length) lines.push(cur.join(" "));
  return lines.join("\n");
}

// ---------- phase: uploadToYoutube ----------

async function uploadToYoutube(
  videoFile: string,
  metadata: VideoMetadata,
  thumbnailFile: string,
  opts: { unlisted: boolean; format: Format; srtPath: string | null },
  log: PublishLog,
  workDir: string
): Promise<{ videoId: string; url: string; studioUrl: string; quotaUsed: number }> {
  if (process.env.YT_MOCK === "1") {
    console.log("uploadToYoutube: YT_MOCK=1, skipping real upload");
    const fakeId = "MOCK" + Math.random().toString(36).slice(2, 10);
    return {
      videoId: fakeId,
      url: `https://youtu.be/${fakeId}`,
      studioUrl: `https://studio.youtube.com/video/${fakeId}/edit`,
      quotaUsed: 0,
    };
  }

  const required = ["YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"];
  for (const k of required) {
    if (!process.env[k]) throw new Error(`${k} not set — run youtube-auth.ts`);
  }

  const oauth = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID!,
    process.env.YT_CLIENT_SECRET!
  );
  oauth.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN! });
  const youtube = google.youtube({ version: "v3", auth: oauth });

  const privacy = opts.unlisted ? "unlisted" : "public";
  console.log(`uploadToYoutube: uploading (${privacy})...`);

  // Vertical + short duration alone isn't a reliable Shorts-classification
  // signal; the #Shorts hashtag is. Append it for vlogs.
  const description =
    opts.format === "vlog"
      ? `${metadata.description.trimEnd()}\n\n#Shorts`
      : metadata.description;

  const insertRes = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: metadata.title,
        description,
        tags: metadata.tags,
        categoryId: "28", // Science & Technology
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoFile),
    },
  });

  const videoId = insertRes.data.id;
  if (!videoId) throw new Error("YouTube upload returned no video id");

  console.log(`uploadToYoutube: video ${videoId}`);

  // Thumbnail
  console.log("uploadToYoutube: setting thumbnail...");
  await youtube.thumbnails.set({
    videoId,
    media: { body: fs.createReadStream(thumbnailFile) },
  });

  // Captions (long-form only — vlogs have burned-in captions).
  // Skipped silently if the SRT file is missing (user deleted it, or a
  // language-detection concern means we'd rather let YouTube auto-caption).
  if (opts.srtPath && opts.format === "long" && fs.existsSync(opts.srtPath)) {
    console.log("uploadToYoutube: uploading captions...");
    await youtube.captions.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId,
          language: "en",
          name: "English",
          isDraft: false,
        },
      },
      media: { body: fs.createReadStream(opts.srtPath) },
    });
  } else if (opts.format === "long") {
    console.log("uploadToYoutube: no SRT present — YouTube will auto-caption.");
  }

  const url = `https://youtu.be/${videoId}`;
  const studioUrl = `https://studio.youtube.com/video/${videoId}/edit`;
  console.log(`uploadToYoutube: ${url}`);
  console.log(`uploadToYoutube: Studio ${studioUrl}`);

  return {
    videoId,
    url,
    studioUrl,
    quotaUsed: YT_QUOTA_COST_UPLOAD + (opts.srtPath ? 400 : 0) + 50,
  };
}

// ---------- phase: prepareLinkedIn ----------

async function prepareLinkedIn(
  videoFile: string,
  metadata: VideoMetadata,
  format: Format,
  duration: number,
  workDir: string
): Promise<string> {
  const liDir = path.join(workDir, "linkedin");
  ensureDir(liDir);

  const size = fs.statSync(videoFile).size;
  const tooLong = duration > LI_MAX_MINUTES * 60;
  const tooBig = size > LI_MAX_BYTES;

  if (process.env.LI_MOCK === "1") {
    fs.copyFileSync(videoFile, path.join(liDir, "video.mp4"));
    fs.writeFileSync(path.join(liDir, "caption.txt"), buildLinkedInCaption(metadata, format));
    return liDir;
  }

  if (tooLong || tooBig) {
    console.log(
      `prepareLinkedIn: source too long/big (${duration.toFixed(1)}s, ${(size / 1024 / 1024).toFixed(1)}MB) — producing teaser`
    );
    const teaser = path.join(liDir, "video-teaser.mp4");
    runFfmpeg(
      [
        "-i",
        videoFile,
        "-t",
        String(LI_TEASER_MAX_SEC),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        teaser,
      ],
      { silent: true }
    );
  } else {
    fs.copyFileSync(videoFile, path.join(liDir, "video.mp4"));
  }

  fs.writeFileSync(path.join(liDir, "caption.txt"), buildLinkedInCaption(metadata, format));
  fs.writeFileSync(
    path.join(liDir, "INSTRUCTIONS.txt"),
    [
      "Manual LinkedIn upload (pre-API-approval):",
      "1. Open LinkedIn, create a new post",
      "2. Upload video.mp4 (or video-teaser.mp4 if present)",
      "3. Paste the contents of caption.txt as the post text",
      "4. Publish",
      "",
      "Once LinkedIn Developer Platform approval lands, prepareLinkedIn will POST to the API and skip this folder.",
    ].join("\n")
  );

  console.log(`prepareLinkedIn: ${liDir}`);
  return liDir;
}

function buildLinkedInCaption(metadata: VideoMetadata, format: Format): string {
  const firstLine = metadata.description.split("\n")[0];
  const ytTeaser =
    format === "long"
      ? "Full video on YouTube: https://www.youtube.com/@plepic-agentic"
      : "";
  return [firstLine, "", ytTeaser].filter(Boolean).join("\n").trim();
}

// ---------- plan file helpers ----------

function readPlanFile(slug: string): { content: string; format?: Format } | null {
  const candidates = fs
    .readdirSync(VIDEO_PLANS_DIR)
    .filter((f) => f.endsWith(`-${slug}.md`) || f.includes(slug))
    .sort()
    .reverse();
  if (candidates.length === 0) return null;
  const content = fs.readFileSync(path.join(VIDEO_PLANS_DIR, candidates[0]), "utf8");
  const formatMatch = content.match(/format:\s*(vlog|long)/i);
  return {
    content,
    format: formatMatch ? (formatMatch[1].toLowerCase() as Format) : undefined,
  };
}

// ---------- captions-only rerun ----------

// Find an existing workdir for a source file. Prefers the most-recent plain
// `<date>-<slug>` entry; falls back to the most-recent suffixed sibling
// (`-z` ... `-a`) if no plain entry exists for any date.
function findExistingWorkDir(sourceFile: string): string | null {
  const slug = slugify(path.basename(sourceFile, path.extname(sourceFile)));
  if (!fs.existsSync(WORK_ROOT)) return null;
  const candidates = fs
    .readdirSync(WORK_ROOT)
    .filter((d) => {
      const m = d.match(/^\d{4}-\d{2}-\d{2}-(.+?)(-[a-z])?$/);
      return m !== null && m[1] === slug;
    });
  if (candidates.length === 0) return null;
  const plainCandidates = candidates.filter((c) => !/-[a-z]$/.test(c)).sort();
  if (plainCandidates.length > 0) {
    return path.join(WORK_ROOT, plainCandidates[plainCandidates.length - 1]);
  }
  candidates.sort();
  return path.join(WORK_ROOT, candidates[candidates.length - 1]);
}

async function runCaptionsOnly(opts: CliOptions): Promise<void> {
  const startedAt = Date.now();
  const workDir = findExistingWorkDir(opts.sourceFile);
  const slug = slugify(path.basename(opts.sourceFile, path.extname(opts.sourceFile)));
  if (!workDir) {
    throw new Error(
      `--captions-only: no existing workdir for "${slug}" under ${WORK_ROOT}; run a full pipeline first.`
    );
  }
  console.log(`\n=== video-publish (captions-only) ===`);
  console.log(`source slug: ${slug}`);
  console.log(`reusing workdir: ${workDir}`);

  const transcriptPath = path.join(workDir, "transcript.json");
  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`--captions-only: ${transcriptPath} missing; cannot reuse without transcript.`);
  }
  const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, "utf8")) as Transcript;
  const transcript: Transcript = {
    words: transcriptData.words,
    language: transcriptData.language,
    duration: transcriptData.duration,
    fullText: transcriptData.fullText,
    srtText: transcriptData.srtText ?? "",
  };

  // Source for the captioned render: edited-no-captions.mp4 if present
  // (newer workdirs); else reconstruct it from the persisted concat-list.txt.
  const editedNoCaptions = path.join(workDir, "edited-no-captions.mp4");
  if (!fs.existsSync(editedNoCaptions)) {
    const concatList = path.join(workDir, "concat-list.txt");
    if (!fs.existsSync(concatList)) {
      throw new Error(
        `--captions-only: neither edited-no-captions.mp4 nor concat-list.txt present in ${workDir}; cannot rebuild splice.`
      );
    }
    console.log("captions-only: rebuilding edited-no-captions.mp4 from concat-list.txt...");
    runFfmpeg(
      ["-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", editedNoCaptions],
      { silent: true }
    );
  }

  // Working copy that ffmpeg will write to (matching full-pipeline contract).
  const edited = path.join(workDir, "edited.mp4");
  fs.copyFileSync(editedNoCaptions, edited);

  const editedInfo = probeVideoInfo(edited);
  const editedDuration = editedInfo.duration || transcript.duration;
  const wantCaptions = !opts.noCaptions;
  const outroSecs = opts.outroImage ? OUTRO_SECONDS : END_CARD_SECONDS;
  const wantEndCard = editedDuration >= outroSecs + 2;
  const endCardStart = Math.max(0, editedDuration - outroSecs);

  const log: PublishLog = readPublishLogIfExists(workDir) ?? {
    slug,
    format: "vlog",
    source_path: opts.sourceFile,
    started_at: new Date(startedAt).toISOString(),
    phases_completed: [],
    youtube: null,
    linkedin: null,
    quota_units_used: 0,
    duration_seconds: null,
    errors: [],
  };

  // Reuse plan loading from the full pipeline. Explicit --plan wins; else
  // look up by slug. Captions-only is exactly the use case where plan
  // alignment matters most (you're iterating on caption styling).
  let planContent: string | null = null;
  if (opts.planPath && fs.existsSync(opts.planPath)) {
    planContent = fs.readFileSync(opts.planPath, "utf8");
  } else {
    const found = readPlanFile(slug);
    if (found) planContent = found.content;
  }

  // Apply the same normalization the full pipeline does, before computing
  // keeps. transcript.json on disk stays untouched (raw Whisper artifact);
  // normalization runs in memory each re-run so a later plan edit picks up
  // new corrections without re-running Whisper.
  if (planContent) {
    const scriptTokens = parseSpokenScriptTokens(planContent);
    if (scriptTokens.length > 0) {
      transcript.words = normalizeWhisperOutput(transcript.words, scriptTokens);
    }
  }

  // Recompute the keeps used by the splice so we can remap word timestamps.
  // The pre-recorded edited-no-captions.mp4 was produced from the same
  // transcript, so the same keeps fall out (deterministic given inputs).
  const keeps: Array<[number, number]> = opts.noCuts
    ? [[0, transcript.duration || editedDuration]]
    : computeKeepRanges(transcript.words, transcript.duration || editedDuration);

  let assPath: string | null = null;
  if (wantCaptions) {
    const fontSize = Math.max(
      24,
      Math.round(CAPTION_FONT_SIZE_VLOG * (editedInfo.height / 1920))
    );
    const editedWords = remapWordsToEdited(transcript.words, keeps);
    const captionableWords = editedWords.filter((w) => {
      const t = w.text.toLowerCase().replace(/[^a-z\s']/g, "").trim();
      return !FILLER_WORDS.has(t);
    });
    let cues: Cue[] | null = null;
    if (planContent) {
      const aligned = alignTranscriptToScript(captionableWords, planContent);
      if (aligned && aligned.matchRatio >= 0.8) {
        cues = aligned.cues;
        console.log(
          `captions-only: plan-aligned ${aligned.cues.length} cues (${(aligned.matchRatio * 100).toFixed(0)}% script match)`
        );
      }
    }
    if (cues === null) {
      cues = chunkCuesViaClaude(captionableWords);
      if (cues === null) {
        console.warn("captions-only: chunking via Claude unavailable; using mechanical groupCues");
        cues = groupCues(captionableWords);
      }
    }
    if (wantEndCard) {
      cues = cues.filter((c) => c.start < endCardStart);
    }
    assPath = path.join(workDir, "captions.ass");
    fs.writeFileSync(assPath, wordsToAss(cues, editedInfo.height || 1920, fontSize));
    console.log(`captions-only: wrote ${cues.length} cues to ${assPath}`);
  }

  if (wantCaptions || wantEndCard) {
    const captioned = path.join(workDir, "edited-captioned.mp4");
    await burnVlogOverlays(edited, captioned, {
      assPath,
      width: editedInfo.width,
      height: editedInfo.height,
      wantOutro: wantEndCard,
      outroStart: endCardStart,
      outroImage: opts.outroImage,
      link: opts.link,
      workDir,
    });
    fs.renameSync(captioned, edited);
  }

  if (assPath) {
    await verifySyncOrThrow(edited, assPath, workDir);
  }

  log.errors.push(`captions-only rerun at ${new Date().toISOString()}`);
  writePublishLog(workDir, log);

  console.log(`\n=== done (captions-only, ${((Date.now() - startedAt) / 1000).toFixed(1)}s) ===`);
  console.log(`edited: ${edited}`);
  openInVlc(edited, opts);
}

// Open the rendered file in VLC (preferred — handles big 4K vertical files
// without dropping frames). Falls back to macOS `open` (Quick Look) if VLC
// isn't installed. Skipped in any mock env so test runs don't pop a player.
function openInVlc(file: string, opts: CliOptions): void {
  if (opts.noOpen) return;
  if (
    process.env.WHISPER_MOCK === "1" ||
    process.env.CLAUDE_MOCK === "1" ||
    process.env.CLAUDE_CHUNK_MOCK === "1" ||
    process.env.YT_MOCK === "1" ||
    process.env.LI_MOCK === "1"
  ) {
    return;
  }
  if (process.platform !== "darwin") return;
  const vlc = spawnSync("open", ["-a", OPEN_PREVIEW_WITH, file], { encoding: "utf8" });
  if (vlc.status !== 0) {
    spawnSync("open", [file], { encoding: "utf8" });
  }
}

// Archive workdirs with a `<YYYY-MM-DD>-` prefix older than 7 days into
// `_archive/<dir>-<unix-ts>/`. Logs each move; never deletes.
function cleanOldWorkDirs(): void {
  if (!fs.existsSync(WORK_ROOT)) {
    console.log(`clean: ${WORK_ROOT} does not exist; nothing to do.`);
    return;
  }
  const archiveDir = path.join(WORK_ROOT, "_archive");
  ensureDir(archiveDir);
  const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const candidates = fs
    .readdirSync(WORK_ROOT)
    .filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d) && d !== "_archive");
  const moved: string[] = [];
  for (const d of candidates) {
    const datePart = d.slice(0, 10);
    const dateMs = Date.parse(datePart);
    if (!Number.isFinite(dateMs) || dateMs > cutoffMs) continue;
    const src = path.join(WORK_ROOT, d);
    const dest = path.join(archiveDir, `${d}-${Math.floor(Date.now() / 1000)}`);
    fs.renameSync(src, dest);
    moved.push(`${src} -> ${dest}`);
  }
  if (moved.length === 0) {
    console.log("clean: no workdirs older than 7 days.");
    return;
  }
  console.log(`clean: archived ${moved.length} workdir(s):`);
  for (const m of moved) console.log(`  ${m}`);
}

// ---------- main orchestrator ----------

async function main(): Promise<void> {
  ensureDir(INBOX_DIR);
  ensureDir(WORK_ROOT);
  ensureDir(ARCHIVE_DIR);
  ensureDir(FIXTURES_DIR);
  ensureDir(VIDEO_PLANS_DIR);

  const opts = parseArgs();

  if (opts.clean) {
    cleanOldWorkDirs();
    return;
  }

  if (opts.captionsOnly) {
    await runCaptionsOnly(opts);
    return;
  }

  const startedAt = Date.now();

  console.log(`\n=== video-publish ===`);
  console.log(`source: ${opts.sourceFile}`);
  if (opts.planPath) console.log(`plan: ${opts.planPath}`);
  if (opts.interactive) console.log(`mode: interactive`);
  if (opts.dryRun) console.log(`mode: dry-run (no YouTube upload)`);
  if (opts.unlisted) console.log(`privacy: unlisted`);

  // Detect format
  const format = detectFormat(opts.sourceFile);

  // Derive initial slug from filename (will be replaced by metadata.slug)
  const initialSlug = slugify(path.basename(opts.sourceFile, path.extname(opts.sourceFile)));
  const workDir = ensureWorkDir(today(), initialSlug, opts.force);
  console.log(`work: ${workDir}`);

  // Idempotency check
  const existing = readPublishLogIfExists(workDir);
  if (existing?.youtube?.video_id && !opts.force) {
    throw new Error(
      `Already published (video_id=${existing.youtube.video_id}). Use --force to re-upload.`
    );
  }

  const log: PublishLog = {
    slug: initialSlug,
    format,
    source_path: opts.sourceFile,
    started_at: new Date(startedAt).toISOString(),
    phases_completed: [],
    youtube: null,
    linkedin: null,
    quota_units_used: 0,
    duration_seconds: null,
    errors: [],
  };

  try {
    // Phase: transcribe
    const transcript = await transcribe(opts.sourceFile, workDir);
    log.phases_completed.push("transcribe");
    writePublishLog(workDir, log);
    await pauseIfInteractive(
      opts.interactive,
      "transcribe — review transcript.json / transcript.srt"
    );

    // Read plan upfront — edit() needs it for plan-aligned cues, and metadata
    // generation reads it later. Same source either way.
    let planContent: string | null = null;
    if (opts.planPath && fs.existsSync(opts.planPath)) {
      planContent = fs.readFileSync(opts.planPath, "utf8");
    } else {
      const found = readPlanFile(initialSlug);
      if (found) planContent = found.content;
      else console.log("generateMetadata: no plan found — degraded mode (transcript only)");
    }

    // Phase: edit
    const editedFile = await edit(
      opts.sourceFile,
      transcript,
      format,
      workDir,
      { noCaptions: opts.noCaptions, planMarkdown: planContent, outroImage: opts.outroImage, link: opts.link, noCuts: opts.noCuts },
      log
    );
    log.phases_completed.push("edit");
    writePublishLog(workDir, log);
    await pauseIfInteractive(opts.interactive, `edit — inspect ${editedFile}`);

    // Phase: generate metadata
    const metadata = await generateMetadata(transcript, planContent, initialSlug);
    log.slug = metadata.slug;
    fs.writeFileSync(
      path.join(workDir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );
    log.phases_completed.push("metadata");
    writePublishLog(workDir, log);
    console.log(`\n--- metadata preview ---`);
    console.log(`Title: ${metadata.title}`);
    console.log(`Description:\n${metadata.description.slice(0, 400)}...`);
    console.log(`Tags: ${metadata.tags.join(", ")}`);
    console.log(
      `Chapters: ${metadata.chapters.length ? metadata.chapters.map((c) => `${c.timestamp} ${c.title}`).join(" | ") : "(none)"}`
    );
    console.log(`------------------------`);
    await pauseIfInteractive(opts.interactive, "metadata — review fields");

    // Phase: thumbnail
    const thumbnail = makeThumbnail(editedFile, metadata, format, workDir, {
      timestamp: opts.thumbnailTime,
    });
    log.phases_completed.push("thumbnail");
    writePublishLog(workDir, log);
    await pauseIfInteractive(opts.interactive, `thumbnail — open ${thumbnail}`);

    // Preview + approval (non-interactive vlog path)
    if (!opts.interactive) {
      console.log(`\n=== PREVIEW ===`);
      console.log(`Title: ${metadata.title}`);
      console.log(`Description: ${metadata.description.slice(0, 200)}...`);
      console.log(`Thumbnail: ${thumbnail}`);
      console.log(`Edited: ${editedFile}`);
      console.log(`================`);
      const ok = await promptYesNo("Upload to YouTube? (y/N) ");
      if (!ok) {
        console.log("Aborted — nothing uploaded.");
        return;
      }
    }

    // Phase: YouTube upload (skipped if dry-run)
    if (opts.dryRun) {
      console.log("--dry-run: skipping YouTube upload");
      log.youtube = {
        video_id: null,
        url: null,
        studio_url: null,
        upload_session_url: null,
        privacy: opts.unlisted ? "unlisted" : "public",
      };
    } else {
      const ytRes = await uploadToYoutube(
        editedFile,
        metadata,
        thumbnail,
        {
          unlisted: opts.unlisted,
          format,
          srtPath: path.join(workDir, "transcript.srt"),
        },
        log,
        workDir
      );
      log.youtube = {
        video_id: ytRes.videoId,
        url: ytRes.url,
        studio_url: ytRes.studioUrl,
        upload_session_url: null,
        privacy: opts.unlisted ? "unlisted" : "public",
      };
      log.quota_units_used += ytRes.quotaUsed;
      log.phases_completed.push("youtube");
      writePublishLog(workDir, log);
    }

    // Phase: LinkedIn handoff
    const liPath = await prepareLinkedIn(
      editedFile,
      metadata,
      format,
      transcript.duration,
      workDir
    );
    log.linkedin = { assets_path: liPath, post_url: null };
    log.phases_completed.push("linkedin-prep");

    // Archive source
    if (!opts.dryRun && !process.env.YT_MOCK) {
      const archived = path.join(ARCHIVE_DIR, path.basename(opts.sourceFile));
      try {
        fs.renameSync(opts.sourceFile, archived);
        console.log(`archived: ${archived}`);
      } catch (err) {
        console.warn(`archive skipped: ${err instanceof Error ? err.message : err}`);
      }
    }

    log.finished_at = new Date().toISOString();
    log.duration_seconds = (Date.now() - startedAt) / 1000;
    writePublishLog(workDir, log);

    // Mirror text artifacts into the repo for historical record.
    // (Raw / edited videos stay in ~/Documents/plepic-video/; they are not committed.)
    const repoArtifactDir = path.join(
      VIDEO_ARTIFACTS_ROOT,
      `${today()}-${log.slug}`
    );
    ensureDir(repoArtifactDir);
    for (const name of [
      "transcript.json",
      "transcript.srt",
      "metadata.json",
      "thumbnail.png",
      "publish-log.json",
    ]) {
      const src = path.join(workDir, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(repoArtifactDir, name));
    }
    console.log(`repo artifacts: ${repoArtifactDir}`);

    console.log(`\n=== done (${log.duration_seconds?.toFixed(1)}s) ===`);
    if (log.youtube?.url) console.log(`YouTube: ${log.youtube.url}`);
    if (log.youtube?.studio_url) console.log(`Studio:  ${log.youtube.studio_url}`);
    console.log(`LinkedIn assets: ${liPath}`);
    openInVlc(editedFile, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.errors.push(redactSecrets(msg));
    log.finished_at = new Date().toISOString();
    log.duration_seconds = (Date.now() - startedAt) / 1000;
    writePublishLog(workDir, log);
    console.error(`\nvideo-publish failed: ${msg}`);
    process.exit(1);
  }
}

function ensureWorkDir(date: string, slug: string, force = false): string {
  const base = path.join(WORK_ROOT, `${date}-${slug}`);
  if (!fs.existsSync(base)) {
    ensureDir(base);
    return base;
  }
  // --force: archive the existing same-slug workdir into _archive/ rather
  // than letting `-a` ... `-z` collision suffixes accumulate. Keeps disk
  // usage predictable; the archived copy is still recoverable.
  if (force) {
    const archiveRoot = path.join(WORK_ROOT, "_archive");
    ensureDir(archiveRoot);
    const dest = path.join(archiveRoot, `${date}-${slug}-${Math.floor(Date.now() / 1000)}`);
    fs.renameSync(base, dest);
    console.log(`force: archived prior workdir to ${dest}`);
    ensureDir(base);
    return base;
  }
  // Collision (no --force): append -a, -b, ...
  for (let c = "a".charCodeAt(0); c <= "z".charCodeAt(0); c++) {
    const suffix = String.fromCharCode(c);
    const candidate = `${base}-${suffix}`;
    if (!fs.existsSync(candidate)) {
      ensureDir(candidate);
      return candidate;
    }
  }
  throw new Error(`Too many collisions for ${base}`);
}

// Only run main() when this file is the entrypoint. Lets tests import the
// helpers without spawning the pipeline.
if (require.main === module) {
  main().catch((err) => {
    console.error(redactSecrets(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
}
