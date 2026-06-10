"use client";

import React from "react";
import Image from "next/image";
import {
  CircleHelp,
  CircleDollarSign,
  Gauge,
  RefreshCw,
  SlidersHorizontal,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import { Game } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  DIFFICULTY_PRESETS,
  MAX_BET,
  MAX_PROFIT,
} from "./megaBonkConfig";

interface MegaBonkSetupCardProps {
  game: Game;
  currentView: 0 | 1 | 2;
  betAmount: number;
  setBetAmount: (v: number) => void;
  difficulty: number;
  setDifficulty: (v: number) => void;
  winChance: number;
  potentialPayout: number;
  playCurrency: "ape" | "gp";
  onPlayCurrencyChange: (currency: "ape" | "gp") => void;
  currencySwitchDisabled: boolean;
  usdMode: boolean;
  setUsdMode: (mode: boolean) => void;
  walletBalance: number;
  score: number | null;
  won: boolean | null;
  isLoading: boolean;
  inReplayMode: boolean;
  onPlay: () => Promise<void>;
  onReset: () => void;
  onPlayAgain: () => Promise<void>;
  onRewatch: () => void;
  onOpenRules: () => void;
}

const BRAND_PRIMARY = "#7FFFD4";
const BRAND_SURFACE =
  "linear-gradient(160deg, rgba(7, 20, 28, 0.97), rgba(15, 40, 53, 0.94))";
const BRAND_BORDER = "rgba(127, 255, 212, 0.34)";
const BET_CHIPS = [1, 5, 10, 25];
const TOKEN_USD_RATE = 1;
const APE_ICON_SRC = "/images/icons/ape_coin.png";
const GP_ICON_SRC = "/images/logos/gp-icon.svg";

const DIFFICULTY_LINES: [number, string][] = [
  [14, "grandma energy"],
  [24, "light stretching vibes"],
  [34, "training arc begins"],
  [44, "getting spicy"],
  [54, "now we are cooking"],
  [64, "genuinely unhinged"],
  [74, "confidence fraud"],
  [84, "ego liquidation"],
  [95, "you are so cooked"],
];

const getDifficultyLine = (difficulty: number): string =>
  DIFFICULTY_LINES.find(([max]) => difficulty <= max)?.[1] ?? "you are so cooked";

const fmt = (value: number): string =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CurrencyIcon = ({
  currency,
  className = "h-4 w-4",
}: {
  currency: "ape" | "gp";
  className?: string;
}) => (
  <Image
    src={currency === "ape" ? APE_ICON_SRC : GP_ICON_SRC}
    alt={currency === "ape" ? "ApeCoin" : "GP"}
    width={24}
    height={24}
    unoptimized={currency === "gp"}
    className={`${className} shrink-0 object-contain ${
      currency === "ape" ? "rounded-full" : ""
    }`}
  />
);

