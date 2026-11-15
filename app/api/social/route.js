import { NextResponse } from "next/server";

import { encodeChunks } from "../../../lib/obfuscate";

/**
 * Community invite links that are deliberately kept out of the page.
 *
 * Discord and WhatsApp invites are the two channels that get scraped and
 * spammed, and they can be revoked at any time — so the URL lives here, on the
 * server, and the browser receives it encoded only after a click.
 * `content/social.js` carries the matching `guarded: true` entries.
 *
 * To rotate an invite, change the value below and redeploy; nothing in the UI
 * changes.
 */
const INVITES = {
  discord: "https://discord.gg/Gce4GxPJde",
  whatsapp: "https://chat.whatsapp.com/JvHlLFa0xUYHudqoXvLlvK?mode=gi_t",
};

const REVEAL_WINDOW_MS = 5 * 60 * 1000;
const MAX_REVEALS_PER_IP = 20;
const reveals = new Map(); // ip -> [timestamps]

function limited(ip) {
  const now = Date.now();
  const cutoff = now - REVEAL_WINDOW_MS;
  const recent = (reveals.get(ip) || []).filter((t) => t > cutoff);
  if (recent.length >= MAX_REVEALS_PER_IP) return true;
  recent.push(now);
  reveals.set(ip, recent);
  return false;
}

/** Which ids exist — names only, never the addresses. */
export async function GET() {
  return NextResponse.json(
    { ids: Object.keys(INVITES) },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request) {
  if (request.headers.get("x-ntx-action") !== "reveal") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const url = INVITES[String(body.id ?? "")];
  if (!url) return NextResponse.json({ error: "unknown" }, { status: 404 });

  if (limited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  return NextResponse.json(
    { p: encodeChunks(url) },
    { headers: { "cache-control": "no-store" } }
  );
}
