"use client";

import { useEffect, useRef } from "react";
import Delaunator from "delaunator";

/**
 * Canvas port of the animated mesh used on the "Neuro Futures" podcast card
 * (03_CARD / _work/make_card_anim_v3.py). Same construction, same colours:
 *
 *   background  vertical gradient (7,4,15) → (16,9,34)
 *   glow        radial, centre (0.5W, 0.46H), radius 780, colour (44,22,86), breathing ±7 %
 *   sweep       gaussian band rotating 0.55 → 0.55+π/2, colour (38,26,74)
 *   vignette    1 − 0.26 · r^2.4
 *   mesh        two layers: FAR 90 nodes, NEAR 150 nodes, links from a Delaunay
 *               triangulation, edges dropped above EDGE_MAX, alpha breathing on
 *               a 5.1 s (far) / 3.6 s (near) cycle
 *   nodes       twinkle, radius 1-3, colour (212,198,255)
 *   pulses      22 travelling cyan dots along near-node pairs, with trails
 *
 * Deliberate corrections against the source video:
 *   1. the near-link breathing is clamped so the mesh can never dip to ~6 %
 *      alpha (the video goes almost blank at t≈6 s, exactly when the title lands)
 *   2. the layout is resolution-independent (node count and edge length scale
 *      with the canvas, so the hero and a 16:9 card both look right)
 *   3. prefers-reduced-motion renders a single still frame at a dense moment
 *   4. the loop is untimed: it never depends on a voice-over cue
 */

const CYAN = "120,226,242";
const NODE_RGB = "212,198,255";
const NEAR_EDGE_RGB = "156,126,232";
const FAR_EDGE_RGB = "120,96,190";
const GLOW_RGB = "44,22,86";
const SWEEP_RGB = "38,26,74";

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLayer(rand, n, w, h, spread, ampMin, ampMax, speedMin, speedMax, radii) {
  const pts = [];
  const orb = [];
  const twi = [];
  const rad = [];
  for (let i = 0; i < n; i++) {
    pts.push([
      rand() * (w + 2 * spread) - spread,
      rand() * (h + 2 * spread) - spread,
    ]);
    orb.push({
      ax: ampMin + rand() * (ampMax - ampMin),
      wx: speedMin + rand() * (speedMax - speedMin),
      phx: rand() * Math.PI * 2,
      ay: ampMin + rand() * (ampMax - ampMin),
      wy: speedMin + rand() * (speedMax - speedMin),
      phy: rand() * Math.PI * 2,
    });
    twi.push({ spd: 0.6 + rand() * 1.4, ph: rand() * Math.PI * 2 });
    rad.push(radii[Math.floor(rand() * radii.length)]);
  }
  return { pts, orb, twi, rad };
}

function positions(layer, t, cx, cy, push, swirl) {
  const s = 1 + push;
  const ca = Math.cos(swirl);
  const sa = Math.sin(swirl);
  const out = new Float32Array(layer.pts.length * 2);
  for (let i = 0; i < layer.pts.length; i++) {
    const [px, py] = layer.pts[i];
    const o = layer.orb[i];
    const x = px + o.ax * Math.sin(2 * Math.PI * o.wx * t + o.phx);
    const y = py + o.ay * Math.sin(2 * Math.PI * o.wy * t + o.phy);
    const dx = x - cx;
    const dy = y - cy;
    out[i * 2] = cx + (dx * ca - dy * sa) * s;
    out[i * 2 + 1] = cy + (dx * sa + dy * ca) * s;
  }
  return out;
}

function triangulate(flat) {
  const n = flat.length / 2;
  const del = Delaunator.from(
    Array.from({ length: n }, (_, i) => [flat[i * 2], flat[i * 2 + 1]]),
    (p) => p[0],
    (p) => p[1]
  );
  return del.triangles;
}

