"use client";

import { useEffect, useRef } from "react";

/**
 * Connectome background — a wiring diagram of neurons, not just a field of cells.
 *
 * Two layers, drawn from the same data:
 *
 *   cellular    somata with dendritic arbors (5–6 primaries, two branching
 *               levels, four width tiers), star-shaped outlines with a nucleus —
 *               morphology from a multipolar neuron reference (Blausen 0657,
 *               Wikimedia Commons, CC BY 3.0)
 *   network     a real graph: every soma links to its 2–4 nearest neighbours in
 *               its own module, and each module sends 2–3 long tracts to other
 *               modules. Local edges are hairlines, tracts are the thicker
 *               fascicles — that contrast is what reads as a connectome
 *
 * Activity is a dynamics, not an animation: an energy value per soma decays with
 * a 0.6 s half-life, a diagonal front injects energy as it passes, and energy
 * diffuses across every edge each frame. Firing therefore spreads along the
 * wiring — a node lights because its neighbour did — and potentials are drawn
 * along the edges that actually carry the difference.
 *
 * Cost: arbors and edges are baked once into Path2D tiers, so a frame strokes the
 * whole graph with a handful of calls; per-frame work is the 46-node energy
 * update and the handful of lit edges/pulses.
 *
 * The canvas never sizes its own layout box: the measured box is written back as
 * explicit clamped pixels. prefers-reduced-motion renders one still frame.
 */

const BASE_TOP = "#05080d";
const BASE_BOTTOM = "#0a1220";
const GLOW_RGB = "34,211,238";
const DENDRITE_RGB = "150,190,235";
const EDGE_RGB = "120,190,230";
const TRACT_RGB = "34,211,238";
const SOMA_RGB = "214,238,255";
const PULSE_RGB = "103,232,249";

const WAVE_PERIOD = 12; // seconds for the activity front to cross
const TIERS = 4; // arbor width classes: trunk, mid, fine, hair
const HALF_LIFE = 0.6; // seconds for a soma's energy to halve

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One soma: star outline, nucleus, dendritic arbor. Absolute coordinates. */
function buildSoma(rand, x, y, scale) {
  const tiers = Array.from({ length: TIERS }, () => []);
  const boutons = [];
  const r = (2.4 + rand() * 2.2) * scale;
  const bias = rand() * Math.PI * 2;
  const spread = Math.PI * (1.2 + rand() * 0.4);

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
    for (let k = 0; k < 2; k++) {
      const a = ang + (k - 0.5) * (0.38 + rand() * 0.28);
      const childLen = l * (0.56 + rand() * 0.14);
      const tier = depth === 0 ? 1 : depth === 1 ? 2 : 3;
      const seg = process(from[0], from[1], a, childLen, 2, 0.7, tier);
      if (depth >= 1) boutons.push(seg.end[0], seg.end[1], 0.8 * scale);
      else grow(seg.end, seg.angle, childLen, depth + 1);
    }
  };

  // 4–6 primaries, each branching twice: enough to read as a cell, light enough
  // that the wiring between cells stays the loudest thing on screen
  const primaries = 4 + Math.floor(rand() * 3);
  for (let d = 0; d < primaries; d++) {
    const angle =
      bias - spread / 2 + (d / Math.max(1, primaries - 1)) * spread + (rand() - 0.5) * 0.4;
    const len = (26 + rand() * 40) * scale;
    const root = process(x, y, angle, len, 3, 0.5, 0);
    grow(root.end, root.angle, len, 0);
  }

  const points = 9 + Math.floor(rand() * 4);
  const outline = [];
  for (let p = 0; p < points; p++) {
    const a = (p / points) * Math.PI * 2;
    const rr = r * (p % 2 === 0 ? 1.6 : 0.85);
    outline.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }

  return { x, y, r, tiers, boutons, outline, lag: rand() * 0.12, off: rand() };
}

/** A curved edge between two somata: quadratic bow, fixed per edge. */
function edgeCurve(a, b, bow) {
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * bow;
  const my = (a.y + b.y) / 2 - (b.x - a.x) * bow;
  return [a.x, a.y, mx, my, b.x, b.y];
}

