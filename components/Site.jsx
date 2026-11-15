"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import communityPhotos from "../content/community-photos.json";
import { HOOKS_ZH } from "../content/hooks_zh";
import ConstellationMesh from "./ConstellationMesh";
import ThemeToggle from "./ThemeToggle";
import ContactDialog from "./ContactDialog";
import AsiaChapterMap from "./AsiaChapterMap";
import SocialLinks from "./SocialLinks";
import { swapLocale } from "../content/locales";

const YOUTUBE = "https://www.youtube.com/@NeuroTechXAsia";

const FIELD_LABEL = {
  CS: { zh: "认知科学", en: "Cognitive sci." },
  BCI: { zh: "脑机接口", en: "BCI" },
  NB: { zh: "神经生物技术", en: "Neuro-biotech" },
  NM: { zh: "类脑计算", en: "Neuromorphic" },
  CN: { zh: "计算神经科学", en: "Comp. neuro" },
  NE: { zh: "神经工程", en: "Neuroengineering" },
  NAI: { zh: "NeuroAI", en: "NeuroAI" },
  AIH: { zh: "AI 医疗", en: "AI for health" },
  NBOT: { zh: "神经机器人", en: "Neurobotics" },
  NMI: { zh: "神经调控与影像", en: "Neuromod./imaging" },
};

const TYPE_LABEL = {
  University: { zh: "大学", en: "University" },
  "Research institute": { zh: "研究院 / 研究所", en: "Research institute" },
  "Research infrastructure": { zh: "科研基础设施", en: "Research infrastructure" },
  "University institute": { zh: "大学研究院", en: "University institute" },
  "University centre": { zh: "大学研究中心", en: "University centre" },
  "University lab": { zh: "大学实验室", en: "University lab" },
  Hospital: { zh: "医院 / 临床中心", en: "Hospital / clinical" },
  "Non-profit": { zh: "非营利组织", en: "Non-profit" },
  Network: { zh: "社群网络", en: "Network" },
  "Industry association": { zh: "行业协会", en: "Industry association" },
  Industry: { zh: "企业", en: "Industry" },
};

const CITY_ORDER = ["Shenzhen", "Hong Kong", "Guangzhou", "Dongguan", "Zhuhai", "Macau"];

const CITY_LABEL = {
  Shenzhen: { zh: "深圳", en: "Shenzhen" },
  "Hong Kong": { zh: "香港", en: "Hong Kong" },
  Guangzhou: { zh: "广州", en: "Guangzhou" },
  Dongguan: { zh: "东莞", en: "Dongguan" },
  Zhuhai: { zh: "珠海 · 横琴", en: "Zhuhai · Hengqin" },
  Macau: { zh: "澳门", en: "Macau" },
};

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function Logo() {
  return (
    <span className="brand flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <img src="/assets/ntx-mark.png" alt="" aria-hidden="true" className="ntx-mark" />
      <span>
        NeuroTech<span className="text-neuro-accent">X</span>
      </span>
      <span className="brand-chip rounded border border-border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground">
        ASIA&nbsp;-&nbsp;CHINA
      </span>
    </span>
  );
}

// Pillar icons — one thin-line family, drawn in currentColor so both themes work.
const PILLAR_ICONS = [
  // Community — three connected nodes, the same constellation language as the hero
  <svg key="community" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5.4" r="2.1" />
    <circle cx="5.5" cy="17.2" r="2.1" />
    <circle cx="18.5" cy="17.2" r="2.1" />
    <path d="M10.7 7.35 6.85 15.25M13.3 7.35l3.85 7.9M7.6 17.2h8.8" />
  </svg>,
  // Education — an open book
  <svg key="education" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 6.9c-1.5-1.15-3.35-1.72-5.55-1.72H5.2v10.5h1.25c2.2 0 4.05.57 5.55 1.72 1.5-1.15 3.35-1.72 5.55-1.72h1.25V5.18h-1.25c-2.2 0-4.05.57-5.55 1.72Z" />
    <path d="M12 6.9v10.5" />
  </svg>,
  // Innovation & professional development — a bulb with side ticks
  <svg key="innovation" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.5 15.2a5.3 5.3 0 1 1 5 0v1.4a1.7 1.7 0 0 1-1.7 1.7h-1.6a1.7 1.7 0 0 1-1.7-1.7v-1.4Z" />
    <path d="M10.3 21.1h3.4" />
    <path d="M3.6 9.4h1.5M18.9 9.4h1.5" />
  </svg>,
];