export default function ConstellationMesh({
  density = 1,
  className = "",
  /** freeze to a single frame (used on the card page when motion is reduced) */
  still = false,
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

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
    let far = null;
    let near = null;
    let farTri = null;
    let nearTri = null;
    let pulses = [];
    let edgeMax = 300;
    let lastLayout = 0;
    let frames = 0;
    let fpsClock = 0;
    let triTick = 0;
    let bg = null;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      // Never let the backing store feed back into layout: the element gets an
      // explicit pixel size (so a percentage height can no longer resolve to the
      // canvas' own intrinsic height) and both axes are clamped.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.min(4096, Math.max(120, Math.round(rect.width)));
      H = Math.min(4096, Math.max(80, Math.round(rect.height)));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // bake the static part of the frame (vertical gradient + vignette) once
      bg = document.createElement("canvas");
      bg.width = canvas.width;
      bg.height = canvas.height;
      const bctx = bg.getContext("2d");
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = bctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgb(7,4,15)");
      g.addColorStop(1, "rgb(16,9,34)");
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, W, H);
      const vg = bctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(0.55, "rgba(0,0,0,0.10)");
      vg.addColorStop(1, "rgba(0,0,0,0.26)");
      bctx.fillStyle = vg;
      bctx.fillRect(0, 0, W, H);

      const area = (W * H) / (1920 * 1080);
      const scale = Math.min(1.4, Math.max(0.4, Math.sqrt(area) * density * 0.85));
      const rand = mulberry32(20261021);
      const spread = 60 * (H / 1080);
      const amp = 0.5 + 0.5 * (H / 1080);

      far = makeLayer(rand, Math.round(90 * scale), W, H, spread, 14 * amp, 34 * amp, 0.045, 0.095, [1, 1]);
      near = makeLayer(rand, Math.round(150 * scale), W, H, spread, 20 * amp, 48 * amp, 0.055, 0.13, [1, 1, 2]);

      edgeMax = 300 * (H / 1080);
      pulses = Array.from({ length: 22 }, () => ({
        i: Math.floor(rand() * near.pts.length),
        j: Math.floor(rand() * near.pts.length),
        off: rand(),
        per: 1.6 + rand() * 1.5,
      }));

      lastLayout = performance.now();
      stateRef.current = { W, H };
    };

    const drawGradient = (t, dur) => {
      // static base + vignette, baked at layout time
      ctx.drawImage(bg, 0, 0, W, H);

      // breathing radial glow behind the type block
      const breathe = 1 + 0.07 * Math.sin((2 * Math.PI * t) / Math.max(dur / 2, 0.001));
      const gx = W * 0.5;
      const gy = H * 0.46;
      const gr = 780 * (H / 1080) * breathe;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(gr, 1));
      rg.addColorStop(0, `rgba(${GLOW_RGB},0.55)`);
      rg.addColorStop(0.55, `rgba(${GLOW_RGB},0.18)`);
      rg.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      // slow light sweep, rotating across the frame
      const th = 0.55 + ((t / dur) * Math.PI) / 2;
      const c = -600 + (W + H) * 1.6 * ((t / dur) % 1);
      const dx = Math.cos(th);
      const dy = Math.sin(th);
      const sweep = ctx.createLinearGradient(
        W / 2 + dx * (c - 260),
        H / 2 + dy * (c - 260),
        W / 2 + dx * (c + 260),
        H / 2 + dy * (c + 260)
      );
      // gaussian-ish falloff (the master used exp(-(d/260)^2), not a linear ramp)
      sweep.addColorStop(0, `rgba(${SWEEP_RGB},0)`);
      sweep.addColorStop(0.18, `rgba(${SWEEP_RGB},0.1)`);
      sweep.addColorStop(0.5, `rgba(${SWEEP_RGB},0.5)`);
      sweep.addColorStop(0.82, `rgba(${SWEEP_RGB},0.1)`);
      sweep.addColorStop(1, `rgba(${SWEEP_RGB},0)`);
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    const drawMesh = (flat, tri, rgb, minAlpha, maxAlpha, seedSalt) => {
      // Edges are batched into four alpha buckets so the mesh costs four stroke
      // calls per layer instead of one per triangle.
      const buckets = [[], [], [], []];
      for (let i = 0; i < tri.length; i += 3) {
        const a = tri[i];
        const b = tri[i + 1];
        const c = tri[i + 2];
        const ax = flat[a * 2];
        const ay = flat[a * 2 + 1];
        const bx = flat[b * 2];
        const by = flat[b * 2 + 1];
        const cx2 = flat[c * 2];
        const cy2 = flat[c * 2 + 1];
        const d1 = Math.hypot(ax - bx, ay - by);
        const d2 = Math.hypot(bx - cx2, by - cy2);
        const d3 = Math.hypot(ax - cx2, ay - cy2);
        if (Math.max(d1, d2, d3) > edgeMax) continue;
        const wgt = 0.5 + 0.5 * ((((a * 73856093) ^ (b * 19349663) ^ seedSalt) >>> 0) % 100) / 100;
        const bucket = Math.min(3, Math.floor(wgt * 4));
        buckets[bucket].push(ax, ay, bx, by, cx2, cy2);
      }
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const pts = buckets[k];
        if (!pts.length) continue;
        const alpha = minAlpha + (maxAlpha - minAlpha) * ((k + 0.5) / 4);
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i += 6) {
          ctx.moveTo(pts[i], pts[i + 1]);
          ctx.lineTo(pts[i + 2], pts[i + 3]);
          ctx.lineTo(pts[i + 4], pts[i + 5]);
          ctx.closePath();
        }
        ctx.stroke();
      }
    };

    const frame = (now) => {
      if (!running) return;
      try {
        drawFrame(now);
      } catch (err) {
        window.__ntxMeshError = String((err && err.message) || err);
        running = false;
        return;
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const drawFrame = (now) => {
      if (!start) start = now - (still || reduce ? 3600 : 0);
      const t = (now - start) / 1000;
      const dur = 14; // same nominal loop length as the card

      // lightweight FPS probe, read as window.__ntxMeshFps
      if (!fpsClock) fpsClock = now;
      frames += 1;
      if (now - fpsClock > 1000) {
        window.__ntxMeshFps = Math.round((frames * 1000) / (now - fpsClock));
        frames = 0;
        fpsClock = now;
      }

      drawGradient(t, dur);

      const cx = W * 0.5;
      const cy = H * 0.46;
      const push = 0.085 * (0.5 + 0.5 * Math.min(1, t / dur));
      const swirl = 0.06 * Math.min(1, t / dur);

      const farFlat = positions(far, t, cx, cy, push * 0.55, swirl * 0.55);
      const nearFlat = positions(near, t, cx, cy, push, swirl);

      const shFar = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 5.1);
      // CORRECTION: clamp the breathing floor (the video dips to ~6 % alpha at 6 s)
      const shNear = Math.max(0.45, 0.62 + 0.38 * Math.sin((2 * Math.PI * t) / 3.6));

      // triangulation is the most expensive step: refresh topology every third
      // frame, which is invisible at 60 fps and halves the cost
      triTick += 1;
      if (triTick % 3 === 1 || !nearTri) {
        farTri = triangulate(farFlat);
        nearTri = triangulate(nearFlat);
      }
      drawMesh(farFlat, farTri, FAR_EDGE_RGB, 0.02, 0.05 * shFar, 7);
      drawMesh(nearFlat, nearTri, NEAR_EDGE_RGB, 0.03, 0.13 * shNear, 13);

      // twinkling near nodes
      for (let i = 0; i < near.pts.length; i++) {
        const { spd, ph } = near.twi[i];
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * spd * t + ph));
        const r = near.rad[i] + (a > 0.9 ? 2 : a > 0.72 ? 1 : 0);
        ctx.fillStyle = `rgba(${NODE_RGB},${0.12 + 0.46 * a})`;
        ctx.beginPath();
        ctx.arc(nearFlat[i * 2], nearFlat[i * 2 + 1], r * (H / 1080), 0, Math.PI * 2);
        ctx.fill();
      }

      // travelling pulses with trails
      for (const p of pulses) {
        if (p.i === p.j || p.i >= near.pts.length || p.j >= near.pts.length) continue;
        const x0 = nearFlat[p.i * 2];
        const y0 = nearFlat[p.i * 2 + 1];
        const x1 = nearFlat[p.j * 2];
        const y1 = nearFlat[p.j * 2 + 1];
        if (Math.hypot(x0 - x1, y0 - y1) > 560 * (H / 1080)) continue;
        const q = ((t / p.per) + p.off) % 1;
        const fade = Math.sin(Math.PI * q) ** 2;
        const px = x0 + (x1 - x0) * q;
        const py = y0 + (y1 - y0) * q;
        const r = (2.4 + 3.4 * fade) * (H / 1080);
        ctx.fillStyle = `rgba(${CYAN},${0.7 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 1; k <= 3; k++) {
          const qq = Math.max(0, q - 0.035 * k);
          const tx = x0 + (x1 - x0) * qq;
          const ty = y0 + (y1 - y0) * qq;
          ctx.fillStyle = `rgba(${CYAN},${(0.35 * fade) / k})`;
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(0.6, r - k * 0.9), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    layout();
    const ro = new ResizeObserver(() => {
      // compare with the CSS box, not the backing store; the first callback fires
      // before the card has its final width, so this must never be throttled
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2) {
        layout();
        farTri = null;
        nearTri = null;
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
      // one dense frame, no loop
      frame(performance.now() + 3600);
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
