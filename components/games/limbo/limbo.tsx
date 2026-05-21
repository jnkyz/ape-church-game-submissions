"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSound from "use-sound";
import GameWindow from "@/components/shared/GameWindow";
import LimboGameWindow from "./limboWindow";
import LimboGameSetupCard from "./limboSetupCard";
import "./limbo.style.css";
import { bytesToHex } from "viem";
import { randomBytes, Game } from "@/lib/games";
import {
    HOUSE_EDGE,
    clampTargetMultiplier,
    clampWinChance,
    drawLimboMultiplierFromWord,
    getTargetForWinChance,
    getWinChanceForTarget,
    limboGame,
} from "./limboConfig";
interface LimboRoundState {
    currentMultiplier: number;
    payout: number | null;
    isWin: boolean | null;
    isLoading: boolean;
    isResolving: boolean;
    resultText: string;
}

interface ChainRoundData {
    roundId: bigint;
    randomWord: `0x${string}`;
    houseEdge: number;
    maxPayout: number;
}

interface FinishedRound {
    roundId: bigint;
    multiplier: number;
    payout: number;
    isWin: boolean;
    targetMultiplier: number;
    houseEdge: number;
    maxPayout: number;
}

interface RecentMultiplierResult {
    id: number;
    multiplier: number;
    isWin: boolean;
}

const INITIAL_ROUND_STATE: LimboRoundState = {
    currentMultiplier: 1,
    payout: null,
    isWin: null,
    isLoading: false,
    isResolving: false,
    resultText: "Set your target multiplier and place a bet.",
};

const DEFAULT_TARGET_MULTIPLIER = 2;
const DEFAULT_POOL_MAX_PAYOUT = 10000;
const MIN_BET_AMOUNT = 1;
const MANUAL_REVEAL_DURATION_MS = 820;
const AUTO_REVEAL_DURATION_MS = 460;
const MANUAL_TICK_INTERVAL_MS = 70;
const AUTO_TICK_INTERVAL_MS = 50;
const AUTO_ADVANCE_DELAY_MS = 320;
const floorToTwoDecimals = (value: number) => Math.floor(value * 100) / 100;

