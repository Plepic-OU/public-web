/**
 * YouTube Channel Data Export Script
 *
 * Exports channel + per-video analytics for @plepic-agentic, using the
 * YouTube Data API v3 (for all-time stats and video metadata) and the
 * YouTube Analytics API v2 (for time-boxed stats: views, watch time, CTR,
 * traffic sources). Matches the shape and invocation pattern of export-ads.ts.
 *
 * Usage:
 *   npx ts-node scripts/export-youtube.ts
 *   npx ts-node scripts/export-youtube.ts --test
 *   npx ts-node scripts/export-youtube.ts --dry-run
 *   npx ts-node scripts/export-youtube.ts --date 2026-04-17
 *
 * Requires: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN, YT_CHANNEL_ID.
 * Run scripts/youtube-auth.ts once first to populate the last two.
 */

import "dotenv/config";
import { google, youtube_v3, youtubeAnalytics_v2 } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const REPORTS_DIR = path.join(__dirname, "..", "analytics", "reports");

const TOP_VIDEO_LIMIT = 20;

interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  channel_id: string;
}

interface YouTubeReport {
  date: string;
  date_range: {
    start: string;
    end: string;
  };
  channel: {
    id: string;
    title: string;
    handle: string | null;
    url: string;
  };
  summary: {
    subscriber_count: number;
    total_views: number;
    total_videos: number;
    views_7d: number;
    watch_time_minutes_7d: number;
    avg_view_duration_sec_7d: number;
    likes_7d: number;
    subscribers_gained_7d: number;
    subscribers_lost_7d: number;
  };
  videos: VideoStats[];
  traffic_sources: TrafficSource[];
}

interface VideoStats {
  video_id: string;
  title: string;
  published_at: string;
  url: string;
  views_all_time: number;
  views_7d: number;
  watch_time_minutes_7d: number;
  avg_view_duration_sec_7d: number;
  likes_7d: number;
}

interface TrafficSource {
  source_type: string;
  views: number;
  watch_time_minutes: number;
}

function loadCredentials(): YouTubeCredentials {
  const required = [
    "YT_CLIENT_ID",
    "YT_CLIENT_SECRET",
    "YT_REFRESH_TOKEN",
    "YT_CHANNEL_ID",
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")} in public-web/.env. ` +
        `Run "npx ts-node scripts/youtube-auth.ts" to set up OAuth.`
    );
  }
  return {
    client_id: process.env.YT_CLIENT_ID!,
    client_secret: process.env.YT_CLIENT_SECRET!,
    refresh_token: process.env.YT_REFRESH_TOKEN!,
    channel_id: process.env.YT_CHANNEL_ID!,
  };
}

function initializeClients(credentials: YouTubeCredentials): {
  youtube: youtube_v3.Youtube;
  analytics: youtubeAnalytics_v2.Youtubeanalytics;
} {
  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret
  );
  oauth2Client.setCredentials({ refresh_token: credentials.refresh_token });
  return {
    youtube: google.youtube({ version: "v3", auth: oauth2Client }),
    analytics: google.youtubeAnalytics({ version: "v2", auth: oauth2Client }),
  };
}

function shiftDate(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split("T")[0];
}

async function fetchChannel(
  youtube: youtube_v3.Youtube
): Promise<YouTubeReport["channel"] & { total_videos: number; total_views: number; subscriber_count: number; uploads_playlist_id: string }> {
  const res = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    mine: true,
  });
  const channel = res.data.items?.[0];
  if (!channel?.id || !channel.snippet?.title) {
    throw new Error("channels.list?mine=true returned no channel.");
  }
  const handle = channel.snippet.customUrl ?? null;
  return {
    id: channel.id,
    title: channel.snippet.title,
    handle,
    url: handle
      ? `https://www.youtube.com/${handle}`
      : `https://www.youtube.com/channel/${channel.id}`,
    subscriber_count: parseInt(channel.statistics?.subscriberCount ?? "0", 10),
    total_views: parseInt(channel.statistics?.viewCount ?? "0", 10),
    total_videos: parseInt(channel.statistics?.videoCount ?? "0", 10),
    uploads_playlist_id:
      channel.contentDetails?.relatedPlaylists?.uploads ?? "",
  };
}

async function fetchRecentUploadIds(
  youtube: youtube_v3.Youtube,
  uploadsPlaylistId: string
): Promise<string[]> {
  if (!uploadsPlaylistId) return [];
  const res = await youtube.playlistItems.list({
    part: ["contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults: 50,
  });
  return (res.data.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));
}

