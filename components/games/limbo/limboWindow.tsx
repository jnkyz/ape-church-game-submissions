"use client";

import React from "react";
import {
    MAX_TARGET_MULTIPLIER,
    MAX_WIN_CHANCE,
    MIN_TARGET_MULTIPLIER,
    MIN_WIN_CHANCE,
    clampTargetMultiplier,
    clampWinChance,
    getTargetForWinChance,
    getWinChanceForTarget,
} from "./limboConfig";

interface RecentMultiplierResult {
    id: number;
    multiplier: number;
    isWin: boolean;
}

interface LimboGameWindowProps {
    recentMultipliers: RecentMultiplierResult[];
    currentMultiplier: number;
    isRolling: boolean;
    isWin: boolean | null;
    targetMultiplier: number;
    winChance: number;
    houseEdge: number;
    onTargetMultiplierChange: (value: number) => void;
    onWinChanceChange: (value: number) => void;
}

const formatMultiplier = (value: number) => `${value.toFixed(2)}x`;
const HISTORY_CARD_SLOT_WIDTH = 92;

const LimboGameWindow: React.FC<LimboGameWindowProps> = ({
    recentMultipliers,
    currentMultiplier,
    isRolling,
    isWin,
    targetMultiplier,
    winChance,
    houseEdge,
    onTargetMultiplierChange,
    onWinChanceChange,
}) => {
    const [historyShiftOffset, setHistoryShiftOffset] = React.useState(0);
    const [isHistoryAnimating, setIsHistoryAnimating] = React.useState(false);

    const [targetInputValue, setTargetInputValue] = React.useState(String(targetMultiplier));
    const [winChanceInputValue, setWinChanceInputValue] = React.useState(String(winChance));

    // Live sync: as user types in one, update the other
    React.useEffect(() => {
        // Only update if the input is focused and being edited
        if (document.activeElement && document.activeElement.classList.contains('limbo-input-target')) {
            const parsed = Number(targetInputValue);
            if (!isNaN(parsed) && parsed >= MIN_TARGET_MULTIPLIER && parsed <= MAX_TARGET_MULTIPLIER) {
                const nextWinChance = getWinChanceForTarget(parsed, houseEdge);
                // Show 3 decimals if < 1, 2 otherwise
                const format = (val: number) => {
                    if (val < 1) return val.toFixed(3).replace(/\.000$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                    if (Number.isInteger(val)) return String(val);
                    return val.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                };
                setWinChanceInputValue(format(nextWinChance));
            }
        }
    }, [targetInputValue, houseEdge]);

    React.useEffect(() => {
        if (document.activeElement && document.activeElement.classList.contains('limbo-input-chance')) {
            const parsed = Number(winChanceInputValue);
            if (!isNaN(parsed) && parsed >= MIN_WIN_CHANCE && parsed <= MAX_WIN_CHANCE) {
                const nextTarget = getTargetForWinChance(parsed, houseEdge);
                setTargetInputValue(String(clampTargetMultiplier(nextTarget)));
            }
        }
    }, [winChanceInputValue, houseEdge]);

    // Sync display when parent commits a new value (e.g. after a round resolves)
    // Format: 3 decimals if < 1, else 2 decimals, no trailing .00
    const formatInputValue = (val: number) => {
        if (val < 1) return val.toFixed(3).replace(/\.000$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
        if (Number.isInteger(val)) return String(val);
        return val.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
    };
    React.useEffect(() => {
        setTargetInputValue(formatInputValue(targetMultiplier));
    }, [targetMultiplier]);
    React.useEffect(() => {
        setWinChanceInputValue(formatInputValue(winChance));
    }, [winChance]);

    const latestHistoryId = recentMultipliers.length > 0 ? recentMultipliers[recentMultipliers.length - 1].id : -1;
    const previousLatestHistoryIdRef = React.useRef(latestHistoryId);
    const visibleHistory = recentMultipliers.slice(-12);

    React.useEffect(() => {
        if (latestHistoryId !== previousLatestHistoryIdRef.current) {
            previousLatestHistoryIdRef.current = latestHistoryId;
            setIsHistoryAnimating(false);
            setHistoryShiftOffset(HISTORY_CARD_SLOT_WIDTH);
            let frameId2 = 0;
            const frameId1 = requestAnimationFrame(() => {
                frameId2 = requestAnimationFrame(() => {
                    setIsHistoryAnimating(true);
                    setHistoryShiftOffset(0);
                });
            });
            return () => {
                cancelAnimationFrame(frameId1);
                if (frameId2) {
                    cancelAnimationFrame(frameId2);
                }
            };
        }
        previousLatestHistoryIdRef.current = latestHistoryId;
    }, [latestHistoryId]);

    return (
        <div className="limbo-root">
            <div className="limbo-history-strip-wrap">
                <div
                    className={`limbo-history-strip ${isHistoryAnimating ? "limbo-history-strip-animating" : ""}`}
                    style={{ transform: `translateX(${historyShiftOffset}px)` }}
                >
                {visibleHistory.map((entry) => (
                    <div
                        key={`limbo-history-${entry.id}`}
                        className={`limbo-history-pill ${entry.isWin ? "limbo-history-pill-win" : "limbo-history-pill-loss"}`}
                    >
                        {formatMultiplier(entry.multiplier)}
                    </div>
                ))}
                </div>
            </div>

            <div className="limbo-center-stage">
                <p
                    className={`limbo-main-multiplier ${
                        isRolling ? "limbo-main-multiplier-rolling" : isWin === true ? "limbo-main-multiplier-win" : "limbo-main-multiplier-loss"
                    }`}
                >
                    {formatMultiplier(currentMultiplier)}
                </p>
            </div>

            <div className="limbo-bottom-panel">
                <div className="limbo-input-card">
                    <label className="limbo-input-label">Target Multiplier</label>
                    <div className="limbo-input-wrap">
                        <input
                            type="number"
                            min={MIN_TARGET_MULTIPLIER}
                            max={MAX_TARGET_MULTIPLIER}
                            step={0.01}
                            value={targetInputValue}
                            inputMode="decimal"
                            pattern="[0-9.]*"
                            onWheel={e => e.currentTarget.blur()}
                            onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                            onChange={(event) => {
                                let val = event.target.value;
                                val = val.replace(/[^\d.]/g, '');
                                let num = Number(val);
                                if (num > MAX_TARGET_MULTIPLIER) num = MAX_TARGET_MULTIPLIER;
                                // Limit to 3 decimals if < 0.1, else 2 decimals, no trailing .00
                                if (num) {
                                    if (num < 1) {
                                        val = num.toFixed(3).replace(/\.000$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                                    } else if (Number.isInteger(num)) {
                                        val = String(num);
                                    } else {
                                        val = num.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                                    }
                                }
                                setTargetInputValue(val);
                            }}
                            onBlur={() => {
                                let parsed = Number(targetInputValue);
                                if (isNaN(parsed) || parsed < MIN_TARGET_MULTIPLIER) parsed = MIN_TARGET_MULTIPLIER;
                                if (parsed > MAX_TARGET_MULTIPLIER) parsed = MAX_TARGET_MULTIPLIER;
                                parsed = parsed < 1 ? Number(parsed.toFixed(3)) : Number(parsed.toFixed(2));
                                onTargetMultiplierChange(parsed);
                                setTargetInputValue(String(parsed));
                            }}
                            className="limbo-input no-spinner limbo-input-target"
                        />
                        <span className="limbo-input-suffix">x</span>
                    </div>
                </div>

                <div className="limbo-input-card">
                    <label className="limbo-input-label">Win Chance</label>
                    <div className="limbo-input-wrap">
                        <input
                            type="number"
                            min={MIN_WIN_CHANCE}
                            max={MAX_WIN_CHANCE}
                            step={0.01}
                            value={winChanceInputValue}
                            inputMode="decimal"
                            pattern="[0-9.]*"
                            onWheel={e => e.currentTarget.blur()}
                            onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                            onChange={(event) => {
                                let val = event.target.value;
                                val = val.replace(/[^\d.]/g, '');
                                let num = Number(val);
                                if (num > MAX_WIN_CHANCE) num = MAX_WIN_CHANCE;
                                // Limit to 2 decimals, but no trailing .00
                                val = num ? (Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1')) : val;
                                setWinChanceInputValue(val);
                            }}
                            onBlur={() => {
                                let parsed = Number(winChanceInputValue);
                                if (isNaN(parsed) || parsed < MIN_WIN_CHANCE) parsed = MIN_WIN_CHANCE;
                                if (parsed > MAX_WIN_CHANCE) parsed = MAX_WIN_CHANCE;
                                parsed = clampWinChance(Number(parsed.toFixed(2)));
                                onWinChanceChange(parsed);
                                setWinChanceInputValue(String(parsed));
                            }}
                            className="limbo-input no-spinner limbo-input-chance"
                        />
                        <span className="limbo-input-suffix">%</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LimboGameWindow;
