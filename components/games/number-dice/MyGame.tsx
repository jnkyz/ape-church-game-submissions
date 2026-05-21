"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import MyGameWindow from "./MyGameWindow";
import MyGameSetupCard from "./MyGameSetupCard";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import { myGame } from "./myGameConfig";

interface MyGameComponentProps {
    /** Omitted on `/submissions/...` preview routes; config supplies defaults. */
    game?: Game;
}

const MyGameComponent: React.FC<MyGameComponentProps> = ({ game }) => {
    const gameData = game ?? myGame;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");
    const walletBalance = 25;
    const [isGameOngoing, setIsGameOngoing] = React.useState<boolean>(false);
    const [currentView, setCurrentView] = React.useState<0 | 1 | 2>(0);

    const [betAmount, setBetAmount] = React.useState<number>(0);
    const [targetNumber, setTargetNumber] = React.useState<number>(3);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [payout, setPayout] = React.useState<number | null>(null);
    const [gameOver, setGameOver] = React.useState<boolean>(false);
    const [diceValues, setDiceValues] = React.useState<number[]>(Array(9).fill(1));
    const [isRolling, setIsRolling] = React.useState<boolean>(false);
    const [winningLines, setWinningLines] = React.useState<number[][]>([]);
    const [winningIndices, setWinningIndices] = React.useState<Set<number>>(new Set());
    const shouldShowPNL: boolean = !!payout && payout > 0;
    const playAgainText = "Play Again";

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        replayIdString == null
            ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
            : BigInt(replayIdString)
    );
    const [userRandomWord, setUserRandomWord] = useState<Hex>(
        bytesToHex(new Uint8Array(randomBytes(32)))
    );

    useEffect(() => {
        if (replayIdString !== null) {
            if (replayIdString.length > 2) {
                setIsLoading(true);
                setCurrentGameId(BigInt(replayIdString));
            }
        }
    }, [replayIdString]);

    const LINES: number[][] = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];

    const calculateWinConditions = (dice: number[]) => {
        let multiplier = 0;
        const matchedLines: number[][] = [];
        const matchedIndices = new Set<number>();

        const counts: { [key: number]: number } = {};
        dice.forEach(val => {
            counts[val] = (counts[val] || 0) + 1;
        });
        const maxMatches = Math.max(...Object.values(counts));

        for (const line of LINES) {
            if (dice[line[0]] === dice[line[1]] && dice[line[1]] === dice[line[2]]) {
                multiplier += 10;
                matchedLines.push(line);
                line.forEach(i => matchedIndices.add(i));
            }
        }

        if (matchedLines.length === 0) {
            if (maxMatches >= 7) {
                multiplier = 5;
            } else if (maxMatches >= 5) {
                multiplier = 2;
            } else if (maxMatches >= 3) {
                multiplier = 1;
            }

            if (multiplier > 0) {
                const winningVal = Object.entries(counts).find(([, c]) => c === maxMatches)?.[0];
                if (winningVal) {
                    dice.forEach((v, i) => {
                        if (String(v) === winningVal) matchedIndices.add(i);
                    });
                }
            }
        }

        return { multiplier, matchedLines, matchedIndices };
    };

    const playGame = async (
        gameId?: bigint,
        randomWord?: Hex,
    ) => {
        setIsLoading(true);
        setIsGameOngoing(true);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;

        try {
            const receiptSuccess = true;

            if (receiptSuccess) {
                toast.success("Transaction complete!");
                setTimeout(() => {
                    setIsLoading(false);
                    setCurrentView(1);
                }, 1000);
            }
            else {
                console.error("Something went wrong..");
                toast.info("Something went wrong..");
                setIsLoading(false);
                setIsGameOngoing(false);
            }
        }
        catch (error) {
            if (
                (error instanceof Error &&
                    error.message.includes("Transaction not found")) ||
                (typeof error === "string" && error.includes("Transaction not found"))
            ) {
                console.warn("Ignoring a known timeout error.");
                return;
            }

            console.error("An unexpected error occurred:", error);
            toast.error("An unexpected error occurred.");
            setIsLoading(false);
            setIsGameOngoing(false);
        }
    };

    const handleRollDice = () => {
        if (isRolling) {
            return;
        }

        setIsRolling(true);

        const newDice = Array(9).fill(0).map(() => Math.floor(Math.random() * 16) + 1);
        setDiceValues(newDice);

        setTimeout(() => {
            setIsRolling(false);

            const winResult = calculateWinConditions(newDice);
            const totalPayout = betAmount * winResult.multiplier;
            setPayout(totalPayout);
            setWinningLines(winResult.matchedLines);
            setWinningIndices(winResult.matchedIndices);

            setTimeout(() => {
                setCurrentView(2);
                setGameOver(true);
                setIsGameOngoing(false);
            }, 1500);
        }, 1500);
    };

    const handleReset = (isPlayingAgain: boolean = false) => {
        if (isPlayingAgain === false) {
            const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
            const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
            setCurrentGameId(newGameId);
            setUserRandomWord(newUserWord);
        }

        setIsRolling(false);
        setCurrentView(0);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setDiceValues(Array(9).fill(1));
        setWinningLines([]);
        setWinningIndices(new Set());

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
        setCurrentView(1);
        setPayout(null);
        setGameOver(false);
        setIsRolling(false);
        setIsGameOngoing(false);
    };

    return (
        <div>
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 sm:gap-8 lg:gap-10">
                <GameWindow
                    game={gameData}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={gameOver}
                    customHeightMobile="min(100vw, 36rem)"
                    onPlayAgain={handlePlayAgain}
                    playAgainText={playAgainText}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={betAmount}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    resultModalDelayMs={1000}
                >
                    <MyGameWindow
                        game={gameData}
                        diceValues={diceValues}
                        isRolling={isRolling}
                        targetNumber={targetNumber}
                        winningLines={winningLines}
                        winningIndices={winningIndices}
                    />
                </GameWindow>

                <MyGameSetupCard
                    game={gameData}
                    onPlay={async () => await playGame()}
                    onRoll={handleRollDice}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={async () => await handlePlayAgain()}
                    playAgainText={playAgainText}
                    currentView={currentView}
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    targetNumber={targetNumber}
                    setTargetNumber={setTargetNumber}
                    isLoading={isLoading}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    account={undefined}
                    walletBalance={walletBalance}
                    playerAddress={undefined}
                    isGamePaused={false}
                    profile={undefined}
                    minBet={1}
                    maxBet={100}
                />
            </div>
        </div>
    );
};

export default MyGameComponent;
