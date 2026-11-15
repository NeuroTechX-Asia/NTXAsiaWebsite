import { NextResponse } from "next/server";

import { encodeChunks } from "../../../lib/obfuscate";

export const runtime = "nodejs";

/**
 * Contact endpoint.
 *
 * The recipient never leaves the server: it is read from CONTACT_EMAIL at request
 * time and is never shipped to the browser, not even in a route payload. The
 * client only learns whether delivery is configured.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_TOTAL_PER_WINDOW = 60;
const MAX_REVEALS_PER_IP = 10;
const REVEAL_WINDOW_MS = 60 * 60 * 1000;

const hits = new Map(); // ip -> [timestamps]
const reveals = new Map(); // ip -> [timestamps]
let totalHits = [];

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

function rateLimited(ip) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const recent = (hits.get(ip) || []).filter((t) => t > cutoff);
  totalHits = totalHits.filter((t) => t > cutoff);

  if (recent.length >= MAX_PER_IP || totalHits.length >= MAX_TOTAL_PER_WINDOW) return true;

  recent.push(now);
  totalHits.push(now);
  hits.set(ip, recent);

  if (hits.size > 5000) {
    for (const [key, stamps] of hits) {
      if (!stamps.length || stamps[stamps.length - 1] < cutoff) hits.delete(key);
    }
  }
  return false;
}

const clean = (value, max) =>
  String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export async function GET() {
  const address = process.env.CONTACT_EMAIL;
  const provider = Boolean(address && process.env.RESEND_API_KEY);
  return NextResponse.json(
    { configured: Boolean(address), mode: !address ? "none" : provider ? "form" : "reveal" },
    { headers: { "cache-control": "no-store" } }
  );
}

/**
 * Obfuscated reveal, used when no mail provider is configured: the address is
 * cut into three chunks whose character codes are shifted by random per-chunk
 * offsets, so the response is a list of integers rather than an address. The
 * encoder is shared with the community invite links (`lib/obfuscate.js`) so
 * there is one mechanism on the site, not two.
 */

function revealLimited(ip) {
  const now = Date.now();
  const cutoff = now - REVEAL_WINDOW_MS;
  const recent = (reveals.get(ip) || []).filter((t) => t > cutoff);
  if (recent.length >= MAX_REVEALS_PER_IP) return true;
  recent.push(now);
  reveals.set(ip, recent);
  return false;
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // reveal mode: the address leaves the server split into shifted integer chunks,
  // never as a string, and only on an explicit same-origin action.
  if (request.headers.get("x-ntx-action") === "reveal") {
    const address = process.env.CONTACT_EMAIL;
    if (!address) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (revealLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    return NextResponse.json(
      { p: encodeChunks(address) },
      { headers: { "cache-control": "no-store" } }
    );
  }

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > 20000) {
    return NextResponse.json({ error: "invalid", field: "message" }, { status: 400 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid", field: "message" }, { status: 400 });
  }

  // honeypot: a hidden field no human can see; answer 200 so bots do not retry
  if (clean(body.company, 100)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const topic = clean(body.topic, 80);
  const message = String(body.message ?? "").trim().slice(0, 4000);

  if (name.length < 2) return NextResponse.json({ error: "invalid", field: "name" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "invalid", field: "email" }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "invalid", field: "message" }, { status: 400 });

  const to = process.env.CONTACT_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const from = process.env.CONTACT_FROM || "NeuroTechX Asia - China <onboarding@resend.dev>";
  const subject = `[neurotechx.asia] ${topic || "contact"} — ${name}`;

  const text = [
    `Name:  ${name}`,
    `Email: ${email}`,
    `Topic: ${topic || "-"}`,
    "",
    message,
    "",
    `— sent from neurotechx.asia (${new Date().toISOString()})`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("contact: upstream rejected", res.status, detail.slice(0, 400));
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
  } catch (err) {
    console.error("contact: send failed", err);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
