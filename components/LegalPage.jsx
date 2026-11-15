"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { LEGAL } from "../content/legal";
import { swapLocale } from "../content/locales";

export default function LegalPage({ kind, locale = "zh" }) {
  const doc = LEGAL[kind];
  const router = useRouter();
  const pathname = usePathname();
  const lang = locale;

  const switchLang = () => {
    const next = lang === "zh" ? "en" : "zh";
    try {
      document.cookie = `ntx-lang=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch (e) {}
    router.push(swapLocale(pathname || "/", next));
  };

  const T = (v) => (v && typeof v === "object" ? v[lang] : v);

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 md:py-20">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/${lang}`} className="brand flex items-center gap-2 font-display text-base font-bold tracking-tight">
          <img src="/assets/ntx-mark.png" alt="" aria-hidden="true" className="ntx-mark" />
          <span>
            NeuroTech<span className="text-neuro-accent">X</span>
          </span>
          <span className="brand-chip rounded border border-border px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.18em] text-muted-foreground">
            ASIA&nbsp;-&nbsp;CHINA
          </span>
        </Link>
        <button
          onClick={switchLang}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-neuro-accent hover:text-foreground"
          aria-label="Switch language"
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>
      </div>

      <header className="section-head mt-12">
        <p className="eyebrow">{kind === "privacy" ? "PRIVACY" : "TERMS"}</p>
        <h1 className="display-h2">{T(doc.title)}</h1>
        <p>{T(doc.lead)}</p>
      </header>

      <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {lang === "zh" ? "最后更新" : "Last updated"} · {doc.updated}
      </p>

      <nav className="legal-toc mt-10" aria-label={lang === "zh" ? "目录" : "Contents"}>
        {doc.sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`}>
            <span className="legal-toc-num">{String(i + 1).padStart(2, "0")}</span>
            {T(s.h)}
          </a>
        ))}
      </nav>

      <div className="legal-body mt-12">
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="legal-section">
            <h2>
              <span className="legal-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {T(s.h)}
            </h2>
            {s.p.map((para, k) => (
              <p key={k}>{T(para)}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-14 border-t border-border pt-8">
        <Link href={`/${lang}`} className="btn-ghost text-sm">
          ← {lang === "zh" ? "返回首页" : "Back to home"}
        </Link>
      </div>
    </main>
  );
}