async function fetchVideoMetadata(
  youtube: youtube_v3.Youtube,
  videoIds: string[]
): Promise<
  Map<string, { title: string; published_at: string; views_all_time: number }>
> {
  if (videoIds.length === 0) return new Map();
  const res = await youtube.videos.list({
    part: ["snippet", "statistics"],
    id: videoIds,
    maxResults: 50,
  });
  const map = new Map<
    string,
    { title: string; published_at: string; views_all_time: number }
  >();
  for (const v of res.data.items ?? []) {
    if (!v.id) continue;
    map.set(v.id, {
      title: v.snippet?.title ?? "(no title)",
      published_at: v.snippet?.publishedAt ?? "",
      views_all_time: parseInt(v.statistics?.viewCount ?? "0", 10),
    });
  }
  return map;
}

async function fetchChannelAnalytics7d(
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  startDate: string,
  endDate: string
): Promise<{
  views_7d: number;
  watch_time_minutes_7d: number;
  avg_view_duration_sec_7d: number;
  likes_7d: number;
  subscribers_gained_7d: number;
  subscribers_lost_7d: number;
}> {
  const baseRes = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics:
      "views,estimatedMinutesWatched,averageViewDuration,likes,subscribersGained,subscribersLost",
  });
  const baseRow = baseRes.data.rows?.[0] ?? [0, 0, 0, 0, 0, 0];

  return {
    views_7d: Number(baseRow[0] ?? 0),
    watch_time_minutes_7d: Number(baseRow[1] ?? 0),
    avg_view_duration_sec_7d: Number(baseRow[2] ?? 0),
    likes_7d: Number(baseRow[3] ?? 0),
    subscribers_gained_7d: Number(baseRow[4] ?? 0),
    subscribers_lost_7d: Number(baseRow[5] ?? 0),
  };
}

async function fetchTopVideos7d(
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  startDate: string,
  endDate: string
): Promise<
  Array<{
    video_id: string;
    views_7d: number;
    watch_time_minutes_7d: number;
    avg_view_duration_sec_7d: number;
    likes_7d: number;
  }>
> {
  const baseRes = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    dimensions: "video",
    metrics:
      "views,estimatedMinutesWatched,averageViewDuration,likes",
    sort: "-views",
    maxResults: TOP_VIDEO_LIMIT,
  });

  const out: Array<{
    video_id: string;
    views_7d: number;
    watch_time_minutes_7d: number;
    avg_view_duration_sec_7d: number;
    likes_7d: number;
  }> = [];
  for (const row of baseRes.data.rows ?? []) {
    const id = String(row[0] ?? "");
    if (!id) continue;
    out.push({
      video_id: id,
      views_7d: Number(row[1] ?? 0),
      watch_time_minutes_7d: Number(row[2] ?? 0),
      avg_view_duration_sec_7d: Number(row[3] ?? 0),
      likes_7d: Number(row[4] ?? 0),
    });
  }

  return out;
}

async function fetchTrafficSources7d(
  analytics: youtubeAnalytics_v2.Youtubeanalytics,
  startDate: string,
  endDate: string
): Promise<TrafficSource[]> {
  const res = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    dimensions: "insightTrafficSourceType",
    metrics: "views,estimatedMinutesWatched",
    sort: "-views",
  });
  return (res.data.rows ?? []).map((row) => ({
    source_type: String(row[0] ?? ""),
    views: Number(row[1] ?? 0),
    watch_time_minutes: Number(row[2] ?? 0),
  }));
}

