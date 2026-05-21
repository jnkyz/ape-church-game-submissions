"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import RPSWindow from "./RPSWindow";
import RPSSetupCard from "./RPSSetupCard";
import RPSAutoBoard from "./RPSAutoBoard";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import "./rps.styles.css";
import { rpsGame } from "./rpsConfig";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Hand = "rock" | "paper" | "scissors";

export type RoundResult = {
  round: number;
  playerHand: Hand;
  computerHand: Hand;
  outcome: "win" | "lose" | "tie";
  multiplier: number;
  gameId: bigint; // seed that determined this round's house hand
};

// Auto-play: each mini-game on the scattered board.
export type AutoGame = {
  id: number;
  playerHand: Hand | null;
  computerHand: Hand | null;
  outcome: "win" | "lose" | "tie" | null;
  gameId: bigint | null;
};

export type AutoPhase = "idle" | "picking" | "shaking" | "revealing" | "outcome" | "done";

// ── Constants ──────────────────────────────────────────────────────────────────

export const MAX_ROUNDS = 20;
export const WIN_MULTIPLIER = 1.96;
export const TX_DELAY_MS = 600; // simulated onchain tx confirm

export const MULTIPLIER_LADDER: number[] = Array.from({ length: MAX_ROUNDS }, (_, i) =>
  parseFloat((WIN_MULTIPLIER ** (i + 1)).toFixed(2))
);

// ── PRNG ───────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Derive a single deterministic house hand from a game ID.
// In the real onchain flow, this is what the smart contract computes after
// receiving VRF output (or equivalent randomness) for a single round.
export function generateHouseHand(gameId: bigint): Hand {
  const seed = Number(gameId & BigInt(0xffffffff));
  const rand = mulberry32(seed);
  const r = rand();
  if (r < 1 / 3) return "rock";
  if (r < 2 / 3) return "paper";
  return "scissors";
}

export function getOutcome(player: Hand, computer: Hand): "win" | "lose" | "tie" {
  if (player === computer) return "tie";
  if (
    (player === "rock" && computer === "scissors") ||
    (player === "paper" && computer === "rock") ||
    (player === "scissors" && computer === "paper")
  ) return "win";
  return "lose";
}

function newGameId(): bigint {
  return BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
}

