"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useSound from "use-sound";
import "./axe-roulette.styles.css";

export type SpinPhase = "idle" | "spinning" | "hitting" | "stopped";

interface AxeRouletteWindowProps {
  spinPhase: SpinPhase;
  wheelRotation: number;
  gameResult: "win" | "loss" | null;
  isGameOver: boolean;
  muteSfx: boolean;
  stuckAxeAngles?: number[];
}

const AXE_FRAME_COUNT = 11;
// Full rotation ends back on frame 1 (same orientation as throw start)
const STUCK_FRAME = 1;
// 30ms per frame × 11 frames = 330ms total (matches AXE_FLIGHT in AxeRoulette.tsx)
const FRAME_INTERVAL_MS = 30;

const AxeRouletteWindow: React.FC<AxeRouletteWindowProps> = ({
  spinPhase,
  wheelRotation,
  gameResult,
  isGameOver,
  muteSfx,
  stuckAxeAngles = [],
}) => {
  const sfxOpts = { interrupt: true, soundEnabled: !muteSfx };
  const [winSFX]     = useSound("/submissions/axe-roulette/sfx/win.mp3",          { ...sfxOpts, volume: 0.6 });
  const [loseSFX]    = useSound("/submissions/axe-roulette/sfx/lose.mp3",         { ...sfxOpts, volume: 0.6 });
  const [axeThrowSFX] = useSound("/submissions/axe-roulette/sfx/axe_throw.mp3",   { ...sfxOpts, volume: 0.8 });
  const [gameEndSFX] = useSound("/submissions/axe-roulette/sfx/snd_game_end.mp3", { ...sfxOpts, volume: 0.7 });
  const [axeFrame, setAxeFrame] = useState(1);

  useEffect(() => {
    if (gameResult === "win") winSFX();
    else if (gameResult === "loss") loseSFX();
  }, [gameResult]);

  useEffect(() => {
    if (isGameOver) gameEndSFX();
  }, [isGameOver]);

  // Play through all 11 frames exactly once during the throw
  useEffect(() => {
    if (spinPhase !== "hitting") {
      if (spinPhase === "stopped") setAxeFrame(STUCK_FRAME);
      return;
    }
    axeThrowSFX();
    setAxeFrame(1);
    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      if (current > AXE_FRAME_COUNT) {
        clearInterval(interval);
        return;
      }
      setAxeFrame(current);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [spinPhase]);

  const isWheelSpinning = spinPhase === "spinning" || spinPhase === "hitting";
  const axeFlying = spinPhase === "hitting";
  const axeStuck  = spinPhase === "stopped";

  const wheelStyle: React.CSSProperties = isWheelSpinning
    ? { animation: "axeWheelSpin 0.55s linear infinite" }
    : { transform: `rotate(${wheelRotation}deg)`, transition: "none" };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-0 overflow-hidden">
      <style>{`
        @keyframes axeWheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Forest background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/submissions/axe-roulette/forest-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Square container */}
      <div
        className="relative flex-shrink-0"
        style={{ width: "min(100%, 540px)", aspectRatio: "1" }}
      >

        {/* Axe — starts full-height at screen center, shrinks to wheel top on impact */}
        <div
          className="absolute z-10 overflow-visible"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}
        >
          <motion.div
            style={{ originX: 0.5, originY: 0.5 }}
            initial={{ y: 0, scale: 4.0, opacity: 0 }}
            animate={
              axeFlying
                ? {
                    y: -70,
                    scale: 0.22,
                    opacity: 1,
                    transition: {
                      duration: 0.33,
                      ease: "easeIn",
                      opacity: { duration: 0 },
                    },
                  }
                : axeStuck
                ? { y: -70, scale: 0.22, opacity: 1, transition: { duration: 0 } }
                : { y: 0, scale: 4.0, opacity: 0, transition: { duration: 0 } }
            }
          >
            {/* Preload all frames to avoid flicker */}
            {Array.from({ length: AXE_FRAME_COUNT }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i + 1}
                src={`/submissions/axe-roulette/axe-sprites/axe${i + 1}.png`}
                alt=""
                style={{
                  width: 250,
                  height: "auto",
                  display: axeFrame === i + 1 ? "block" : "none",
                  pointerEvents: "none",
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* Spinning wheel */}
        <div className="absolute" style={{ inset: "10%", ...wheelStyle }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/submissions/axe-roulette/wheel.png"
            alt="Roulette wheel"
            className="w-full h-full drop-shadow-2xl"
            draggable={false}
          />

          {/* Stuck axes from previous throws — rendered inside the wheel so they rotate with it */}
          {stuckAxeAngles.map((angle, i) => (
            <div
              key={i}
              className="absolute inset-0 pointer-events-none"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/submissions/axe-roulette/axe-sprites/axe1.png"
                alt=""
                className="absolute left-1/2"
                style={{
                  width: "12%",
                  height: "auto",
                  top: "25%",
                  transform: "translateX(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AxeRouletteWindow;