const LimboGame: React.FC = () => {
    const game: Game = limboGame;

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
    );

    const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
    const [betAmount, setBetAmount] = useState(MIN_BET_AMOUNT);
    const [numberOfSpins, setNumberOfSpins] = useState(1);
    const [betMode, setBetMode] = useState<"manual" | "auto">("manual");
    const [autoBetCount, setAutoBetCount] = useState(10);
    const [isAutoBetting, setIsAutoBetting] = useState(false);
    const [remainingAutoBets, setRemainingAutoBets] = useState(0);
    const [autoTotalPayout, setAutoTotalPayout] = useState(0);
    const [autoRoundsPlayed, setAutoRoundsPlayed] = useState(0);
    const [walletBalance, setWalletBalance] = useState(25);
    const [purchasedRoundsRemaining, setPurchasedRoundsRemaining] = useState(0);
    const [targetMultiplier, setTargetMultiplier] = useState(DEFAULT_TARGET_MULTIPLIER);
    const [winChance, setWinChance] = useState(() => getWinChanceForTarget(DEFAULT_TARGET_MULTIPLIER));
    const [roundState, setRoundState] = useState<LimboRoundState>(INITIAL_ROUND_STATE);
    const [recentMultipliers, setRecentMultipliers] = useState<RecentMultiplierResult[]>([]);
    const [isRewatching, setIsRewatching] = useState(false);
    const [chainHouseEdge, setChainHouseEdge] = useState(HOUSE_EDGE);
    const [maxPayoutPerGame, setMaxPayoutPerGame] = useState(DEFAULT_POOL_MAX_PAYOUT);
    const [isAutoMinimizePending, setIsAutoMinimizePending] = useState(false);

    const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tickerTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastFinishedRoundRef = useRef<FinishedRound | null>(null);
    const historyEntryIdRef = useRef(0);
    const lastAutoMinimizedRoundRef = useRef<bigint | null>(null);

    const activeHouseEdge = chainHouseEdge;

    const resetTimers = () => {
        if (resolveTimeoutRef.current !== null) {
            clearTimeout(resolveTimeoutRef.current);
            resolveTimeoutRef.current = null;
        }
        if (autoActionTimeoutRef.current !== null) {
            clearTimeout(autoActionTimeoutRef.current);
            autoActionTimeoutRef.current = null;
        }
        if (tickerTimeoutRef.current !== null) {
            clearInterval(tickerTimeoutRef.current);
            tickerTimeoutRef.current = null;
        }
    };

    const requestRoundFromChain = async (): Promise<ChainRoundData> => {
        const useMockChain = process.env.NEXT_PUBLIC_APE_CHAIN_MODE !== "live";

        if (!useMockChain) {
            throw new Error("On-chain Limbo adapter is not configured yet.");
        }

        const randomWord = bytesToHex(new Uint8Array(randomBytes(32))) as `0x${string}`;
        const roundId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));

        return {
            roundId,
            randomWord,
            houseEdge: HOUSE_EDGE,
            maxPayout: DEFAULT_POOL_MAX_PAYOUT,
        };
    };

    const updateTargetFromInput = (value: number) => {
        const nextTarget = Number(clampTargetMultiplier(value).toFixed(2));
        setTargetMultiplier(nextTarget);
        setWinChance(getWinChanceForTarget(nextTarget, activeHouseEdge));
    };

    const updateChanceFromInput = (value: number) => {
        const nextChance = Number(clampWinChance(value).toFixed(8));
        setWinChance(nextChance);
        setTargetMultiplier(getTargetForWinChance(nextChance, activeHouseEdge));
    };

    // SFX
    const [playWin] = useSound("/submissions/limbo/sfx/win_v2.mp3", { volume: 0.5 });
    const [playLose] = useSound("/submissions/limbo/sfx/lose_v2.mp3", { volume: 0.5 });

    const applyPayout = (isWin: boolean, payout: number, isAutoRound = false) => {
        if (isAutoRound) {
            setAutoRoundsPlayed((prev) => prev + 1);
            setAutoTotalPayout((prev) => Number((prev + payout).toFixed(2)));
            setRemainingAutoBets((prev) => Math.max(0, prev - 1));
        }

        if (payout > 0) {
            setWalletBalance((prev) => Number((prev + payout).toFixed(2)));
        }

        setRoundState((prev) => ({
            ...prev,
            payout,
            isWin,
            isResolving: false,
            isLoading: false,
            resultText: isWin ? "Win" : "Loss",
        }));
        // Play SFX
        if (isWin) {
            playWin();
        } else {
            playLose();
        }
    };

    const startRevealAnimation = (
        rolledMultiplier: number,
        didWin: boolean,
        payout: number,
        onComplete: () => void,
        rollingText: string,
        options?: { resolveDelayMs?: number; tickIntervalMs?: number }
    ) => {
        setCurrentView(1);
        setRoundState((prev) => ({
            ...prev,
            isLoading: true,
            isResolving: true,
            payout: null,
            isWin: null,
            resultText: rollingText,
        }));

        const resolveDelayMs = options?.resolveDelayMs ?? MANUAL_REVEAL_DURATION_MS;
        const tickIntervalMs = options?.tickIntervalMs ?? MANUAL_TICK_INTERVAL_MS;

        tickerTimeoutRef.current = setInterval(() => {
            setRoundState((prev) => {
                const fakeTick = Number((1 + Math.random() * 6).toFixed(2));
                return { ...prev, currentMultiplier: fakeTick };
            });
        }, tickIntervalMs);

        resolveTimeoutRef.current = setTimeout(() => {
            if (tickerTimeoutRef.current !== null) {
                clearInterval(tickerTimeoutRef.current);
                tickerTimeoutRef.current = null;
            }

            // Show minimized card as soon as possible
            setIsAutoMinimizePending(true);

            // Force a microtask before updating state for even faster UI
            Promise.resolve().then(() => {
                setRoundState((prev) => ({
                    ...prev,
                    currentMultiplier: rolledMultiplier,
                }));
            });

            onComplete();
            setCurrentView(2);
            setRecentMultipliers((prev) => {
                const nextEntry: RecentMultiplierResult = {
                    id: historyEntryIdRef.current++,
                    multiplier: rolledMultiplier,
                    isWin: didWin,
                };
                return [...prev, nextEntry].slice(-20);
            });
        }, resolveDelayMs);
    };

    const playGame = async (options?: { noPayment?: boolean; isAutoRound?: boolean }) => {
        if (betAmount < MIN_BET_AMOUNT || roundState.isResolving || roundState.isLoading) return;

        const isAutoRound = options?.isAutoRound === true;

        setIsRewatching(false);
        resetTimers();

        if (!options?.noPayment) {
            if (betMode === "manual") {
                if (purchasedRoundsRemaining > 0) {
                    setPurchasedRoundsRemaining((prev) => Math.max(0, prev - 1));
                } else {
                    const roundsToBuy = Math.max(1, numberOfSpins);
                    const packageCost = Number((roundsToBuy * betAmount).toFixed(2));

                    if (walletBalance < packageCost) {
                        setRoundState((prev) => ({
                            ...prev,
                            resultText: `Not enough balance to buy ${roundsToBuy} rounds.`,
                        }));
                        return;
                    }

                    setWalletBalance((prev) => Number((prev - packageCost).toFixed(2)));
                    setPurchasedRoundsRemaining(Math.max(0, roundsToBuy - 1));
                }
            } else {
                if (walletBalance < betAmount) {
                    setRoundState((prev) => ({
                        ...prev,
                        resultText: "Not enough balance for this bet.",
                    }));
                    return;
                }
                setWalletBalance((prev) => Number((prev - betAmount).toFixed(2)));
            }
        }

        let chainRound: ChainRoundData;
        try {
            chainRound = await requestRoundFromChain();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to retrieve on-chain randomness.";
            setRoundState((prev) => ({
                ...prev,
                isLoading: false,
                isResolving: false,
                resultText: message,
            }));
            return;
        }

        setCurrentGameId(chainRound.roundId);
        setChainHouseEdge(chainRound.houseEdge);
        const nextMaxPayout = Number(Math.max(1, chainRound.maxPayout).toFixed(2));
        setMaxPayoutPerGame(nextMaxPayout);

        const rolledMultiplier = drawLimboMultiplierFromWord(chainRound.randomWord, chainRound.houseEdge);
        const settledMultiplier = floorToTwoDecimals(rolledMultiplier);
        const didWin = settledMultiplier >= targetMultiplier;
        const uncappedPayout = didWin ? betAmount * targetMultiplier : 0;
        const payout = Number(Math.min(uncappedPayout, nextMaxPayout).toFixed(2));

        startRevealAnimation(
            settledMultiplier,
            didWin,
            payout,
            () => {
                applyPayout(didWin, payout, isAutoRound);
                lastFinishedRoundRef.current = {
                    roundId: chainRound.roundId,
                    multiplier: settledMultiplier,
                    payout,
                    isWin: didWin,
                    targetMultiplier,
                    houseEdge: chainRound.houseEdge,
                    maxPayout: nextMaxPayout,
                };
            },
            "Rolling...",
            isAutoRound
                ? { resolveDelayMs: AUTO_REVEAL_DURATION_MS, tickIntervalMs: AUTO_TICK_INTERVAL_MS }
                : undefined
        );
    };

    const startAutobet = () => {
        if (isAutoBetting || betAmount < MIN_BET_AMOUNT) return;

        const hasPurchasedAutoRounds = remainingAutoBets > 0;
        const rounds = hasPurchasedAutoRounds ? remainingAutoBets : Math.max(1, autoBetCount);

        if (!hasPurchasedAutoRounds) {
            const totalCost = Number((rounds * betAmount).toFixed(2));

            if (walletBalance < totalCost) {
                setRoundState((prev) => ({
                    ...prev,
                    resultText: `Not enough balance to buy ${rounds} auto bets.`,
                }));
                return;
            }

            setWalletBalance((prev) => Number((prev - totalCost).toFixed(2)));
        }

        setIsAutoBetting(true);
        if (!hasPurchasedAutoRounds) {
            setRemainingAutoBets(rounds);
        }
        setAutoTotalPayout(0);
        setAutoRoundsPlayed(0);
        void playGame({ noPayment: true, isAutoRound: true });
    };

    const stopAutobet = () => {
        setIsAutoBetting(false);
        if (autoActionTimeoutRef.current !== null) {
            clearTimeout(autoActionTimeoutRef.current);
            autoActionTimeoutRef.current = null;
        }
    };

    const handleReset = (options?: { preserveLastFinishedRound?: boolean; preserveBetAmount?: boolean }) => {
        resetTimers();
        setCurrentGameId(BigInt(bytesToHex(new Uint8Array(randomBytes(32)))));
        setCurrentView(0);
        setBetAmount(options?.preserveBetAmount ? Math.max(MIN_BET_AMOUNT, betAmount) : MIN_BET_AMOUNT);
        setNumberOfSpins(1);
        setBetMode("manual");
        setAutoBetCount(10);
        setIsAutoBetting(false);
        setRemainingAutoBets(0);
        setAutoTotalPayout(0);
        setAutoRoundsPlayed(0);
        setWalletBalance(25);
        setPurchasedRoundsRemaining(0);
        setTargetMultiplier(DEFAULT_TARGET_MULTIPLIER);
        setWinChance(getWinChanceForTarget(DEFAULT_TARGET_MULTIPLIER, HOUSE_EDGE));
        setRoundState(INITIAL_ROUND_STATE);
        setIsRewatching(false);
        setChainHouseEdge(HOUSE_EDGE);
        setMaxPayoutPerGame(DEFAULT_POOL_MAX_PAYOUT);
        setRecentMultipliers([]);
        setIsAutoMinimizePending(false);
        historyEntryIdRef.current = 0;
        if (!options?.preserveLastFinishedRound) {
            lastFinishedRoundRef.current = null;
        }
    };

    const handlePlayAgain = () => {
        handleReset({ preserveLastFinishedRound: true, preserveBetAmount: true });
        void playGame();
    };

    const handleRewatch = () => {
        const previous = lastFinishedRoundRef.current;
        if (!previous) return;

        handleReset({ preserveLastFinishedRound: true });

        setIsRewatching(true);
        setCurrentGameId(previous.roundId);
        setChainHouseEdge(previous.houseEdge);
        setMaxPayoutPerGame(previous.maxPayout);
        setTargetMultiplier(previous.targetMultiplier);
        setWinChance(getWinChanceForTarget(previous.targetMultiplier, previous.houseEdge));

        startRevealAnimation(
            previous.multiplier,
            previous.isWin,
            previous.payout,
            () => {
                setRoundState((prev) => ({
                    ...prev,
                    payout: previous.payout,
                    isWin: previous.isWin,
                    isResolving: false,
                    isLoading: false,
                    resultText: "Rewatch complete.",
                }));
            },
            "Rewatching previous round..."
        );
    };

    useEffect(() => {
        if (!isAutoBetting || currentView !== 2) return;

        if (remainingAutoBets <= 0) {
            setIsAutoBetting(false);
            return;
        }

        autoActionTimeoutRef.current = setTimeout(() => {
            void playGame({ noPayment: true, isAutoRound: true });
        }, AUTO_ADVANCE_DELAY_MS);

        return () => {
            if (autoActionTimeoutRef.current !== null) {
                clearTimeout(autoActionTimeoutRef.current);
                autoActionTimeoutRef.current = null;
            }
        };
    }, [isAutoBetting, currentView, remainingAutoBets, playGame]);

    useEffect(() => {
        return () => resetTimers();
    }, []);

    const displayedPayout = roundState.payout ?? 0;
    const isLoading = roundState.isLoading && !roundState.isResolving;
    const gameFinished = currentView === 2 && roundState.isWin !== null && !roundState.isResolving && !roundState.isLoading;
    const showProfit = displayedPayout > betAmount;

    const liveWinChance = useMemo(
        () => getWinChanceForTarget(targetMultiplier, activeHouseEdge),
        [targetMultiplier, activeHouseEdge]
    );

    useEffect(() => {
        if (!roundState.isResolving && !roundState.isLoading) {
            setWinChance(liveWinChance);
        }
    }, [liveWinChance, roundState.isResolving, roundState.isLoading]);

    useEffect(() => {
        if (!gameFinished) {
            setIsAutoMinimizePending(false);
            return;
        }
        if (lastAutoMinimizedRoundRef.current === currentGameId) return;

        setIsAutoMinimizePending(true);

        const tryMinimize = () => {
            const minimizeButton = document.querySelector<HTMLButtonElement>('button[aria-label="Minimize"]');
            if (!minimizeButton) return false;

            minimizeButton.click();
            lastAutoMinimizedRoundRef.current = currentGameId;
            setIsAutoMinimizePending(false);
            return true;
        };

        if (tryMinimize()) return;

        const observer = new MutationObserver(() => {
            tryMinimize();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const safetyTimeoutId = window.setTimeout(() => {
            setIsAutoMinimizePending(false);
            observer.disconnect();
        }, 1200);

        return () => {
            observer.disconnect();
            window.clearTimeout(safetyTimeoutId);
        };
    }, [gameFinished, currentGameId]);

    return (
        <div className={`flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10 ${isAutoMinimizePending ? "limbo-auto-minimize-pending" : ""}`}>
            <GameWindow
                game={game}
                currentGameId={currentGameId}
                isLoading={isLoading}
                isGameFinished={gameFinished}
                onPlayAgain={handlePlayAgain}
                playAgainText="Play Again"
                onReset={handleReset}
                onRewatch={handleRewatch}
                betAmount={betAmount}
                payout={displayedPayout}
                inReplayMode={isRewatching}
                isUserOriginalPlayer
                showPNL={showProfit}
                isGamePaused={false}
                resultModalDelayMs={250}
            >
                <LimboGameWindow
                    recentMultipliers={recentMultipliers}
                    currentMultiplier={roundState.currentMultiplier}
                    isRolling={roundState.isResolving}
                    isWin={roundState.isWin}
                    targetMultiplier={targetMultiplier}
                    winChance={winChance}
                    houseEdge={activeHouseEdge}
                    onTargetMultiplierChange={updateTargetFromInput}
                    onWinChanceChange={updateChanceFromInput}
                />
            </GameWindow>

            <LimboGameSetupCard
                currentView={currentView}
                betAmount={betAmount}
                setBetAmount={(amount) => setBetAmount(Math.max(MIN_BET_AMOUNT, amount))}
                numberOfSpins={numberOfSpins}
                setNumberOfSpins={setNumberOfSpins}
                betMode={betMode}
                setBetMode={setBetMode}
                autoBetCount={autoBetCount}
                setAutoBetCount={setAutoBetCount}
                isAutoBetting={isAutoBetting}
                remainingAutoBets={remainingAutoBets}
                autoRoundsPlayed={autoRoundsPlayed}
                autoTotalPayout={autoTotalPayout}
                hasActivePackage={purchasedRoundsRemaining > 0}
                manualRoundsRemaining={purchasedRoundsRemaining}
                onStart={() => void playGame()}
                onStartAutobet={startAutobet}
                onStopAutobet={stopAutobet}
                isLoading={roundState.isLoading}
                isResolving={roundState.isResolving}
                walletBalance={walletBalance}
                maxPayoutPerGame={maxPayoutPerGame}
            />
        </div>
    );
};
export default LimboGame;