function buildField(rand, W, H, scale, density) {
  const area = (W * H) / (1920 * 1080);
  const count = Math.max(16, Math.round(64 * Math.sqrt(area) * density));

  // Composition: tissue is packed into the right, the bottom and especially the
  // bottom-right corner, and thins out toward the left edge so the left column of
  // the layout stays quiet. One function drives modules, somata and scatter, so
  // the gradient is consistent instead of three independent biases.
  const densityAt = (x, y) => {
    const nx = Math.min(1, Math.max(0, x / W));
    const ny = Math.min(1, Math.max(0, y / H));
    const sx = 0.16 + 0.84 * Math.pow(nx, 2.0); // left -> right
    const sy = 0.2 + 0.8 * Math.pow(ny, 1.5); // top -> bottom
    return sx * sy; // 0.03 at the top-left, 1 at the bottom-right
  };

  // rejection sampling against that field
  const sample = () => {
    for (let tries = 0; tries < 80; tries++) {
      const x = rand() * W;
      const y = rand() * H;
      if (rand() < densityAt(x, y)) return [x, y];
    }
    const x = rand() * W;
    return [x, rand() * H];
  };

  // Module centres, spread out but themselves weighted by the same field, so the
  // clusters sit where the density is. Minimum separation keeps them legible.
  const modules = Math.max(4, Math.round(7 * density));
  const centres = [];
  const minSep = Math.min(W, H) * 0.15;
  for (let tries = 0; tries < 600 && centres.length < modules; tries++) {
    const [x, y] = sample();
    if (centres.every(([cx, cy]) => Math.hypot(cx - x, cy - y) > minSep)) centres.push([x, y]);
  }

  const centreWeights = centres.map(([x, y]) => densityAt(x, y));
  const weightSum = centreWeights.reduce((a, b) => a + b, 0) || 1;
  const pickCentre = () => {
    let r = rand() * weightSum;
    for (let k = 0; k < centres.length; k++) {
      r -= centreWeights[k];
      if (r <= 0) return k;
    }
    return centres.length - 1;
  };

  const clusterR = 0.17 * Math.min(W, H);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    if (i % 7 === 0) {
      // a few somata sit between modules, on the same gradient
      [x, y] = sample();
    } else {
      const [cx, cy] = centres[pickCentre()];
      const r = Math.sqrt(rand()) * clusterR * (0.7 + rand() * 0.6);
      const a = rand() * Math.PI * 2;
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r;
    }
    x = Math.min(W - 8, Math.max(8, x));
    y = Math.min(H - 8, Math.max(8, y));
    nodes.push({ ...buildSoma(rand, x, y, scale), module: 0 });
  }

  // Module index per node (nearest centre) — cheap and correct for scattered nodes too.
  nodes.forEach((n) => {
    let best = 0;
    let bestD = Infinity;
    centres.forEach(([cx, cy], k) => {
      const d = Math.hypot(cx - n.x, cy - n.y);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    n.module = best;
  });

  // ---- edges ----
  const edges = []; // { a, b, tract, bow, rate }
  const localEdges = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const candidates = [];
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      const b = nodes[j];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d < 190 * scale) candidates.push([d, j]);
    }
    candidates.sort((p, q) => p[0] - q[0]);
    const k = 3 + Math.floor(rand() * 3); // 3–5 local projections
    for (let c = 0; c < Math.min(k, candidates.length); c++) {
      const j = candidates[c][1];
      if (j < i) continue; // one edge per pair
      edges.push({
        a: i,
        b: j,
        tract: false,
        bow: (rand() - 0.5) * 0.5,
        rate: 0.2 + rand() * 0.25,
        off: rand(),
      });
      localEdges.push(edges.length - 1);
    }
  }

  // inter-module tracts: 2–3 per module, the long fascicles of the diagram
  const byModule = centres.map((_, k) => nodes.map((n, i) => [i, n]).filter(([, n]) => n.module === k));
  byModule.forEach((members, k) => {
    if (members.length < 2) return;
    const links = 2 + Math.floor(rand() * 2);
    for (let l = 0; l < links; l++) {
      const other = (k + 1 + Math.floor(rand() * Math.max(1, centres.length - 1))) % centres.length;
      const pool = byModule[other];
      if (!pool || !pool.length) continue;
      const [ai] = members[Math.floor(rand() * members.length)];
      const [bi] = pool[Math.floor(rand() * pool.length)];
      if (ai === bi) continue;
      edges.push({
        a: ai,
        b: bi,
        tract: true,
        bow: (rand() - 0.5) * 0.9,
        rate: 0.12 + rand() * 0.12,
        off: rand(),
      });
    }
  });

  return { nodes, edges, centres };
}

