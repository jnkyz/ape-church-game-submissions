"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { WHEEL_SLICES } from "./axeRouletteConfig";

interface AxeRouletteSetupCardProps {
  game: Game;
  currentView: 0 | 1 | 2;

  throwMode: 1 | 2;
  setThrowMode: (mode: 1 | 2) => void;

  betAmount: number;
  setBetAmount: (amount: number) => void;

  isLoading: boolean;
  isSpinning: boolean;
  payout: number | null;
  gameResult: "win" | "loss" | null;
  axeResults: {multiplier: number; payout: number}[];
  currentAxeNumber: number;
  inReplayMode: boolean;
  isGamePaused?: boolean;

  onPlay: () => void;
  onReset: () => void;
  onPlayAgain: () => void;

  walletBalance: number;
  minBet: number;
  maxBet: number;

  account?: unknown;
  playerAddress?: string;
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="w-full flex justify-between items-center text-xs font-medium">
      <p className="text-[#91989C]">{label}</p>
      <p className={highlight ? "text-green-400 text-right" : "text-right"}>{value}</p>
    </div>
  );
}

// Compute unique multipliers with their total probability from WHEEL_SLICES
interface OddsRow {
  multiplier: number;
  label: string;
  probability: number;
  color: string;
}

function getOdds(): OddsRow[] {
  const totals: Record<number, { degrees: number; color: string }> = {};
  for (const s of WHEEL_SLICES) {
    const deg = s.endAngle - s.startAngle;
    if (!totals[s.multiplier]) totals[s.multiplier] = { degrees: 0, color: s.color };
    totals[s.multiplier].degrees += deg;
  }
  const rows: OddsRow[] = [];
  for (const [mult, { degrees, color }] of Object.entries(totals)) {
    const m = Number(mult);
    rows.push({
      multiplier: m,
      label: m === 0 ? "💀 Miss" : `${m}×`,
      probability: degrees / 360,
      color,
    });
  }
  return rows.sort((a, b) => b.multiplier - a.multiplier);
}

const ODDS = getOdds();

