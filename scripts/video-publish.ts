/**
 * Video Publishing Pipeline
 *
 * Single-file pipeline that takes a raw video (iPhone vlog or Mac screen-recorded
 * tutorial), transcribes it, removes filler words and long pauses, generates
 * SEO-ready metadata and a thumbnail, and publishes to YouTube + prepares a
 * LinkedIn handoff folder. Sub-project 2 of the YouTube automation spec.
 *
 * Usage:
 *   npx ts-node scripts/video-publish.ts ~/plepic-video/inbox/IMG_1234.MOV
 *   npx ts-node scripts/video-publish.ts <file> --interactive   (pause between phases)
 *   npx ts-node scripts/video-publish.ts <file> --plan <path>   (explicit W11 plan)
 *   npx ts-node scripts/video-publish.ts <file> --dry-run       (skip YT upload)
 *   npx ts-node scripts/video-publish.ts <file> --unlisted      (upload as unlisted)
 *   npx ts-node scripts/video-publish.ts <file> --force         (override idempotency)
 *   npx ts-node scripts/video-publish.ts <file> --no-captions   (skip caption burn-in)
 *   npx ts-node scripts/video-publish.ts <file> --thumbnail-time 2047   (grab thumbnail frame at 2047s)
 *
 * Mock mode env switches (for contract tests + offline iteration):
 *   WHISPER_MOCK=1     read transcript from _fixtures/mock-responses/transcript.json
 *   CLAUDE_MOCK=1      read metadata from _fixtures/mock-responses/metadata.json
 *   YT_MOCK=1          skip the YouTube upload, emit a fake video id
 *   LI_MOCK=1          prepareLinkedIn writes a minimal folder without trim
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

const VIDEO_ROOT = path.join(os.homedir(), "plepic-video");
const INBOX_DIR = path.join(VIDEO_ROOT, "inbox");
const WORK_ROOT = path.join(VIDEO_ROOT, "work");
const ARCHIVE_DIR = path.join(VIDEO_ROOT, "archive");

const REPO_ROOT = path.join(__dirname, "..");
const VIDEO_ARTIFACTS_ROOT = path.join(REPO_ROOT, "analytics", "video");
const VIDEO_PLANS_DIR = path.join(REPO_ROOT, "analytics", "video-plans");
const FIXTURES_DIR = path.join(VIDEO_ARTIFACTS_ROOT, "_fixtures");
const MOCKS_DIR = path.join(FIXTURES_DIR, "mock-responses");
const FONT_PATH = path.join(__dirname, "fonts", "ZillaSlab-Bold.ttf");

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

const MIN_PAUSE_SEC = 1.5;
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

// ---------- types ----------

type Format = "vlog" | "long";

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
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
  thumbnailTime: number | null;
}

// ---------- CLI parsing ----------

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    throw new Error(
      "Usage: video-publish.ts <file> [--interactive] [--plan <path>] " +
        "[--dry-run] [--unlisted] [--force] [--no-captions]"
    );
  }
  const sourceFile = path.resolve(args[0]);
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source video not found: ${sourceFile}`);
  }
  const planIdx = args.indexOf("--plan");
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
    thumbnailTime,
  };
}

// ---------- utilities ----------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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
    "stream=width,height,duration:format=duration",
    "-of",
    "json",
    file,
  ]);
  const data = JSON.parse(out);
  const stream = data.streams?.[0] ?? {};
  const width = stream.width ?? 0;
  const height = stream.height ?? 0;
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

// ---------- phase: edit (filler removal + silence trim + splice) ----------

async function edit(
  sourceFile: string,
  transcript: Transcript,
  format: Format,
  workDir: string,
  opts: { noCaptions: boolean }
): Promise<string> {
  // Compute keep-ranges by starting from the full video duration and cutting
  // out filler-word spans and long pauses.
  const duration = transcript.duration || probeVideoInfo(sourceFile).duration;
  const cuts: Array<[number, number]> = [];

  // Filler words
  for (let i = 0; i < transcript.words.length; i++) {
    const w = transcript.words[i];
    const token = w.text.toLowerCase().replace(/[^a-z\s']/g, "").trim();
    if (FILLER_WORDS.has(token)) {
      cuts.push([w.start - 0.05, w.end + 0.05]);
    }
  }

  // Long pauses from word gaps
  for (let i = 1; i < transcript.words.length; i++) {
    const gap = transcript.words[i].start - transcript.words[i - 1].end;
    if (gap >= MIN_PAUSE_SEC) {
      cuts.push([
        transcript.words[i - 1].end + 0.1,
        transcript.words[i].start - 0.1,
      ]);
    }
  }

  const keeps = invertCuts(cuts, duration);
  const mergedKeeps = mergeAdjacent(keeps, 0.05);
  console.log(
    `edit: ${cuts.length} cut ranges → ${mergedKeeps.length} keep segments (${duration.toFixed(1)}s total)`
  );

  // If no cuts, just copy-remux the source.
  const edited = path.join(workDir, "edited.mp4");
  if (mergedKeeps.length === 1 && cuts.length === 0) {
    runFfmpeg(["-i", sourceFile, "-c", "copy", edited], { silent: true });
  } else {
    await spliceConcat(sourceFile, mergedKeeps, edited, workDir);
  }

  // Caption burn-in for vlogs only (long-form uses SRT upload to YouTube).
  if (format === "vlog" && !opts.noCaptions) {
    const captioned = path.join(workDir, "edited-captioned.mp4");
    console.log("edit: burning in captions (vlog)...");
    runFfmpeg(
      [
        "-i",
        edited,
        "-vf",
        `subtitles='${path.join(workDir, "transcript.srt").replace(/'/g, "\\'")}':force_style='FontName=Zilla Slab,Fontsize=24,PrimaryColour=&H00faf7f2,OutlineColour=&H00224a0d,BorderStyle=3'`,
        "-c:a",
        "copy",
        captioned,
      ],
      { silent: true }
    );
    fs.renameSync(captioned, edited);
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
  "pinnedComment": "string, optional, <=500 chars — a single genuine question that invites discussion",
  "slug": "kebab-case slug <=60 chars"
}

Constraints:
- Never use "unleash", "game-changer", "revolutionize", "in this video", "don't forget to like and subscribe". Any of these fails immediately.
- Lead with the problem or the outcome, not with who Kaido is.
- Voice is Kaido's: NVC/MI-grounded, observational, specific. Follow the voice authority rules exactly.
- If a plan is provided, it is the primary seed. Transcript is secondary context — use it to ground claims but not to structure.
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
    title: String(parsed.title ?? "").trim(),
    description: String(parsed.description ?? "").trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim()) : [],
    chapters: Array.isArray(parsed.chapters)
      ? parsed.chapters.map((c: { timestamp?: string; title?: string }) => ({
          timestamp: String(c.timestamp ?? ""),
          title: String(c.title ?? ""),
        }))
      : [],
    pinnedComment: String(parsed.pinnedComment ?? "").trim(),
    slug: slugify(String(parsed.slug ?? fallbackSlug)) || fallbackSlug,
  };
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

  const insertRes = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
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

// ---------- main orchestrator ----------

async function main(): Promise<void> {
  ensureDir(INBOX_DIR);
  ensureDir(WORK_ROOT);
  ensureDir(ARCHIVE_DIR);
  ensureDir(FIXTURES_DIR);
  ensureDir(VIDEO_PLANS_DIR);

  const opts = parseArgs();
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
  const workDir = ensureWorkDir(today(), initialSlug);
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

    // Phase: edit
    const editedFile = await edit(opts.sourceFile, transcript, format, workDir, {
      noCaptions: opts.noCaptions,
    });
    log.phases_completed.push("edit");
    writePublishLog(workDir, log);
    await pauseIfInteractive(opts.interactive, `edit — inspect ${editedFile}`);

    // Read plan if provided
    let planContent: string | null = null;
    if (opts.planPath && fs.existsSync(opts.planPath)) {
      planContent = fs.readFileSync(opts.planPath, "utf8");
    } else {
      const found = readPlanFile(initialSlug);
      if (found) planContent = found.content;
      else console.log("generateMetadata: no plan found — degraded mode (transcript only)");
    }

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
    // (Raw / edited videos stay in ~/plepic-video/; they are not committed.)
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

function ensureWorkDir(date: string, slug: string): string {
  let base = path.join(WORK_ROOT, `${date}-${slug}`);
  if (!fs.existsSync(base)) {
    ensureDir(base);
    return base;
  }
  // Collision: append -a, -b, ...
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

main().catch((err) => {
  console.error(redactSecrets(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
