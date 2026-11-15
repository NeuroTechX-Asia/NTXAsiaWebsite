"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contact dialog.
 *
 * The address is never in the HTML or the JS bundle. With a mail provider configured
 * the visitor writes into a form and the recipient stays server-side; without one,
 * the address is fetched on click, in three shifted integer chunks, and assembled in
 * memory.
 */
export default function ContactDialog({ open, onClose, t }) {
  const ref = useRef(null);
  const firstField = useRef(null);
  const addressRef = useRef(null);

  const [mode, setMode] = useState("loading"); // loading | form | reveal | none
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      setState("idle");
      setError("");
      setAddress("");
      setCopied(false);
      dlg.showModal();
      const id = window.setTimeout(() => firstField.current?.focus(), 40);
      fetch("/api/contact", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setMode(j.mode || "none"))
        .catch(() => setMode("none"));
      return () => window.clearTimeout(id);
    }
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const onCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener("cancel", onCancel);
    return () => dlg.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const reveal = async () => {
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "x-ntx-action": "reveal" },
        body: "{}",
      });
      const json = await res.json();
      if (!res.ok || !json.p) {
        setState("error");
        setError(t.contact.errors[json.error] || t.contact.errors.network);
        return;
      }
      // three chunks, each shifted by its own offset — assembled only here
      const decoded = json.p
        .map((part) => part.c.map((v) => String.fromCharCode(v - part.o)).join(""))
        .join("");
      setAddress(decoded);
      setState("idle");
      window.setTimeout(() => addressRef.current?.select(), 60);
    } catch {
      setState("error");
      setError(t.contact.errors.network);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      addressRef.current?.select();
      document.execCommand?.("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const mailto = `mailto:${address}?subject=${encodeURIComponent(t.contact.mailSubject)}`;

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        form.reset();
        setState("sent");
        return;
      }
      if (json.error === "not_configured") {
        setMode("reveal");
        setState("idle");
        return;
      }
      setError(t.contact.errors[json.error] || t.contact.errors.network);
      setState("error");
    } catch {
      setError(t.contact.errors.network);
      setState("error");
    }
  };

  return (
    <dialog
      ref={ref}
      className="contact-dialog"
      aria-labelledby="contact-title"
      onClick={(e) => {
        // click on the backdrop (the dialog box itself, outside the panel) closes
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="contact-panel">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">{t.contact.eyebrow}</p>
            <h2 id="contact-title" className="mt-3 font-display text-xl font-bold">
              {t.contact.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="contact-close" aria-label={t.contact.close}>
            ✕
          </button>
        </div>

        {mode === "none" && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
            {t.contact.errors.not_configured}
          </p>
        )}

        {mode === "reveal" && (
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.contact.revealNote}</p>

            {address ? (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <input
                    ref={addressRef}
                    readOnly
                    value={address}
                    onFocus={(e) => e.currentTarget.select()}
                    className="contact-input font-mono sm:flex-1"
                    aria-label={t.contact.email}
                  />
                  <button type="button" onClick={copy} className="btn-ghost">
                    {copied ? t.contact.copied : t.contact.copy}
                  </button>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <a href={mailto} className="btn-primary">
                    {t.contact.write} <span aria-hidden="true">→</span>
                  </a>
                  <span className="text-xs text-muted-foreground">{t.contact.privacy}</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={reveal}
                disabled={state === "sending"}
                className="btn-primary mt-6"
              >
                {state === "sending" ? t.contact.sending : t.contact.revealCta}
              </button>
            )}

            {state === "error" && (
              <p className="mt-4 text-xs text-amber-300" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {mode === "form" &&
          (state === "sent" ? (
            <div className="py-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{t.contact.success}</p>
              <button type="button" onClick={onClose} className="btn-ghost mt-6">
                {t.contact.close}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="contact-label">{t.contact.name}</span>
                  <input
                    ref={firstField}
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    className="contact-input"
                  />
                </label>
                <label className="block">
                  <span className="contact-label">{t.contact.email}</span>
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={120}
                    autoComplete="email"
                    className="contact-input"
                  />
                </label>
              </div>

              <label className="block">
                <span className="contact-label">{t.contact.topic}</span>
                <select name="topic" className="contact-input" defaultValue={t.contact.topics[0]}>
                  {t.contact.topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="contact-label">{t.contact.message}</span>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  className="contact-input resize-y"
                />
              </label>

              {/* honeypot — hidden from humans, filled by bots */}
              <input
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="contact-honeypot"
              />

              {state === "error" && (
                <p className="text-xs text-amber-300" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button type="submit" disabled={state === "sending"} className="btn-primary">
                  {state === "sending" ? t.contact.sending : t.contact.send}
                </button>
                <span className="text-xs text-muted-foreground">{t.contact.privacy}</span>
              </div>
            </form>
          ))}
      </div>
    </dialog>
  );
}
