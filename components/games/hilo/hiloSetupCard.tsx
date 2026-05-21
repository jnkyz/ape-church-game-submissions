import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BetAmountInput from "@/components/shared/BetAmountInput";

type RankAction = "lower" | "higher" | "skip";
const MAX_BET_ROUNDS = 99999;

interface MyGameSetupCardProps {
    currentView: 0 | 1 | 2;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    numberOfSpins: number;
    setNumberOfSpins: (rounds: number) => void;
    betMode: "manual" | "auto";
    setBetMode: (mode: "manual" | "auto") => void;
    autoBetCount: number; 
    setAutoBetCount: (count: number) => void;
    isAutoBetting: boolean;
    showStoppedAutoSummary: boolean;
    remainingAutoBets: number;
    autoLowerOrSameRanks: number[];
    setAutoLowerOrSameRanks: (ranks: number[]) => void;
    autoHigherOrSameRanks: number[];
    setAutoHigherOrSameRanks: (ranks: number[]) => void;
    autoSkipRanks: number[];
    setAutoSkipRanks: (ranks: number[]) => void;
    autoAceAction: "higher" | "same" | "skip";
    setAutoAceAction: (action: "higher" | "same" | "skip") => void;
    autoKingAction: "lower" | "same" | "skip";
    setAutoKingAction: (action: "lower" | "same" | "skip") => void;
    autoCashoutMultiplier: number;
    setAutoCashoutMultiplier: (multiplier: number) => void;
    hasActivePackage: boolean;
    packageLocked: boolean;
    manualRoundsRemaining: number;
    manualRoundsPlayed: number;
    payoutCardTitle: string;
    payoutCardValue: number;
    autoTotalPayout: number;
    autoRoundsPlayed: number;
    onStart: () => void;
    onStartAutobet: () => void;
    onResumeAutobet: () => void;
    onBuyAutoRounds: () => void;
    onStopAutobet: () => void;
    isLoading: boolean;
    isResolving: boolean;
    walletBalance: number;
    walletShake: boolean;
    maxPayoutPerGame: number;
    canStartAutobet: boolean;
    autoNeedsRounds: boolean;
}

