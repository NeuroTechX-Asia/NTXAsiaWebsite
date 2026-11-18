"use client";

import { useEffect, useRef } from "react";

/**
 * Connectome background, dense: ~1000 somata wired into one network.
 *
 * At this node count the geometry can no longer be restroked every frame, so the
 * whole static tissue — arbors, wiring, somata, nuclei — is rasterised ONCE into
 * an offscreen canvas at layout, padded so it can drift without showing an edge.
 * A frame is then two drawImage calls plus the activity layer, which is the only
 * part that changes.
 *
 * Composition
 *   somata      ~1000 per 1920x1080, ~10 % of them "cells" with full dendritic
 *               arbors (4–6 primaries, two branching levels); the rest are small
 *               somata with a 2–3 process tuft, which is what makes a thousand
 *               bodies readable instead of a solid mass
 *   modules     28 on a jittered grid, so coverage is even by construction
 *   edges       each soma wires to its 2–3 nearest neighbours in its module
 *               (hairlines) and each module sends 1–2 long tracts across the
 *               frame (cyan fascicles) — the hairline/tract contrast is the
 *               connectome read
 *   activity    energy per soma decays with a 0.6 s half-life, a diagonal front
 *               injects energy as it crosses, and energy diffuses across every
 *               edge each frame, so firing spreads along the actual wiring. Edges
 *               carrying the biggest gradient are stroked bright with a potential
 *               running along them, capped at 110 strokes per frame.
 *
 * Arbor alphas are trimmed 25 % from the previous pass (0.068–0.135) because a
 * thousand cells would otherwise bury the wiring and the copy.
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
const HALF_LIFE = 0.6; // seconds for a soma's energy to halve
const TIERS = 4; // arbor width classes: trunk, mid, fine, hair
const PAD = 32; // padding around the baked tissue, so it can drift

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One soma: star outline, optional nucleus, optional dendritic arbor. */
function buildSoma(rand, x, y, scale) {
  const cell = rand() < 0.1; // 10 % keep the full multipolar morphology
  const tiers = Array.from({ length: TIERS }, () => []);
  const boutons = [];
  const r = (cell ? 2.2 + rand() * 2.0 : 0.9 + rand() * 1.1) * scale;
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
      if (depth >= 1) boutons.push(seg.end[0], seg.end[1], 0.7 * scale);
      else grow(seg.end, seg.angle, childLen, depth + 1);
    }
  };

  // Cells branch twice; the crowd gets a short tuft, which is what keeps a
  // thousand bodies from turning into a solid texture.
  const primaries = cell ? 4 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2);
  for (let d = 0; d < primaries; d++) {
    const angle =
      bias - spread / 2 + (d / Math.max(1, primaries - 1)) * spread + (rand() - 0.5) * 0.4;
    const len = (cell ? 26 + rand() * 40 : 7 + rand() * 9) * scale;
    const root = process(x, y, angle, len, cell ? 3 : 2, 0.5, cell ? 0 : 3);
    if (cell) grow(root.end, root.angle, len, 0);
  }

  const points = cell ? 9 + Math.floor(rand() * 4) : 5 + Math.floor(rand() * 3);
  const outline = [];
  for (let p = 0; p < points; p++) {
    const a = (p / points) * Math.PI * 2;
    const rr = r * (p % 2 === 0 ? 1.6 : 0.85);
    outline.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }

  return { x, y, r, tiers, boutons, outline, cell, lag: rand() * 0.12, off: rand() };
}

/** A curved edge between two somata: quadratic bow, fixed per edge. */
function edgeCurve(a, b, bow) {
  return [
    a.x,
    a.y,
    (a.x + b.x) / 2 + (b.y - a.y) * bow,
    (a.y + b.y) / 2 - (b.x - a.x) * bow,
    b.x,
    b.y,
  ];
}

