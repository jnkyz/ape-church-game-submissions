"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

export type WinTier = "small" | "big" | "mega";

interface Props {
  show: boolean;
  tier: WinTier;
  accentColor?: string;
}

const TIER_CONFIG: Record<WinTier, {
  label: string | null;
  particleCount: number;
  flashOpacity: number;
  flashDuration: number;
  shake: boolean;
}> = {
  small: { label: null,         particleCount: 10, flashOpacity: 0,    flashDuration: 0,   shake: false },
  big:   { label: "BIG WIN!",   particleCount: 22, flashOpacity: 0.35, flashDuration: 250, shake: false },
  mega:  { label: "MEGA WIN!",  particleCount: 48, flashOpacity: 0.55, flashDuration: 400, shake: true  },
};

const CONFETTI_COLORS = ["#FFD700", "#00C853", "#1E88E5", "#E91E63", "#FF6F00", "#FFFFFF"];

const WinCelebration: React.FC<Props> = ({ show, tier, accentColor = "#FFD700" }) => {
  const config = TIER_CONFIG[tier];

  // Regenerate particles whenever the celebration mounts (keyed remount ensures this).
  const particles = useMemo(() => {
    return Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 500,
      y: Math.random() * -300 - 50,
      rotate: Math.random() * 720 - 360,
      scale: 0.6 + Math.random() * 0.8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.15,
    }));
  }, [config.particleCount]);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={`cel-${tier}`}
          className="absolute inset-0 z-[25] pointer-events-none overflow-hidden"
          initial={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          animate={config.shake
            ? { x: [0, -8, 8, -6, 6, -4, 4, 0] }
            : { x: 0 }}
          transition={config.shake
            ? { duration: 0.4, ease: "easeInOut" }
            : { duration: 0 }}
        >
          {/* Screen flash */}
          {config.flashOpacity > 0 && (
            <motion.div
              className="absolute inset-0"
              style={{ background: accentColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, config.flashOpacity, 0] }}
              transition={{ duration: config.flashDuration / 1000, times: [0, 0.3, 1] }}
            />
          )}

          {/* Tier label */}
          {config.label && (
            <motion.div
              className="absolute inset-0 flex items-start justify-center pt-16 sm:pt-20 pointer-events-none"
              initial={{ scale: 0, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
            >
              <div
                className="text-3xl sm:text-5xl font-black tracking-widest px-4 py-2 rounded-xl"
                style={{
                  color: accentColor,
                  background: "rgba(10, 10, 26, 0.85)",
                  textShadow: `0 0 24px ${accentColor}, 0 2px 6px rgba(0,0,0,0.8)`,
                  border: `2px solid ${accentColor}`,
                  boxShadow: `0 0 30px ${accentColor}66`,
                }}
              >
                {config.label}
              </div>
            </motion.div>
          )}

          {/* Confetti particles bursting from center */}
          <div className="absolute inset-0 flex items-center justify-center">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute"
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  rotate: p.rotate,
                  opacity: 0,
                  scale: p.scale,
                }}
                transition={{
                  duration: 1.2,
                  delay: p.delay,
                  ease: [0.25, 0.75, 0.5, 1],
                }}
                style={{
                  width: tier === "mega" ? 12 : 8,
                  height: tier === "mega" ? 12 : 8,
                  background: p.color,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${p.color}`,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinCelebration;
