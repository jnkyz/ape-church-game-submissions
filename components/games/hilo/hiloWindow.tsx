"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    GuessDirection,
    SUIT_SYMBOLS,
    getCardRankLabel,
} from "./hiloConfig";

interface CardHistoryEntry {
    card: Card;
    multiplier: number;
    isStart: boolean;
    outcome: "start" | "win" | "loss" | "skip";
}

interface MyGameWindowProps {
    currentCard: Card | null;
    revealedCard: Card | null;
    isSfxMuted: boolean;
    isAutoBetting: boolean;
    betAmount: number;
    history: CardHistoryEntry[];
    currentMultiplier: number;
    higherOuts: number;
    lowerOuts: number;
    equalOuts: number;
    higherMultiplier: number;
    lowerMultiplier: number;
    sameMultiplier: number;
    canGuess: boolean;
    canCashOut: boolean;
    canSkip: boolean;
    canDeal: boolean;
    isRoundActive: boolean;
    onGuess: (direction: GuessDirection) => void;
    onSkip: () => void;
    onCashOut: () => void;
    onDeal: () => void;
    showMiniResult?: boolean;
    miniResultPayout?: number | null;
    miniResultText?: string;
    roundsLeft?: number;
    onPlayAgain?: () => void;
    showEndCardGamesNote?: boolean;
    endCardGamesCount?: number;
}

const isRedSuit = (card: Card) => card.suit === "hearts" || card.suit === "diamonds";

