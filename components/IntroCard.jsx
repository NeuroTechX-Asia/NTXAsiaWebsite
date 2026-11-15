"use client";

/**
 * Web reproduction of the "Neuro Futures" title card (03_CARD / pass11_logo),
 * with the animated mesh ported to canvas. Timeline copied from
 * _work/make_card_anim_v3.py:
 *
 *   brand letters 0.15-0.85 s · PRESENTS 0.95-1.45 · title 1.45-2.00
 *   title grows 82 → 116 px over 2.05-4.72 · X pulse at 2.28 (+0.62)
 *   rule 5.95-6.30 · tagline 6.26-6.80
 *
 * Corrections vs the video:
 *   - every size is expressed in container units, so the card is resolution
 *     independent instead of hard-coded to 1920×1080
 *   - the type block only animates transform/opacity, so nothing reflows while
 *     the title grows
 *   - the X pulse repeats on a 9 s loop instead of being pinned to the old
 *     voice-over cue (2.24-2.72 s)
 *   - the logo sits inside a 4 % safe area (the video used a 3.7 % bottom margin,
 *     which players can crop)
 *   - a static dither overlay replaces the video's ±5 grain, killing banding
 */
import { useState } from "react";
import ConstellationMesh from "./ConstellationMesh";

const BRAND = "NeuroTechX Asia - China";
const SHOW = "Neuro Futures";
const TAG = "Exploring creativity, culture, and the future of neurotechnology";

export default function IntroCard({ showControls = true, density = 1.15 }) {
  const [key, setKey] = useState(0);

  return (
    <div className="relative w-full">
      <div
        key={key}
        className="intro-card relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: "16 / 9" }}
      >
        <ConstellationMesh className="absolute inset-0 h-full w-full" density={density} />

        <div className="intro-scrim absolute inset-0" aria-hidden="true" />
        <div className="intro-dither absolute inset-0" aria-hidden="true" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="intro-block">
            <p className="intro-brand" aria-label={BRAND}>
              {BRAND.split("").map((ch, i) => (
                <span
                  key={i}
                  className={ch === "X" ? "intro-letter intro-x" : "intro-letter"}
                  style={{ animationDelay: `${0.15 + i * 0.055}s` }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </p>

            <p className="intro-presents">
              {"PRESENTS".split("").map((ch, i) => (
                <span key={i} style={{ animationDelay: `${0.95 + i * 0.03}s` }}>
                  {ch}
                </span>
              ))}
            </p>

            <h1 className="intro-show">{SHOW}</h1>

            <span className="intro-rule" />

            <p className="intro-tag">{TAG}</p>
          </div>
        </div>

        <div className="intro-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/ntx-mark.png" alt="NeuroTechX" />
        </div>
      </div>

      {showControls && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>1920×1080 master, rebuilt in canvas — no video file loaded</span>
          <button type="button" onClick={() => setKey((k) => k + 1)} className="intro-replay">
            ↺ Replay
          </button>
        </div>
      )}
    </div>
  );
}
