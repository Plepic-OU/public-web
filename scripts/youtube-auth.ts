/**
 * YouTube OAuth Setup Script (one-time)
 *
 * Walks Kaido through OAuth consent for the @plepic-agentic brand account,
 * then persists the refresh token and channel ID to public-web/.env.
 *
 * GCP prerequisites (one-time, done in console):
 *   1. Project: top-cubist-465911-v4
 *   2. Enable APIs: YouTube Data API v3, YouTube Analytics API
 *   3. Create OAuth 2.0 Client ID → type "Desktop app" → name "YouTube Pipeline"
 *   4. Copy client ID + secret into .env as YT_CLIENT_ID / YT_CLIENT_SECRET
 *   5. Start Production verification application (long lead — sensitive scopes
 *      in sub-project 2 require it). Readonly scopes here work in Testing mode.
 *
 * Usage:
 *   npx ts-node scripts/youtube-auth.ts
 *
 * Requests full scopes in a single auth (readonly + upload + force-ssl).
 * Until Production verification lands, the OAuth client is in Testing mode:
 *   - Refresh tokens expire after 7 days (re-run this script weekly to refresh)
 *   - Only test users listed on the OAuth consent screen can authenticate.
 *     Add kaido@plepic.com (or the account managing the brand channel) as a
 *     test user in the GCP OAuth consent screen settings.
 */

import "dotenv/config";
import { google } from "googleapis";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { URL } from "url";

const ENV_PATH = path.join(__dirname, "..", ".env");

// Full scopes: requested in a single auth up-front (diverges from the spec's
// staged least-privilege approach — conscious tradeoff made 2026-04-20:
// one-time setup over a re-auth when sub-project 2 ships, at the cost of a
// higher blast radius if the refresh token leaks.
const SCOPES_FULL = [
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

const EXPECTED_CHANNEL_HANDLE = "@plepic-agentic";

function loadClientCredentials(): { clientId: string; clientSecret: string } {
  if (!process.env.YT_CLIENT_ID || !process.env.YT_CLIENT_SECRET) {
    throw new Error(
      "Missing YT_CLIENT_ID / YT_CLIENT_SECRET in public-web/.env. " +
        "Create an OAuth Desktop client in GCP console (project top-cubist-465911-v4), " +
        "then add both values. See .env.example for details."
    );
  }
  return {
    clientId: process.env.YT_CLIENT_ID,
    clientSecret: process.env.YT_CLIENT_SECRET,
  };
}

async function pickAvailablePort(
  candidates: number[]
): Promise<number> {
  for (const port of candidates) {
    const available = await new Promise<boolean>((resolve) => {
      const probe = http.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error(
    `No free port found in ${candidates.join(", ")}. Close whatever is holding them and retry.`
  );
}

async function runLoopbackAuthFlow(
  clientId: string,
  clientSecret: string,
  scopes: string[]
): Promise<{ refreshToken: string; accessToken: string }> {
  const port = await pickAvailablePort([3000, 3001, 3002, 3003]);
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  console.log("\n========================================");
  console.log("1. Open this URL in a browser:");
  console.log(authUrl);
  console.log("\n2. CRITICAL: on the account picker, choose the Plepic");
  console.log("   brand account — NOT your personal kaido@plepic.com.");
  console.log(`   The target channel is ${EXPECTED_CHANNEL_HANDLE}.`);
  console.log("\n3. Authorize the requested scopes.");
  console.log("   The callback will return here automatically.");
  console.log("========================================\n");

  const code = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("OAuth callback timed out after 5 minutes."));
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const error = url.searchParams.get("error");
      const receivedCode = url.searchParams.get("code");
      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          `<h1>OAuth error</h1><p>${error}</p><p>You can close this tab.</p>`
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`OAuth consent returned error: ${error}`));
        return;
      }
      if (!receivedCode) {
        res.writeHead(400);
        res.end("Missing authorization code");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h1>Authorization received</h1><p>You can close this tab and return to the terminal.</p>"
      );
      clearTimeout(timeout);
      server.close();
      resolve(receivedCode);
    });

    server.listen(port, "127.0.0.1");
  });

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token returned. This usually means Google remembered a previous consent. " +
        "Revoke this app at https://myaccount.google.com/permissions and retry."
    );
  }
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token || "",
  };
}

async function fetchChannelIdentity(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ id: string; title: string; handle: string | null }> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const res = await youtube.channels.list({
    part: ["snippet"],
    mine: true,
  });
  const channel = res.data.items?.[0];
  if (!channel?.id || !channel.snippet?.title) {
    throw new Error(
      "channels.list?mine=true returned no channel. Did you pick a Google account " +
        "that isn't linked to any YouTube channel?"
    );
  }
  return {
    id: channel.id,
    title: channel.snippet.title,
    handle: channel.snippet.customUrl ?? null,
  };
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

function upsertEnvFile(updates: Record<string, string>): void {
  let lines: string[] = [];
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  }
  const remaining = { ...updates };
  const rewritten = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match && match[1] in remaining) {
      const key = match[1];
      const value = remaining[key];
      delete remaining[key];
      return `${key}=${value}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(remaining)) {
    rewritten.push(`${key}=${value}`);
  }
  const body = rewritten.join("\n").replace(/\n+$/, "") + "\n";
  fs.writeFileSync(ENV_PATH, body);
  fs.chmodSync(ENV_PATH, 0o600);
}

async function main(): Promise<void> {
  const { clientId, clientSecret } = loadClientCredentials();

  console.log("Starting YouTube OAuth flow (full scopes: analytics + upload)...");
  const { refreshToken } = await runLoopbackAuthFlow(
    clientId,
    clientSecret,
    SCOPES_FULL
  );

  console.log("\nToken received. Verifying which channel it points to...");
  const channel = await fetchChannelIdentity(
    clientId,
    clientSecret,
    refreshToken
  );

  console.log("\n--- Channel identity ---");
  console.log(`  Title:   ${channel.title}`);
  console.log(`  ID:      ${channel.id}`);
  console.log(`  Handle:  ${channel.handle ?? "(none returned)"}`);
  console.log(`  Expected handle: ${EXPECTED_CHANNEL_HANDLE}`);
  console.log("------------------------\n");

  const matchesExpected =
    channel.handle?.toLowerCase() === EXPECTED_CHANNEL_HANDLE.toLowerCase();
  if (!matchesExpected) {
    console.log(
      `WARNING: handle does not match ${EXPECTED_CHANNEL_HANDLE}. ` +
        "If this is not the Plepic brand channel, answer N and rerun, " +
        "picking the correct brand account on the Google account picker."
    );
  }

  const confirmed = await promptYesNo(
    `Persist this refresh token for "${channel.title}"? (y/N) `
  );
  if (!confirmed) {
    console.log("Aborted — nothing written. Rerun and select the correct brand account.");
    process.exit(1);
  }

  upsertEnvFile({
    YT_REFRESH_TOKEN: refreshToken,
    YT_CHANNEL_ID: channel.id,
  });
  console.log(`\nSaved YT_REFRESH_TOKEN + YT_CHANNEL_ID=${channel.id} to ${ENV_PATH}`);
  console.log("Mode: 600 (owner read/write only).");
  console.log("Next: npx ts-node scripts/export-youtube.ts --test");
}

main().catch((error) => {
  console.error("\nyoutube-auth failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
