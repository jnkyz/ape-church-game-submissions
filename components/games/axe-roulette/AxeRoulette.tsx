"use client";

import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import AxeRouletteWindow, { SpinPhase } from "./AxeRouletteWindow";
import AxeRouletteSetupCard from "./AxeRouletteSetupCard";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import { axeRouletteGame, WHEEL_SLICES } from "./axeRouletteConfig";

// Animation timing (ms)
const TX_DELAY      = 600;  // simulated transaction
const AXE_THROW_AT  = 1400; // wheel spin time before axe is thrown
const AXE_FLIGHT    = 330;  // axe travel duration (11 frames × 30ms)
const HIT_DELAY     = AXE_THROW_AT + AXE_FLIGHT; // when wheel snaps + result is known
const GAME_OVER_DELAY = 1800; // after result, transition to game-over view

interface AxeRouletteComponentProps {
  game: Game;
}

const AxeRouletteComponent: React.FC = () => {
  const game: Game = axeRouletteGame;
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayIdString = searchParams.get("id");
  const [walletBalance, setWalletBalance] = useState<number>(25);
  const [muteSfx, setMuteSfx] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
  const [isLoading, setIsLoading]         = useState<boolean>(false);
  const [currentGameId] = useState<bigint>(
    replayIdString != null
      ? BigInt(replayIdString)
      : BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
  );
  const [userRandomWord] = useState<Hex>(bytesToHex(new Uint8Array(randomBytes(32))));

  // Game state
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const [throwMode, setThrowMode]             = useState<1 | 2>(1);
  const [betAmount, setBetAmount]             = useState<number>(0);
  const [spinPhase, setSpinPhase]             = useState<SpinPhase>("idle");
  const [wheelRotation, setWheelRotation]     = useState<number>(0);
  const [gameResult, setGameResult]           = useState<"win" | "loss" | null>(null);
  const [payout, setPayout]                   = useState<number | null>(null);
  const [axeResults, setAxeResults]           = useState<{multiplier: number; payout: number}[]>([]);
  const [currentAxeNumber, setCurrentAxeNumber] = useState(0);
  const [lastSpinAngles, setLastSpinAngles]   = useState<number[]>([]);
  const [stuckAxeAngles, setStuckAxeAngles]   = useState<number[]>([]);

  const gameOver      = currentView === 2;
  const shouldShowPNL = !!payout && payout > betAmount;

  // ── Core spin logic (single axe throw) ───────────────────────────────────────
  const executeSpin = (axeBet: number, fixedAngle?: number): Promise<{multiplier: number; payout: number; angle: number; restingRotation: number}> => {
    return new Promise((resolve) => {
      const targetAngle = fixedAngle ?? Math.random() * 360;

      const landedSlice =
        WHEEL_SLICES.find((s) => targetAngle >= s.startAngle && targetAngle < s.endAngle) ??
        WHEEL_SLICES[0];

      const midAngle = (landedSlice.startAngle + landedSlice.endAngle) / 2;
      const restingRotation = (360 - midAngle) % 360;
      setWheelRotation(restingRotation);

      setSpinPhase("spinning");

      timeoutsRef.current.push(setTimeout(() => setSpinPhase("hitting"), AXE_THROW_AT));

      timeoutsRef.current.push(setTimeout(() => {
        setSpinPhase("stopped");
        const mult = landedSlice.multiplier;
        const axePayout = mult > 0 ? axeBet * mult : 0;
        resolve({ multiplier: mult, payout: axePayout, angle: targetAngle, restingRotation });
      }, HIT_DELAY));
    });
  };

  // ── Throw sequence (handles single & dual mode) ─────────────────────────────
  const executeThrowSequence = async (fixedAngles?: number[]): Promise<void> => {
    const perAxeBet = throwMode === 2 ? betAmount / 2 : betAmount;
    const angles: number[] = [];
    const results: {multiplier: number; payout: number}[] = [];

    setCurrentAxeNumber(1);

    const result1 = await executeSpin(perAxeBet, fixedAngles?.[0]);
    angles.push(result1.angle);
    results.push(result1);
    setAxeResults([...results]);

    if (throwMode === 2) {
      if (result1.multiplier > 0) {
        toast(`Axe 1: ${result1.multiplier}× — ${result1.payout.toFixed(2)} APE`);
      } else {
        toast("Axe 1: Miss!");
      }

      await new Promise<void>((r) => { timeoutsRef.current.push(setTimeout(r, 1000)); });
      setCurrentAxeNumber(2);
      setSpinPhase("idle");
      // Pin first axe to the wheel now that the animated axe is hidden
      setStuckAxeAngles([(360 - result1.restingRotation) % 360]);
      await new Promise<void>((r) => { timeoutsRef.current.push(setTimeout(r, 80)); });

      const result2 = await executeSpin(perAxeBet, fixedAngles?.[1]);
      angles.push(result2.angle);
      results.push(result2);
      setAxeResults([...results]);

      if (result2.multiplier > 0) {
        toast(`Axe 2: ${result2.multiplier}× — ${result2.payout.toFixed(2)} APE`);
      } else {
        toast("Axe 2: Miss!");
      }
    }

    const totalPayout = results.reduce((sum, r) => sum + r.payout, 0);
    setPayout(totalPayout);

    if (totalPayout > 0) {
      setWalletBalance((prev) => prev + totalPayout);
      setGameResult("win");
      if (throwMode === 1) {
        const mult = results[0].multiplier;
        if (mult === 0.5) toast(`½× — Recovered ${totalPayout.toFixed(2)} APE`);
        else if (mult === 1) toast(`1× — Bet returned (${totalPayout.toFixed(2)} APE)`);
        else toast.success(`${mult}× — You won ${totalPayout.toFixed(2)} APE!`);
      } else {
        toast.success(`Total winnings: ${totalPayout.toFixed(2)} APE!`);
      }
    } else {
      setGameResult("loss");
    }

    setLastSpinAngles(angles);
    timeoutsRef.current.push(setTimeout(() => setCurrentView(2), GAME_OVER_DELAY));
  };

  // ── Lifecycle functions ──────────────────────────────────────────────────────
  const playGame = async (): Promise<void> => {
    if (betAmount <= 0) return;

    setIsLoading(true);
    setWalletBalance((prev) => prev - betAmount);
    setCurrentView(1);
    setGameResult(null);
    setPayout(null);
    setAxeResults([]);
    setStuckAxeAngles([]);

    console.log("mock tx — gameId:", currentGameId.toString(), "randomWord:", userRandomWord);

    try {
      await new Promise((resolve) => setTimeout(resolve, TX_DELAY));
      toast.success(throwMode === 2 ? "First axe thrown!" : "Axe thrown!");
      setIsLoading(false);
      await executeThrowSequence();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong.");
      setIsLoading(false);
      setCurrentView(0);
    }
  };

  const handleReset = (): void => {
    clearAllTimeouts();
    setSpinPhase("idle");
    setWheelRotation(0);
    setCurrentView(0);
    setPayout(null);
    setGameResult(null);
    setAxeResults([]);
    setStuckAxeAngles([]);
    setCurrentAxeNumber(0);

    if (replayIdString !== null) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("id");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  const handlePlayAgain = async (): Promise<void> => {
    clearAllTimeouts();
    setSpinPhase("idle");
    setWheelRotation(0);
    setCurrentView(1);
    setGameResult(null);
    setPayout(null);
    setAxeResults([]);
    setStuckAxeAngles([]);
    setWalletBalance((prev) => prev - betAmount);
    await new Promise((r) => setTimeout(r, 80));
    await executeThrowSequence();
  };

  const handleRewatch = async (): Promise<void> => {
    if (lastSpinAngles.length === 0) return;
    clearAllTimeouts();
    setSpinPhase("idle");
    setWheelRotation(0);
    setCurrentView(1);
    setGameResult(null);
    setPayout(null);
    setAxeResults([]);
    setStuckAxeAngles([]);
    await new Promise((r) => setTimeout(r, 80));
    await executeThrowSequence(lastSpinAngles);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
        {/* Square game window on desktop */}
        <div className="lg:basis-2/3 lg:aspect-square">
          <GameWindow
            game={game}
            currentGameId={currentGameId}
            isLoading={isLoading}
            isGameFinished={gameOver}
            onPlayAgain={handlePlayAgain}
            onRewatch={handleRewatch}
            playAgainText="Throw Again"
            onReset={handleReset}
            betAmount={betAmount}
            payout={payout}
            inReplayMode={replayIdString !== null}
            isUserOriginalPlayer={true}
            showPNL={shouldShowPNL}
            isGamePaused={false}
            resultModalDelayMs={400}
            onSfxMutedChange={setMuteSfx}
          >
            <AxeRouletteWindow
              spinPhase={spinPhase}
              wheelRotation={wheelRotation}
              gameResult={gameResult}
              isGameOver={gameOver}
              muteSfx={muteSfx}
              stuckAxeAngles={stuckAxeAngles}
            />
          </GameWindow>
        </div>

        {/* Setup Card */}
        <AxeRouletteSetupCard
          game={game}
          currentView={currentView}
          throwMode={throwMode}
          setThrowMode={setThrowMode}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          isLoading={isLoading}
          isSpinning={spinPhase === "spinning" || spinPhase === "hitting"}
          payout={payout}
          gameResult={gameResult}
          axeResults={axeResults}
          currentAxeNumber={currentAxeNumber}
          inReplayMode={replayIdString !== null}
          onPlay={playGame}
          onReset={handleReset}
          onPlayAgain={handlePlayAgain}
          walletBalance={walletBalance}
          minBet={1}
          maxBet={75000}
          account={undefined}
          playerAddress={undefined}
          isGamePaused={false}
        />
      </div>
    </div>
  );
};

export default AxeRouletteComponent;