const AxeRouletteSetupCard: React.FC<AxeRouletteSetupCardProps> = ({
  game,
  currentView,
  throwMode,
  setThrowMode,
  betAmount,
  setBetAmount,
  isLoading,
  isSpinning,
  payout,
  gameResult,
  axeResults,
  currentAxeNumber,
  inReplayMode,
  isGamePaused = false,
  onPlay,
  onReset,
  onPlayAgain,
  walletBalance,
  minBet,
  maxBet,
  account,
  playerAddress,
}) => {
  const theme = game.themeColorBackground;
  const canPlay = betAmount > 0 && !isGamePaused && !isLoading;


  // ── SETUP VIEW ──────────────────────────────────────────────────────────────
  if (currentView === 0) {
    return (
      <Card className="lg:basis-1/3 p-6 flex flex-col gap-5">
        <CardContent className="p-0 flex flex-col gap-5">

          {/* Throw mode selector */}
          <div>
            <p className="text-xs font-semibold text-[#91989C] uppercase tracking-wide mb-2">
              Throw Mode
            </p>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  throwMode === 1
                    ? "bg-[#1A56DB] text-white"
                    : "bg-[#2A3640] text-[#91989C] hover:text-white"
                }`}
                onClick={() => setThrowMode(1)}
                disabled={isLoading}
              >
                🪓 Single Axe
              </button>
              <button
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  throwMode === 2
                    ? "bg-[#1A56DB] text-white"
                    : "bg-[#2A3640] text-[#91989C] hover:text-white"
                }`}
                onClick={() => setThrowMode(2)}
                disabled={isLoading}
              >
                🪓🪓 Double Axe
              </button>
            </div>
            {throwMode === 2 && betAmount > 0 && (
              <p className="text-xs text-[#91989C] mt-1.5">
                {(betAmount / 2).toFixed(2)} APE per axe
              </p>
            )}
          </div>

          <BetAmountInput
            min={minBet}
            max={walletBalance}
            step={0.1}
            value={betAmount}
            onChange={setBetAmount}
            balance={walletBalance}
            usdMode={false}
            setUsdMode={() => {}}
            disabled={isLoading}
            themeColorBackground={theme}
          />

          {/* Wheel odds legend */}
          <div>
            <p className="text-xs font-semibold text-[#91989C] uppercase tracking-wide mb-2">
              Wheel Odds
            </p>
            <div className="flex flex-col gap-1">
              {ODDS.map((row) => (
                <div key={row.multiplier} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-medium">{row.label}</span>
                  </div>
                  <span className="flex-1 border-b border-dotted border-[#3A4650] mb-0.5" />
                  <span className="text-[#91989C] text-xs flex-shrink-0">
                    {(row.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <div className="grow" />

        <CardFooter className="p-0 flex flex-col gap-3">
          <div className="w-full flex flex-col gap-1.5">
            <StatRow label="Bet" value={`${betAmount.toFixed(2)} APE`} />
            <StatRow label="Max Bet" value={`${maxBet.toLocaleString()} APE`} />
          </div>

          <Button
            className="w-full font-bold tracking-wide text-base text-white"
            style={{ backgroundColor: "#1A56DB", borderColor: "#1A56DB" }}
            disabled={!canPlay}
            onClick={onPlay}
          >
            {throwMode === 2 ? "🪓🪓 Spin & Double Throw" : "🪓 Spin & Throw"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ── SPINNING VIEW ───────────────────────────────────────────────────────────
  if (currentView === 1) {
    return (
      <Card className="lg:basis-1/3 p-6 flex flex-col items-center justify-center gap-6">
        <CardContent className="p-0 flex flex-col items-center gap-4 w-full">
          <div className="w-full rounded-xl py-6 flex flex-col items-center gap-2 border-2 border-[#2A3640]">
            <p className="text-sm text-[#91989C] uppercase tracking-wider">
              {throwMode === 2
                ? `Axe ${currentAxeNumber} of 2 in the air…`
                : "Axe in the air…"}
            </p>
            <p className="text-5xl">🪓</p>
            <p className="text-sm text-[#91989C] animate-pulse">
              {isSpinning ? "Spinning…" : "Waiting…"}
            </p>
            {throwMode === 2 && axeResults.length === 1 && !isSpinning && (
              <p className="text-xs text-[#91989C] mt-1">
                Axe 1: {axeResults[0].multiplier > 0
                  ? `${axeResults[0].multiplier}× — ${axeResults[0].payout.toFixed(2)} APE`
                  : "Miss!"}
              </p>
            )}
          </div>
          <div className="w-full flex flex-col gap-1.5">
            <StatRow label="Bet" value={`${betAmount.toFixed(2)} APE`} />
            {throwMode === 2 && (
              <StatRow label="Per Axe" value={`${(betAmount / 2).toFixed(2)} APE`} />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── GAME OVER VIEW ──────────────────────────────────────────────────────────
  return (
    <Card className="lg:basis-1/3 p-6 flex flex-col gap-6">
      <CardContent className="p-0 flex flex-col gap-4">

        {gameResult && throwMode === 1 && (
          <div
            className={`w-full rounded-xl py-4 flex flex-col items-center gap-1 border-2 ${
              gameResult === "win"
                ? "border-green-400 bg-green-950/40"
                : "border-red-700 bg-red-950/40"
            }`}
          >
            <p className="text-sm uppercase tracking-wider text-[#91989C]">
              {gameResult === "win" ? "Direct hit!" : "Skull zone!"}
            </p>
            <p className={`text-4xl font-bold ${gameResult === "win" ? "text-green-400" : "text-red-400"}`}>
              {gameResult === "win"
                ? `+${(payout ?? 0).toFixed(2)} APE`
                : "💀 No payout"}
            </p>
            {gameResult === "win" && axeResults[0]?.multiplier > 0 && (
              <p className="text-sm text-white opacity-60">{axeResults[0].multiplier}× multiplier</p>
            )}
          </div>
        )}

        {gameResult && throwMode === 2 && (
          <div
            className={`w-full rounded-xl py-4 flex flex-col items-center gap-2 border-2 ${
              gameResult === "win"
                ? "border-green-400 bg-green-950/40"
                : "border-red-700 bg-red-950/40"
            }`}
          >
            <p className="text-sm uppercase tracking-wider text-[#91989C]">
              {gameResult === "win" ? "Hit!" : "Both missed!"}
            </p>
            <div className="flex flex-col gap-1 w-full px-4">
              {axeResults.map((r, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#91989C]">Axe {i + 1}</span>
                  <span className={r.multiplier > 0 ? "text-green-400" : "text-red-400"}>
                    {r.multiplier > 0 ? `${r.multiplier}× — ${r.payout.toFixed(2)} APE` : "💀 Miss"}
                  </span>
                </div>
              ))}
            </div>
            <p className={`text-3xl font-bold ${gameResult === "win" ? "text-green-400" : "text-red-400"}`}>
              {gameResult === "win"
                ? `+${(payout ?? 0).toFixed(2)} APE`
                : "💀 No payout"}
            </p>
          </div>
        )}

        <div className="w-full flex flex-col gap-1.5">
          <StatRow label="Bet" value={`${betAmount.toFixed(2)} APE`} />
          <StatRow
            label="Payout"
            value={`${(payout ?? 0).toFixed(2)} APE`}
            highlight={gameResult === "win"}
          />
          <StatRow
            label="Net"
            value={`${((payout ?? 0) - betAmount).toFixed(2)} APE`}
            highlight={(payout ?? 0) > betAmount}
          />
          <StatRow label="Wallet" value={`${walletBalance.toFixed(2)} APE`} />
        </div>
      </CardContent>

      <div className="grow" />

      <CardFooter className="p-0 flex flex-col gap-3">
        <Button
          className="w-full font-bold"
          style={{ backgroundColor: theme, borderColor: theme }}
          onClick={onPlayAgain}
          disabled={isGamePaused}
        >
          🪓 Throw Again
        </Button>
        <Button className="w-full" variant="secondary" onClick={onReset}>
          Change Bet
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AxeRouletteSetupCard;
