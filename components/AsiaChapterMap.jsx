import map from "../content/asia_map.json";
import chapters from "../content/chapters_asia.json";

/**
 * Chapter map of Asia.
 *
 * Land is Natural Earth 110m (public domain), clipped to the window in Python and
 * baked into content/asia_map.json — no geo library ships with the site. Cities are
 * data (lat/lon + projected x/y + label offset), so a new chapter is one JSON row.
 */

const STATUS = {
  listed: { color: "#22d3ee" },
  forming: { color: "#f59e0b" },
  reboot: { color: "#e879f9" },
};

export default function AsiaChapterMap({ t, lang, onJoin }) {
  const [, , vw, vh] = map.viewBox;
  const hub = chapters.find((c) => c.id === "hongkong") ?? chapters[0];
  const statuses = [...new Set(chapters.map((c) => c.status))];

  // gentle great-circle-ish arcs from the regional hub to every chapter
  const arcs = chapters
    .filter((c) => c.id !== hub.id)
    .map((c) => {
      const mx = (hub.x + c.x) / 2;
      const my = (hub.y + c.y) / 2 - Math.abs(c.x - hub.x) * 0.22 - 1.5;
      return { id: c.id, d: `M${hub.x} ${hub.y} Q${mx.toFixed(2)} ${my.toFixed(2)} ${c.x} ${c.y}` };
    });

  return (
    <div className="asia-map-wrap">
      <div className="asia-map" style={{ aspectRatio: `${vw} / ${vh}` }}>
        <picture>
          <source srcSet="/assets/asia-land.webp" type="image/webp" width={2200} height={1404} />
          <img
            src="/assets/asia-land.png"
            alt=""
            className="asia-land-img"
            width={2200}
            height={1404}
            decoding="async"
            aria-hidden="true"
          />
        </picture>

        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <g className="arcs">
            {arcs.map((a) => (
              <path key={a.id} className="arc" d={a.d} />
            ))}
          </g>
        </svg>

        {chapters.map((c) => {
          const s = STATUS[c.status] ?? STATUS.listed;
          const tx = c.anchor === "right" ? `calc(-100% + ${c.dx}px)` : `${c.dx}px`;
          return (
            <div
              key={c.id}
              className="chapter-pin"
              style={{ left: `${c.x}%`, top: `${c.y}%`, color: s.color }}
            >
              <span
                className={`chapter-dot${c.status === "forming" || c.status === "reboot" ? " chapter-dot-pulse" : ""}`}
                style={{ background: s.color, boxShadow: `0 0 0 3px ${s.color}22, 0 0 10px ${s.color}66` }}
              />
              <span className="chapter-label" style={{ transform: `translate(${tx}, ${c.dy}px)` }}>
                <span className="chapter-city">{c.name[lang]}</span>
                <span className="chapter-status" style={{ color: s.color }}>
                  {t.chapters.status[c.status]}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          {statuses.map((key) => (
            <li key={key} className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: STATUS[key]?.color ?? "#22d3ee" }}
                aria-hidden="true"
              />
              {t.chapters.status[key]}
            </li>
          ))}
        </ul>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{t.chapters.note}</p>
      </div>

      <div className="chapter-cta">
        <div>
          <h3 className="font-display text-lg font-bold">{t.chapters.ctaTitle}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t.chapters.ctaBody}</p>
        </div>
        <button type="button" onClick={onJoin} className="btn-primary shrink-0">
          {t.chapters.ctaButton} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
