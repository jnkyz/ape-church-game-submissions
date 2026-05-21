import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BetAmountInput from "@/components/shared/BetAmountInput";
const MAX_BET_ROUNDS = 99999;

interface MinesSetupCardProps {
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
    hasActivePackage: boolean;
    packageLocked: boolean;
    manualRoundsRemaining: number;
    manualRoundsPlayed: number;
    payoutCardTitle: string;
    payoutCardValue: number;
    autoTotalPayout: number;
    autoRoundsPlayed: number;
    mineCount: number;
    setMineCount: (count: number) => void;
    onCashOut: () => void;
    canCashOut: boolean;
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

const MinesSetupCard: React.FC<MinesSetupCardProps> = ({
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
    mineCount,
    setMineCount,
    onCashOut,
    canCashOut,
}) => {
    const disabled =
        isLoading ||
        isResolving ||
        (currentView === 1 && !(betMode === "auto" && showStoppedAutoSummary));
    const showAutoProgressCards = isAutoBetting || showStoppedAutoSummary;
    const stakeControlsDisabled = disabled || packageLocked || showAutoProgressCards;
    const minesControlDisabled = disabled || showAutoProgressCards;
    const baseText = "font-[Afacad,sans-serif]";
    const headingText = "font-[Nohemi,sans-serif]";

    const fmt2 = (value: number): string => value.toFixed(2);
    const safeManualRoundsRemaining = Number.isFinite(manualRoundsRemaining)
        ? Math.max(0, Math.floor(manualRoundsRemaining))
        : 0;
    const safeRemainingAutoBets = Number.isFinite(remainingAutoBets)
        ? Math.max(0, Math.floor(remainingAutoBets))
        : 0;
    const [manualRoundsDraft, setManualRoundsDraft] = React.useState(() => String(numberOfSpins));
    const [autoBetsDraft, setAutoBetsDraft] = React.useState(() => String(autoBetCount));
    const [isMineListOpen, setIsMineListOpen] = React.useState(false);
    const mineListRef = React.useRef<HTMLDivElement>(null);
    const manualRoundsCardRef = React.useRef<HTMLDivElement>(null);
    const autoBetsCardRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isMineListOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (mineListRef.current && !mineListRef.current.contains(e.target as Node)) {
                setIsMineListOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isMineListOpen]);

