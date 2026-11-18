"use client";

import { useEffect, useRef } from "react";

/**
 * Connectome background — neural tissue, drawn from multipolar neuron morphology.
 *
 * Modelled on a textbook multipolar neuron (Blausen 0657, Wikimedia Commons,
 * CC BY 3.0), reduced to the features that still read at background scale:
 *
 *   soma        irregular star outline, 5–7 primary processes, nucleus visible
 *   dendrites   2–3 levels of branching, children at ±0.34–0.64 rad, each level
 *               ~60 % the length and ~55 % the width of its parent, drifting as
 *               it goes — bushy and asymmetric rather than radial spokes
 *   axon        one per neuron, leaving opposite the dendritic bias through a
 *               hillock, far longer than any dendrite, ending in a telodendron
 *               fan of 3–4 branches on ANOTHER neuron's soma — the synapse the
 *               reference image shows between its two cells
 *   activity    a diagonal front crosses the frame every 11 s; a soma fires as
 *               the front reaches it and potentials run its axon to the target
 *               soma, where the boutons sit
 *
 * Performance: all geometry is baked once into four Path2D width tiers, so a
 * frame strokes the whole network four times no matter how many neurons there
 * are. Only the activity loop is per-neuron.
 *
 * The canvas never sizes its own layout box: the measured box is written back as
 * explicit clamped pixels. prefers-reduced-motion renders one still frame.
 */

const BASE_TOP = "#05080d";
const BASE_BOTTOM = "#0a1220";
const GLOW_RGB = "34,211,238";
const DENDRITE_RGB = "150,190,235";
const AXON_RGB = "34,211,238";
const SOMA_RGB = "214,238,255";
const PULSE_RGB = "103,232,249";

const WAVE_PERIOD = 11; // seconds for the activity front to cross the frame
const TIERS = 4; // trunk, mid, fine, hair

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One neuron: soma, dendritic arbor, axon — in absolute canvas coordinates. */
function buildNeuron(rand, x, y, scale, target) {
  const tiers = Array.from({ length: TIERS }, () => []);
  const boutons = [];

  const rSoma = (2.6 + rand() * 2.4) * scale;
  // dendritic bias: processes lean into one half-plane and the axon leaves
  // through the other. This polarity is what makes a multipolar cell look like
  // a cell instead of a starburst.
  const bias = rand() * Math.PI * 2;
  const spread = Math.PI * (1.15 + rand() * 0.4);

  const pushSeg = (tier, x0, y0, pts) => {
    const list = tiers[tier];
    let lx = x0;
    let ly = y0;
    for (const [px, py] of pts) {
      list.push(lx, ly, px, py);
      lx = px;
      ly = py;
    }
  };

  // A process: a curved polyline of `segs` segments from (x0,y0) at `angle`,
  // drifting per segment so it waves instead of running straight.
  const process = (x0, y0, angle, len, segs, curl, tier) => {
    const pts = [];
    let a = angle;
    let cx = x0;
    let cy = y0;
    for (let s = 0; s < segs; s++) {
      a += (rand() - 0.5) * curl;
      cx += Math.cos(a) * (len / segs);
      cy += Math.sin(a) * (len / segs);
      pts.push([cx, cy]);
    }
    pushSeg(tier, x0, y0, pts);
    return { end: [cx, cy], angle: a };
  };

  const grow = (from, ang, l, depth) => {
    const kids = 2;
    for (let k = 0; k < kids; k++) {
      const a = ang + (k - (kids - 1) / 2) * (0.36 + rand() * 0.28);
      const childLen = l * (0.56 + rand() * 0.14);
      const tier = depth === 0 ? 1 : depth === 1 ? 2 : 3;
      const seg = process(from[0], from[1], a, childLen, depth >= 2 ? 2 : 3, 0.7, tier);
      if (depth >= 2) boutons.push(seg.end[0], seg.end[1], 0.85 * scale);
      else grow(seg.end, seg.angle, childLen, depth + 1);
    }
  };

  // 5–7 primary dendrites, each branching twice (depth 2 → 7 segments)
  const primaries = 5 + Math.floor(rand() * 3);
  for (let d = 0; d < primaries; d++) {
    const angle =
      bias - spread / 2 + (d / Math.max(1, primaries - 1)) * spread + (rand() - 0.5) * 0.4;
    const len = (30 + rand() * 52) * scale;
    const root = process(x, y, angle, len, 3, 0.5, 0);
    grow(root.end, root.angle, len, 0);
  }

  // Axon: hillock, one long sweep, telodendron fan landing on the target soma.
  let axonPts = null;
  if (target) {
    const [tx, ty] = target;
    const startAngle = bias + Math.PI + (rand() - 0.5) * 0.5;
    const hillock = (3.4 + rand() * 1.6) * scale;
    const hx = x + Math.cos(startAngle) * hillock;
    const hy = y + Math.sin(startAngle) * hillock;
    tiers[0].push(x, y, hx, hy);

    const mx = (hx + tx) / 2 + (ty - hy) * (0.18 + rand() * 0.3);
    const my = (hy + ty) / 2 - (tx - hx) * (0.18 + rand() * 0.3);
    axonPts = [];
    const steps = 20;
    for (let s = 0; s <= steps; s++) {
      const q = s / steps;
      const iq = 1 - q;
      axonPts.push([
        iq * iq * hx + 2 * iq * q * mx + q * q * tx,
        iq * iq * hy + 2 * iq * q * my + q * q * ty,
      ]);
    }
    pushSeg(1, hx, hy, axonPts);
    tiers[1].push(x, y, hx, hy);

    // telodendria: short branches fanned out where the axon lands
    const inAngle = Math.atan2(ty - my, tx - mx);
    const fan = 3 + Math.floor(rand() * 2);
    for (let f = 0; f < fan; f++) {
      const a = inAngle + Math.PI + (f - (fan - 1) / 2) * 0.55;
      const seg = process(tx, ty, a, (7 + rand() * 8) * scale, 2, 0.6, 2);
      boutons.push(seg.end[0], seg.end[1], 1.05 * scale);
    }
  }

  return {
    x,
    y,
    r: rSoma,
    tiers,
    boutons,
    axonPts,
    lag: rand() * 0.16,
    rate: 0.14 + rand() * 0.14,
    off: rand(),
  };
}