const MegaBonkSetupCard: React.FC<MegaBonkSetupCardProps> = ({
  game,
  currentView,
  betAmount,
  setBetAmount,
  difficulty,
  setDifficulty,
  winChance,
  potentialPayout,
  playCurrency,
  onPlayCurrencyChange,
  currencySwitchDisabled,
  usdMode,
  setUsdMode,
  walletBalance,
  score,
  won,
  isLoading,
  inReplayMode,
  onPlay,
  onReset,
  onPlayAgain,
  onRewatch,
  onOpenRules,
}) => {
  const maxProfit = MAX_PROFIT;
  const tokenLabel = playCurrency === "ape" ? "APE" : "GP";
  const displayUsd = playCurrency === "ape" && usdMode;
  const maxPlayableBet = Math.min(MAX_BET, walletBalance);
  const statusText =
    currentView === 2
      ? won
        ? "Target cleared"
        : "Target missed"
      : currentView === 1
        ? "Measuring impact"
        : "Ready to bonk";

  const formatAmount = (value: number, opts?: { withUnit?: boolean }): string => {
    if (displayUsd) {
      return `$${fmt(value * TOKEN_USD_RATE)}`;
    }
    const amount = Number.isInteger(value) ? value.toLocaleString() : fmt(value);
    return opts?.withUnit === false ? amount : `${amount} ${tokenLabel}`;
  };

  const addBet = (amount: number): void => {
    setBetAmount(Math.min(betAmount + amount, maxPlayableBet));
  };

  const toggleUsdMode = (): void => {
    if (playCurrency === "ape") {
      setUsdMode(!usdMode);
    }
  };

  return (
    <aside className="flex min-w-0 w-full flex-col lg:basis-1/3">
      <section
        className="flex min-w-0 w-full flex-col overflow-hidden rounded-[8px] border"
        style={{
          background: BRAND_SURFACE,
          borderColor: BRAND_BORDER,
          boxShadow: "0 0 30px rgba(0, 229, 255, 0.14)",
        }}
      >
        <header className="relative overflow-hidden border-b border-[#7FFFD433] bg-[#07131B]/80 px-4 py-4">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black tracking-[0.06em] text-[#ECFFFB]">
                {game.title}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-[#7FFFD4] drop-shadow-[0_0_14px_rgba(127,255,212,0.44)]">
                  {difficulty}
                </span>
                <span className="pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8AD9E8]">
                  target
                </span>
              </div>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#D8FFF6]">
                {statusText}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onOpenRules}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#7FFFD433] text-[#8AD9E8] transition hover:border-[#7FFFD466] hover:bg-[#7FFFD4]/10 hover:text-[#C9FFF3]"
                title="How to play"
                aria-label="How to play"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#7FFFD455] bg-[#0D1D29]/90 p-1">
                <Image
                  src="/submissions/mega-bonk/ui/jnkyz-logo-white.png"
                  alt="JNKYZ"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        {currentView === 0 ? (
          <>
            <div className="flex flex-col gap-3 px-5 pb-4 pt-5">
              <div className="flex items-center justify-between gap-3 rounded-[6px] border border-[#7FFFD422] bg-[#07131B]/60 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
                  <span
                    className={`flex items-center gap-1.5 ${
                      playCurrency === "ape" ? "text-[#C9FFF3]" : "text-[#54727B]"
                    }`}
                  >
                    <CurrencyIcon
                      currency="ape"
                      className={`h-4 w-4 ${playCurrency === "ape" ? "" : "opacity-50"}`}
                    />
                    APE
                  </span>
                  <Switch
                    checked={playCurrency === "gp"}
                    disabled={currencySwitchDisabled}
                    onCheckedChange={(checked) =>
                      onPlayCurrencyChange(checked ? "gp" : "ape")
                    }
                    className="data-[state=checked]:bg-[#7FFFD4] data-[state=unchecked]:bg-[#24404A]"
                    aria-label="Switch play currency"
                  />
                  <span
                    className={`flex items-center gap-1.5 ${
                      playCurrency === "gp" ? "text-[#C9FFF3]" : "text-[#54727B]"
                    }`}
                  >
                    <CurrencyIcon
                      currency="gp"
                      className={`h-4 w-4 ${playCurrency === "gp" ? "" : "opacity-50"}`}
                    />
                    GP
                  </span>
                </div>
                <button
                  type="button"
                  aria-pressed={displayUsd}
                  disabled={playCurrency !== "ape"}
                  onClick={toggleUsdMode}
                  className="flex items-center gap-1.5 rounded-[5px] border border-[#7FFFD433] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#98C9D3] transition hover:border-[#7FFFD466] hover:text-[#C9FFF3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {displayUsd ? (
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  ) : (
                    <CurrencyIcon currency="ape" className="h-3.5 w-3.5" />
                  )}
                  {displayUsd ? "USD" : "APE"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#ECFFFB]">Bet Amount</span>
                <button
                  type="button"
                  onClick={toggleUsdMode}
                  className="flex items-center gap-1.5 text-xs text-[#98C9D3] transition hover:text-[#C9FFF3] disabled:hover:text-[#98C9D3]"
                  disabled={playCurrency !== "ape"}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {formatAmount(walletBalance)}
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-[6px] border border-[#7FFFD422] bg-[#07131B]/85 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleUsdMode}
                  disabled={playCurrency !== "ape"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7FFFD455] bg-[#0D1D29] text-[#7FFFD4] disabled:cursor-default"
                  aria-label="Toggle APE and USD display"
                >
                  {displayUsd ? (
                    <CircleDollarSign className="h-4 w-4" />
                  ) : (
                    <CurrencyIcon currency={playCurrency} className="h-5 w-5" />
                  )}
                </button>
                <span className="flex-1 text-2xl font-bold text-white">
                  {betAmount > 0 ? formatAmount(betAmount, { withUnit: false }) : "0"}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#98C9D3]">
                  {displayUsd ? "USD" : tokenLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setBetAmount(0)}
                  className="text-xs text-[#98C9D3] transition-colors hover:text-[#C9FFF3]"
                >
                  Clear
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={maxPlayableBet}
                step={1}
                value={betAmount}
                disabled={isLoading}
                onChange={(event) => setBetAmount(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, ${BRAND_PRIMARY} ${(betAmount / Math.max(maxPlayableBet, 1)) * 100}%, #24404A ${(betAmount / Math.max(maxPlayableBet, 1)) * 100}%)`,
                }}
              />

              <div className="grid grid-cols-4 gap-2">
                {BET_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => addBet(chip)}
                    disabled={isLoading || betAmount >= maxPlayableBet}
                    className="rounded-[6px] border border-[#7FFFD433] bg-[#0D1D29]/85 py-1.5 text-sm font-semibold text-[#C9FFF3] transition-colors hover:bg-[#103346] disabled:opacity-40"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[#7FFFD422]" />

            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[#8AD9E8]" />
                  <span className="text-sm font-semibold text-[#ECFFFB]">Set Target</span>
                </div>
                <span className="max-w-[130px] truncate text-xs font-medium text-[#8AD9E8]">
                  {getDifficultyLine(difficulty)}
                </span>
              </div>

              <input
                type="range"
                min={DIFFICULTY_MIN}
                max={DIFFICULTY_MAX}
                step={1}
                value={difficulty}
                disabled={isLoading}
                onChange={(event) => setDifficulty(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, ${BRAND_PRIMARY} ${((difficulty - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN)) * 100}%, #24404A ${((difficulty - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN)) * 100}%)`,
                }}
              />

              <div className="grid grid-cols-5 gap-1.5">
                {DIFFICULTY_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setDifficulty(preset)}
                    disabled={isLoading}
                    className={`rounded-[6px] border py-1.5 text-xs font-semibold transition-colors ${
                      difficulty === preset
                        ? "border-[#7FFFD4] bg-[#7FFFD4] text-[#042D28]"
                        : "border-[#7FFFD433] bg-[#0D1D29]/85 text-[#98C9D3] hover:border-[#7FFFD466] hover:text-[#C9FFF3]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[#7FFFD422]" />

            <div className="flex flex-col gap-2 px-5 py-4">
              <StatRow label="Target" value={`> ${difficulty}`} icon={<Target />} />
              <StatRow label="Win Chance" value={`${winChance}%`} icon={<Gauge />} />
              <StatRow label="Bet Amount" value={formatAmount(betAmount)} />
              <StatRow
                label="Payout"
                value={potentialPayout > 0 ? formatAmount(potentialPayout) : formatAmount(0)}
                highlight={potentialPayout > 0}
              />
              <div className="my-1 h-px bg-[#7FFFD422]" />
              <StatRow
                label="Max Profit Per Game"
                value={`${maxProfit.toLocaleString()} ${tokenLabel}`}
                muted
              />
              <StatRow
                label="Max Bet Per Game"
                value={`${MAX_BET.toLocaleString()} ${tokenLabel}`}
                muted
              />
            </div>

            <div className="px-5 pb-5">
              <Button
                onClick={onPlay}
                disabled={isLoading || betAmount <= 0 || betAmount > maxPlayableBet}
                className="h-12 w-full rounded-[6px] border-0 bg-[#7FFFD4] text-base font-black uppercase tracking-[0.1em] text-[#042D28] shadow-[0_0_24px_rgba(127,255,212,0.35)] transition hover:bg-[#6EE8C4] disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />
                {isLoading ? "Placing Bet..." : "Bonk"}
              </Button>
            </div>
          </>
        ) : null}

        {currentView === 1 ? (
          <div className="flex flex-col gap-5 px-5 py-6">
            <div className="flex flex-col items-center gap-3 py-5">
              <div className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="h-2 w-2 rounded-full bg-[#7FFFD4]"
                    style={{
                      animation: `bounce 0.8s ease-in-out ${index * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8AD9E8]">
                Reading the meter
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-[6px] border border-[#7FFFD422] bg-[#07131B]/70 p-4">
              <StatRow label="Target to Beat" value={`> ${difficulty}`} icon={<Target />} />
              <StatRow label="Bet Amount" value={formatAmount(betAmount)} />
              <StatRow label="Win Chance" value={`${winChance}%`} icon={<Gauge />} />
            </div>
          </div>
        ) : null}

        {currentView === 2 && score !== null ? (
          <div className="flex flex-col gap-4 px-5 py-5">
            <div
              className={`flex flex-col items-center gap-1 rounded-[6px] border py-4 ${
                won
                  ? "border-[#7FFFD433] bg-[#7FFFD4]/10"
                  : "border-red-400/25 bg-red-500/10"
              }`}
            >
              <span
                className={`text-3xl font-black uppercase tracking-[0.08em] ${
                  won ? "text-[#7FFFD4]" : "text-red-400"
                }`}
              >
                {won ? "Target Cleared" : "Target Missed"}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">{score}</span>
                <span className="text-sm text-[#98C9D3]">/ 100</span>
              </div>
              <p className="mt-1 text-xs text-[#98C9D3]">
                {won ? `Beat the target of ${difficulty}` : `Needed more than ${difficulty}`}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-[6px] border border-[#7FFFD422] bg-[#07131B]/70 p-4">
              <StatRow label="Bet" value={formatAmount(betAmount)} />
              <StatRow
                label={won ? "Payout" : "Lost"}
                value={won ? formatAmount(potentialPayout) : formatAmount(betAmount)}
                highlight={won === true}
                loss={won === false}
              />
            </div>

            <div className="flex flex-col gap-2">
              {!inReplayMode ? (
                <Button
                  onClick={onPlayAgain}
                  disabled={isLoading}
                  className="h-12 w-full rounded-[6px] border-0 bg-[#7FFFD4] text-base font-black uppercase tracking-[0.1em] text-[#042D28] shadow-[0_0_24px_rgba(127,255,212,0.3)] transition hover:bg-[#6EE8C4]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Play Again
                </Button>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={onRewatch}
                  variant="ghost"
                  className="h-10 rounded-[6px] border border-[#7FFFD433] bg-[#0D1D29]/85 text-sm text-[#C9FFF3] hover:bg-[#103346] hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rewatch
                </Button>
                <Button
                  onClick={onReset}
                  variant="ghost"
                  className="h-10 rounded-[6px] border border-[#7FFFD433] bg-[#0D1D29]/85 text-sm text-[#C9FFF3] hover:bg-[#103346] hover:text-white"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Change Bet
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </aside>
  );
};

interface StatRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  loss?: boolean;
  muted?: boolean;
  icon?: React.ReactElement<{ className?: string }>;
}

const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  highlight,
  loss,
  muted,
  icon,
}) => (
  <div className="flex items-center justify-between gap-3">
    <span
      className={`flex min-w-0 items-center gap-1.5 text-xs ${
        muted ? "text-[#54727B]" : "text-[#98C9D3]"
      }`}
    >
      {icon
        ? React.cloneElement(icon, {
            className: "h-3.5 w-3.5 shrink-0",
          })
        : null}
      {label}
    </span>
    <span
      className={`text-right text-sm font-semibold ${
        highlight
          ? "text-[#7FFFD4]"
          : loss
            ? "text-red-400"
            : muted
              ? "text-[#54727B]"
              : "text-[#ECFFFB]"
      }`}
    >
      {value}
    </span>
  </div>
);

export default MegaBonkSetupCard;
