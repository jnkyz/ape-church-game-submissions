"use client";

import React from "react";
import { motion } from "motion/react";
import { Game } from "@/lib/games";
import { AutoGame, AutoPhase, Hand, MULTIPLIER_LADDER } from "./RPS";

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

interface Props {
  game: Game;
  games: AutoGame[];
  phase: AutoPhase;
  betAmount: number;
  onPickHand: (id: number, hand: Hand) => void;
  onPickAll: (hand: Hand | "random") => void;
  onCommit: () => void;
}

// Grid column count — keeps each mini-match roughly square and readable.
function gridColsForN(n: number): number {
  if (n <= 2) return 2;
  if (n <= 4) return 2;
  if (n <= 6) return 3;
  if (n <= 9) return 3;
  if (n <= 12) return 4;
  if (n <= 16) return 4;
  return 5;
}

const RPSAutoBoard: React.FC<Props> = ({ game, games, phase, betAmount, onPickHand, onPickAll, onCommit }) => {
  const theme = game.themeColorBackground;
  const n = games.length;

  // Initial render can briefly see games=[] before the sync effect seeds the grid.
  // Avoid MULTIPLIER_LADDER[-1] crashes by holding the board blank for a tick.
  if (n === 0) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <p className="text-white/40 text-sm animate-pulse">Loading auto play...</p>
      </div>
    );
  }

  const cols = gridColsForN(n);
  const allPicked = games.every(g => g.playerHand !== null);
  const targetMult = MULTIPLIER_LADDER[n - 1];
  const targetPayout = betAmount * targetMult;

  const resultVisible = phase === "outcome" || phase === "done";
  const anyLoss = resultVisible && games.some(g => g.outcome === "lose");
  const wins = resultVisible ? games.filter(g => g.outcome === "win").length : 0;
  const ties = resultVisible ? games.filter(g => g.outcome === "tie").length : 0;

  // Hide small labels when N is high so the cards stay legible.
  const showLabels = n <= 9;
  const compact = n > 12;

  return (
    <div className="absolute inset-0 z-10 flex flex-col p-2 sm:p-3 md:p-4 gap-2">
      {/* Header — auto info */}
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest">Auto Play</span>
          <span className="text-sm sm:text-base font-bold text-white">{n} Hands</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest">Target</span>
          <span className="text-sm sm:text-base font-black" style={{ color: "#FFD700" }}>
            {targetMult.toFixed(2)}x · {targetPayout.toFixed(2)} APE
          </span>
        </div>
      </div>

      {/* Scattered grid of mini-matches — grid itself flexes so rows divide
          the available vertical space, keeping the footer clear. */}
      <div
        className="flex-1 min-h-0 grid gap-1.5 sm:gap-2 w-full overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${Math.ceil(n / cols)}, minmax(0, 1fr))`,
        }}
      >
        {games.map((g) => (
          <AutoMiniMatch
            key={g.id}
            game={g}
            phase={phase}
            themeColor={theme}
            showLabels={showLabels}
            compact={compact}
            onPickHand={(hand) => onPickHand(g.id, hand)}
          />
        ))}
      </div>

      {/* Footer controls */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {phase === "picking" && (
          <>
            <div className="flex gap-1.5 sm:gap-2">
              {HANDS.map(h => (
                <button
                  key={h}
                  onClick={() => onPickAll(h)}
                  className="flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold text-white/70 border border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-1"
                >
                  <img src={HAND_EMOJI_URL[h]} alt={h} className="w-4 h-4 object-contain" />
                  All
                </button>
              ))}
              <button
                onClick={() => onPickAll("random")}
                className="flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold text-white/70 border border-white/20 hover:bg-white/5 transition-all"
              >
                Random
              </button>
            </div>
            <button
              onClick={onCommit}
              disabled={!allPicked}
              className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${allPicked ? "rps-commit-pulse" : ""}`}
              style={{
                background: theme,
                color: "#fff",
                // CSS var feeds the pulse keyframes so the glow matches the game theme.
                ["--rps-pulse-color" as string]: `${theme}cc`,
              }}
            >
              {allPicked
                ? `Commit ${n} Hands — ${targetMult.toFixed(2)}x`
                : `Pick All ${n} Hands (${games.filter(g => g.playerHand).length}/${n})`}
            </button>
          </>
        )}
        {phase === "shaking" && (
          <p className="text-center text-white/50 text-sm animate-pulse">Shuffling all hands...</p>
        )}
        {phase === "revealing" && (
          <p className="text-center text-white/50 text-sm animate-pulse">Revealing...</p>
        )}
        {resultVisible && (
          <div className="text-center flex flex-col items-center gap-0.5">
            {anyLoss ? (
              <p className="font-black text-lg sm:text-xl tracking-widest" style={{ color: "#EF5350" }}>
                BUST
              </p>
            ) : (
              <>
                <p className="font-black text-lg sm:text-xl tracking-widest" style={{ color: "#00C853" }}>
                  {wins === n
                    ? `ALL WIN · ${targetMult.toFixed(2)}x`
                    : `${wins}W / ${ties}T · ${(wins === 0 ? 1 : MULTIPLIER_LADDER[wins - 1]).toFixed(2)}x`}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface MiniProps {
  game: AutoGame;
  phase: AutoPhase;
  themeColor: string;
  showLabels: boolean;
  compact: boolean;
  onPickHand: (hand: Hand) => void;
}

const AutoMiniMatch: React.FC<MiniProps> = ({ game, phase, themeColor, showLabels, compact, onPickHand }) => {
  const canPick = phase === "picking";
  const shaking = phase === "shaking";
  const revealed = phase === "revealing" || phase === "outcome" || phase === "done";
  const showOutcome = phase === "outcome" || phase === "done";

  const outcomeColor = showOutcome && game.outcome
    ? game.outcome === "win" ? "#00C853"
    : game.outcome === "tie" ? "#FFD700"
    : "#EF5350"
    : themeColor;

  const cardGap = compact ? "gap-0.5" : "gap-1";
  const labelClass = compact
    ? "text-[6px] tracking-wider"
    : "text-[7px] sm:text-[9px] tracking-widest";

  return (
    <div
      className="relative rounded-lg flex flex-col items-center p-1 sm:p-1.5 min-h-0 min-w-0 overflow-hidden"
      style={{
        background: "#120a1e",
        border: `1px solid ${showOutcome ? outcomeColor : "#1E88E533"}`,
        boxShadow: showOutcome && game.outcome === "win" ? "0 0 12px #00C85366" : "none",
      }}
    >
      {/* House label */}
      {showLabels && (
        <span className={`${labelClass} text-white/40 font-bold uppercase`}>House</span>
      )}

      {/* House row */}
      <div className={`flex ${cardGap} w-full flex-1 min-h-0 items-center`}>
        {HANDS_HOUSE.map(h => {
          const selected = revealed && game.computerHand === h;
          const dim = revealed && game.computerHand !== null && !selected;
          return (
            <div
              key={`h-${h}`}
              className="flex-1 min-w-0 h-full rounded flex items-center justify-center transition-all duration-300"
              style={{
                background: "#1a1a2e",
                border: `1.5px solid ${selected ? outcomeColor : "#333"}`,
                opacity: dim ? 0.25 : 1,
                boxShadow: selected ? `0 0 8px ${outcomeColor}77` : "none",
              }}
            >
              {shaking && !revealed ? (
                <motion.img
                  src={HAND_EMOJI_URL[h]}
                  alt={h}
                  draggable={false}
                  animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="w-[72%] h-[72%] object-contain select-none"
                  style={{ filter: "brightness(0.5)" }}
                />
              ) : (
                <img
                  src={HAND_EMOJI_URL[h]}
                  alt={h}
                  draggable={false}
                  className="w-[72%] h-[72%] object-contain select-none"
                  style={{ filter: dim ? "brightness(0.4)" : "none" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* VS */}
      <span className={`${compact ? "text-[8px]" : "text-[9px] sm:text-[11px]"} font-black text-white/20 my-0.5`}>VS</span>

      {/* Player row */}
      <div className={`flex ${cardGap} w-full flex-1 min-h-0 items-center`}>
        {HANDS.map(h => {
          const selected = game.playerHand === h;
          const dim = game.playerHand !== null && !selected;
          const isShaking = shaking && selected;
          return (
            <button
              key={`p-${h}`}
              onClick={() => canPick && onPickHand(h)}
              disabled={!canPick}
              className="flex-1 min-w-0 h-full rounded flex items-center justify-center transition-all duration-200"
              style={{
                background: "#1a1a2e",
                border: `1.5px solid ${selected ? outcomeColor : canPick ? themeColor : "#333"}`,
                opacity: dim ? 0.25 : 1,
                boxShadow: selected && !showOutcome ? `0 0 8px ${themeColor}77`
                  : selected && showOutcome ? `0 0 8px ${outcomeColor}77`
                  : canPick ? `0 0 6px ${themeColor}33`
                  : "none",
                cursor: canPick ? "pointer" : "default",
              }}
              title={HAND_LABEL[h]}
            >
              {isShaking ? (
                <motion.img
                  src={HAND_EMOJI_URL[h]}
                  alt={h}
                  draggable={false}
                  animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="w-[72%] h-[72%] object-contain select-none"
                />
              ) : (
                <img
                  src={HAND_EMOJI_URL[h]}
                  alt={h}
                  draggable={false}
                  className="w-[72%] h-[72%] object-contain select-none"
                  style={{ filter: dim ? "brightness(0.4)" : "none" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* You label */}
      {showLabels && (
        <span className={`${labelClass} text-white/40 font-bold uppercase`}>You</span>
      )}

      {/* Outcome corner badge */}
      {showOutcome && game.outcome && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="absolute top-0.5 right-0.5 text-[8px] sm:text-[9px] font-black px-1 py-0 rounded tracking-wider"
          style={{ background: outcomeColor, color: "#fff" }}
        >
          {game.outcome === "win" ? "W" : game.outcome === "tie" ? "T" : "L"}
        </motion.span>
      )}
    </div>
  );
};

export default RPSAutoBoard;