const MyGameWindow: React.FC<MyGameWindowProps> = ({
    currentCard,
    revealedCard,
    isSfxMuted,
    isAutoBetting,
    betAmount,
    history,
    currentMultiplier,
    higherOuts,
    lowerOuts,
    equalOuts,
    higherMultiplier,
    lowerMultiplier,
    sameMultiplier,
    canGuess,
    canCashOut,
    canSkip,
    canDeal,
    isRoundActive,
    onGuess,
    onSkip,
    onCashOut,
    onDeal,
    showMiniResult = false,
    miniResultPayout = null,
    miniResultText = "",
    roundsLeft = 0,
    onPlayAgain,
    showEndCardGamesNote = false,
    endCardGamesCount = 0,
}) => {
    const historyScrollRef = React.useRef<HTMLDivElement | null>(null);
    const dragStateRef = React.useRef({
        isDragging: false,
        startX: 0,
        startScrollLeft: 0,
    });

    React.useEffect(() => {
        const el = historyScrollRef.current;
        if (!el) return;
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }, [history.length]);

    React.useEffect(() => {
        if (!showMiniResult) return;

        let frameId: number | null = null;
        const startedAt = Date.now();
        const maxWaitMs = 1400;
        const minimizedSelector = ".absolute.top-2.left-2.lg\\:top-4.lg\\:left-4.z-20";
        document.body.classList.add("hilo-suppress-result-open");

        const tryAutoMinimize = () => {
            const minimizedCard = document.querySelector(minimizedSelector) as HTMLElement | null;
            if (minimizedCard) {
                document.body.classList.remove("hilo-suppress-result-open");
                return;
            }

            const backdrop = document.querySelector(".absolute.inset-0.z-20") as HTMLElement | null;

            if (backdrop) {
                backdrop.click();
            }

            if (Date.now() - startedAt < maxWaitMs) {
                frameId = window.requestAnimationFrame(tryAutoMinimize);
                return;
            }

            document.body.classList.remove("hilo-suppress-result-open");
        };

        frameId = window.requestAnimationFrame(tryAutoMinimize);

        return () => {
            document.body.classList.remove("hilo-suppress-result-open");
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [showMiniResult]);

    React.useEffect(() => {
        const noteId = "hilo-end-card-games-note-inline";

        if (!showEndCardGamesNote || endCardGamesCount <= 0) {
            const existing = document.getElementById(noteId);
            existing?.remove();
            return;
        }

        let frameId: number | null = null;
        const maxWaitMs = 1800;
        const startedAt = Date.now();

        const upsertNote = () => {
            const modalCard = document.querySelector(
                ".absolute.inset-0.z-30 .relative.rounded-3xl"
            ) as HTMLElement | null;
            if (!modalCard) {
                if (Date.now() - startedAt < maxWaitMs) {
                    frameId = window.requestAnimationFrame(upsertNote);
                }
                return;
            }

            const payout = modalCard.querySelector(
                "p.font-bold.text-4xl.sm\\:text-5xl.text-primary"
            ) as HTMLElement | null;
            if (!payout) {
                if (Date.now() - startedAt < maxWaitMs) {
                    frameId = window.requestAnimationFrame(upsertNote);
                }
                return;
            }

            let note = modalCard.querySelector(`#${noteId}`) as HTMLParagraphElement | null;
            if (!note) {
                note = document.createElement("p");
                note.id = noteId;
                note.className = "hilo-end-card-games-note-inline";
                payout.insertAdjacentElement("afterend", note);
            }

            note.textContent = `(in ${endCardGamesCount} game${endCardGamesCount !== 1 ? "s" : ""})`;
        };

        frameId = window.requestAnimationFrame(upsertNote);

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            const existing = document.getElementById(noteId);
            existing?.remove();
        };
    }, [showEndCardGamesNote, endCardGamesCount]);

    const handleHistoryPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const el = historyScrollRef.current;
        if (!el) return;
        dragStateRef.current = {
            isDragging: true,
            startX: event.clientX,
            startScrollLeft: el.scrollLeft,
        };
        el.setPointerCapture(event.pointerId);
    };

    const handleHistoryPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const el = historyScrollRef.current;
        if (!el || !dragStateRef.current.isDragging) return;
        const deltaX = event.clientX - dragStateRef.current.startX;
        el.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
    };

    const handleHistoryPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const el = historyScrollRef.current;
        if (!el) return;
        dragStateRef.current.isDragging = false;
        if (el.hasPointerCapture(event.pointerId)) {
            el.releasePointerCapture(event.pointerId);
        }
    };

    const rank = currentCard?.rank ?? 0;
    const lowerOrSameChance = ((lowerOuts + equalOuts) / 13) * 100;
    const higherOrSameChance = ((higherOuts + equalOuts) / 13) * 100;
    const sameChance = (equalOuts / 13) * 100;

    const leftOption =
        rank === 13
            ? { label: "Lower", direction: "lower" as GuessDirection, chance: (lowerOuts / 13) * 100, multiplier: lowerMultiplier }
            : rank === 1
            ? { label: "Same", direction: "same" as GuessDirection, chance: sameChance, multiplier: sameMultiplier }
            : { label: "Lower or Same", direction: "lower" as GuessDirection, chance: lowerOrSameChance, multiplier: lowerMultiplier };

    const rightOption =
        rank === 1
            ? { label: "Higher", direction: "higher" as GuessDirection, chance: (higherOuts / 13) * 100, multiplier: higherMultiplier }
            : rank === 13
            ? { label: "Same", direction: "same" as GuessDirection, chance: sameChance, multiplier: sameMultiplier }
            : { label: "Higher or Same", direction: "higher" as GuessDirection, chance: higherOrSameChance, multiplier: higherMultiplier };

    const showCashOut = isRoundActive;

    const lowerDisplay =
        rank === 13
            ? { label: "Lower", multiplier: lowerMultiplier }
            : rank === 1
                ? { label: "Same", multiplier: sameMultiplier }
                : { label: "Lower or Same", multiplier: lowerMultiplier };

    const higherDisplay =
        rank === 1
            ? { label: "Higher", multiplier: higherMultiplier }
            : rank === 13
                ? { label: "Same", multiplier: sameMultiplier }
                : { label: "Higher or Same", multiplier: higherMultiplier };

    const lowerChanceDisplay =
        rank === 13
            ? (lowerOuts / 13) * 100
            : rank === 1
                ? sameChance
                : lowerOrSameChance;

    const higherChanceDisplay =
        rank === 1
            ? (higherOuts / 13) * 100
            : rank === 13
                ? sameChance
                : higherOrSameChance;

    const runningAmount = betAmount * currentMultiplier;
    const lowerPayout = lowerDisplay.multiplier > 0 ? runningAmount * lowerDisplay.multiplier : 0;
    const higherPayout = higherDisplay.multiplier > 0 ? runningAmount * higherDisplay.multiplier : 0;
    const topCard = revealedCard ?? currentCard;
    const topCardKey = topCard ? `${topCard.rank}-${topCard.suit}` : "hidden";
    const shouldCenterHistory = history.length <= 2;
    const latestOutcome = history.length > 0 ? history[history.length - 1].outcome : null;
    const topCardResultFlash =
        revealedCard && (latestOutcome === "win" || latestOutcome === "loss")
            ? latestOutcome
            : null;
    const persistLossOutline = latestOutcome === "loss";
    const topCardAnimationMode =
        revealedCard && (latestOutcome === "win" || latestOutcome === "skip")
            ? "reveal"
            : revealedCard && latestOutcome === "loss"
                ? "shake"
                : null;
    const slideSfxRef = React.useRef<HTMLAudioElement | null>(null);
    const lastTopCardKeyRef = React.useRef<string>("hidden");
    const lastSlideSfxAtRef = React.useRef(0);

    const triggerSlideSfx = React.useCallback(() => {
        if (isSfxMuted) return;
        const sound = slideSfxRef.current;
        if (!sound) return;

        lastSlideSfxAtRef.current = Date.now();
        sound.currentTime = 0;
        void sound.play().catch(() => {
            // Ignore autoplay/interruption errors from the browser.
        });
    }, [isSfxMuted]);

    React.useEffect(() => {
        slideSfxRef.current = new Audio("/submissions/hilo/sfx/card_slide.mp3");
        slideSfxRef.current.preload = "auto";

        return () => {
            if (slideSfxRef.current) {
                slideSfxRef.current.pause();
                slideSfxRef.current = null;
            }
        };
    }, []);

    React.useLayoutEffect(() => {
        const previousKey = lastTopCardKeyRef.current;
        if (topCardKey === previousKey) return;

        const hasNewVisibleCard = topCardKey !== "hidden";
        const recentlyPlayedOnClick = Date.now() - lastSlideSfxAtRef.current < 220;
        if (hasNewVisibleCard && !recentlyPlayedOnClick) {
            triggerSlideSfx();
        }

        lastTopCardKeyRef.current = topCardKey;
    }, [topCardKey, triggerSlideSfx]);

    return (
        <div className={"hilo-root"}>
            <div className={"hilo-vignette"} />

            <div className={"hilo-table-shell"}>
                <div className={"hilo-guide-card"}>
                    <p className={"hilo-guide-value"}>A</p>
                    <p className={"hilo-guide-copy"}>Ace Lowest</p>
                </div>

                <div className={"hilo-card-stack-area"}>
                    <div className={"hilo-card-shadow-1"} />
                    <div className={"hilo-card-shadow-2"} />
                    <CardFace
                        key={topCardKey}
                        card={topCard}
                        hidden={!topCard}
                        compact={false}
                        resultFlash={topCardResultFlash}
                        persistLossOutline={persistLossOutline}
                        animationMode={topCardAnimationMode}
                    />
                </div>

                <div className={"hilo-guide-card"}>
                    <p className={"hilo-guide-value"}>K</p>
                    <p className={"hilo-guide-copy"}>King Highest</p>
                </div>
            </div>

            <div className={"hilo-action-row"}>
                <Button
                    onClick={() => {
                        triggerSlideSfx();
                        onGuess(leftOption.direction);
                    }}
                    disabled={isAutoBetting || !canGuess || leftOption.chance <= 0}
                    className={"hilo-action-btn"}
                >
                    <span className={"hilo-action-content"}>
                        <span>{leftOption.label}</span>
                        <small>{leftOption.multiplier.toFixed(2)}x</small>
                    </span>
                </Button>

                <div className={"hilo-center-actions"}>
                    <Button
                        onClick={() => {
                            if (showCashOut) {
                                onCashOut();
                                return;
                            }

                            onDeal();
                        }}
                        disabled={isAutoBetting || (showCashOut ? !canCashOut : !canDeal)}
                        className={"hilo-cashout-btn"}
                    >
                        {showCashOut ? "Cash Out" : <span className={"hilo-deal-label"}>Deal</span>}
                    </Button>

                    <Button
                        onClick={() => {
                            triggerSlideSfx();
                            onSkip();
                        }}
                        disabled={isAutoBetting || !canSkip}
                        className={"hilo-action-btn"}
                    >
                        <span>Skip Card</span>
                    </Button>
                </div>

                <Button
                    onClick={() => {
                        triggerSlideSfx();
                        onGuess(rightOption.direction);
                    }}
                    disabled={isAutoBetting || !canGuess || rightOption.chance <= 0}
                    className={"hilo-action-btn"}
                >
                    <span className={"hilo-action-content"}>
                        <span>{rightOption.label}</span>
                        <small>{rightOption.multiplier.toFixed(2)}x</small>
                    </span>
                </Button>
            </div>

            <div className={"hilo-profit-row"}>
                <div className={"hilo-profit-box"}>
                    <p className={"hilo-afacad-label"}>{lowerDisplay.label} ({lowerChanceDisplay.toFixed(2)}%)</p>
                    <strong className={"hilo-nohemi-number"}>{lowerPayout.toFixed(2)} APE</strong>
                </div>
                <div className={"hilo-profit-box hilo-profit-box-right"}>
                    <p className={"hilo-afacad-label"}>{higherDisplay.label} ({higherChanceDisplay.toFixed(2)}%)</p>
                    <strong className={"hilo-nohemi-number"}>{higherPayout.toFixed(2)} APE</strong>
                </div>
            </div>

            <div className={"hilo-history-row"}>
                <div
                    ref={historyScrollRef}
                    className={`${"hilo-history-scroll"} ${shouldCenterHistory ? "hilo-history-scroll-centered" : ""}`}
                    onPointerDown={handleHistoryPointerDown}
                    onPointerMove={handleHistoryPointerMove}
                    onPointerUp={handleHistoryPointerUp}
                    onPointerCancel={handleHistoryPointerUp}
                >
                    {history.map((entry, index) => (
                        <div key={`${entry.card.rank}-${index}`} className={"hilo-history-item"}>
                            {index > 0 && (
                                <div
                                    className={`${"hilo-history-connector"} ${
                                        entry.outcome === "loss"
                                            ? "hilo-history-connector-loss"
                                            : entry.outcome === "skip"
                                                ? "hilo-history-connector-skip"
                                            : "hilo-history-connector-win"
                                    }`}
                                >
                                    <img
                                        src={
                                            entry.outcome === "loss"
                                                ? "/submissions/hilo/x_white.svg"
                                                : entry.outcome === "skip"
                                                    ? "/submissions/hilo/arrow_white.svg"
                                                    : "/submissions/hilo/checkmark_white.svg"
                                        }
                                        alt={
                                            entry.outcome === "loss"
                                                ? "Loss"
                                                : entry.outcome === "skip"
                                                    ? "Skip"
                                                    : "Win"
                                        }
                                        className={`${"hilo-history-connector-icon"} ${
                                            entry.outcome === "win"
                                                ? "hilo-history-connector-icon-check"
                                                : entry.outcome === "loss"
                                                    ? "hilo-history-connector-icon-loss"
                                                    : ""
                                        }`}
                                    />
                                </div>
                            )}
                            <HistoryAnimatedCard card={entry.card} isSkipped={entry.outcome === "skip"} />
                            <span
                                className={`${"hilo-history-label"} ${
                                    entry.outcome === "loss"
                                        ? "hilo-history-label-loss"
                                        : entry.outcome === "skip"
                                            ? "hilo-history-label-skip"
                                            : ""
                                }`}
                            >
                                {entry.isStart ? "Start Card" : entry.outcome === "loss" ? "0.00x" : `${entry.multiplier.toFixed(2)}x`}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

const HistoryAnimatedCard: React.FC<{ card: Card; isSkipped?: boolean }> = ({ card, isSkipped = false }) => {
    return (
        <div
            className={`${"hilo-history-card"} ${"hilo-history-card-enter"} ${
                isSkipped ? "hilo-history-card-skip" : ""
            }`}
        >
            <div className={"hilo-history-card-flip"}>
                <div className={"hilo-history-card-face hilo-history-card-face-back"}>
                    <CardFace card={card} hidden compact />
                </div>
                <div className={"hilo-history-card-face hilo-history-card-face-front"}>
                    <CardFace card={card} hidden={false} compact />
                </div>
            </div>
        </div>
    );
};

const CardFace: React.FC<{
    card: Card | null;
    hidden: boolean;
    compact?: boolean;
    resultFlash?: "win" | "loss" | null;
    persistLossOutline?: boolean;
    animationMode?: "reveal" | "shake" | null;
}> = ({ card, hidden, compact = false, resultFlash = null, persistLossOutline = false, animationMode = null }) => {
    if (hidden) {
        return (
            <div
                className={`${"hilo-card"} ${"hilo-card-hidden"} ${
                    compact ? "hilo-card-compact" : ""
                }`}
            >
                <div className={"hilo-card-pattern"} />
            </div>
        );
    }

    if (!card) return null;

    return (
        <div
            className={`${"hilo-card"} ${compact ? "hilo-card-compact" : ""} ${
                !compact && animationMode === "reveal"
                    ? "hilo-card-live"
                    : !compact && animationMode === "shake"
                        ? "hilo-card-shake"
                        : ""
            } ${
                !compact && resultFlash === "win"
                    ? "hilo-card-result-win"
                    : !compact && resultFlash === "loss" && !persistLossOutline
                        ? "hilo-card-result-loss"
                        : ""
            } ${
                !compact && persistLossOutline
                    ? "hilo-card-result-loss-persist"
                    : ""
            }`}
        >
            <div className={"hilo-card-corner"} style={{ color: isRedSuit(card) ? "#ef4444" : "#0f172a" }}>
                {getCardRankLabel(card)}
            </div>
            <div className={"hilo-card-center"} style={{ color: isRedSuit(card) ? "#ef4444" : "#0f172a" }}>
                {SUIT_SYMBOLS[card.suit]}
            </div>
            <div
                className={`${"hilo-card-corner"} ${"hilo-card-corner-bottom"}`}
                style={{ color: isRedSuit(card) ? "#ef4444" : "#0f172a" }}
            >
                {getCardRankLabel(card)}
            </div>
        </div>
    );
};

export default MyGameWindow;

