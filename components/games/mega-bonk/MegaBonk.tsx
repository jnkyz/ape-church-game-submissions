"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import MegaBonkWindow from "./MegaBonkWindow";
import MegaBonkSetupCard from "./MegaBonkSetupCard";
import MegaBonkRulesModal from "./MegaBonkRulesModal";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import {
  megaBonk,
  initialGameState,
  MegaBonkGameState,
  calcPotentialPayout,
  getWinChance,
  MAX_BET,
  METER_COUNT_DURATION_MS,
  RESULT_ANIM_DELAY_MS,
  RESULT_SFX_DUCK_MULTIPLIER,
  RESULT_SFX_RESTORE_DELAY_MS,
  WIN_SFX_DURATION_MS,
  LOSE_SFX_DURATION_MS,
  SCORE_MIN,
  SCORE_MAX,
} from "./megaBonkConfig";
import { Game } from "@/lib/games";

type PlayCurrency = "ape" | "gp";

interface MegaBonkComponentProps {
  game: Game;
}

const MegaBonkComponent: React.FC<MegaBonkComponentProps> = ({ game }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayIdString = searchParams.get("id");

  const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGameOngoing, setIsGameOngoing] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [playCurrency, setPlayCurrency] = useState<PlayCurrency>("ape");
  const [usdMode, setUsdMode] = useState<boolean>(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);
  const [musicVolumeMultiplier, setMusicVolumeMultiplier] = useState<number>(1);
  const [gameState, setGameState] = useState<MegaBonkGameState>(initialGameState);
  const [meterValue, setMeterValue] = useState<number>(initialGameState.difficulty);

  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apeWallet = 25;
  const gpWallet = 5_000;
  const walletBalance = playCurrency === "ape" ? apeWallet : gpWallet;
  const tokenLabel = playCurrency === "ape" ? "APE" : "GP";

  // ── SFX ─────────────────────────────────────────────────────────────────
  const bagDropSfxRef = useRef<HTMLAudioElement | null>(null);
  const punchSfxRef = useRef<HTMLAudioElement | null>(null);
  const loseSfxRef = useRef<HTMLAudioElement | null>(null);
  const winSfxRef = useRef<HTMLAudioElement | null>(null);
  const stepsSfxRef = useRef<HTMLAudioElement | null>(null);
  const sfxMutedRef = useRef(false);
  // Tracks the delayed win/lose SFX so reset/rewatch can cancel a pending one
  const resultSfxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicRestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const bagDrop = new Audio("/submissions/mega-bonk/audio/bag-drop.mp3");
    bagDrop.preload = "auto";
    bagDrop.volume = 0.9;
    const punch = new Audio("/submissions/mega-bonk/audio/punch.mp3");
    punch.preload = "auto";
    punch.volume = 1;
    const lose = new Audio("/submissions/mega-bonk/audio/lose.mp3");
    lose.preload = "auto";
    lose.volume = 0.4;
    const win = new Audio("/submissions/mega-bonk/audio/win.mp3");
    win.preload = "auto";
    win.volume = 0.44;
    const steps = new Audio("/submissions/mega-bonk/audio/steps.mp3");
    steps.loop = true;
    steps.volume = 0.08;
    bagDropSfxRef.current = bagDrop;
    punchSfxRef.current = punch;
    loseSfxRef.current = lose;
    winSfxRef.current = win;
    stepsSfxRef.current = steps;
    return () => {
      if (resultSfxTimerRef.current !== null) {
        clearTimeout(resultSfxTimerRef.current);
        resultSfxTimerRef.current = null;
      }
      if (musicRestoreTimerRef.current !== null) {
        clearTimeout(musicRestoreTimerRef.current);
        musicRestoreTimerRef.current = null;
      }
      [bagDrop, punch, lose, win, steps].forEach((audio) => audio.pause());
      bagDropSfxRef.current = null;
      punchSfxRef.current = null;
      loseSfxRef.current = null;
      winSfxRef.current = null;
      stepsSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    sfxMutedRef.current = sfxMuted;
    [
      bagDropSfxRef.current,
      punchSfxRef.current,
      loseSfxRef.current,
      winSfxRef.current,
      stepsSfxRef.current,
    ].forEach((audio) => {
      if (audio) audio.muted = sfxMuted;
    });
  }, [sfxMuted]);

  const playSfx = (el: HTMLAudioElement | null) => {
    if (!el || sfxMutedRef.current) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  };

  const clearScheduledResultSfx = () => {
    if (resultSfxTimerRef.current !== null) {
      clearTimeout(resultSfxTimerRef.current);
      resultSfxTimerRef.current = null;
    }
  };

  const clearMusicRestoreTimer = () => {
    if (musicRestoreTimerRef.current !== null) {
      clearTimeout(musicRestoreTimerRef.current);
      musicRestoreTimerRef.current = null;
    }
  };

  const stopAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };

  const stopRoundAudio = () => {
    clearScheduledResultSfx();
    clearMusicRestoreTimer();
    setMusicVolumeMultiplier(1);
    stopAudio(bagDropSfxRef.current);
    stopAudio(punchSfxRef.current);
    stopAudio(loseSfxRef.current);
    stopAudio(winSfxRef.current);
  };

  const duckMusicForResult = (durationMs: number) => {
    if (sfxMutedRef.current) return;
    clearMusicRestoreTimer();
    setMusicVolumeMultiplier(RESULT_SFX_DUCK_MULTIPLIER);
    musicRestoreTimerRef.current = setTimeout(() => {
      musicRestoreTimerRef.current = null;
      setMusicVolumeMultiplier(1);
    }, durationMs + RESULT_SFX_RESTORE_DELAY_MS);
  };

  // Schedule win/lose SFX to fire exactly when the victory/defeat animation
  // starts (Wade_Punch ends), so audio stays in sync with the animation.
  const scheduleResultSfx = (won: boolean) => {
    clearScheduledResultSfx();
    resultSfxTimerRef.current = setTimeout(() => {
      resultSfxTimerRef.current = null;
      duckMusicForResult(won ? WIN_SFX_DURATION_MS : LOSE_SFX_DURATION_MS);
      playSfx(won ? winSfxRef.current : loseSfxRef.current);
    }, RESULT_ANIM_DELAY_MS);
  };

  // Loop subtle footsteps only during the idle / setup phase
  useEffect(() => {
    const steps = stepsSfxRef.current;
    if (!steps) return;
    if (currentView === 0) {
      steps.play().catch(() => {});
    } else {
      steps.pause();
    }
  }, [currentView]);

  const [currentGameId, setCurrentGameId] = useState<bigint>(
    replayIdString == null
      ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
      : BigInt(replayIdString)
  );
  const [userRandomWord, setUserRandomWord] = useState<Hex>(
    bytesToHex(new Uint8Array(randomBytes(32)))
  );

  useEffect(() => {
    if (replayIdString !== null && replayIdString.length > 2) {
      setIsLoading(true);
      setCurrentGameId(BigInt(replayIdString));
    }
  }, [replayIdString]);

  useEffect(() => {
    if (playCurrency === "gp") {
      setUsdMode(false);
    }
    const maxPlayableBet = Math.min(MAX_BET, walletBalance);
    setGameState((prev) =>
      prev.betAmount > maxPlayableBet
        ? { ...prev, betAmount: maxPlayableBet }
        : prev
    );
  }, [playCurrency, walletBalance]);

  const clearMeterInterval = () => {
    if (meterIntervalRef.current !== null) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
  };

  const animateMeter = (targetScore: number, onDone: () => void) => {
    clearMeterInterval();
    const startValue = 0;
    const steps = 60;
    const intervalMs = METER_COUNT_DURATION_MS / steps;
    let step = 0;

    meterIntervalRef.current = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
      const current = Math.round(startValue + (targetScore - startValue) * eased);
      setMeterValue(current);
      if (step >= steps) {
        clearMeterInterval();
        setMeterValue(targetScore);
        onDone();
      }
    }, intervalMs);
  };

  const playGame = async (gameId?: bigint, randomWord?: Hex) => {
    stopRoundAudio();
    if (gameState.betAmount <= 0) {
      toast.error("Enter a bet amount first.");
      return;
    }

    setIsLoading(true);
    setIsGameOngoing(true);

    const gameIdToUse = gameId ?? currentGameId;
    const randomWordToUse = randomWord ?? userRandomWord;

    console.log("Placing bet:", { gameId: gameIdToUse, randomWord: randomWordToUse });

    try {
      const receiptSuccess = true;

      if (receiptSuccess) {
        toast.success("Transaction complete!");

        const score =
          Math.floor(Math.random() * (SCORE_MAX - SCORE_MIN + 1)) + SCORE_MIN;
        const won = score > gameState.difficulty;
        const payout = won
          ? calcPotentialPayout(gameState.betAmount, gameState.difficulty)
          : 0;

        setTimeout(() => {
          setIsLoading(false);
          setCurrentView(1);
          setMeterValue(0);
          setGameState((prev) => ({ ...prev, score, won, payout }));
          playSfx(bagDropSfxRef.current);

          // Win/lose SFX synced to the victory/defeat animation start
          scheduleResultSfx(won);

        }, 800);
      } else {
        toast.info("Something went wrong.");
        setIsLoading(false);
        setIsGameOngoing(false);
      }
    } catch (error) {
      if (
        (error instanceof Error &&
          error.message.includes("Transaction not found")) ||
        (typeof error === "string" && error.includes("Transaction not found"))
      ) {
        console.warn("Ignoring known timeout error.");
        return;
      }
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred.");
      setIsLoading(false);
      setIsGameOngoing(false);
    }
  };

  const handleReset = (isPlayingAgain: boolean = false) => {
    clearMeterInterval();
    stopRoundAudio();

    if (!isPlayingAgain) {
      const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
      const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
      setCurrentGameId(newGameId);
      setUserRandomWord(newUserWord);
    }

    setGameState((prev) => ({
      ...initialGameState,
      betAmount: prev.betAmount,
      difficulty: prev.difficulty,
    }));
    setMeterValue(gameState.difficulty);
    setCurrentView(0);
    setGameOver(false);
    setIsGameOngoing(false);
    setIsLoading(false);

    if (replayIdString !== null) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("id");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  const handlePlayAgain = async () => {
    const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
    const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
    setCurrentGameId(newGameId);
    setUserRandomWord(newUserWord);
    handleReset(true);
    await playGame(newGameId, newUserWord);
  };

  const handleRewatch = () => {
    if (gameState.score === null) return;
    clearMeterInterval();
    stopRoundAudio();
    setMeterValue(0);
    setCurrentView(1);
    setGameOver(false);
    setIsGameOngoing(false);
    playSfx(bagDropSfxRef.current);

    // Win/lose SFX synced to the victory/defeat animation start
    scheduleResultSfx(gameState.won === true);

  };

  const handlePunchImpact = () => {
    if (gameState.score === null) return;
    playSfx(punchSfxRef.current);
    animateMeter(gameState.score, () => {
      setTimeout(() => {
        setCurrentView(2);
        setGameOver(true);
        setIsGameOngoing(false);
      }, 600);
    });
  };

  const handleDifficultyChange = (value: number) => {
    setGameState((prev) => ({ ...prev, difficulty: value }));
    if (currentView === 0) setMeterValue(value);
  };

  const winChance = getWinChance(gameState.difficulty);
  const potentialPayout = calcPotentialPayout(gameState.betAmount, gameState.difficulty);

  return (
    <div className="relative">
      <MegaBonkRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
        <div className="relative min-w-0 w-full lg:basis-2/3">
          <GameWindow
            game={game}
            currentGameId={currentGameId}
            isLoading={isLoading}
            isGameFinished={gameOver}
            onPlayAgain={handlePlayAgain}
            playAgainText="Play Again"
            onRewatch={handleRewatch}
            onReset={() => handleReset(false)}
            betAmount={gameState.betAmount}
            payout={gameState.payout}
            inReplayMode={replayIdString !== null}
            isUserOriginalPlayer={true}
            showPNL={gameState.won === true}
            isGamePaused={false}
            resultModalDelayMs={800}
            sfxMuted={sfxMuted}
            onSfxMutedChange={setSfxMuted}
            musicVolumeMultiplier={musicVolumeMultiplier}
          >
            <MegaBonkWindow
              game={game}
              phase={currentView}
              difficulty={gameState.difficulty}
              score={gameState.score}
              won={gameState.won}
              meterValue={meterValue}
              onDifficultyChange={handleDifficultyChange}
              onPunchImpact={handlePunchImpact}
            />
          </GameWindow>
        </div>

        <MegaBonkSetupCard
          game={game}
          currentView={currentView}
          betAmount={gameState.betAmount}
          setBetAmount={(v) => setGameState((prev) => ({ ...prev, betAmount: v }))}
          difficulty={gameState.difficulty}
          setDifficulty={handleDifficultyChange}
          winChance={winChance}
          potentialPayout={potentialPayout}
          playCurrency={playCurrency}
          onPlayCurrencyChange={setPlayCurrency}
          currencySwitchDisabled={isLoading || isGameOngoing || currentView !== 0}
          usdMode={usdMode}
          setUsdMode={setUsdMode}
          walletBalance={walletBalance}
          score={gameState.score}
          won={gameState.won}
          isLoading={isLoading}
          inReplayMode={replayIdString !== null}
          onPlay={async () => await playGame()}
          onReset={() => handleReset(false)}
          onPlayAgain={async () => await handlePlayAgain()}
          onRewatch={handleRewatch}
          onOpenRules={() => setRulesOpen(true)}
        />
      </div>
    </div>
  );
};

export default MegaBonkComponent;