const MyGameSetupCard: React.FC<MyGameSetupCardProps> = ({
    currentView,
    betAmount,
    setBetAmount,
    numberOfSpins,
    setNumberOfSpins,
    betMode,
    setBetMode,
    autoBetCount,
    setAutoBetCount,
    isAutoBetting,
    showStoppedAutoSummary,
    remainingAutoBets,
    autoLowerOrSameRanks,
    setAutoLowerOrSameRanks,
    autoHigherOrSameRanks,
    setAutoHigherOrSameRanks,
    autoSkipRanks,
    setAutoSkipRanks,
    autoAceAction,
    setAutoAceAction,
    autoKingAction,
    setAutoKingAction,
    autoCashoutMultiplier,
    setAutoCashoutMultiplier,
    hasActivePackage,
    packageLocked,
    manualRoundsRemaining,
    manualRoundsPlayed,
    payoutCardTitle,
    payoutCardValue,
    autoTotalPayout,
    autoRoundsPlayed,
    onStart,
    onStartAutobet,
    onResumeAutobet,
    onBuyAutoRounds,
    onStopAutobet,
    isLoading,
    isResolving,
    walletBalance,
    walletShake,
    maxPayoutPerGame,
    canStartAutobet,
    autoNeedsRounds,
}) => {
    const disabled =
        isLoading ||
        isResolving ||
        (currentView === 1 && !(betMode === "auto" && showStoppedAutoSummary));
    const modeTabsLocked = currentView === 1 || isAutoBetting;
    const showAutoProgressCards = isAutoBetting || showStoppedAutoSummary;
    const stakeControlsDisabled = disabled || packageLocked || showAutoProgressCards;
    const baseText = "font-[Afacad,sans-serif]";
    const headingText = "font-[Nohemi,sans-serif]";

    const fmt2 = (value: number): string => value.toFixed(2);
    const safeManualRoundsRemaining = Number.isFinite(manualRoundsRemaining)
        ? Math.max(0, Math.floor(manualRoundsRemaining))
        : 0;
    const safeRemainingAutoBets = Number.isFinite(remainingAutoBets)
        ? Math.max(0, Math.floor(remainingAutoBets))
        : 0;
    const rankChoices = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const [selectedPaintAction, setSelectedPaintAction] = React.useState<RankAction>("higher");
    const [manualRoundsDraft, setManualRoundsDraft] = React.useState(() => String(numberOfSpins));
    const [autoBetsDraft, setAutoBetsDraft] = React.useState(() => String(autoBetCount));
    const [autoCashoutDraft, setAutoCashoutDraft] = React.useState(() => String(autoCashoutMultiplier));
    const parsedManualRoundsDraft = parseInt(manualRoundsDraft, 10);
    const liveManualRoundsForSummary =
        manualRoundsDraft.trim() === ""
            ? 0
            : Number.isFinite(parsedManualRoundsDraft)
                ? Math.min(MAX_BET_ROUNDS, Math.max(0, parsedManualRoundsDraft))
                : 0;
    const manualTotalBuyIn = betAmount * liveManualRoundsForSummary;
    const parsedAutoBetsDraft = parseInt(autoBetsDraft, 10);
    const liveAutoBetCount = autoBetsDraft.trim() === "" || !Number.isFinite(parsedAutoBetsDraft)
        ? 0
        : Math.min(MAX_BET_ROUNDS, Math.max(1, parsedAutoBetsDraft));
    const liveAutoNeedsRounds = !showAutoProgressCards && liveAutoBetCount > (manualRoundsRemaining ?? 0);

    React.useEffect(() => {
        setManualRoundsDraft(String(numberOfSpins));
    }, [numberOfSpins]);

    React.useEffect(() => {
        setAutoBetsDraft(String(autoBetCount));
    }, [autoBetCount]);

    React.useEffect(() => {
        setAutoCashoutDraft(String(autoCashoutMultiplier));
    }, [autoCashoutMultiplier]);

    const commitManualRoundsDraft = (): void => {
        const parsed = parseInt(manualRoundsDraft, 10);
        const next = Number.isFinite(parsed)
            ? Math.min(MAX_BET_ROUNDS, Math.max(1, parsed))
            : 1;
        setNumberOfSpins(next);
        setManualRoundsDraft(String(next));
    };

    const commitAutoBetsDraft = (): void => {
        const parsed = parseInt(autoBetsDraft, 10);
        const next = Number.isFinite(parsed)
            ? Math.min(MAX_BET_ROUNDS, Math.max(1, parsed))
            : 1;
        setAutoBetCount(next);
        setAutoBetsDraft(String(next));
    };

    const commitAutoCashoutDraft = (): void => {
        const parsed = Number(autoCashoutDraft);
        const next = Number.isFinite(parsed) && parsed > 0 ? Math.max(1.01, parsed) : 2;
        const rounded = Number(next.toFixed(2));
        setAutoCashoutMultiplier(rounded);
        setAutoCashoutDraft(String(rounded));
    };

    const arraysEqual = (a: number[], b: number[]): boolean =>
        a.length === b.length && a.every((value, index) => value === b[index]);

    React.useEffect(() => {
        const normalizedLower: number[] = [];
        const normalizedHigher: number[] = [];
        const normalizedSkip: number[] = [];

        for (let rank = 2; rank <= 12; rank += 1) {
            const wantsSkip = autoSkipRanks.includes(rank);
            const wantsLower = autoLowerOrSameRanks.includes(rank);
            const wantsHigher = autoHigherOrSameRanks.includes(rank);

            let action: RankAction;
            if (wantsSkip) {
                action = "skip";
            } else if (wantsLower && !wantsHigher) {
                action = "lower";
            } else if (wantsHigher && !wantsLower) {
                action = "higher";
            } else {
                action = "skip";
            }

            if (action === "lower") normalizedLower.push(rank);
            if (action === "higher") normalizedHigher.push(rank);
            if (action === "skip") normalizedSkip.push(rank);
        }

        if (!arraysEqual(normalizedLower, autoLowerOrSameRanks)) {
            setAutoLowerOrSameRanks(normalizedLower);
        }
        if (!arraysEqual(normalizedHigher, autoHigherOrSameRanks)) {
            setAutoHigherOrSameRanks(normalizedHigher);
        }
        if (!arraysEqual(normalizedSkip, autoSkipRanks)) {
            setAutoSkipRanks(normalizedSkip);
        }
    }, [
        autoLowerOrSameRanks,
        autoHigherOrSameRanks,
        autoSkipRanks,
        setAutoLowerOrSameRanks,
        setAutoHigherOrSameRanks,
        setAutoSkipRanks,
    ]);

    const getRankAction = (rank: number): RankAction => {
        if (rank === 1) {
            if (autoAceAction === "higher") return "higher";
            if (autoAceAction === "same") return "lower";
            return "skip";
        }

        if (rank === 13) {
            if (autoKingAction === "lower") return "lower";
            if (autoKingAction === "same") return "higher";
            return "skip";
        }

        if (autoSkipRanks.includes(rank)) return "skip";
        if (autoLowerOrSameRanks.includes(rank)) return "lower";
        if (autoHigherOrSameRanks.includes(rank)) return "higher";
        return "skip";
    };

    const setRankAction = (rank: number, nextAction: RankAction): void => {
        const nextLower = autoLowerOrSameRanks.filter((r) => r !== rank);
        const nextHigher = autoHigherOrSameRanks.filter((r) => r !== rank);
        const nextSkip = autoSkipRanks.filter((r) => r !== rank);

        if (nextAction === "lower") {
            setAutoLowerOrSameRanks([...nextLower, rank].sort((a, b) => a - b));
            setAutoHigherOrSameRanks(nextHigher);
            setAutoSkipRanks(nextSkip);
            return;
        }

        if (nextAction === "higher") {
            setAutoLowerOrSameRanks(nextLower);
            setAutoHigherOrSameRanks([...nextHigher, rank].sort((a, b) => a - b));
            setAutoSkipRanks(nextSkip);
            return;
        }

        if (nextAction === "skip") {
            setAutoLowerOrSameRanks(nextLower);
            setAutoHigherOrSameRanks(nextHigher);
            setAutoSkipRanks([...nextSkip, rank].sort((a, b) => a - b));
            return;
        }

        setAutoLowerOrSameRanks(nextLower);
        setAutoHigherOrSameRanks(nextHigher);
        setAutoSkipRanks(nextSkip);
    };

    const canApplyActionToRank = (_action: RankAction, _rank: number): boolean => true;

    const mapPaintActionForRank = (rank: number, action: RankAction): RankAction => {
        if (rank === 1 && action === "lower") {
            // Ace cannot be lower; Lower/Same maps to Same.
            return "lower";
        }
        if (rank === 13 && action === "higher") {
            // King cannot be higher; Higher/Same maps to Same.
            return "higher";
        }
        return action;
    };

    const applyActionToRank = (rank: number): void => {
        if (!canApplyActionToRank(selectedPaintAction, rank)) return;

        if (rank === 1) {
            const nextAceAction =
                selectedPaintAction === "higher"
                    ? "higher"
                    : selectedPaintAction === "lower"
                        ? "same"
                        : "skip";

            if (autoAceAction === nextAceAction) {
                setAutoAceAction("skip");
                return;
            }

            setAutoAceAction(nextAceAction);
            return;
        }

        if (rank === 13) {
            const nextKingAction =
                selectedPaintAction === "lower"
                    ? "lower"
                    : selectedPaintAction === "higher"
                        ? "same"
                        : "skip";

            if (autoKingAction === nextKingAction) {
                setAutoKingAction("skip");
                return;
            }

            setAutoKingAction(nextKingAction);
            return;
        }

        const currentAction = getRankAction(rank);
        const mappedAction = mapPaintActionForRank(rank, selectedPaintAction);

        if (currentAction === mappedAction) {
            setRankAction(rank, "skip");
            return;
        }

        setRankAction(rank, mappedAction);
    };

    const getActionTileClass = (action: RankAction): string => {
        if (action === "higher") return "hilo-setup-rank-tile--higher";
        if (action === "lower") return "hilo-setup-rank-tile--lower";
        return "hilo-setup-rank-tile--skip";
    };

    const renderManualSettings = (): React.ReactElement => (
        <div className="mt-4 flex flex-col gap-3">
            {hasActivePackage ? (
                <div className="mt-1.5 p-2 rounded-lg text-center hilo-setup-neutral-bg">
                    <p className="text-xs text-[#91989C] mb-1">Game Left</p>
                    <p className="hilo-setup-payout-value">
                        {safeManualRoundsRemaining}
                    </p>
                </div>
            ) : (
                <>
                    <div>
                        <p className="text-sm font-medium text-foreground mb-1 hilo-setup-label">Games to Buy</p>
                        <input
                            type="number"
                            min={1}
                            max={MAX_BET_ROUNDS}
                            value={manualRoundsDraft}
                            onChange={(e) => {
                                if (e.target.value.replace(/\D/g, "").length <= 5) setManualRoundsDraft(e.target.value);
                            }}
                            onBlur={commitManualRoundsDraft}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    (e.currentTarget as HTMLInputElement).blur();
                                }
                            }}
                            disabled={packageLocked || isAutoBetting}
                            className="w-full px-3 py-2 rounded-lg text-sm hilo-setup-input"
                        />
                    </div>

                    <div className="px-3 py-[7px] rounded-lg hilo-setup-summary-box">
                        <p className={`text-sm font-bold text-white ${headingText}`}>
                            {fmt2(betAmount)} APE x {liveManualRoundsForSummary} games = {fmt2(manualTotalBuyIn)} APE
                        </p>
                    </div>
                </>
            )}
        </div>
    );

    const renderAutoSettings = (): React.ReactElement => (
        <div className="mt-2.5 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <p className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground hilo-setup-label whitespace-nowrap overflow-hidden">
                        <span className="truncate">Amount of Games</span>
                        {(isAutoBetting || showStoppedAutoSummary) && (
                            <span className="shrink-0 text-xs">({safeRemainingAutoBets} left)</span>
                        )}
                    </p>
                    <input
                        type="number"
                        min={1}
                        max={MAX_BET_ROUNDS}
                        value={(isAutoBetting || showStoppedAutoSummary) ? String(safeRemainingAutoBets) : autoBetsDraft}
                        onChange={(e) => {
                            if (isAutoBetting || showStoppedAutoSummary) return;
                            if (e.target.value.replace(/\D/g, "").length <= 5) setAutoBetsDraft(e.target.value);
                        }}
                        onBlur={() => {
                            if (isAutoBetting || showStoppedAutoSummary) return;
                            commitAutoBetsDraft();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                        disabled={isAutoBetting || showStoppedAutoSummary}
                        className={`w-full px-2.5 py-1 rounded-lg text-sm hilo-setup-input ${(isAutoBetting || showStoppedAutoSummary) ? "hilo-setup-input-disabled" : ""}`}
                    />
                </div>

                <div>
                    <p className="text-sm font-medium text-foreground mb-1 hilo-setup-label">
                        Multiplier
                    </p>
                    <div className="relative">
                        <input
                            type="number"
                            min={1.01}
                            step={0.01}
                            value={autoCashoutDraft}
                            onChange={(e) => {
                                if (isAutoBetting || showStoppedAutoSummary) return;
                                setAutoCashoutDraft(e.target.value);
                            }}
                            onBlur={() => {
                                if (isAutoBetting || showStoppedAutoSummary) return;
                                commitAutoCashoutDraft();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    (e.currentTarget as HTMLInputElement).blur();
                                }
                            }}
                            disabled={isAutoBetting || showStoppedAutoSummary}
                            className={`w-full pl-2.5 pr-7 py-1 rounded-lg text-sm hilo-setup-input ${(isAutoBetting || showStoppedAutoSummary) ? "hilo-setup-input-disabled" : ""}`}
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#9FB2C0]">
                            X
                        </span>
                    </div>
                </div>
            </div>

            {showAutoProgressCards ? (
                <>
                    {renderManualPayoutCard(true)}
                    {renderManualPayoutCard(true, `Total Payout (${autoRoundsPlayed})`, autoTotalPayout)}
                </>
            ) : (
                <div className="mt-2 flex flex-col gap-2">
                    <div>
                        <p className="text-sm font-medium text-foreground mb-1 hilo-setup-label">
                            Auto Card Rules
                        </p>

                        <div className="mb-2 flex items-center gap-2 hilo-setup-label">
                            {([
                                { action: "higher" as const, label: "Higher/Same" },
                                { action: "lower" as const, label: "Lower/Same" },
                                { action: "skip" as const, label: "Skip" },
                            ]).map(({ action, label }) => {
                                const isSelected = selectedPaintAction === action;
                                return (
                                    <button
                                        key={`paint-${action}`}
                                        type="button"
                                        onClick={() => setSelectedPaintAction(action)}
                                        className={`px-2.5 py-1.5 rounded text-[10px] font-semibold leading-none hilo-setup-paint-btn hilo-setup-paint-btn--${action} ${isSelected ? "is-selected" : ""}`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {rankChoices.map((label, idx) => {
                                const rank = idx + 1;
                                const action = getRankAction(rank);
                                const canApply = canApplyActionToRank(selectedPaintAction, rank);
                                return (
                                    <button
                                        key={`auto-rule-${rank}`}
                                        type="button"
                                        onClick={() => applyActionToRank(rank)}
                                        disabled={!canApply}
                                        className={`h-10 rounded-md flex flex-col items-center justify-center hilo-setup-rank-tile ${getActionTileClass(action)} ${canApply ? "" : "is-disabled"}`}
                                    >
                                        <span className="text-[11px] leading-none font-semibold">{label}</span>
                                            {((rank === 1 && action !== "skip") || (rank === 13 && action !== "skip")) && (
                                                <span className="text-[8px] leading-none mt-0.5 font-bold opacity-80">
                                                    {rank === 1
                                                        ? (action === "higher" ? "Higher" : "Same")
                                                        : (action === "lower" ? "Lower" : "Same")}
                                                </span>
                                            )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );

    const renderManualPayoutCard = (compact = false, title = payoutCardTitle, value = payoutCardValue): React.ReactElement => (
        <div className={`${compact ? "mt-1.5" : "mt-3"} p-2 rounded-lg text-center hilo-setup-neutral-bg`}>
            <p className="text-xs text-[#91989C] mb-1">{title}</p>
            <p className="hilo-setup-payout-value">
                {fmt2(value)} APE
            </p>
        </div>
    );

    return (
        <Card className="lg:basis-1/3 p-5 flex flex-col border-[#2A3640] bg-[#1A2328] rounded-xl">
            <CardContent className="p-0">
                <div
                    className={`flex rounded-lg overflow-hidden mb-2 hilo-setup-neutral-bg ${modeTabsLocked ? "hilo-setup-mode-tabs-locked" : ""}`}
                >
                    {(["manual", "auto"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setBetMode(mode)}
                            className={`flex-1 py-2 text-sm font-semibold transition-all hilo-setup-mode-tab hilo-setup-mode-tab--${mode} ${betMode === mode ? "is-active" : ""} ${modeTabsLocked ? "is-locked" : ""}`}
                        >
                            {mode === "manual" ? "Manual" : "Auto"}
                        </button>
                    ))}
                </div>

                <div className="mb-3">
                    <div className={`hilo-bet-slider-shell hilo-wallet-balance-row ${walletShake ? "hilo-wallet-alert" : ""} ${stakeControlsDisabled ? "pointer-events-none" : ""}`}>
                        <BetAmountInput
                            min={1}
                            max={walletBalance}
                            step={0.1}
                            value={betAmount}
                            onChange={stakeControlsDisabled ? () => {} : setBetAmount}
                            balance={walletBalance}
                            usdMode={false}
                            setUsdMode={() => {}}
                            disabled={stakeControlsDisabled}
                            themeColorBackground="#8CFF00"
                        />
                    </div>
                </div>

                {betMode === "manual" ? renderManualSettings() : renderAutoSettings()}
                {betMode === "manual" && (currentView === 1 || hasActivePackage) && renderManualPayoutCard()}
            </CardContent>

            <div className="grow" />

            <CardFooter className="p-0 mt-6">
                <div className="w-full flex flex-col gap-3">
                    <div className={`text-sm text-[#d8eafa] space-y-2 ${baseText}`}>
                        <div className="flex items-center justify-between">
                            <span>Prepaid Games Left</span>
                            <strong className={headingText}>{safeManualRoundsRemaining === 0 ? "0" : `${safeManualRoundsRemaining} x ${betAmount.toFixed(2)} APE`}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Max Bet Per Game</span>
                            <strong className={headingText}>{walletBalance.toFixed(2)} APE</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Max Payout Per Game</span>
                            <strong className={headingText}>{maxPayoutPerGame.toFixed(2)} APE</strong>
                        </div>
                    </div>

                    <Button
                        onClick={
                            betMode === "auto"
                                ? (isAutoBetting ? onStopAutobet : (showStoppedAutoSummary ? onResumeAutobet : (liveAutoNeedsRounds ? onBuyAutoRounds : onStartAutobet)))
                                : onStart
                        }
                        disabled={
                            betMode === "auto" && isAutoBetting
                                ? false
                                : disabled || betAmount <= 0 || (betMode === "auto" && !liveAutoNeedsRounds && !canStartAutobet)
                        }
                        className={`w-full text-base cursor-pointer disabled:cursor-not-allowed ${headingText}`}
                        style={
                            betMode === "auto" && isAutoBetting
                                ? { backgroundColor: "#EF4444", borderColor: "#EF4444", color: "#fff" }
                                : { backgroundColor: "#8CFF00", borderColor: "#8CFF00", color: "#0d1803" }
                        }
                    >
                        {betMode === "auto"
                            ? (isAutoBetting ? "Stop Autobet" : (showStoppedAutoSummary ? "Start Autobet" : (liveAutoNeedsRounds ? `Buy Games (${Math.max(1, liveAutoBetCount - (manualRoundsRemaining ?? 0))})` : "Start Autobet")))
                            : currentView === 1
                                ? "Round Running"
                                : hasActivePackage
                                    ? "Deal First Card"
                                    : `Buy Games (${Math.max(1, liveManualRoundsForSummary)})`}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default MyGameSetupCard;

