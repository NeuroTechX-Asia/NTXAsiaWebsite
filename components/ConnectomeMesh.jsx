"use client";

import { useEffect, useRef } from "react";

/**
 * Connectome background — the "forked" animation for the site.
 *
 * Reads as tissue rather than as a constellation: somata with dendritic arbors,
 * long curved axons between neurons, and a slow activity front that sweeps the
 * culture and makes neurons fire as it passes, with pulses running down the
 * axons that leave a firing soma.
 *
 * Construction
 *   background   baked vertical gradient (#05080d → #0a1220) + vignette
 *   glow         one breathing radial wash behind the type, cyan at 0.10
 *   arbor        ~26 somata per 1920×1080, 5–8 dendrites each, 3–4 segments,
 *                each segment turning by ±0.35 rad so no two arbors match
 *   axons        1–3 per neuron, cubic Bézier with a fixed bow, recomputed each
 *                frame from the live soma centres so the ends never detach
 *   activity     a diagonal front crossing the frame every 11 s; a soma fires
 *                as the front reaches it, its axons brighten, pulses run out
 *   palette      the site's own tokens: cyan #22d3ee signals, blue-white somata
 *
 * Deliberate choices
 *   1. the wave is untimed — it never depends on a scroll position or a video cue
 *   2. geometry scales with canvas height, so the hero and the 0.75-density bands
 *      look like the same tissue
 *   3. prefers-reduced-motion renders one still frame with the front mid-frame
 *   4. the canvas never sizes its own layout box: measured pixels are written
 *      back and clamped (the trap that doubles a section until it is blank)
 */

const BASE_TOP = "#05080d";
const BASE_BOTTOM = "#0a1220";
const GLOW_RGB = "34,211,238";
const DENDRITE_RGB = "150,190,235";
const AXON_RGB = "34,211,238";
const SOMA_RGB = "214,238,255";
const PULSE_RGB = "103,232,249";

const WAVE_PERIOD = 11; // seconds for the front to cross
const BAND = 150; // half-width of the activity band, in design px at 1080p

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Somata + their dendritic arbors, in coordinates relative to their own centre. */
function buildNeurons(rand, count, W, H, scale) {
  const neurons = [];
  // a few hubs anchor the tissue: bigger somata, longer and more numerous arbors
  const hubs = Math.max(2, Math.round(count * 0.16));
  for (let i = 0; i < count; i++) {
    const hub = i < hubs;
    const branches = [];
    // dendrites are not radially symmetric: each neuron polarises along its own
    // axis and most branches fan out inside a 200-260° sector on one side
    const baseAngle = rand() * Math.PI * 2;
    const spread = Math.PI * (1.05 + rand() * 0.35);
    const nb = hub ? 10 + Math.floor(rand() * 5) : 5 + Math.floor(rand() * 4);
    for (let b = 0; b < nb; b++) {
      const pts = [];
      let angle = baseAngle - spread / 2 + (b / Math.max(1, nb - 1)) * spread + (rand() - 0.5) * 0.32;
      const len = (hub ? 34 + rand() * 66 : 22 + rand() * 48) * scale;
      const segs = 4 + Math.floor(rand() * 2);
      let dist = 0;
      for (let s = 0; s < segs; s++) {
        // proximal segments bend less than distal ones, as real arbors do
        angle += (rand() - 0.5) * (0.28 + 0.22 * s);
        dist += len / segs;
        pts.push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
      }
      branches.push(pts);
    }
    neurons.push({
      x: rand() * W,
      y: rand() * H,
      r: (hub ? 2.8 + rand() * 2.2 : 1.4 + rand() * 1.9) * scale,
      hub,
      branches,
      // slow independent drift, so the tissue breathes without leaving the frame
      ax: (6 + rand() * 16) * scale,
      wx: 0.03 + rand() * 0.05,
      phx: rand() * Math.PI * 2,
      ay: (6 + rand() * 16) * scale,
      wy: 0.03 + rand() * 0.05,
      phy: rand() * Math.PI * 2,
      // where this neuron sits along the sweeping front, ± a little scatter
      lag: rand() * 0.18,
      twinkle: 0.5 + rand() * 1.1,
    });
  }
  return neurons;
}

/** Axons: short-range projections with a fixed bow, drawn from live centres. */
function buildAxons(rand, neurons) {
  const axons = [];
  for (let i = 0; i < neurons.length; i++) {
    const k = 1 + Math.floor(rand() * 3);
    for (let c = 0; c < k; c++) {
      const j = (i + 1 + Math.floor(rand() * 10)) % neurons.length;
      if (j === i) continue;
      axons.push({
        i,
        j,
        bow: (rand() - 0.5) * 0.75,
        rate: 0.16 + rand() * 0.22, // pulses per second
        off: rand(),
      });
    }
  }
  return axons;
}