async function exportYouTube(
  date: string | undefined,
  options: { dryRun: boolean }
): Promise<void> {
  const endDate = date || new Date().toISOString().split("T")[0];
  const startDate = shiftDate(endDate, -6);
  console.log(`Exporting YouTube data for ${startDate} → ${endDate}...`);

  const credentials = loadCredentials();
  const { youtube, analytics } = initializeClients(credentials);

  console.log("Fetching channel metadata...");
  const channel = await fetchChannel(youtube);

  console.log("Fetching recent uploads...");
  const recentVideoIds = await fetchRecentUploadIds(
    youtube,
    channel.uploads_playlist_id
  );

  console.log("Fetching channel analytics (7-day)...");
  const channelAnalytics = await fetchChannelAnalytics7d(
    analytics,
    startDate,
    endDate
  );

  console.log("Fetching top videos analytics (7-day)...");
  const topVideoStats = await fetchTopVideos7d(analytics, startDate, endDate);

  console.log("Fetching traffic sources (7-day)...");
  const trafficSources = await fetchTrafficSources7d(
    analytics,
    startDate,
    endDate
  );

  // Merge: gather video IDs from both "recent uploads" and "top videos",
  // pull metadata for the union, build the videos array keyed by top-video order
  // so the report leads with what moved this week.
  const videoIdUnion = Array.from(
    new Set([...topVideoStats.map((v) => v.video_id), ...recentVideoIds])
  );
  const metadata = await fetchVideoMetadata(youtube, videoIdUnion);
  const topVideoStatsMap = new Map(
    topVideoStats.map((v) => [v.video_id, v])
  );

  const videos: VideoStats[] = videoIdUnion
    .map((video_id) => {
      const meta = metadata.get(video_id);
      const stats = topVideoStatsMap.get(video_id);
      return {
        video_id,
        title: meta?.title ?? "(unknown)",
        published_at: meta?.published_at ?? "",
        url: `https://youtu.be/${video_id}`,
        views_all_time: meta?.views_all_time ?? 0,
        views_7d: stats?.views_7d ?? 0,
        watch_time_minutes_7d: stats?.watch_time_minutes_7d ?? 0,
        avg_view_duration_sec_7d: stats?.avg_view_duration_sec_7d ?? 0,
        likes_7d: stats?.likes_7d ?? 0,
      };
    })
    .sort((a, b) => b.views_7d - a.views_7d);

  const report: YouTubeReport = {
    date: endDate,
    date_range: { start: startDate, end: endDate },
    channel: {
      id: channel.id,
      title: channel.title,
      handle: channel.handle,
      url: channel.url,
    },
    summary: {
      subscriber_count: channel.subscriber_count,
      total_views: channel.total_views,
      total_videos: channel.total_videos,
      ...channelAnalytics,
    },
    videos,
    traffic_sources: trafficSources,
  };

  if (options.dryRun) {
    console.log("\n--- Dry run — report NOT written ---");
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  const reportPath = path.join(REPORTS_DIR, `${endDate}-youtube.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${reportPath}`);

  console.log("\n--- Summary ---");
  console.log(`Channel: ${report.channel.title} (${report.channel.handle ?? "no handle"})`);
  console.log(`Subscribers: ${report.summary.subscriber_count}`);
  console.log(`Total views: ${report.summary.total_views}`);
  console.log(`Total videos: ${report.summary.total_videos}`);
  console.log(`Views (7d): ${report.summary.views_7d}`);
  console.log(`Watch time (7d): ${report.summary.watch_time_minutes_7d} min`);
  console.log(`Subs +/- (7d): +${report.summary.subscribers_gained_7d} / -${report.summary.subscribers_lost_7d}`);
  console.log(`Likes (7d): ${report.summary.likes_7d}`);
  console.log(`Videos tracked: ${report.videos.length}`);
  console.log(`Traffic sources: ${report.traffic_sources.length}`);
}

async function testConnection(): Promise<void> {
  console.log("Testing YouTube API connection...");
  try {
    const credentials = loadCredentials();
    const { youtube } = initializeClients(credentials);
    const channel = await fetchChannel(youtube);
    console.log("Connection successful!");
    console.log(`  Channel ID:   ${channel.id}`);
    console.log(`  Channel name: ${channel.title}`);
    console.log(`  Handle:       ${channel.handle ?? "(none)"}`);
    console.log(`  Subscribers:  ${channel.subscriber_count}`);
    console.log(`  Total videos: ${channel.total_videos}`);
    if (channel.id !== credentials.channel_id) {
      console.warn(
        `\nWARNING: channel.id (${channel.id}) does not match YT_CHANNEL_ID (${credentials.channel_id}). ` +
          "The refresh token points to a different channel than the one pinned in .env. " +
          "Rerun youtube-auth.ts and select the correct brand account."
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("Connection failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const args = process.argv.slice(2);

if (args.includes("--test")) {
  testConnection();
} else {
  const dateIndex = args.indexOf("--date");
  const date = dateIndex !== -1 ? args[dateIndex + 1] : undefined;
  const dryRun = args.includes("--dry-run");
  exportYouTube(date, { dryRun }).catch((error) => {
    console.error("Export failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
