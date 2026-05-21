"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Game } from "@/lib/games";
import { Hand, RoundResult, MULTIPLIER_LADDER, MAX_ROUNDS } from "./RPS";
import WinCelebration, { WinTier } from "./WinCelebration";

interface Props {
  game: Game;
  currentView: 0 | 1 | 2;
  gameActive: boolean;
  isRevealing: boolean;
  isPickPending: boolean;
  lastRound: RoundResult | null;
  currentRound: number;
  currentMultiplier: number;
  onPickHand: (hand: Hand) => void;
  onHandPress?: () => void;
  onCashOut: () => void;
  betAmount: number;
  autoSpeed?: number;
  autoProgress?: { current: number; total: number } | null;
}

// Twemoji SVGs — consistent rendering across Windows/Mac/iOS/Android/browsers.
const HAND_EMOJI_URL: Record<Hand, string> = {
  rock: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1faa8.svg",
  paper: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4c4.svg",
  scissors: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2702.svg",
};

const HAND_LABEL: Record<Hand, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

const HANDS: Hand[] = ["rock", "paper", "scissors"];
const HANDS_HOUSE: Hand[] = ["scissors", "paper", "rock"];

const RPSWindow: React.FC<Props> = ({
  game,
  currentView,
  gameActive,
  isRevealing,
  isPickPending,
  lastRound,
  currentRound,
  currentMultiplier,
  onPickHand,
  onHandPress,
  onCashOut,
  betAmount,
  autoSpeed = 1,
  autoProgress = null,
}) => {
  const speed = Math.max(1, autoSpeed);
  const theme = game.themeColorBackground;
  const [showOutcome, setShowOutcome] = useState(false);
  const [computerRevealed, setComputerRevealed] = useState(false);
  const [shakePhase, setShakePhase] = useState(false);
  const [playerPicked, setPlayerPicked] = useState<Hand | null>(null);
  const [computerHighlight, setComputerHighlight] = useState<Hand | null>(null);
  const [fightPhase, setFightPhase] = useState(false);
  const [showResultColors, setShowResultColors] = useState(false);
  const prevRoundRef = useRef<RoundResult | null>(null);
  const ladderScrollRef = useRef<HTMLDivElement | null>(null);
  const currentPillRef = useRef<HTMLDivElement | null>(null);

  // Keep the current-round pill centered in the ladder as the streak advances.
  useEffect(() => {
    if (!ladderScrollRef.current || !currentPillRef.current) return;
    const container = ladderScrollRef.current;
    const pill = currentPillRef.current;
    const offset = pill.offsetLeft - container.clientWidth / 2 + pill.clientWidth / 2;
    container.scrollTo({ left: offset, behavior: "smooth" });
  }, [currentRound]);

  // Handle round reveal animation
  useEffect(() => {
    if (!lastRound || lastRound === prevRoundRef.current) return;
    prevRoundRef.current = lastRound;

    // Phase 1: Player picks (instant), show player's choice moving to center
    setPlayerPicked(lastRound.playerHand);
    setComputerHighlight(null);
    setComputerRevealed(false);
    setShowOutcome(false);
    setFightPhase(false);
    setShowResultColors(false);
    setShakePhase(true);

    // Phase 2: At 1200ms reveal the computer's pick — house stops shaking (via !computerRevealed check).
    const t1 = setTimeout(() => {
      setComputerHighlight(lastRound.computerHand);
      setComputerRevealed(true);
    }, 1200 / speed);

    // Phase 2b: Player's hand keeps shaking with the tension sound — stops at 1900ms when the riser fades.
    const t1b = setTimeout(() => {
      setShakePhase(false);
    }, 1900 / speed);

    // Phase 3: Both move to center to fight
    const t2 = setTimeout(() => {
      setFightPhase(true);
    }, 1800 / speed);

    // Phase 4: Show outcome text and result colors together
    const t3 = setTimeout(() => {
      setShowOutcome(true);
      setShowResultColors(true);
    }, 2600 / speed);

    return () => {
      clearTimeout(t1);
      clearTimeout(t1b);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [lastRound]);

  // Reset picked state when revealing ends
  useEffect(() => {
    if (!isRevealing) {
      setPlayerPicked(null);
      setComputerHighlight(null);
      setFightPhase(false);
      setShowOutcome(false);
      setShowResultColors(false);
      setComputerRevealed(false);
      setShakePhase(false);
    }
  }, [isRevealing]);

  const outcomeColor = showResultColors && lastRound
    ? lastRound.outcome === "win"
      ? "#00C853"
      : lastRound.outcome === "lose"
      ? "#EF5350"
      : "#FFD700"
    : "#666";

  // Win celebration tier — escalates with streak. Only visible on a win outcome.
  const isWinCelebration = showOutcome && lastRound?.outcome === "win";
  const winTier: WinTier = lastRound
    ? lastRound.round >= 7 ? "mega" : lastRound.round >= 4 ? "big" : "small"
    : "small";
  const celebrationAccent = winTier === "mega" ? "#FF6F00" : winTier === "big" ? "#FFD700" : "#00C853";

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-1 sm:p-3 md:p-4 pt-3 sm:pt-6 md:pt-8">
      <WinCelebration show={isWinCelebration} tier={winTier} accentColor={celebrationAccent} />
      {/* ── Multiplier Ladder ── */}
      <div className="w-full">
        <div ref={ladderScrollRef} className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1 px-1 rps-no-scrollbar">
          {MULTIPLIER_LADDER.map((mult, i) => {
            const isActive = i < currentRound;
            const isCurrent = i === currentRound;
            return (
              <div
                key={i}
                ref={isCurrent ? currentPillRef : undefined}
                className="flex-shrink-0 flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-12 sm:w-14 h-7 sm:h-9 rounded-md flex items-center justify-center text-[10px] sm:text-sm font-bold transition-all duration-300"
                  style={{
                    background: isActive ? theme : isCurrent ? "#2a2a4a" : "#1a1a2e",
                    border: isCurrent ? `2px solid ${theme}` : isActive ? "2px solid transparent" : "1px solid #333",
                    color: isActive ? "#fff" : isCurrent ? theme : "#666",
                    boxShadow: isCurrent ? `0 0 12px ${theme}44` : "none",
                  }}
                >
                  {mult.toFixed(2)}x
                </div>
                <div className="text-[9px] font-medium" style={{ color: isActive ? theme : "#555" }}>
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Always reserve vertical space for the current-multiplier display so the
            layout doesn't shift when it appears/disappears. */}
        <div className="text-center mt-1.5 h-7 sm:h-9 md:h-10 flex items-center justify-center">
          {currentRound > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <span className="text-xl sm:text-2xl md:text-3xl font-black" style={{ color: "#FFD700" }}>
                {currentMultiplier.toFixed(2)}x
              </span>
              <span className="text-xs sm:text-sm text-white/50 ml-2">
                ({(betAmount * currentMultiplier).toFixed(2)} APE)
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── HOUSE (top) ── */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 w-full" style={{ transform: "translateY(-1%)" }}>
        <p className="text-xs sm:text-base md:text-lg text-white/40 font-bold uppercase tracking-widest">House</p>
        <div className="flex gap-3 sm:gap-4 md:gap-6 justify-center relative">
          {HANDS_HOUSE.map((hand) => {
            const isSelected = computerHighlight === hand;
            const isNotSelected = computerHighlight !== null && !isSelected;
            return (
              <motion.div
                key={`house-${hand}`}
                className="flex flex-col items-center gap-1.5"
                animate={
                  fightPhase && isSelected
                    ? { y: 12, scale: 1.05 }
                    : isNotSelected
                    ? { opacity: 0.2, scale: 0.8 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ type: "spring", stiffness: 150, damping: 18, mass: 0.8 }}
              >
                <div
                  className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isSelected ? "#1a1a2e" : "#1a1a2e88",
                    border: isSelected
                      ? `3px solid ${outcomeColor}`
                      : shakePhase
                      ? "2px solid #555"
                      : "2px solid #333",
                    boxShadow: isSelected ? `0 0 20px ${outcomeColor}44` : "none",
                  }}
                >
                  {shakePhase ? (
                    <motion.img
                      src={HAND_EMOJI_URL[hand]}
                      alt={hand}
                      draggable={false}
                      className="w-[2.9rem] h-[2.9rem] sm:w-[3.9rem] sm:h-[3.9rem] md:w-[5rem] md:h-[5rem] object-contain select-none"
                      animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                      style={{ filter: "brightness(0.5)" }}
                    />
                  ) : (
                    <img
                      src={HAND_EMOJI_URL[hand]}
                      alt={hand}
                      draggable={false}
                      className="w-[2.9rem] h-[2.9rem] sm:w-[3.9rem] sm:h-[3.9rem] md:w-[5rem] md:h-[5rem] object-contain select-none"
                      style={{ filter: isNotSelected ? "brightness(0.3)" : "none" }}
                    />
                  )}
                </div>
                <span
                  className="text-[9px] sm:text-xs font-bold uppercase tracking-wider"
                  style={{ color: isSelected ? outcomeColor : "#555" }}
                >
                  {HAND_LABEL[hand]}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: VS / Outcome — fixed height so VS↔WIN!/LOSE/TIE swap doesn't reflow ── */}
      <div className="flex flex-col items-center justify-center gap-1 h-20 sm:h-28 md:h-32 relative z-20 pointer-events-none">
        <AnimatePresence>
          {showOutcome && lastRound ? (
            <motion.div
              key={`outcome-${rounds_key(lastRound)}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-black tracking-widest rounded-lg"
              style={{
                color: outcomeColor,
                textShadow: `0 0 20px ${outcomeColor}, 0 2px 4px rgba(0,0,0,0.8)`,
              }}
            >
              <span className="px-4 sm:px-5 py-1 rounded-lg" style={{ background: "rgba(10, 10, 26, 0.85)" }}>
                {lastRound.outcome === "win" ? "WIN!" : lastRound.outcome === "lose" ? "LOSE" : "TIE"}
              </span>
            </motion.div>
          ) : (
            <motion.span
              key="vs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-black text-white/15"
            >
              VS
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── YOU (bottom) ── */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 w-full" style={{ transform: "translateY(3%)" }}>
        <div className="flex gap-3 sm:gap-4 md:gap-6 justify-center relative">
          {HANDS.map((hand) => {
            const isSelected = playerPicked === hand;
            const isNotSelected = playerPicked !== null && !isSelected;
            const canPick = gameActive && !isRevealing && !isPickPending;
            return (
              <motion.div
                key={`player-${hand}`}
                className="flex flex-col items-center gap-1.5"
                animate={
                  fightPhase && isSelected
                    ? { y: -12, scale: 1.1 }
                    : isNotSelected
                    ? { opacity: 0.2, scale: 0.8 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ type: "spring", stiffness: 150, damping: 18, mass: 0.8 }}
              >
                <motion.button
                  whileHover={canPick ? { scale: 1.08 } : {}}
                  whileTap={canPick ? { scale: 0.95 } : {}}
                  onPointerDown={() => { if (canPick) onHandPress?.(); }}
                  onClick={() => canPick && onPickHand(hand)}
                  disabled={!canPick}
                  className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isSelected ? "#1a1a2e" : "#1a1a2e",
                    border: isSelected
                      ? `3px solid ${outcomeColor}`
                      : canPick
                      ? `2px solid ${theme}`
                      : "2px solid #333",
                    boxShadow: isSelected
                      ? `0 0 20px ${outcomeColor}44`
                      : canPick
                      ? `0 0 12px ${theme}33`
                      : "none",
                    cursor: canPick ? "pointer" : "default",
                  }}
                >
                  {shakePhase && isSelected ? (
                    <motion.img
                      src={HAND_EMOJI_URL[hand]}
                      alt={hand}
                      draggable={false}
                      className="w-[2.9rem] h-[2.9rem] sm:w-[3.9rem] sm:h-[3.9rem] md:w-[5rem] md:h-[5rem] object-contain select-none pointer-events-none"
                      animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                    />
                  ) : (
                    <img
                      src={HAND_EMOJI_URL[hand]}
                      alt={hand}
                      draggable={false}
                      className="w-[2.9rem] h-[2.9rem] sm:w-[3.9rem] sm:h-[3.9rem] md:w-[5rem] md:h-[5rem] object-contain select-none pointer-events-none"
                      style={{ filter: isNotSelected ? "brightness(0.3)" : "none" }}
                    />
                  )}
                </motion.button>
                <span
                  className="text-[9px] sm:text-xs font-bold uppercase tracking-wider"
                  style={{ color: isSelected ? outcomeColor : canPick ? theme : "#555" }}
                >
                  {HAND_LABEL[hand]}
                </span>
              </motion.div>
            );
          })}
        </div>
        <p className="text-xs sm:text-base md:text-lg text-white/40 font-bold uppercase tracking-widest">You</p>
      </div>

      {/* ── Cash Out / Pick Label — fixed min-height so state swaps don't reflow layout ── */}
      <div className="w-full max-w-lg min-h-[5.5rem] sm:min-h-[7rem] flex items-center justify-center">
        {gameActive && !isRevealing && !isPickPending && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full flex flex-col gap-2"
          >
            {currentRound > 0 && (
              <button
                onClick={onCashOut}
                className="w-full py-2.5 sm:py-4 rounded-xl font-bold text-sm sm:text-lg md:text-xl transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "#00C853",
                  color: "#fff",
                  boxShadow: "0 0 20px #00C85344",
                }}
              >
                Cash Out {(betAmount * currentMultiplier).toFixed(2)} APE
              </button>
            )}
            <p className="text-center text-white/50 text-sm font-medium">
              {currentRound === 0 ? "Pick your hand" : "Pick again or cash out"}
            </p>
          </motion.div>
        )}

        {isPickPending && (
          <div className="text-center flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: theme }} />
              <p className="text-sm font-semibold" style={{ color: theme }}>
                Confirming transaction...
              </p>
            </div>
            <p className="text-[10px] text-white/30">Generating house hand onchain</p>
          </div>
        )}

        {isRevealing && !showOutcome && (
          <div className="text-center flex flex-col items-center gap-1">
            <p className="text-white/40 text-base animate-pulse">
              {shakePhase ? "Shuffling..." : "Revealing..."}
            </p>
            {autoProgress && (
              <p className="text-xs font-semibold" style={{ color: theme }}>
                Auto Play — Round {autoProgress.current} of {autoProgress.total}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function rounds_key(r: RoundResult): string {
  return `${r.round}-${r.outcome}-${r.playerHand}-${r.computerHand}`;
}

export default RPSWindow;
