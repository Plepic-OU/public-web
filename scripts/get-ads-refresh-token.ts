#!/usr/bin/env npx ts-node
/**
 * Get OAuth2 refresh token for Google Ads API
 *
 * This script opens a browser for OAuth authentication and outputs
 * the refresh token to add to your .env file.
 *
 * Usage: npx ts-node scripts/get-ads-refresh-token.ts
 */

import * as http from 'http';
import * as url from 'url';
import * as dotenv from 'dotenv';
import open from 'open';

dotenv.config();

const CLIENT_ID = process.env.ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.ADS_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:8080/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/adwords'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing ADS_CLIENT_ID or ADS_CLIENT_SECRET in .env file');
  process.exit(1);
}

async function getRefreshToken(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a simple HTTP server to receive the OAuth callback
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);

      if (parsedUrl.pathname === '/oauth2callback') {
        const code = parsedUrl.query.code as string;

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error: No authorization code received</h1>');
          server.close();
          reject(new Error('No authorization code'));
          return;
        }

        try {
          // Exchange the authorization code for tokens
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              client_id: CLIENT_ID!,
              client_secret: CLIENT_SECRET!,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code',
            }),
          });

          const tokens = await tokenResponse.json();

          if (tokens.error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error: ${tokens.error}</h1><p>${tokens.error_description}</p>`);
            server.close();
            reject(new Error(tokens.error_description || tokens.error));
            return;
          }

          console.log('\n=== SUCCESS ===\n');
          console.log('Add this to your .env file:\n');
          console.log(`ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log('\n===============\n');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #22c55e;">Success!</h1>
                <p>Your refresh token has been printed to the terminal.</p>
                <p>Add it to your <code>.env</code> file as:</p>
                <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto;">ADS_REFRESH_TOKEN=${tokens.refresh_token}</pre>
                <p>You can close this window now.</p>
              </body>
            </html>
          `);

          server.close();
          resolve();
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error exchanging code for tokens</h1><pre>${error}</pre>`);
          server.close();
          reject(error);
        }
      }
    });

    server.listen(8080, () => {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(CLIENT_ID!)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log('Opening browser for authentication...');
      console.log('If it doesn\'t open automatically, visit:');
      console.log(authUrl);
      console.log('');

      open(authUrl);
    });

    server.on('error', reject);
  });
}

getRefreshToken()
  .then(() => {
    console.log('Done! You can now run the Google Ads export script.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to get refresh token:', error);
    process.exit(1);
  });