export default function Site({ copy, ecosystem, locale = "zh" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLang] = useState(locale);
  const [city, setCity] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    setLang(locale);
    document.documentElement.lang = copy[locale].htmlLang;
  }, [locale, copy]);

  const switchLang = () => {
    const next = lang === "zh" ? "en" : "zh";
    try {
      document.cookie = `ntx-lang=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch (e) {}
    router.push(swapLocale(pathname || `/${lang}`, next));
  };

  const t = copy[lang];

  const cities = useMemo(() => {
    const present = new Set(ecosystem.map((e) => e.city));
    return CITY_ORDER.filter((c) => present.has(c));
  }, [ecosystem]);

  const rows = useMemo(
    () => (city === "all" ? ecosystem : ecosystem.filter((e) => e.city === city)),
    [city, ecosystem]
  );

  // ecosystem slider: 6 cards per view on desktop, 4 on tablets, 2 on phones
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(6);
  const touchX = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 2 : w < 1024 ? 4 : 6);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < rows.length; i += perPage) out.push(rows.slice(i, i + perPage));
    return out;
  }, [rows, perPage]);

  const pageCount = Math.max(1, pages.length);
  const cols = perPage === 2 ? 1 : perPage === 4 ? 2 : 3;

  useEffect(() => setPage(0), [city, perPage]);
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  // Page changes never move the viewport on their own: when the pager sits at the
  // bottom edge the new cards land above the fold and the click reads as "nothing
  // happened". Bring the grid back into view whenever its top has scrolled away.
  const revealGrid = () => {
    const el = gridRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 72 || top > window.innerHeight * 0.6) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const changePage = (next) => {
    setPage((p) => {
      const target = typeof next === "function" ? next(p) : next;
      return Math.min(pageCount - 1, Math.max(0, target));
    });
    revealGrid();
  };

  const go = (delta) => changePage((p) => p + delta);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const navItems = [
    ["#chapters", t.nav.chapters],
    ["#fields", t.nav.fields],
    ["#map", t.nav.map],
    ["#events", t.nav.events],
    ["#podcast", t.nav.podcast],
  ];

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* announcement */}
      <div className="border-b border-border bg-surface-2/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-neuro-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-background">
              {t.banner.tag}
            </span>
            <span className="text-sm font-semibold">{t.banner.title}</span>
            <span className="hidden text-sm text-muted-foreground md:inline">{t.banner.meta}</span>
          </div>
          <a href="#events" className="text-xs font-semibold uppercase tracking-wider text-neuro-accent hover:underline">
            {t.banner.cta} <Arrow />
          </a>
        </div>
      </div>

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center" aria-label="NeuroTechX Asia - China">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {navItems.map(([href, label]) => (
              <a key={href} href={href} className="transition hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={switchLang}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-neuro-accent hover:text-foreground"
              aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
            >
              {t.langLabel}
            </button>
            <a href="#join" className="hidden rounded-md bg-neuro-accent px-4 py-2 text-sm font-bold text-background transition hover:bg-neuro-accent-strong md:inline-block">
              {t.nav.cta}
            </a>
            <ThemeToggle t={t} />
            <button
              className="rounded-md border border-border px-3 py-1.5 text-sm md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border px-5 py-4 md:hidden">
            {navItems.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">
                {label}
              </a>
            ))}
            <a href="#join" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold text-neuro-accent">
              {t.nav.cta}
            </a>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="mesh-layer absolute inset-0">
            <ConstellationMesh className="h-full w-full" density={1} />
          </div>
          <div className="hero-vignette pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-5 py-20 md:py-28">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            {/* the pill rides on the headline row so its centre sits on the blue
                "神经科技" line instead of the eyebrow */}
            <div className="hero-head mt-6">
              <h1 className="max-w-3xl flex-1 text-4xl font-bold leading-[1.15] lg:text-[2.9rem] xl:text-[3.5rem]">
                {t.hero.titleA} <span className="text-gradient">{t.hero.titleGradient}</span> {t.hero.titleB}
              </h1>
              <a
                href={YOUTUBE}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-podcast"
              >
                <img
                  src="/assets/yt-avatar.jpg"
                  alt=""
                  width={320}
                  height={320}
                  className="hero-podcast-avatar"
                  decoding="async"
                  aria-hidden="true"
                />
                {t.hero.podcastCta}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{t.hero.subtitle}</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#join" className="btn-primary">
                {t.hero.primary} <Arrow />
              </a>
              <a href="#map" className="btn-ghost">
                {t.hero.secondary}
              </a>
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.hero.note}</p>
          </div>
        </section>

        {/* stats */}
        <section className="border-b border-border bg-surface-1/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
            {t.stats.map((s, i) => (
              <div key={s.label}>
                {/* index 1 is the on-site entry count: always read the live array
                    rather than a number that drifts as the directory grows */}
                <div className="font-display text-3xl font-bold text-neuro-accent md:text-4xl">
                  {i === 1 ? ecosystem.length : s.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* pillars — community / education / innovation */}
        <section id="pillars" className="pillars glow glow-top mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="pillars-head">
            <p className="eyebrow">{t.pillars.eyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">
              {t.pillars.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t.pillars.sub}
            </p>
          </div>
          <ol className="pillars-grid">
            {t.pillars.items.map((p, i) => (
              <li key={p.title} className="pillar">
                <span className="pillar-icon" aria-hidden="true">
                  {PILLAR_ICONS[i % PILLAR_ICONS.length]}
                </span>
                <h3 className="pillar-title">{p.title}</h3>
                <p className="pillar-desc">{p.desc}</p>
                <span className="pillar-rule" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        {/* chapters — dotted map of Asia */}
        <section id="chapters" className="border-y border-border bg-surface-1/20">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
            <p className="eyebrow">CHAPTERS</p>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">{t.chapters.title}</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">{t.chapters.subtitle}</p>
            <div className="mt-10">
              <AsiaChapterMap t={t} lang={lang} onJoin={() => setContactOpen(true)} />
            </div>
          </div>
        </section>

        {/* fields */}
        <section id="fields" className="glow glow-left mx-auto max-w-6xl px-5 py-20 md:py-24">
          <header className="section-head">
            <p className="eyebrow">{t.nav.fields}</p>
            <h2>{t.fields.title}</h2>
            <p>{t.fields.subtitle}</p>
          </header>
          <div className="cells mt-12 grid sm:grid-cols-2 lg:grid-cols-4">
            {t.fields.items.map((f) => (
              <div key={f.name} className="cell">
                <span className="cell-icon" aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className="cell-title">{f.name}</h3>
                <p className="cell-desc">{f.desc}</p>
                <span className="cell-rule" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        {/* ecosystem map */}
        <section id="map" className="glow glow-both border-y border-border bg-surface-1/30">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
            <header className="section-head">
              <p className="eyebrow">{t.nav.map}</p>
              <h2>{t.map.title}</h2>
              <p>{t.map.subtitle}</p>
            </header>

            <div className="mt-9 flex flex-wrap gap-2">
              {["all", ...cities].map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`chip ${city === c ? "chip-active" : ""}`}
                >
                  {c === "all" ? t.map.filterAll : CITY_LABEL[c][lang]}
                  <span className="ml-2 text-xs opacity-70">
                    {c === "all" ? ecosystem.length : ecosystem.filter((e) => e.city === c).length}
                  </span>
                </button>
              ))}
            </div>

            <div
              className="mt-8"
              role="region"
              aria-roledescription="carousel"
              aria-label={t.map.title}
              tabIndex={0}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  go(1);
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  go(-1);
                }
              }}
            >
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.map.empty}</p>
              ) : (
                <>
                  <div className="overflow-hidden" ref={gridRef}>
                    <div
                      className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
                      style={{ transform: `translateX(-${page * 100}%)` }}
                    >
                      {pages.map((group, pi) => (
                        <div
                          key={pi}
                          className="w-full shrink-0"
                          aria-hidden={pi !== page}
                          inert={pi !== page}
                        >
                          <div
                            className="grid gap-4"
                            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                          >
                            {group.map((e) => (
                              <EcosystemCard key={e.name} e={e} t={t} lang={lang} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      {fmt(t.map.showing, {
                        a: page * perPage + 1,
                        b: Math.min((page + 1) * perPage, rows.length),
                        n: rows.length,
                      })}
                      <span className="ml-3 opacity-70 md:hidden">· {t.map.swipe}</span>
                    </p>

                    <div className="flex items-center gap-4">
                      {pageCount <= 8 && (
                        <div className="flex items-center gap-1.5">
                          {pages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => changePage(i)}
                              aria-label={fmt(t.map.pageOf, { a: i + 1, b: pageCount })}
                              aria-current={i === page ? "true" : undefined}
                              className={`h-1.5 rounded-full transition-all ${
                                i === page
                                  ? "w-6 bg-neuro-accent"
                                  : "w-1.5 bg-border-strong hover:bg-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      <span aria-live="polite" className="hidden text-xs text-muted-foreground sm:inline">
                        {fmt(t.map.pageOf, { a: page + 1, b: pageCount })}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => go(-1)}
                          disabled={page === 0}
                          aria-label={t.map.prev}
                          title={t.map.prev}
                          className="carousel-arrow"
                        >
                          <Chevron dir="left" />
                        </button>
                        <button
                          type="button"
                          onClick={() => go(1)}
                          disabled={page >= pageCount - 1}
                          aria-label={t.map.next}
                          title={t.map.next}
                          className="carousel-arrow"
                        >
                          <Chevron dir="right" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="mt-8 text-sm text-muted-foreground">{t.map.more}</p>
          </div>
        </section>

        {/* events — auto-playing gallery */}
        <section id="events" className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <header className="section-head">
            <p className="eyebrow">{t.nav.events}</p>
            <h2>{t.events.title}</h2>
            <p>{t.events.subtitle}</p>
          </header>
          <EventGallery t={t} lang={lang} />
        </section>

        {/* podcast — constellation card */}
        <section id="podcast" className="border-y border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
            <div className="frame glow glow-center glow-inside podcast-frame relative overflow-hidden p-8 md:p-12">
              <div className="mesh-layer absolute inset-0">
                <ConstellationMesh className="absolute inset-0 h-full w-full" density={0.85} />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/20" />
              <div className="relative z-10 max-w-2xl">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-neuro-accent/50 bg-background/60 text-neuro-accent" aria-hidden="true">
                    ◉
                  </span>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.podcast.tag}</span>
                  <span className="rounded-full border border-neuro-accent/40 px-3 py-1 text-[0.65rem] font-semibold text-neuro-accent">
                    {t.podcast.preparing}
                  </span>
                </div>
                <h2 className="display-h2">{t.podcast.title}</h2>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {t.podcast.desc}
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a href="https://podcasts.apple.com/us/podcast/fus-forward/id1857021050" target="_blank" rel="noopener noreferrer" className="btn-primary">
                    {t.podcast.cta} <Arrow />
                  </a>
                  <a href="#join" className="btn-ghost">
                    {t.podcast.ctaSecondary}
                  </a>
                  <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    {t.podcast.ctaYoutube} <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <p className="mt-6 text-xs">
                  <Link href="/card" className="text-neuro-accent hover:underline">
                    在浏览器中查看片头卡片（网页版） →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* join */}
        <section id="join" className="glow glow-bottom mx-auto max-w-6xl px-5 py-20 md:py-24">
          <header className="section-head">
            <p className="eyebrow">{t.nav.join}</p>
            <h2>{t.join.title}</h2>
            <p>{t.join.subtitle}</p>
          </header>
          <div className="cells mt-12 grid md:grid-cols-3">
            {t.join.cards.map((c) => (
              <div key={c.title} className="cell">
                <h3 className="cell-title">{c.title}</h3>
                <p className="cell-desc">{c.desc}</p>
                <span className="cell-rule" aria-hidden="true" />
              </div>
            ))}
          </div>
          <div className="community-gallery mt-14">
            <p className="eyebrow">{t.join.galleryEyebrow}</p>
            <ul className="community-strip mt-5">
              {communityPhotos.gallery.map((p) => (
                <li key={p.src} className="community-tile">
                  <img src={p.src} alt={p.alt[lang]} loading="lazy" />
                  <span className="community-credit">{p.credit}</span>
                </li>
              ))}
            </ul>
            {communityPhotos.placeholder && (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {communityPhotos.disclosure[lang]}
              </p>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => setContactOpen(true)} className="btn-primary">
              {t.join.cta} <Arrow />
            </button>
            <span className="text-sm text-muted-foreground">{t.join.note}</span>
          </div>
        </section>
      </main>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} t={t} />

      <footer className="site-footer border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:justify-between">
          <div className="max-w-md">
            <div className="footer-lockup">
              <img src="/assets/ntx-logo.png" alt="NeuroTechX" className="footer-logo" />
              <span className="footer-region">ASIA - CHINA</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.footer.about}</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t.footer.links}</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://neurotechx.org" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-neuro-accent">
                  {t.footer.global} ↗
                </a>
              </li>
              <li>
                <a href="https://neurotechx.com/chapter/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-neuro-accent">
                  City chapters ↗
                </a>
              </li>
              <li>
                <a href="#map" className="text-muted-foreground hover:text-neuro-accent">
                  {t.nav.map}
                </a>
              </li>
            </ul>
            <SocialLinks t={t} />
          </div>
        </div>
        <div className="site-footer-bar px-5 py-5">
          <div className="site-footer-bar-inner mx-auto max-w-6xl">
            <p className="text-xs">{t.footer.copyright}</p>
            <img src="/assets/ntx-mark.png" alt="NeuroTechX" className="footer-bar-mark" />
            <p className="text-xs">
              <Link href={`/${lang}/privacy`} className="hover:underline">
                {t.footer.privacy}
              </Link>
              <span className="mx-2 opacity-60" aria-hidden="true">
                |
              </span>
              <Link href={`/${lang}/terms`} className="hover:underline">
                {t.footer.terms}
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// {placeholder} interpolation — copy.js stays serialisable across the server/client boundary
const fmt = (template, vars) =>
  String(template).replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? ""));

