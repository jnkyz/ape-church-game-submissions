"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { RoundResult, MULTIPLIER_LADDER, MAX_ROUNDS } from "./RPS";

interface Props {
  game: Game;
  onPlay: () => void;
  onReset: () => void;
  onPlayAgain: () => void;
  currentView: 0 | 1 | 2;
  betAmount: number;
  setBetAmount: (v: number) => void;
  isLoading: boolean;
  payout: number | null;
  inReplayMode: boolean;
  walletBalance: number;
  minBet: number;
  maxBet: number;
  currentRound: number;
  currentMultiplier: number;
  rounds: RoundResult[];
  isAutoMode: boolean;
  setIsAutoMode: (v: boolean) => void;
  autoNumHands: number;
  setAutoNumHands: (v: number) => void;
  onStartAutoPlay: () => void;
  isAutoPlaying: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });

const RPSSetupCard: React.FC<Props> = ({
  game, onPlay, onReset, onPlayAgain,
  currentView, betAmount, setBetAmount, isLoading, payout,
  inReplayMode, walletBalance, minBet, maxBet,
  currentRound, currentMultiplier, rounds,
  isAutoMode, setIsAutoMode,
  autoNumHands, setAutoNumHands,
  onStartAutoPlay, isAutoPlaying,
}) => {
  const theme = game.themeColorBackground;
  const netPnl = payout !== null ? payout - betAmount : null;
  const isWin = netPnl !== null && netPnl > 0;
  const autoTargetMultiplier = MULTIPLIER_LADDER[autoNumHands - 1];
  const autoTargetPayout = betAmount * autoTargetMultiplier;

  return (
    <Card className="lg:basis-1/3 lg:aspect-[1/2] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 lg:overflow-hidden lg:min-h-0">
      {/* ── Setup ── */}
      {currentView === 0 && (
        <>
          <CardContent className="p-0 flex flex-col gap-3 sm:gap-4 order-2 lg:order-1">
            {inReplayMode && (
              <p className="text-center font-semibold text-lg" style={{ color: theme }}>
                Replay Mode
              </p>
            )}

            {/* Mode toggle */}
            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-lg"
              style={{ background: "#120a1e", border: "1px solid #1E88E544" }}
            >
              <button
                className="py-2 rounded-md text-sm font-bold transition-all"
                style={{
                  background: !isAutoMode ? theme : "transparent",
                  color: !isAutoMode ? "#fff" : "#888",
                }}
                onClick={() => setIsAutoMode(false)}
                disabled={isAutoPlaying}
              >
                Manual
              </button>
              <button
                className="py-2 rounded-md text-sm font-bold transition-all"
                style={{
                  background: isAutoMode ? theme : "transparent",
                  color: isAutoMode ? "#fff" : "#888",
                }}
                onClick={() => setIsAutoMode(true)}
                disabled={isAutoPlaying}
              >
                Auto Play
              </button>
            </div>

            <BetAmountInput
              min={minBet} max={maxBet} step={0.1}
              value={betAmount} onChange={setBetAmount}
              balance={walletBalance} usdMode={false} setUsdMode={() => {}}
              disabled={isLoading || isAutoPlaying} themeColorBackground={theme}
            />

            {/* Auto Play — Number of Hands dropdown */}
            {isAutoMode && (
              <div
                className="rounded-lg p-2.5 flex flex-col gap-2"
                style={{ background: "#120a1e", border: "1px solid #1E88E544" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="auto-num-hands" className="font-semibold text-sm" style={{ color: theme }}>
                    Number of Hands
                  </label>
                  <select
                    id="auto-num-hands"
                    value={autoNumHands}
                    onChange={(e) => setAutoNumHands(Number(e.target.value))}
                    disabled={isAutoPlaying}
                    className="bg-[#1a1a2e] text-white text-sm font-bold rounded-md px-3 py-1.5 border cursor-pointer"
                    style={{ borderColor: theme }}
                  >
                    {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                  <span className="font-bold" style={{ color: "#FFD700" }}>{autoTargetMultiplier.toFixed(2)}x</span>
                  <span className="font-bold" style={{ color: "#00C853" }}>{fmt(autoTargetPayout)} APE</span>
                </div>
              </div>
            )}

            <div
              className="rounded-lg p-2.5 flex flex-col gap-1.5 text-xs text-muted-foreground"
              style={{ background: "#120a1e", border: "1px solid #1E88E544" }}
            >
              <p className="font-semibold text-sm" style={{ color: theme }}>
                {isAutoMode ? "How Auto Play Works" : "How to Play"}
              </p>
              {!isAutoMode ? (
                <>
                  <p>Pick <span className="text-white font-semibold">Rock, Paper, or Scissors</span> and beat the house!</p>
                  <p><span className="text-white font-semibold">Win</span> = <span style={{ color: "#FFD700" }}>1.96x</span> your bet. <span className="text-white font-semibold">Tie</span> = push (keep playing). <span className="text-white font-semibold">Lose</span> = lose your bet.</p>
                  <p>After a win, choose to <span className="text-green-400 font-semibold">Cash Out</span> or <span style={{ color: theme }} className="font-semibold">keep going</span> for compounding multipliers!</p>
                </>
              ) : (
                <>
                  <p>Pick your <span className="text-white font-semibold">target rounds (2–20)</span>, then press start.</p>
                  <p>The game plays <span className="text-white font-semibold">hands automatically</span> at 2× speed. Ties re-roll.</p>
                  <p><span className="text-green-400 font-semibold">All wins</span> → auto-cash out at target. <span className="text-red-400 font-semibold">Any loss</span> → lose bet.</p>
                </>
              )}

              {!isAutoMode && (
                <>
                  <p className="font-semibold text-xs mt-1" style={{ color: theme }}>Multiplier Ladder</p>
                  <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                    {MULTIPLIER_LADDER.slice(0, 10).map((m, i) => (
                      <span key={i} className="py-0.5 rounded" style={{ background: "#1a1a2e" }}>
                        {i + 1}: <span style={{ color: "#FFD700" }}>{m.toFixed(2)}x</span>
                      </span>
                    ))}
                  </div>
                </>
              )}

            </div>

            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Bet</span><span>{fmt(betAmount)} APE</span>
              </div>
              <div className="flex justify-between">
                <span>Balance</span><span>{fmt(walletBalance)} APE</span>
              </div>
            </div>
          </CardContent>

          <div className="grow hidden lg:block lg:order-2" />

          <CardFooter className="p-0 flex flex-col gap-2 order-1 lg:order-3">
            <Button
              className="w-full text-base font-bold py-3.5"
              style={{ background: theme, borderColor: theme }}
              disabled={betAmount <= 0 || isLoading || isAutoPlaying}
              onClick={isAutoMode ? onStartAutoPlay : onPlay}
            >
              {isAutoPlaying
                ? "Auto Playing..."
                : isLoading
                ? "Confirming..."
                : isAutoMode
                ? `Start Auto Play — ${autoTargetMultiplier.toFixed(2)}x`
                : "Play"}
            </Button>
          </CardFooter>
        </>
      )}

      {/* ── Playing ── */}
      {currentView === 1 && (
        <CardContent className="p-0 grow flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Bet</span><span>{fmt(betAmount)} APE</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Round</span>
              <span style={{ color: theme }}>{currentRound} / {MAX_ROUNDS}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Current Multiplier</span>
              <span style={{ color: "#FFD700" }}>{currentMultiplier.toFixed(2)}x</span>
            </div>
            {currentRound > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Potential Payout</span>
                <span style={{ color: "#00C853" }}>{fmt(betAmount * currentMultiplier)} APE</span>
              </div>
            )}
          </div>

          {/* Round history */}
          {rounds.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              <p className="text-xs font-semibold text-muted-foreground">History</p>
              <div className="max-h-48 overflow-y-auto rps-no-scrollbar flex flex-col gap-1">
                {rounds.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs px-2 py-1 rounded"
                    style={{ background: "#1a1a2e" }}
                  >
                    <span className="text-white/60">
                      {r.playerHand} vs {r.computerHand}
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        color: r.outcome === "win" ? "#00C853" : r.outcome === "lose" ? "#EF5350" : "#FFD700"
                      }}
                    >
                      {r.outcome.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* ── Game over ── */}
      {currentView === 2 && (
        <>
          <CardContent className="p-0 flex flex-col gap-5">
            {inReplayMode && (
              <p className="text-center font-semibold" style={{ color: theme }}>Replay Mode</p>
            )}

            {payout !== null && payout > 0 && (
              <div
                className="text-center py-2 rounded-lg font-black text-lg tracking-widest"
                style={{
                  color: "#FFD700",
                  background: "#120a1e",
                  border: "1px solid #FFD70044",
                }}
              >
                {currentMultiplier >= 50 ? "MEGA WIN" : currentMultiplier >= 5 ? "BIG WIN" : "WIN"}
              </div>
            )}

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Bet</span><span>{fmt(betAmount)} APE</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Rounds Won</span>
                <span style={{ color: theme }}>{currentRound}</span>
              </div>
              {payout !== null && payout > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Final Multiplier</span>
                  <span style={{ color: "#FFD700" }}>{currentMultiplier.toFixed(2)}x</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2 mt-1">
                <span>Payout</span>
                <span style={{ color: isWin ? "#00C853" : "#EF5350" }}>
                  {fmt(payout ?? 0)} APE
                </span>
              </div>
              {netPnl !== null && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>P&L</span>
                  <span style={{ color: isWin ? "#00C853" : "#EF5350" }}>
                    {isWin ? "+" : ""}{fmt(netPnl)} APE
                  </span>
                </div>
              )}
            </div>
          </CardContent>

          <div className="grow" />

          <CardFooter className="p-0 flex flex-col gap-3">
            <Button
              className="w-full font-bold"
              style={{ background: theme, borderColor: theme }}
              onClick={onPlayAgain}
            >
              Play Again
            </Button>
            <Button className="w-full" variant="ghost" onClick={onReset}>
              Change Bet
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default RPSSetupCard;