function buildField(rand, W, H, scale, density) {
  const area = (W * H) / (1920 * 1080);
  const count = Math.max(120, Math.round(1000 * Math.sqrt(area) * density));

  // Modules on a jittered grid: even coverage by construction, not by luck.
  const modules = Math.max(8, Math.round(28 * density));
  const cols = Math.ceil(Math.sqrt(modules * (W / H)));
  const rows = Math.ceil(modules / cols);
  const centres = [];
  for (let r = 0; r < rows && centres.length < modules; r++) {
    for (let c = 0; c < cols && centres.length < modules; c++) {
      centres.push([
        ((c + 0.5) / cols) * W + (rand() - 0.5) * (W / cols) * 0.7,
        ((r + 0.5) / rows) * H + (rand() - 0.5) * (H / rows) * 0.7,
      ]);
    }
  }

  const clusterR = 0.15 * Math.min(W, H);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    if (i % 5 === 0) {
      x = rand() * W;
      y = rand() * H;
    } else {
      const [cx, cy] = centres[Math.floor(rand() * centres.length)];
      const r = Math.sqrt(rand()) * clusterR;
      const a = rand() * Math.PI * 2;
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r;
    }
    nodes.push({
      ...buildSoma(rand, Math.min(W - 6, Math.max(6, x)), Math.min(H - 6, Math.max(6, y)), scale),
      module: 0,
    });
  }

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

  // ---- edges: 2–3 local projections per soma + 1–2 tracts per module ----
  const edges = [];
  const maxLocal = Math.max(40, 110 * scale);
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const best = [];
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      const b = nodes[j];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > maxLocal) continue;
      // keep the three nearest without sorting the whole field
      if (best.length < 3) {
        best.push([d, j]);
        best.sort((p, q) => p[0] - q[0]);
      } else if (d < best[2][0]) {
        best[2] = [d, j];
        best.sort((p, q) => p[0] - q[0]);
      }
    }
    const k = 2 + Math.floor(rand() * 2);
    for (let c = 0; c < Math.min(k, best.length); c++) {
      const j = best[c][1];
      if (j < i) continue;
      edges.push({ a: i, b: j, tract: false, bow: (rand() - 0.5) * 0.45, rate: 0.24 + rand() * 0.3, off: rand() });
    }
  }

  const byModule = centres.map((_, k) => nodes.map((n, i) => [i, n]).filter(([, n]) => n.module === k));
  byModule.forEach((members, k) => {
    if (members.length < 2) return;
    const links = 1 + Math.floor(rand() * 2);
    for (let l = 0; l < links; l++) {
      const other = (k + 1 + Math.floor(rand() * Math.max(1, centres.length - 1))) % centres.length;
      const pool = byModule[other];
      if (!pool || !pool.length) continue;
      const [ai] = members[Math.floor(rand() * members.length)];
      const [bi] = pool[Math.floor(rand() * pool.length)];
      if (ai === bi) continue;
      edges.push({ a: ai, b: bi, tract: true, bow: (rand() - 0.5) * 0.9, rate: 0.12 + rand() * 0.12, off: rand() });
    }
  });

  return { nodes, edges, centres, count };
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
    let tissue = null;
    let nodes = [];
    let edges = [];
    let energy = null;
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

      // ---- backdrop: gradient + vignette, baked once ----
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
      const vg = bctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(0.55, "rgba(0,0,0,0.08)");
      vg.addColorStop(1, "rgba(0,0,0,0.28)");
      bctx.fillStyle = vg;
      bctx.fillRect(0, 0, W, H);

      const scale = Math.min(1.5, Math.max(0.45, (H / 1080) * (0.8 + 0.2 * density)));
      const rand = mulberry32(20261118);
      const field = buildField(rand, W, H, scale, density);
      nodes = field.nodes;
      edges = field.edges;
      energy = new Float32Array(nodes.length);

      // ---- the static tissue, rasterised once into a padded canvas ----
      tissue = document.createElement("canvas");
      tissue.width = Math.round((W + PAD * 2) * dpr);
      tissue.height = Math.round((H + PAD * 2) * dpr);
      const t = tissue.getContext("2d");
      t.setTransform(dpr, 0, 0, dpr, 0, 0);
      t.translate(PAD, PAD);

      const tiers = Array.from({ length: TIERS }, () => new Path2D());
      const somaPath = new Path2D();
      const nucleusPath = new Path2D();
      const boutonPath = new Path2D();
      const localPath = new Path2D();
      const tractPath = new Path2D();

      nodes.forEach((n) => {
        for (let tier = 0; tier < TIERS; tier++) {
          const list = n.tiers[tier];
          for (let i = 0; i < list.length; i += 4) {
            tiers[tier].moveTo(list[i], list[i + 1]);
            tiers[tier].lineTo(list[i + 2], list[i + 3]);
          }
        }
        n.outline.forEach(([px, py], i) => {
          if (i === 0) somaPath.moveTo(px, py);
          else somaPath.lineTo(px, py);
        });
        somaPath.closePath();
        if (n.cell) {
          nucleusPath.moveTo(n.x + n.r * 0.36, n.y);
          nucleusPath.arc(n.x, n.y, n.r * 0.36, 0, Math.PI * 2);
        }
        for (let i = 0; i < n.boutons.length; i += 3) {
          boutonPath.moveTo(n.boutons[i] + n.boutons[i + 2], n.boutons[i + 1]);
          boutonPath.arc(n.boutons[i], n.boutons[i + 1], n.boutons[i + 2], 0, Math.PI * 2);
        }
      });

      edges.forEach((e) => {
        const [x0, y0, mx, my, x1, y1] = edgeCurve(nodes[e.a], nodes[e.b], e.bow);
        const p = e.tract ? tractPath : localPath;
        p.moveTo(x0, y0);
        p.quadraticCurveTo(mx, my, x1, y1);
      });

      // wiring first, then cellular detail — and the arbors at 75 % of the
      // previous pass, so a thousand cells still leave the network legible
      t.strokeStyle = `rgba(${EDGE_RGB},0.13)`;
      t.lineWidth = 0.7;
      t.stroke(localPath);
      t.strokeStyle = `rgba(${TRACT_RGB},0.2)`;
      t.lineWidth = 1.4;
      t.stroke(tractPath);
      t.lineCap = "round";
      const alphas = [0.068, 0.09, 0.113, 0.135];
      const widths = [1.4, 1.0, 0.75, 0.5];
      for (let tier = 0; tier < TIERS; tier++) {
        t.strokeStyle = `rgba(${DENDRITE_RGB},${alphas[tier]})`;
        t.lineWidth = widths[tier];
        t.stroke(tiers[tier]);
      }
      t.fillStyle = `rgba(${PULSE_RGB},0.24)`;
      t.fill(boutonPath);
      t.fillStyle = `rgba(${SOMA_RGB},0.55)`;
      t.fill(somaPath);
      t.fillStyle = `rgba(9,16,29,0.9)`;
      t.fill(nucleusPath);

      front = { ca: 0.86, sa: 0.5, span: W * 0.86 + H * 0.5 };
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

      ctx.drawImage(bg, 0, 0, W, H);

      // breathing glow behind the copy
      const breathe = 1 + 0.06 * Math.sin((2 * Math.PI * t) / 7);
      const gr = Math.max(1, 700 * (H / 1080) * breathe);
      const rg = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, gr);
      rg.addColorStop(0, `rgba(${GLOW_RGB},0.08)`);
      rg.addColorStop(0.55, `rgba(${GLOW_RGB},0.025)`);
      rg.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // the whole network in one blit, drifting slowly
      const dx = Math.sin((2 * Math.PI * t) / 23) * 5;
      const dy = Math.cos((2 * Math.PI * t) / 31) * 4;
      ctx.drawImage(tissue, -PAD + dx, -PAD + dy, W + PAD * 2, H + PAD * 2);

      // ---- energy: front injection + diffusion along the real wiring ----
      const decay = Math.pow(0.5, dt / HALF_LIFE);
      const spreadK = Math.min(0.9, dt * 6);
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
      for (let k = 0; k < edges.length; k++) {
        const e = edges[k];
        const diff = energy[e.a] - energy[e.b];
        if (diff > 0.05) energy[e.b] += diff * spreadK * (e.tract ? 0.16 : 0.28);
        else if (diff < -0.05) energy[e.a] += -diff * spreadK * (e.tract ? 0.16 : 0.28);
      }

      ctx.save();
      ctx.translate(dx, dy);

      // firing somata, bucketed by brightness so a thousand arcs cost three fills
      const buckets = [[], [], []];
      for (let i = 0; i < nodes.length; i++) {
        const e = energy[i];
        if (e < 0.16) continue;
        const n = nodes[i];
        const b = e > 0.65 ? 2 : e > 0.35 ? 1 : 0;
        buckets[b].push(n.x, n.y, n.r * (2.2 + 3.2 * e), e);
      }
      const glowAlpha = [0.06, 0.12, 0.2];
      for (let b = 0; b < 3; b++) {
        const list = buckets[b];
        if (!list.length) continue;
        ctx.fillStyle = `rgba(${GLOW_RGB},${glowAlpha[b]})`;
        ctx.beginPath();
        for (let i = 0; i < list.length; i += 4) {
          ctx.moveTo(list[i] + list[i + 2], list[i + 1]);
          ctx.arc(list[i], list[i + 1], list[i + 2], 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // signal: edges carrying the biggest gradient, capped so a fully firing
      // field cannot turn into hundreds of strokes
      let lit = 0;
      for (let k = 0; k < edges.length && lit < 110; k++) {
        const e = edges[k];
        const ea = energy[e.a];
        const eb = energy[e.b];
        const diff = Math.abs(ea - eb);
        if (diff < 0.16) continue;
        lit += 1;
        const [x0, y0, mx, my, x1, y1] = edgeCurve(nodes[e.a], nodes[e.b], e.bow);
        ctx.strokeStyle = `rgba(${PULSE_RGB},${Math.min(0.45, diff * 0.85)})`;
        ctx.lineWidth = e.tract ? 1.6 : 1.0;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my, x1, y1);
        ctx.stroke();

        const q = (t * e.rate + e.off) % 1;
        const iq = 1 - q;
        const px = iq * iq * x0 + 2 * iq * q * mx + q * q * x1;
        const py = iq * iq * y0 + 2 * iq * q * my + q * q * y1;
        const fade = Math.sin(Math.PI * q) ** 2 * Math.min(1, diff * 1.6);
        ctx.fillStyle = `rgba(${PULSE_RGB},${0.8 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + 1.2 * fade, 0, Math.PI * 2);
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