// ── Component ──────────────────────────────────────────────────────────────────
const RPSComponent: React.FC = () => {
  const game = rpsGame;

  const router = useRouter();
  const searchParams = useSearchParams();
  const replayIdString = searchParams.get("id");
  const walletBalance = 25;

  const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [payout, setPayout] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // The session ID is just the first round's seed — used for the result modal.
  // In the real onchain version this would be any round ID for rewatch/ref.
  const [currentGameId, setCurrentGameId] = useState<bigint>(
    replayIdString == null ? newGameId() : BigInt(replayIdString)
  );
  const [, setUserRandomWord] = useState<Hex>(bytesToHex(new Uint8Array(randomBytes(32))));

  // Game state
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isPickPending, setIsPickPending] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [lastRound, setLastRound] = useState<RoundResult | null>(null);

  // Auto Play mode — N mini-games scattered on the board, user picks each hand,
  // all games animate in parallel after commit. Any loss → bust entire bet.
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoNumHands, setAutoNumHands] = useState(2);
  const [autoGames, setAutoGames] = useState<AutoGame[]>([]);
  const [autoPhase, setAutoPhase] = useState<AutoPhase>("idle");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const pendingAutoCommitRef = useRef(false);
  // Track every queued timer so handleReset can cancel in-flight animations.
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const queueTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    intervalsRef.current.forEach(id => clearInterval(id));
    timersRef.current.clear();
    intervalsRef.current.clear();
  }, []);

  // SFX — respects the SFX mute button in GameWindow
  const cashoutSfxRef = useRef<HTMLAudioElement | null>(null);
  const winSfxRef = useRef<HTMLAudioElement | null>(null);
  const loseSfxRef = useRef<HTMLAudioElement | null>(null);
  const clickSfxRef = useRef<HTMLAudioElement | null>(null);
  const tenseSfxRef = useRef<HTMLAudioElement | null>(null);
  const tieSfxRef = useRef<HTMLAudioElement | null>(null);
  const sfxMutedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const c = new Audio("/submissions/rock-paper-scissors/sfx/cashout.mp3");
    c.preload = "auto";
    c.volume = 0.6;
    cashoutSfxRef.current = c;

    const w = new Audio("/submissions/rock-paper-scissors/sfx/win.mp3");
    w.preload = "auto";
    w.volume = 0.5;
    // playbackRate is set per-play in handlePickHand so it slows with each win
    winSfxRef.current = w;

    const l = new Audio("/submissions/rock-paper-scissors/sfx/lose.mp3");
    l.preload = "auto";
    l.volume = 0.6;
    loseSfxRef.current = l;

    const k = new Audio("/submissions/rock-paper-scissors/sfx/click.mp3");
    k.preload = "auto";
    k.volume = 0.5;
    clickSfxRef.current = k;

    const t = new Audio("/submissions/rock-paper-scissors/sfx/tense.mp3?v=2");
    t.preload = "auto";
    t.volume = 0.9;
    tenseSfxRef.current = t;

    const tie = new Audio("/submissions/rock-paper-scissors/sfx/tie.mp3");
    tie.preload = "auto";
    tie.volume = 0.6;
    tieSfxRef.current = tie;
  }, []);

  const handleSfxMutedChange = useCallback((muted: boolean) => {
    sfxMutedRef.current = muted;
  }, []);

  const playGame = async () => {
    if (betAmount <= 0) { toast.error("Set a bet amount first."); return; }
    // No initial tx — each pick is its own onchain action. Just enter the play view.
    setRounds([]);
    setCurrentRound(0);
    setCurrentMultiplier(1);
    setLastRound(null);
    setCurrentView(1);
    setGameActive(true);
    setGameOver(false);
    setPayout(null);
  };

  // Click SFX — fired on press-down (before the actual pick commits) for snappier feedback.
  const handleHandPress = useCallback(() => {
    if (isRevealing || isPickPending || !gameActive) return;
    const click = clickSfxRef.current;
    if (click && !sfxMutedRef.current) {
      try { click.pause(); click.currentTime = 0; click.play().catch(() => {}); } catch {}
    }
  }, [isRevealing, isPickPending, gameActive]);

  const handlePickHand = useCallback(async (playerHand: Hand) => {
    if (isRevealing || isPickPending || !gameActive) return;

    // Simulate onchain commit-reveal: player commits first, then randomness is revealed.
    // In real onchain flow this is a tx submission → VRF callback.
    setIsPickPending(true);
    await new Promise((r) => setTimeout(r, TX_DELAY_MS));

    // Fresh seed generated only AFTER player commits → determines house hand.
    const roundGameId = newGameId();
    const computerHand: Hand = generateHouseHand(roundGameId);
    const outcome = getOutcome(playerHand, computerHand);

    let newMult = currentMultiplier;
    let newRound = currentRound;
    if (outcome === "win") {
      newRound = currentRound + 1;
      newMult = parseFloat((WIN_MULTIPLIER ** newRound).toFixed(2));
    }

    const roundResult: RoundResult = {
      round: outcome === "tie" ? currentRound : newRound,
      playerHand,
      computerHand,
      outcome,
      multiplier: newMult,
      gameId: roundGameId,
    };

    setIsPickPending(false);
    setIsRevealing(true);
    setLastRound(roundResult);

    // Rising tension during the shake + reveal phase — fades out before the outcome.
    const tense = tenseSfxRef.current;
    if (tense && !sfxMutedRef.current) {
      try {
        tense.pause();
        tense.currentTime = 0;
        const startVolume = 0.9;
        tense.volume = startVolume;
        tense.play().catch(() => {});
        // Fade out over 500ms starting at 1400ms so it ends at 1900ms.
        setTimeout(() => {
          const steps = 15;
          const interval = 500 / steps;
          let i = 0;
          const fade = setInterval(() => {
            i++;
            try { tense.volume = Math.max(0, startVolume * (1 - i / steps)); } catch {}
            if (i >= steps) {
              clearInterval(fade);
              try { tense.pause(); } catch {}
            }
          }, interval);
        }, 1400);
      } catch {}
    }

    if (outcome === "lose") {
      // Lose SFX leads the outcome reveal by 350ms (plays at 2250ms).
      setTimeout(() => {
        const a = loseSfxRef.current;
        if (a && !sfxMutedRef.current) {
          try {
            a.pause();
            a.currentTime = 0;
            a.play().catch(() => {});
          } catch {}
        }
      }, 2250);

      setTimeout(() => {
        setCurrentRound(newRound);
        setCurrentMultiplier(newMult);
        setRounds(prev => [...prev, roundResult]);
      }, 2600);
      setTimeout(() => {
        setGameActive(false);
        setPayout(0);
        setIsRevealing(false);
        setTimeout(() => {
          setCurrentView(2);
          setGameOver(true);
        }, 800);
      }, 3200);
    } else if (outcome === "win") {
      // Win SFX on every win — plays 8-bit blast (0:09–0:11 segment).
      // Speed decreases with each streak win for dramatic escalation: 1.25x → 0.8x floor.
      const winRate = Math.max(0.8, 1.25 - (newRound - 1) * 0.025);
      // Volume scales UP with each win: 0.90 → 1.25 target (HTMLAudio clamps at 1.0).
      const winVol = Math.min(1.0, 0.9 + (newRound - 1) * 0.0175);
      // Segment is 2000ms of audio; real-time duration = 2000 / rate, capped for sanity.
      const stopAfterMs = Math.min(3400, Math.round(2000 / winRate));
      setTimeout(() => {
        const a = winSfxRef.current;
        if (a && !sfxMutedRef.current) {
          try {
            a.pause();
            a.currentTime = 9;
            a.playbackRate = winRate;
            a.volume = winVol;
            a.play().catch(() => {});
            setTimeout(() => { try { a.pause(); } catch {} }, stopAfterMs);
          } catch {}
        }
      }, 2100);

      setTimeout(() => {
        setCurrentRound(newRound);
        setCurrentMultiplier(newMult);
        setRounds(prev => [...prev, roundResult]);
      }, 2600);

      if (newRound >= MAX_ROUNDS) {
        setTimeout(() => {
          setGameActive(false);
          const finalPayout = parseFloat((betAmount * newMult).toFixed(4));
          setPayout(finalPayout);
          setIsRevealing(false);
          setTimeout(() => {
            setCurrentView(2);
            setGameOver(true);
          }, 2000);
        }, 3200);
      } else {
        setTimeout(() => {
          setIsRevealing(false);
        }, 3200);
      }
    } else {
      // Tie — play boing SFX leading into the TIE reveal.
      setTimeout(() => {
        const a = tieSfxRef.current;
        if (a && !sfxMutedRef.current) {
          try {
            a.pause();
            a.currentTime = 0;
            a.play().catch(() => {});
          } catch {}
        }
      }, 2250);

      setTimeout(() => {
        setRounds(prev => [...prev, roundResult]);
      }, 2600);
      setTimeout(() => {
        setIsRevealing(false);
      }, 3200);
    }
  }, [isRevealing, isPickPending, gameActive, currentMultiplier, currentRound, betAmount]);

  const handleCashOut = useCallback(() => {
    if (!gameActive || isRevealing || isPickPending) return;
    setGameActive(false);
    const finalPayout = parseFloat((betAmount * currentMultiplier).toFixed(4));
    setPayout(finalPayout);
    // Play cashout SFX unless muted
    if (!sfxMutedRef.current && cashoutSfxRef.current) {
      try { cashoutSfxRef.current.currentTime = 0; cashoutSfxRef.current.play().catch(() => {}); } catch {}
    }
    setTimeout(() => {
      setCurrentView(2);
      setGameOver(true);
    }, 500);
  }, [gameActive, isRevealing, isPickPending, betAmount, currentMultiplier]);

  // Auto Play — scattered mini-games. Live preview: toggling on auto mode or
  // changing the hand count immediately re-sizes the board. Picks persist by id
  // so the user doesn't lose selections when resizing.
  useEffect(() => {
    if (!isAutoMode) {
      // Turning auto mode off clears any preview state — but don't interrupt
      // an in-flight batch animation.
      if (autoPhase === "picking" || autoPhase === "idle") {
        if (autoPhase !== "idle") setAutoPhase("idle");
        if (autoGames.length !== 0) setAutoGames([]);
      }
      return;
    }

    // Auto mode on: keep board in "picking" with exactly N mini-games.
    if (autoPhase === "picking" || autoPhase === "idle") {
      if (autoPhase === "idle") setAutoPhase("picking");
      if (autoGames.length !== autoNumHands) {
        setAutoGames(prev => {
          const next: AutoGame[] = [];
          for (let i = 0; i < autoNumHands; i++) {
            const existing = prev[i];
            next.push(existing ?? {
              id: i, playerHand: null, computerHand: null, outcome: null, gameId: null,
            });
          }
          return next;
        });
      }
    }
  }, [isAutoMode, autoNumHands, autoPhase, autoGames.length]);

  const handleAutoPick = useCallback((id: number, hand: Hand) => {
    if (autoPhase !== "picking") return;
    const click = clickSfxRef.current;
    if (click && !sfxMutedRef.current) {
      try { click.pause(); click.currentTime = 0; click.play().catch(() => {}); } catch {}
    }
    setAutoGames(prev => prev.map(g => g.id === id ? { ...g, playerHand: hand } : g));
  }, [autoPhase]);

  const handleAutoPickAll = useCallback((hand: Hand | "random") => {
    if (autoPhase !== "picking") return;
    const hands: Hand[] = ["rock", "paper", "scissors"];
    setAutoGames(prev => prev.map(g => ({
      ...g,
      playerHand: hand === "random" ? hands[Math.floor(Math.random() * 3)] : hand,
    })));
  }, [autoPhase]);

  const commitAutoBatch = useCallback(() => {
    if (autoPhase !== "picking") return;
    if (betAmount <= 0) { toast.error("Set a bet amount first."); return; }
    // Require every mini-game to have a pick.
    const allPicked = autoGames.every(g => g.playerHand !== null);
    if (!allPicked) { toast.error("Pick a hand for every mini-game."); return; }

    setRounds([]);
    setCurrentRound(0);
    setCurrentMultiplier(1);
    setLastRound(null);
    setGameActive(false);
    setGameOver(false);
    setPayout(null);
    setIsAutoPlaying(true);
    setCurrentView(1);

    // Resolve each mini-game — ties are allowed (matches manual mode: tie = push).
    const resolved: AutoGame[] = autoGames.map(g => {
      const gameId = newGameId();
      const computerHand = generateHouseHand(gameId);
      const outcome = getOutcome(g.playerHand!, computerHand);
      return { ...g, computerHand, outcome, gameId };
    });

    setAutoGames(resolved);
    setAutoPhase("shaking");

    // Tense riser across the whole batch.
    const tense = tenseSfxRef.current;
    if (tense && !sfxMutedRef.current) {
      try {
        tense.pause(); tense.currentTime = 0;
        const startVolume = 0.9;
        tense.volume = startVolume;
        tense.play().catch(() => {});
        setTimeout(() => {
          const steps = 15;
          const interval = 500 / steps;
          let i = 0;
          const fade = setInterval(() => {
            i++;
            try { tense.volume = Math.max(0, startVolume * (1 - i / steps)); } catch {}
            if (i >= steps) { clearInterval(fade); try { tense.pause(); } catch {} }
          }, interval);
        }, 1400);
      } catch {}
    }

    // Phase timings mirror single-round flow: shake → reveal → fight → outcome.
    queueTimer(() => setAutoPhase("revealing"), 1200);
    queueTimer(() => setAutoPhase("outcome"), 2600);

    // Final result — play outcome SFX + set payout.
    queueTimer(() => {
      const anyLoss = resolved.some(g => g.outcome === "lose");
      const wins = resolved.filter(g => g.outcome === "win").length;
      const ties = resolved.filter(g => g.outcome === "tie").length;


      if (anyLoss) {
        const a = loseSfxRef.current;
        if (a && !sfxMutedRef.current) {
          try { a.pause(); a.currentTime = 0; a.play().catch(() => {}); } catch {}
        }
        setPayout(0);
        setCurrentRound(wins);
        setCurrentMultiplier(1);
      } else {
        // No losses — ties count as push, payout scales with number of wins only.
        // wins=0 (all ties) → pushes full bet back (1.0x) and plays only the tie SFX.
        const finalMult = wins === 0 ? 1 : parseFloat((WIN_MULTIPLIER ** wins).toFixed(2));
        const finalPayout = parseFloat((betAmount * finalMult).toFixed(4));
        setPayout(finalPayout);
        setCurrentRound(wins);
        setCurrentMultiplier(finalMult);

        if (wins === 0) {
          // All ties — tie SFX only, no win/cashout sound.
          const t = tieSfxRef.current;
          if (t && !sfxMutedRef.current) {
            try { t.pause(); t.currentTime = 0; t.play().catch(() => {}); } catch {}
          }
        } else {
          // Profitable — one final win blast + cash register.
          const a = winSfxRef.current;
          if (a && !sfxMutedRef.current) {
            const winRate = Math.max(0.8, 1.25 - (wins - 1) * 0.025);
            const winVol = Math.min(1.0, 0.9 + (wins - 1) * 0.0175);
            try {
              a.pause(); a.currentTime = 9;
              a.playbackRate = winRate; a.volume = winVol;
              a.play().catch(() => {});
              setTimeout(() => { try { a.pause(); } catch {} }, Math.min(3400, Math.round(2000 / winRate)));
            } catch {}
          }
          setTimeout(() => {
            if (!sfxMutedRef.current && cashoutSfxRef.current) {
              try { cashoutSfxRef.current.currentTime = 0; cashoutSfxRef.current.play().catch(() => {}); } catch {}
            }
          }, 600);
        }
      }

      setAutoPhase("done");
    }, 2600);

    // Transition to game-over view after outcome settles.
    queueTimer(() => {
      setIsAutoPlaying(false);
      setCurrentView(2);
      setGameOver(true);
    }, 4200);
  }, [autoPhase, autoGames, autoNumHands, betAmount, queueTimer]);

  // When Play Again sets pendingAutoCommitRef, auto-fire commit once state has
  // settled into "picking" with all picks preserved — no manual Start needed.
  useEffect(() => {
    if (!pendingAutoCommitRef.current) return;
    if (!isAutoMode || autoPhase !== "picking") return;
    if (autoGames.length !== autoNumHands) return;
    if (!autoGames.every(g => g.playerHand !== null)) return;
    pendingAutoCommitRef.current = false;
    commitAutoBatch();
  }, [isAutoMode, autoPhase, autoGames, autoNumHands, commitAutoBatch]);

  const handleReset = (again = false) => {
    // Kill any in-flight animation timers so they don't mutate post-reset state.
    clearAllTimers();
    pendingAutoCommitRef.current = false;
    if (!again) {
      setCurrentGameId(newGameId());
      setUserRandomWord(bytesToHex(new Uint8Array(randomBytes(32))));
    }
    setCurrentView(0);
    setPayout(null);
    setGameOver(false);
    setGameActive(false);
    setIsRevealing(false);
    setIsPickPending(false);
    setRounds([]);
    setCurrentRound(0);
    setCurrentMultiplier(1);
    if (again && isAutoMode) {
      // Play Again in auto mode — keep player picks, clear only per-round results.
      setAutoGames(prev => prev.map(g => ({
        ...g, computerHand: null, outcome: null, gameId: null,
      })));
      setAutoPhase("picking");
    } else {
      setAutoGames([]);
      setAutoPhase("idle");
    }
    setIsAutoPlaying(false);
    setLastRound(null);
    if (replayIdString !== null) {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("id");
      router.replace(`?${p.toString()}`, { scroll: false });
    }
  };

  const handlePlayAgain = async () => {
    setCurrentGameId(newGameId());
    setUserRandomWord(bytesToHex(new Uint8Array(randomBytes(32))));
    handleReset(true);
    if (isAutoMode) {
      // Queue an auto-commit — fires once state settles via the effect below.
      // Only valid if every mini-game already has a pick (which Play Again preserves).
      const allPicked = autoGames.every(g => g.playerHand !== null);
      if (allPicked) pendingAutoCommitRef.current = true;
      return;
    }
    await playGame();
  };

  // Required lifecycle per SKILL.md §4: replay the previous game using existing
  // on-chain data, no new transaction. Walks through each stored round with the
  // same timing/SFX as a live round, then returns to the game-over view.
  const handleRewatch = useCallback(() => {
    // Auto mode: re-run the last batch animation using the saved picks + results.
    if (isAutoMode) {
      if (!autoGames.length || autoGames[0].computerHand == null) return;
      const snapshot = autoGames.map(g => ({ ...g }));
      const wins = snapshot.filter(g => g.outcome === "win").length;
      const anyLoss = snapshot.some(g => g.outcome === "lose");

      // Hide outcomes, return to a pre-shake state while keeping picks visible.
      setGameOver(false);
      setCurrentView(1);
      setIsAutoPlaying(true);
      setAutoGames(snapshot.map(g => ({ ...g, computerHand: null, outcome: null })));
      setAutoPhase("picking");

      // Small delay so the UI visibly resets before shake starts.
      queueTimer(() => {
        setAutoGames(snapshot);
        setAutoPhase("shaking");
        const tense = tenseSfxRef.current;
        if (tense && !sfxMutedRef.current) {
          try {
            tense.pause(); tense.currentTime = 0;
            const startVolume = 0.9;
            tense.volume = startVolume;
            tense.play().catch(() => {});
            setTimeout(() => {
              const steps = 15;
              const interval = 500 / steps;
              let i = 0;
              const fade = setInterval(() => {
                i++;
                try { tense.volume = Math.max(0, startVolume * (1 - i / steps)); } catch {}
                if (i >= steps) { clearInterval(fade); try { tense.pause(); } catch {} }
              }, interval);
            }, 1400);
          } catch {}
        }
        queueTimer(() => setAutoPhase("revealing"), 1200);
        queueTimer(() => setAutoPhase("outcome"), 2600);
        queueTimer(() => {
          setAutoPhase("done");
          // Play the same aggregate SFX as the original batch.
          if (anyLoss) {
            const a = loseSfxRef.current;
            if (a && !sfxMutedRef.current) {
              try { a.pause(); a.currentTime = 0; a.play().catch(() => {}); } catch {}
            }
          } else if (wins === 0) {
            const t = tieSfxRef.current;
            if (t && !sfxMutedRef.current) {
              try { t.pause(); t.currentTime = 0; t.play().catch(() => {}); } catch {}
            }
          } else {
            const a = winSfxRef.current;
            if (a && !sfxMutedRef.current) {
              const winRate = Math.max(0.8, 1.25 - (wins - 1) * 0.025);
              const winVol = Math.min(1.0, 0.9 + (wins - 1) * 0.0175);
              try {
                a.pause(); a.currentTime = 9;
                a.playbackRate = winRate; a.volume = winVol;
                a.play().catch(() => {});
                setTimeout(() => { try { a.pause(); } catch {} }, Math.min(3400, Math.round(2000 / winRate)));
              } catch {}
            }
          }
        }, 2600);
        queueTimer(() => {
          setIsAutoPlaying(false);
          setCurrentView(2);
          setGameOver(true);
        }, 4200);
      }, 120);
      return;
    }

    if (!rounds.length) return;
    const snapshot = [...rounds];

    // Close the results modal and reset ephemeral round state.
    setGameOver(false);
    setCurrentView(1);
    setGameActive(false); // block picks during replay
    setIsPickPending(false);
    setIsRevealing(true);
    setLastRound(null);
    setRounds([]);
    setCurrentRound(0);
    setCurrentMultiplier(1);

    const ROUND_MS = 3200;

    snapshot.forEach((r, idx) => {
      const base = idx * ROUND_MS;

      // Trigger the RPSWindow reveal animation for this round.
      // Clone the round so React sees a fresh reference — without this,
      // 1-round replays no-op because the object equals the original lastRound.
      setTimeout(() => {
        setLastRound({ ...r });
        // Tense drumroll during the shake — same as live flow.
        const tense = tenseSfxRef.current;
        if (tense && !sfxMutedRef.current) {
          try {
            tense.pause(); tense.currentTime = 0;
            const startVolume = 0.9;
            tense.volume = startVolume;
            tense.play().catch(() => {});
            setTimeout(() => {
              const steps = 15;
              const interval = 500 / steps;
              let i = 0;
              const fade = setInterval(() => {
                i++;
                try { tense.volume = Math.max(0, startVolume * (1 - i / steps)); } catch {}
                if (i >= steps) { clearInterval(fade); try { tense.pause(); } catch {} }
              }, interval);
            }, 1400);
          } catch {}
        }
      }, base);

      // Outcome SFX at the same offsets as a live round.
      if (r.outcome === "win") {
        setTimeout(() => {
          const a = winSfxRef.current;
          if (a && !sfxMutedRef.current) {
            const winRate = Math.max(0.8, 1.25 - (r.round - 1) * 0.025);
            const winVol = Math.min(1.0, 0.9 + (r.round - 1) * 0.0175);
            const stopAfterMs = Math.min(3400, Math.round(2000 / winRate));
            try {
              a.pause(); a.currentTime = 9;
              a.playbackRate = winRate; a.volume = winVol;
              a.play().catch(() => {});
              setTimeout(() => { try { a.pause(); } catch {} }, stopAfterMs);
            } catch {}
          }
        }, base + 2100);
      } else if (r.outcome === "lose") {
        setTimeout(() => {
          const a = loseSfxRef.current;
          if (a && !sfxMutedRef.current) {
            try { a.pause(); a.currentTime = 0; a.play().catch(() => {}); } catch {}
          }
        }, base + 2250);
      } else {
        setTimeout(() => {
          const a = tieSfxRef.current;
          if (a && !sfxMutedRef.current) {
            try { a.pause(); a.currentTime = 0; a.play().catch(() => {}); } catch {}
          }
        }, base + 2250);
      }

      // Advance the ladder + history at the same 2600ms mark as a live round.
      setTimeout(() => {
        if (r.outcome !== "tie") {
          setCurrentRound(r.round);
          setCurrentMultiplier(r.multiplier);
        }
        setRounds(prev => [...prev, r]);
      }, base + 2600);
    });

    // After the full replay, return to the game-over view.
    setTimeout(() => {
      setIsRevealing(false);
      setCurrentView(2);
      setGameOver(true);
    }, snapshot.length * ROUND_MS + 400);
  }, [rounds, isAutoMode, autoGames, queueTimer]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-8 lg:gap-10">
        <GameWindow
          game={game}
          currentGameId={currentGameId}
          isLoading={isLoading}
          isGameFinished={gameOver}
          onPlayAgain={handlePlayAgain}
          playAgainText="Play Again"
          onRewatch={handleRewatch}
          onReset={() => handleReset(false)}
          betAmount={betAmount}
          payout={payout}
          inReplayMode={replayIdString !== null}
          isUserOriginalPlayer={true}
          showPNL={!!payout && payout > betAmount}
          isGamePaused={false}
          resultModalDelayMs={800}
          onSfxMutedChange={handleSfxMutedChange}
          customHeightMobile="640px"
        >
          {isAutoMode ? (
            <RPSAutoBoard
              game={game}
              games={autoGames}
              phase={autoPhase}
              betAmount={betAmount}
              onPickHand={handleAutoPick}
              onPickAll={handleAutoPickAll}
              onCommit={commitAutoBatch}
            />
          ) : (
            <RPSWindow
              game={game}
              currentView={currentView}
              gameActive={gameActive}
              isRevealing={isRevealing}
              isPickPending={isPickPending}
              lastRound={lastRound}
              currentRound={currentRound}
              currentMultiplier={currentMultiplier}
              onPickHand={handlePickHand}
              onHandPress={handleHandPress}
              onCashOut={handleCashOut}
              betAmount={betAmount}
            />
          )}
        </GameWindow>

        <RPSSetupCard
          game={game}
          onPlay={async () => await playGame()}
          onReset={() => handleReset(false)}
          onPlayAgain={handlePlayAgain}
          currentView={currentView}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          isLoading={isLoading}
          payout={payout}
          inReplayMode={replayIdString !== null}
          walletBalance={walletBalance}
          minBet={0.1}
          maxBet={walletBalance}
          currentRound={currentRound}
          currentMultiplier={currentMultiplier}
          rounds={rounds}
          isAutoMode={isAutoMode}
          setIsAutoMode={setIsAutoMode}
          autoNumHands={autoNumHands}
          setAutoNumHands={setAutoNumHands}
          onStartAutoPlay={commitAutoBatch}
          isAutoPlaying={isAutoPlaying}
        />
      </div>
    </div>
  );
};

export default RPSComponent;
