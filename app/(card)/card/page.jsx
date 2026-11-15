import IntroCard from "../../../components/IntroCard";


const TIMELINE = [
  ["0.15 – 0.85 s", "Logotype builds letter by letter"],
  ["0.95 – 1.45 s", "PRESENTS fades in, tracking 19 px"],
  ["1.45 – 2.00 s", "“Neuro Futures” enters"],
  ["2.05 – 4.72 s", "Title grows 82 → 116 px (scale 1.4146)"],
  ["2.28 s", "X pulse — 0.62 s, then every 9 s"],
  ["5.95 – 6.30 s", "Cyan rule extends to 300 px"],
  ["6.26 – 6.80 s", "Tagline fades in"],
];

const CORRECTIONS = [
  "Mesh breathing clamped — in the video the near-layer links fall to ≈6 % alpha at t≈6 s, so the background nearly disappears exactly when the title lands.",
  "Geometry in container units — the card scales to any width instead of being locked to 1920×1080.",
  "Transform-only animation — the 82 → 116 px title growth no longer reflows the type block.",
  "X pulse on a 9 s loop, decoupled from the old voice-over cue (2.24–2.72 s), so a new take from Kimberley cannot desynchronise it.",
  "Logo inside a 4 % safe area (the master used a 3.7 % bottom margin, within player crop).",
  "Static dither overlay replaces the ±5 grain, keeping the gradient band-free at any DPR.",
];

export default function CardPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">03_CARD · pass11_logo</p>
          <h1 className="mt-3 text-3xl font-bold">Neuro Futures — web port</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Same colours, timings and mesh construction as the 1920×1080 master, rebuilt as a canvas
            component. No video file is loaded.
          </p>
        </div>
        <a href="/" className="btn-ghost text-sm">
          ← Back to the site
        </a>
      </div>

      <IntroCard />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Timeline
          </h2>
          <ul className="space-y-2 text-sm">
            {TIMELINE.map(([t, label]) => (
              <li key={t} className="flex gap-4">
                <span className="w-28 shrink-0 font-mono text-xs text-neuro-accent">{t}</span>
                <span className="text-muted-foreground">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Corrections applied
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {CORRECTIONS.map((c) => (
              <li key={c} className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neuro-accent" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
