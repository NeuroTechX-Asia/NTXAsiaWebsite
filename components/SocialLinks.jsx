"use client";

import { useCallback, useRef, useState } from "react";

import { SOCIAL_CHANNELS } from "../content/social";
import { decodeChunks } from "../lib/obfuscate";
import { SOCIAL_PATHS } from "./social-icons";

/**
 * Icon-only community channels for the footer's "global network" column.
 *
 * Plain channels are ordinary links. The guarded ones (Discord, WhatsApp) ask
 * `/api/social` for the invite encoded in shifted integer chunks and open the
 * tab only once it decodes, so the URL never appears in the HTML, the bundle or
 * the network response as a string.
 *
 * The tab is opened synchronously on click (`about:blank`) and navigated after
 * the fetch: opening it inside the `await` continuation is what popup blockers
 * silently drop. If the browser refuses the popup anyway, the invite opens in
 * the current tab — a social icon that does nothing is worse than one that
 * leaves the page.
 */
export default function SocialLinks({ t }) {
  const cache = useRef(new Map());
  const [busy, setBusy] = useState("");
  const [failed, setFailed] = useState("");

  const open = useCallback(async (item) => {
    const known = cache.current.get(item.id);
    if (known) {
      window.open(known, "_blank", "noopener,noreferrer");
      return;
    }

    const tab = window.open("about:blank", "_blank");
    setBusy(item.id);
    setFailed("");
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "x-ntx-action": "reveal" },
        body: JSON.stringify({ id: item.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.p) throw new Error(json.error || "unavailable");
      const url = decodeChunks(json.p);
      cache.current.set(item.id, url);
      if (tab) {
        tab.opener = null;
        tab.location.replace(url);
      } else {
        window.location.assign(url);
      }
    } catch {
      tab?.close();
      setFailed(item.id);
    } finally {
      setBusy("");
    }
  }, []);

  return (
    <>
      <ul className="social-row" aria-label={t.footer.socialLabel}>
        {SOCIAL_CHANNELS.map((item) => (
          <li key={item.id}>
            {item.guarded ? (
              <button
                type="button"
                className="social-btn"
                onClick={() => open(item)}
                aria-label={item.label}
                aria-busy={busy === item.id}
                title={item.label}
              >
                <Icon id={item.id} />
              </button>
            ) : (
              <a
                className="social-btn"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.label}${item.note ? ` — ${item.note}` : ""}`}
                title={`${item.label}${item.note ? ` — ${item.note}` : ""}`}
              >
                <Icon id={item.id} />
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className={failed ? "social-note social-note-error" : "social-note"}>
        {failed === "" ? t.footer.socialNote : t.footer.socialError}
      </p>
    </>
  );
}

function Icon({ id }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d={SOCIAL_PATHS[id]} fill="currentColor" />
    </svg>
  );
}