export default function ConnectomeMesh({
  density = 1,
  className = "",
  still = false,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = true;
    let start = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let bg = null;
    let neurons = [];
    let axons = [];
    let scale = 1;
    let front = { ca: 0.86, sa: 0.5, span: 1 };
    let frames = 0;
    let fpsClock = 0;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.min(4096, Math.max(120, Math.round(rect.width)));
      H = Math.min(4096, Math.max(80, Math.round(rect.height)));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // bake the static part of the frame once: it is one drawImage per frame after this
      bg = document.createElement("canvas");
      bg.width = canvas.width;
      bg.height = canvas.height;
      const bctx = bg.getContext("2d");
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = bctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, BASE_TOP);
      g.addColorStop(1, BASE_BOTTOM);
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, W, H);
      const vg = bctx.createRadialGradient(
        W / 2,
        H / 2,
        0,
        W / 2,
        H / 2,
        Math.hypot(W, H) * 0.62
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(0.55, "rgba(0,0,0,0.08)");
      vg.addColorStop(1, "rgba(0,0,0,0.28)");
      bctx.fillStyle = vg;
      bctx.fillRect(0, 0, W, H);

      scale = Math.min(1.5, Math.max(0.45, (H / 1080) * (0.75 + 0.25 * density)));
      const area = (W * H) / (1920 * 1080);
      const count = Math.max(12, Math.round(32 * Math.sqrt(area) * density));
      const rand = mulberry32(20261115);
      neurons = buildNeurons(rand, count, W, H, scale);
      axons = buildAxons(rand, neurons);

      // the activity front runs on a fixed diagonal; span covers the whole canvas
      const ca = 0.86;
      const sa = 0.5;
      front = {
        ca,
        sa,
        span: W * Math.abs(ca) + H * Math.abs(sa),
      };
    };

    const drawBackground = (t) => {
      ctx.drawImage(bg, 0, 0, W, H);
      const breathe = 1 + 0.06 * Math.sin((2 * Math.PI * t) / 7);
      const gx = W * 0.5;
      const gy = H * 0.44;
      const gr = Math.max(1, 700 * (H / 1080) * breathe);
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, `rgba(${GLOW_RGB},0.10)`);
      rg.addColorStop(0.55, `rgba(${GLOW_RGB},0.03)`);
      rg.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    const drawFrame = (now) => {
      if (!start) start = now - (still || reduce ? 7200 : 0);
      const t = (now - start) / 1000;

      if (!fpsClock) fpsClock = now;
      frames += 1;
      if (now - fpsClock > 1000) {
        window.__ntxConnectomeFps = Math.round((frames * 1000) / (now - fpsClock));
        frames = 0;
        fpsClock = now;
      }

      drawBackground(t);

      // live soma centres (drift only — arbors move with them)
      const px = new Float32Array(neurons.length);
      const py = new Float32Array(neurons.length);
      const act = new Float32Array(neurons.length);
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        px[i] = n.x + n.ax * Math.sin(2 * Math.PI * n.wx * t + n.phx);
        py[i] = n.y + n.ay * Math.sin(2 * Math.PI * n.wy * t + n.phy);
      }

      // activity front: one pass every WAVE_PERIOD, entering and leaving off-frame
      const u = (((t / WAVE_PERIOD) % 1) * (front.span + 900) - 450) | 0;
      const band = BAND * (H / 1080);
      for (let i = 0; i < neurons.length; i++) {
        const proj = px[i] * front.ca + py[i] * front.sa + neurons[i].lag * front.span;
        const d = (proj - u) / band;
        act[i] = Math.exp(-d * d); // 0..1 firing envelope
      }

      // ---- dendritic arbors: batched into a few alpha buckets, not 26 strokes ----
      const buckets = [[], [], []];
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        const bucket = act[i] > 0.55 ? 2 : act[i] > 0.18 ? 1 : 0;
        for (const pts of n.branches) {
          buckets[bucket].push(px[i], py[i], pts);
        }
      }
      for (let b = 0; b < 3; b++) {
        const list = buckets[b];
        if (!list.length) continue;
        ctx.strokeStyle = `rgba(${DENDRITE_RGB},${[0.19, 0.3, 0.46][b]})`;
        ctx.lineWidth = b === 2 ? 1.25 : 1;
        ctx.beginPath();
        for (let k = 0; k < list.length; k += 3) {
          const ox = list[k];
          const oy = list[k + 1];
          const pts = list[k + 2];
          let lastX = ox;
          let lastY = oy;
          for (const [dx, dy] of pts) {
            const nx = ox + dx;
            const ny = oy + dy;
            // slight mid-segment bow so branches curve instead of kinking
            const mx = (lastX + nx) / 2 + (ny - lastY) * 0.34;
            const my = (lastY + ny) / 2 - (nx - lastX) * 0.34;
            ctx.moveTo(lastX, lastY);
            ctx.quadraticCurveTo(mx, my, nx, ny);
            lastX = nx;
            lastY = ny;
          }
        }
        ctx.stroke();
      }

      // ---- terminal boutons: the little tips that read as synapses ----
      ctx.fillStyle = `rgba(${DENDRITE_RGB},0.4)`;
      ctx.beginPath();
      for (let i = 0; i < neurons.length; i++) {
        if (act[i] < 0.12) continue;
        for (const pts of neurons[i].branches) {
          const [dx, dy] = pts[pts.length - 1];
          ctx.moveTo(px[i] + dx, py[i] + dy);
          ctx.arc(px[i] + dx, py[i] + dy, 0.9 * scale, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // ---- axons: faint bows, lit while the soma they leave is firing ----
      ctx.lineWidth = 1;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle =
          pass === 0
            ? `rgba(${AXON_RGB},0.095)`
            : `rgba(${AXON_RGB},0.3)`;
        ctx.beginPath();
        for (const a of axons) {
          const lit = Math.max(act[a.i], act[a.j] * 0.6);
          if ((lit > 0.2) !== (pass === 1)) continue;
          const x0 = px[a.i];
          const y0 = py[a.i];
          const x1 = px[a.j];
          const y1 = py[a.j];
          const mx = (x0 + x1) / 2 + (y1 - y0) * a.bow;
          const my = (y0 + y1) / 2 - (x1 - x0) * a.bow;
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(mx, my, x1, y1);
        }
        ctx.stroke();
      }

      // ---- travelling potentials down the axons that just fired ----
      for (const a of axons) {
        const lit = act[a.i];
        if (lit < 0.25) continue;
        const q = (t * a.rate + a.off) % 1;
        const x0 = px[a.i];
        const y0 = py[a.i];
        const x1 = px[a.j];
        const y1 = py[a.j];
        const mx = (x0 + x1) / 2 + (y1 - y0) * a.bow;
        const my = (y0 + y1) / 2 - (x1 - x0) * a.bow;
        const inv = 1 - q;
        const bx = inv * inv * x0 + 2 * inv * q * mx + q * q * x1;
        const by = inv * inv * y0 + 2 * inv * q * my + q * q * y1;
        const fade = Math.sin(Math.PI * q) ** 2 * lit;
        ctx.fillStyle = `rgba(${PULSE_RGB},${0.75 * fade})`;
        ctx.beginPath();
        ctx.arc(bx, by, (1.3 + 1.8 * fade) * scale, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 1; k <= 2; k++) {
          const qq = Math.max(0, q - 0.05 * k);
          const iq = 1 - qq;
          const tx = iq * iq * x0 + 2 * iq * qq * mx + qq * qq * x1;
          const ty = iq * iq * y0 + 2 * iq * qq * my + qq * qq * y1;
          ctx.fillStyle = `rgba(${PULSE_RGB},${(0.3 * fade) / k})`;
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(0.5, 1.1 * scale - k * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- somata last, so they sit on top of their own arbors ----
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        const a = act[i];
        const twinkle = 0.5 + 0.5 * Math.sin(2 * Math.PI * n.twinkle * 0.12 * t + i);
        const r = n.r * (1 + 0.55 * a + 0.12 * twinkle);

        // halo (a plain circle: a radial gradient per neuron per frame is not worth it)
        ctx.fillStyle = `rgba(${GLOW_RGB},${0.06 + 0.26 * a})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], r * (3.2 + 2.4 * a), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${SOMA_RGB},${0.62 + 0.35 * a})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], r, 0, Math.PI * 2);
        ctx.fill();

        // a bright rim while firing reads as depolarisation
        if (a > 0.45) {
          ctx.strokeStyle = `rgba(${PULSE_RGB},${0.5 * (a - 0.45)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px[i], py[i], r * (1.9 + 1.6 * a), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    const frame = (now) => {
      if (!running) return;
      try {
        drawFrame(now);
      } catch (err) {
        window.__ntxConnectomeError = String((err && err.message) || err);
        running = false;
        return;
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    layout();
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2) {
        layout();
        if (reduce || still) frame(performance.now());
      }
    });
    ro.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        running = true;
        start = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce || still) {
      frame(performance.now() + 7200);
      running = false;
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density, still]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