export default function NeuronField({ density = 1, className = "", still = false }) {
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
    let paths = [];
    let somaPath = null;
    let nucleusPath = null;
    let boutonPath = null;
    let axonLengths = [];
    let field = { ca: 0.86, sa: 0.5, span: 1 };
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

      // static backdrop baked once: one drawImage per frame after this
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

      const scale = Math.min(1.5, Math.max(0.45, (H / 1080) * (0.8 + 0.2 * density)));
      const area = (W * H) / (1920 * 1080);
      const count = Math.max(14, Math.round(58 * Math.sqrt(area) * density));
      const rand = mulberry32(20261116);

      const centres = [];
      for (let i = 0; i < count; i++) centres.push([rand() * W, rand() * H]);

      neurons = centres.map(([x, y], i) => {
        let target = null;
        let bestD = Infinity;
        for (let k = 0; k < centres.length; k++) {
          if (k === i) continue;
          const d = Math.hypot(centres[k][0] - x, centres[k][1] - y);
          if (d > 70 * scale && d < 300 * scale && d < bestD) {
            bestD = d;
            target = centres[k];
          }
        }
        return buildNeuron(rand, x, y, scale, target);
      });

      paths = Array.from({ length: TIERS }, () => new Path2D());
      somaPath = new Path2D();
      nucleusPath = new Path2D();
      boutonPath = new Path2D();
      axonLengths = [];

      neurons.forEach((n) => {
        for (let tier = 0; tier < TIERS; tier++) {
          const list = n.tiers[tier];
          for (let i = 0; i < list.length; i += 4) {
            paths[tier].moveTo(list[i], list[i + 1]);
            paths[tier].lineTo(list[i + 2], list[i + 3]);
          }
        }

        // star-shaped soma: alternate long/short radii where processes leave
        const points = 9 + Math.floor(rand() * 4);
        for (let p = 0; p < points; p++) {
          const a = (p / points) * Math.PI * 2;
          const rr = n.r * (p % 2 === 0 ? 1.6 : 0.85);
          const sx = n.x + Math.cos(a) * rr;
          const sy = n.y + Math.sin(a) * rr;
          if (p === 0) somaPath.moveTo(sx, sy);
          else somaPath.lineTo(sx, sy);
        }
        somaPath.closePath();
        nucleusPath.moveTo(n.x + n.r * 0.36, n.y);
        nucleusPath.arc(n.x, n.y, n.r * 0.36, 0, Math.PI * 2);

        for (let i = 0; i < n.boutons.length; i += 3) {
          boutonPath.moveTo(n.boutons[i] + n.boutons[i + 2], n.boutons[i + 1]);
          boutonPath.arc(n.boutons[i], n.boutons[i + 1], n.boutons[i + 2], 0, Math.PI * 2);
        }

        // arc-length table so potentials travel at even speed
        if (n.axonPts) {
          const cum = [0];
          for (let i = 1; i < n.axonPts.length; i++) {
            cum.push(
              cum[i - 1] +
                Math.hypot(
                  n.axonPts[i][0] - n.axonPts[i - 1][0],
                  n.axonPts[i][1] - n.axonPts[i - 1][1]
                )
            );
          }
          axonLengths.push(cum);
        } else {
          axonLengths.push(null);
        }
      });

      field = { ca: 0.86, sa: 0.5, span: W * 0.86 + H * 0.5 };
    };

    const pointAt = (pts, cum, q) => {
      if (!pts || !cum) return null;
      const total = cum[cum.length - 1];
      const d = q * total;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const span = cum[i] - cum[i - 1] || 1;
      const f = (d - cum[i - 1]) / span;
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
    };

    const drawBackground = (t) => {
      ctx.drawImage(bg, 0, 0, W, H);
      const breathe = 1 + 0.06 * Math.sin((2 * Math.PI * t) / 7);
      const gx = W * 0.5;
      const gy = H * 0.44;
      const gr = Math.max(1, 700 * (H / 1080) * breathe);
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, `rgba(${GLOW_RGB},0.09)`);
      rg.addColorStop(0.55, `rgba(${GLOW_RGB},0.028)`);
      rg.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    const drawFrame = (now) => {
      if (!start) start = now - (still || reduce ? 5200 : 0);
      const t = (now - start) / 1000;

      if (!fpsClock) fpsClock = now;
      frames += 1;
      if (now - fpsClock > 1000) {
        window.__ntxConnectomeFps = Math.round((frames * 1000) / (now - fpsClock));
        frames = 0;
        fpsClock = now;
      }

      drawBackground(t);

      // the tissue drifts as a whole: cheap life without rebuilding geometry
      const dx = Math.sin((2 * Math.PI * t) / 23) * 5;
      const dy = Math.cos((2 * Math.PI * t) / 31) * 4;
      ctx.save();
      ctx.translate(dx, dy);

      const u = ((t / WAVE_PERIOD) % 1) * (field.span + 900) - 450;
      const band = 150 * (H / 1080);
      const act = new Float32Array(neurons.length);
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        const proj = n.x * field.ca + n.y * field.sa + n.lag * field.span;
        const d = (proj - u) / band;
        act[i] = Math.exp(-d * d);
      }

      // ---- the network: four strokes for every neuron on screen ----
      const alphas = [0.10, 0.14, 0.18, 0.22];
      const widths = [1.7, 1.25, 0.85, 0.6];
      ctx.lineCap = "round";
      for (let tier = 0; tier < TIERS; tier++) {
        ctx.strokeStyle = `rgba(${DENDRITE_RGB},${alphas[tier]})`;
        ctx.lineWidth = widths[tier];
        ctx.stroke(paths[tier]);
      }

      // axons read as the brighter, cooler pathway
      ctx.strokeStyle = `rgba(${AXON_RGB},0.13)`;
      ctx.lineWidth = 1.1;
      ctx.stroke(paths[1]);

      ctx.fillStyle = `rgba(${PULSE_RGB},0.3)`;
      ctx.fill(boutonPath);

      ctx.fillStyle = `rgba(${SOMA_RGB},0.55)`;
      ctx.fill(somaPath);
      ctx.fillStyle = `rgba(9,16,29,0.9)`;
      ctx.fill(nucleusPath);

      // ---- activity: firing somata and their potentials ----
      for (let i = 0; i < neurons.length; i++) {
        const a = act[i];
        if (a < 0.2) continue;
        const n = neurons[i];

        ctx.fillStyle = `rgba(${GLOW_RGB},${0.06 + 0.28 * a})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (2.4 + 3.2 * a), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${SOMA_RGB},${0.14 * a})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1.3 + 0.7 * a), 0, Math.PI * 2);
        ctx.fill();

        const pts = n.axonPts;
        const cum = axonLengths[i];
        if (!pts) continue;
        const q = (t * n.rate + n.off) % 1;
        const p = pointAt(pts, cum, q);
        if (!p) continue;
        const fade = Math.sin(Math.PI * q) ** 2 * a;
        ctx.fillStyle = `rgba(${PULSE_RGB},${0.8 * fade})`;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.5 + 1.5 * fade, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 1; k <= 2; k++) {
          const tp = pointAt(pts, cum, Math.max(0, q - 0.05 * k));
          if (!tp) continue;
          ctx.fillStyle = `rgba(${PULSE_RGB},${(0.3 * fade) / k})`;
          ctx.beginPath();
          ctx.arc(tp[0], tp[1], Math.max(0.5, 1.2 - k * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    const loop = (now) => {
      if (!running) return;
      try {
        drawFrame(now);
      } catch (err) {
        window.__ntxConnectomeError = String((err && err.message) || err);
        running = false;
        return;
      }
      if (running) raf = requestAnimationFrame(loop);
    };

    layout();
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2) {
        layout();
        if (reduce || still) loop(performance.now());
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
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce || still) {
      loop(performance.now() + 5200);
      running = false;
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(loop);
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