// One institution card — shared by every slider page.
function EcosystemCard({ e, t, lang }) {
  const title = lang === "zh" && e.native ? e.native : e.name;
  const secondary = lang === "zh" && e.native ? e.name : e.native;
  const hook = lang === "zh" ? HOOKS_ZH[e.name] ?? e.hook : e.hook;

  return (
    <article className="card eco-card flex flex-col p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold leading-snug">{title}</h3>
        <span
          className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
            e.verified ? "bg-neuro-accent" : "bg-amber-400"
          }`}
          title={e.verified ? t.map.verified : t.map.partial}
        />
      </div>
      {secondary && <p className="mb-3 text-xs text-muted-foreground">{secondary}</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.7rem]">
        <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
          {CITY_LABEL[e.city]?.[lang] ?? e.city}
        </span>
        <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
          {TYPE_LABEL[e.type]?.[lang] ?? e.type}
        </span>
      </div>
      <p className="mb-4 flex-1 text-xs leading-relaxed text-muted-foreground">{hook}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {e.fields.slice(0, 5).map((f) => (
            <span
              key={f}
              className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-semibold text-neuro-accent"
            >
              {FIELD_LABEL[f]?.[lang] ?? f}
            </span>
          ))}
          {e.fields.length > 5 && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
              +{e.fields.length - 5}
            </span>
          )}
        </div>
        {e.website && (
          <a
            href={e.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-muted-foreground hover:text-neuro-accent"
          >
            {e.website.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 32)} ↗
          </a>
        )}
      </div>
    </article>
  );
}

// Auto-playing events gallery: the positioning slide first, then one slide per event.
function EventGallery({ t, lang }) {
  const slides = useMemo(
    () => [
      { kind: "claim", ...t.events.claim },
      ...t.events.items.map((e) => ({ kind: "event", ...e })),
    ],
    [t]
  );
  const total = slides.length;
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const reduced = useRef(false);
  const touchX = useRef(null);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const paused = hovered || manualPause || reduced.current;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % total), 6500);
    return () => clearInterval(id);
  }, [paused, total, idx]);

  const go = (d) => setIdx((i) => (i + d + total) % total);

  return (
    <div
      className="mt-10"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.events.title}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
        }
      }}
    >
      <div className="frame glow glow-right glow-inside relative overflow-hidden bg-surface-1/40">
        <div className="mesh-layer absolute inset-0">
          <ConstellationMesh className="absolute inset-0 h-full w-full" density={0.75} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/45" />

        {/* progress line for the autoplay cycle */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-border/60">
          <div
            key={`${idx}-${paused ? "p" : "r"}`}
            className="slide-progress h-full bg-neuro-accent"
            style={{ animationPlayState: paused ? "paused" : "running" }}
          />
        </div>

        <div className="relative z-10 grid items-center p-8 md:p-14">
          {slides.map((s, i) => (
            <div
              key={i}
              className={`col-start-1 row-start-1 transition-opacity duration-700 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
              style={{ pointerEvents: i === idx ? "auto" : "none" }}
              aria-hidden={i !== idx}
              inert={i !== idx}
            >
              {s.kind === "claim" ? (
                <ClaimSlide c={s} photo={communityPhotos.events} lang={lang} />
              ) : (
                <EventSlide s={s} t={t} index={i} total={total - 1} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={fmt(t.map.pageOf, { a: i + 1, b: total })}
              aria-current={i === idx ? "true" : undefined}
              className="group py-1"
            >
              <span
                className={`block h-1 rounded-full transition-all ${
                  i === idx ? "w-10 bg-neuro-accent" : "w-5 bg-border-strong group-hover:bg-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {paused ? t.events.paused : t.events.autoplay}
          </span>
          <button
            type="button"
            onClick={() => setManualPause((v) => !v)}
            aria-label={manualPause ? t.events.play : t.events.pause}
            className="carousel-arrow"
          >
            {manualPause ? "▶" : "❚❚"}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => go(-1)} aria-label={t.map.prev} className="carousel-arrow">
              ←
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t.map.next} className="carousel-arrow">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir = "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: dir === "left" ? "rotate(180deg)" : undefined }}
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ClaimSlide({ c, photo, lang }) {
  return (
    <div className="grid gap-10 py-2 md:grid-cols-[minmax(0,1fr)_300px] md:items-center">
      <div className="max-w-3xl">
      <p className="eyebrow">{c.eyebrow}</p>
      <h3 className="mt-6 font-display text-3xl font-bold leading-[1.15] md:text-5xl">
        {c.lineA}{" "}
        <span className="text-gradient">{c.lineB}</span>
      </h3>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {c.sub}
      </p>
      <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {c.meta.map((m) => (
          <li key={m} className="flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-neuro-accent" aria-hidden="true" />
            {m}
          </li>
        ))}
      </ul>
      </div>
      {photo && (
        <figure className="claim-figure hidden md:block">
          <img src={photo.src} alt={photo.alt[lang]} loading="lazy" />
          <figcaption>{photo.credit}</figcaption>
        </figure>
      )}
    </div>
  );
}

function EventSlide({ s, t }) {
  const label =
    s.status === "upcoming"
      ? t.events.statusUpcoming
      : s.status === "past"
        ? t.events.statusPast
        : t.events.statusRecurring;

  return (
    <div className="max-w-3xl py-2">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
            s.status === "upcoming"
              ? "bg-neuro-accent text-background"
              : "border border-border text-muted-foreground"
          }`}
        >
          {label}
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t.events.claim.eyebrow}
        </span>
      </div>
      <h3 className="font-display text-2xl font-bold leading-snug md:text-4xl">{s.name}</h3>
      <p className="mt-6 text-base text-neuro-accent md:text-lg">{s.date}</p>
      <p className="mt-2 text-sm text-muted-foreground">{s.place}</p>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {s.desc}
      </p>
    </div>
  );
}