    React.useEffect(() => {
        const mineListElement = mineListRef.current;
        if (!mineListElement) return;

        const handleWheel = (event: WheelEvent) => {
            if (minesControlDisabled) return;
            const listbox = mineListRef.current?.querySelector('[role="listbox"]');
            if (listbox && listbox.contains(event.target as Node)) return;
            event.preventDefault();
            event.stopPropagation();
            const delta = event.deltaY < 0 ? 1 : -1;
            setMineCount(Math.min(24, Math.max(1, mineCount + delta)));
        };

        mineListElement.addEventListener("wheel", handleWheel, { passive: false });
        return () => mineListElement.removeEventListener("wheel", handleWheel);
    }, [minesControlDisabled, setMineCount, mineCount]);

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
        if (stakeControlsDisabled) {
            setIsMineListOpen(false);
        }
    }, [stakeControlsDisabled]);

    React.useEffect(() => {
        const manualCard = manualRoundsCardRef.current;
        if (!manualCard) return;

        const handleWheel = (event: WheelEvent) => {
            if (packageLocked || isAutoBetting) return;
            event.preventDefault();
            event.stopPropagation();
            adjustManualRoundsByWheel(event.deltaY < 0 ? 1 : -1);
        };

        manualCard.addEventListener("wheel", handleWheel, { passive: false });
        return () => manualCard.removeEventListener("wheel", handleWheel);
    }, [packageLocked, isAutoBetting, manualRoundsDraft, numberOfSpins, betMode]);

    React.useEffect(() => {
        const autoCard = autoBetsCardRef.current;
        if (!autoCard) return;

        const handleWheel = (event: WheelEvent) => {
            if (isAutoBetting || showStoppedAutoSummary) return;
            event.preventDefault();
            event.stopPropagation();
            adjustAutoBetsByWheel(event.deltaY < 0 ? 1 : -1);
        };

        autoCard.addEventListener("wheel", handleWheel, { passive: false });
        return () => autoCard.removeEventListener("wheel", handleWheel);
    }, [isAutoBetting, showStoppedAutoSummary, autoBetsDraft, betMode]);

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

    const adjustManualRoundsByWheel = (delta: number): void => {
        if (packageLocked || isAutoBetting) return;
        const parsed = parseInt(manualRoundsDraft, 10);
        const current = Number.isFinite(parsed) ? parsed : numberOfSpins;
        const next = Math.min(MAX_BET_ROUNDS, Math.max(1, current + delta));
        setNumberOfSpins(next);
        setManualRoundsDraft(String(next));
    };

    const adjustAutoBetsByWheel = (delta: number): void => {
        if (isAutoBetting || showStoppedAutoSummary) return;
        const parsed = parseInt(autoBetsDraft, 10);
        const current = Number.isFinite(parsed) ? parsed : autoBetCount;
        const next = Math.min(MAX_BET_ROUNDS, Math.max(1, current + delta));
        setAutoBetCount(next);
        setAutoBetsDraft(String(next));
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
                    <div ref={manualRoundsCardRef}>
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
        <div className="mt-4 flex flex-col gap-3">
            <div ref={autoBetsCardRef}>
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
                        className="w-full px-3 py-2 rounded-lg text-sm hilo-setup-input"
                        style={{
                            color: (isAutoBetting || showStoppedAutoSummary) ? "rgba(255,255,255,0.25)" : undefined,
                            cursor: (isAutoBetting || showStoppedAutoSummary) ? "not-allowed" : "text",
                            opacity: (isAutoBetting || showStoppedAutoSummary) ? 0.5 : 1,
                        }}
                    />
                </div>

            {showAutoProgressCards ? (
                <>
                    {renderManualPayoutCard(true)}
                    {renderManualPayoutCard(true, `Total Payout (${autoRoundsPlayed})`, autoTotalPayout)}
                </>
            ) : (
                <div className="px-3 py-[7px] rounded-lg hilo-setup-summary-box">
                    <p className={`text-sm font-bold text-white ${headingText}`}>
                        Select tiles directly in the game window.
                    </p>
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
                    className="flex rounded-lg overflow-hidden mb-2 hilo-setup-neutral-bg"
                    style={{
                        pointerEvents: (currentView === 1 || isAutoBetting) ? "none" : "auto",
                        opacity: (currentView === 1 || isAutoBetting) ? 0.5 : 1,
                    }}
                >
                    {(["manual", "auto"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setBetMode(mode)}
                            className="flex-1 py-2 text-sm font-semibold transition-all hilo-setup-mode-tab"
                            style={{
                                background: betMode === mode ? "#8CFF00" : "transparent",
                                color: betMode === mode ? "#0d1803" : "rgba(255,255,255,0.6)",
                                cursor: (currentView === 1 || isAutoBetting) ? "not-allowed" : "pointer",
                                borderRadius: mode === "manual" ? "6px 0 0 6px" : "0 6px 6px 0",
                            }}
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

                <div className="mt-1 mb-3" style={{ opacity: minesControlDisabled ? 0.5 : 1 }}>
                    <p className="text-sm font-medium mb-1 hilo-setup-label">Mines</p>
                    <div
                        className="relative"
                        ref={mineListRef}
                    >
                        <button
                            type="button"
                            onClick={() => !minesControlDisabled && setIsMineListOpen((prev) => !prev)}
                            disabled={minesControlDisabled}
                            className="w-full px-3 py-2 rounded-lg text-sm text-left hilo-setup-input"
                            aria-expanded={!minesControlDisabled && isMineListOpen}
                            aria-haspopup="listbox"
                            style={{ cursor: minesControlDisabled ? "not-allowed" : "pointer" }}
                        >
                            <div className="flex items-center justify-between">
                                <span>{mineCount}</span>
                                <span className="text-[#6b8394]">/25</span>
                            </div>
                        </button>

                        {!minesControlDisabled && isMineListOpen && (
                            <div
                                role="listbox"
                                className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-lg border border-[#2f3c46] bg-[#1f2b33] shadow-lg"
                            >
                                {Array.from({ length: 24 }, (_, i) => i + 1).map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        onClick={() => {
                                            setMineCount(count);
                                            setIsMineListOpen(false);
                                        }}
                                        className="block w-full px-3 py-2 text-left text-sm text-[#d8eafa] hover:bg-[#2a3944]"
                                        aria-selected={mineCount === count}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                        )}
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
                                : currentView === 1 ? onCashOut : onStart
                        }
                        disabled={
                            betMode === "auto" && isAutoBetting
                                ? false
                                : betMode === "manual" && currentView === 1
                                    ? !canCashOut
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
                                ? "Cash Out"
                                : hasActivePackage
                                    ? "Start Game"
                                    : `Buy Games (${Math.max(1, liveManualRoundsForSummary)})`}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default MinesSetupCard;