export default function ConnectomeField({ density = 1, className = "", still = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = true;
    let start = 0;
    let last = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let bg = null;
    let nodes = [];
    let edges = [];
    let energy = null;
    let arborPaths = [];
    let somaPath = null;
    let nucleusPath = null;
    let boutonPath = null;
    let localPath = null;
    let tractPath = null;
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
      const rand = mulberry32(20261117);
      const field = buildField(rand, W, H, scale, density);
      nodes = field.nodes;
      edges = field.edges;
      energy = new Float32Array(nodes.length);

      arborPaths = Array.from({ length: TIERS }, () => new Path2D());
      somaPath = new Path2D();
      nucleusPath = new Path2D();
      boutonPath = new Path2D();
      localPath = new Path2D();
      tractPath = new Path2D();

      nodes.forEach((n) => {
        for (let tier = 0; tier < TIERS; tier++) {
          const list = n.tiers[tier];
          for (let i = 0; i < list.length; i += 4) {
            arborPaths[tier].moveTo(list[i], list[i + 1]);
            arborPaths[tier].lineTo(list[i + 2], list[i + 3]);
          }
        }
        n.outline.forEach(([px, py], i) => {
          if (i === 0) somaPath.moveTo(px, py);
          else somaPath.lineTo(px, py);
        });
        somaPath.closePath();
        nucleusPath.moveTo(n.x + n.r * 0.36, n.y);
        nucleusPath.arc(n.x, n.y, n.r * 0.36, 0, Math.PI * 2);
        for (let i = 0; i < n.boutons.length; i += 3) {
          boutonPath.moveTo(n.boutons[i] + n.boutons[i + 2], n.boutons[i + 1]);
          boutonPath.arc(n.boutons[i], n.boutons[i + 1], n.boutons[i + 2], 0, Math.PI * 2);
        }
      });

      edges.forEach((e) => {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const [x0, y0, mx, my, x1, y1] = edgeCurve(a, b, e.bow);
        const p = e.tract ? tractPath : localPath;
        p.moveTo(x0, y0);
        p.quadraticCurveTo(mx, my, x1, y1);
      });

      front = { ca: 0.86, sa: 0.5, span: W * 0.86 + H * 0.5 };
    };

    const drawBackground = (t) => {
      ctx.drawImage(bg, 0, 0, W, H);
      const breathe = 1 + 0.06 * Math.sin((2 * Math.PI * t) / 7);
      const gx = W * 0.5;
      const gy = H * 0.44;
      const gr = Math.max(1, 700 * (H / 1080) * breathe);
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, `rgba(${GLOW_RGB},0.08)`);
      rg.addColorStop(0.55, `rgba(${GLOW_RGB},0.025)`);
      rg.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    const drawFrame = (now) => {
      if (!start) start = now - (still || reduce ? 6000 : 0);
      const t = (now - start) / 1000;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      if (!fpsClock) fpsClock = now;
      frames += 1;
      if (now - fpsClock > 1000) {
        window.__ntxConnectomeFps = Math.round((frames * 1000) / (now - fpsClock));
        frames = 0;
        fpsClock = now;
      }

      drawBackground(t);

      // ---- energy dynamics: front injection + diffusion along the real edges ----
      const decay = Math.pow(0.5, dt / HALF_LIFE);
      for (let i = 0; i < nodes.length; i++) energy[i] *= decay;

      const u = ((t / WAVE_PERIOD) % 1) * (front.span + 900) - 450;
      const band = 160 * (H / 1080);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const proj = n.x * front.ca + n.y * front.sa + n.lag * front.span;
        const d = (proj - u) / band;
        const drive = Math.exp(-d * d);
        if (drive > energy[i]) energy[i] = drive;
      }

      const spreadK = Math.min(0.9, dt * 6);
      for (let k = 0; k < edges.length; k++) {
        const e = edges[k];
        const diff = energy[e.a] - energy[e.b];
        if (diff > 0.05) energy[e.b] += diff * spreadK * (e.tract ? 0.16 : 0.3);
        else if (diff < -0.05) energy[e.a] += -diff * spreadK * (e.tract ? 0.16 : 0.3);
      }

      const dx = Math.sin((2 * Math.PI * t) / 23) * 5;
      const dy = Math.cos((2 * Math.PI * t) / 31) * 4;
      ctx.save();
      ctx.translate(dx, dy);

      // ---- the wiring is the loudest layer ----
      ctx.strokeStyle = `rgba(${EDGE_RGB},0.14)`;
      ctx.lineWidth = 0.8;
      ctx.stroke(localPath);
      ctx.strokeStyle = `rgba(${TRACT_RGB},0.20)`;
      ctx.lineWidth = 1.5;
      ctx.stroke(tractPath);

      // ---- cellular detail, quieter ----
      const alphas = [0.09, 0.12, 0.15, 0.18];
      const widths = [1.5, 1.1, 0.8, 0.55];
      ctx.lineCap = "round";
      for (let tier = 0; tier < TIERS; tier++) {
        ctx.strokeStyle = `rgba(${DENDRITE_RGB},${alphas[tier]})`;
        ctx.lineWidth = widths[tier];
        ctx.stroke(arborPaths[tier]);
      }
      ctx.fillStyle = `rgba(${PULSE_RGB},0.26)`;
      ctx.fill(boutonPath);

      // ---- signal: edges that are actually carrying a difference ----
      for (let k = 0; k < edges.length; k++) {
        const e = edges[k];
        const ea = energy[e.a];
        const eb = energy[e.b];
        const diff = Math.abs(ea - eb);
        if (diff < 0.12) continue;
        const a = nodes[e.a];
        const b = nodes[e.b];
        const [x0, y0, mx, my, x1, y1] = edgeCurve(a, b, e.bow);
        ctx.strokeStyle = `rgba(${PULSE_RGB},${Math.min(0.5, diff * 0.9)})`;
        ctx.lineWidth = e.tract ? 1.7 : 1.1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my, x1, y1);
        ctx.stroke();

        // potential travelling a → b; direction is carried by which soma is
        // hotter, so the same parameterisation serves both directions
        const q = (ea > eb ? (t * e.rate + e.off) % 1 : 1 - ((t * e.rate + e.off) % 1));
        const iq = 1 - q;
        const px = iq * iq * x0 + 2 * iq * q * mx + q * q * x1;
        const py = iq * iq * y0 + 2 * iq * q * my + q * q * y1;
        const fade = Math.sin(Math.PI * q) ** 2 * Math.min(1, diff * 1.6);
        ctx.fillStyle = `rgba(${PULSE_RGB},${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.4 + 1.4 * fade, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- somata and nuclei ----
      ctx.fillStyle = `rgba(${SOMA_RGB},0.5)`;
      ctx.fill(somaPath);
      ctx.fillStyle = `rgba(9,16,29,0.9)`;
      ctx.fill(nucleusPath);

      for (let i = 0; i < nodes.length; i++) {
        const e = energy[i];
        if (e < 0.18) continue;
        const n = nodes[i];
        ctx.fillStyle = `rgba(${GLOW_RGB},${0.05 + 0.3 * e})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (2.2 + 3.4 * e), 0, Math.PI * 2);
        ctx.fill();
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
        last = 0;
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
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce || still) {
      loop(performance.now() + 6000);
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
