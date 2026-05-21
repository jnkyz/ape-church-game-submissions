"use client";

import React, { useRef, useEffect } from "react";
import useSound from 'use-sound';
import { Game } from "@/lib/games";

interface MyGameWindowProps {
    game: Game;
    diceValues: number[];
    isRolling: boolean;
    targetNumber: number;
    winningLines: number[][];
    winningIndices: Set<number>;
}

const DiceTile: React.FC<{
    value: number;
    index: number;
    isRolling: boolean;
    isWinner: boolean;
}> = ({ value, index, isRolling, isWinner }) => {
    const delay = index * 50;

    return (
        <div
            className="relative group"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div
                className={`
                    relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28
                    rounded-xl sm:rounded-2xl
                    flex items-center justify-center
                    transition-all duration-500 ease-out
                    border
                    ${isRolling ? 'animate-pulse' : ''}
                    ${isWinner
                        ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                        : 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/[0.12] hover:border-white/[0.2] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
                    }
                    backdrop-blur-sm
                `}
            >
                {isWinner && (
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-emerald-400/5 animate-pulse" />
                )}

                <span
                    className={`
                        relative z-10
                        text-2xl sm:text-3xl md:text-4xl lg:text-5xl
                        font-mono font-bold tracking-tight
                        transition-all duration-300
                        ${isRolling
                            ? 'text-cyan-300/50 blur-[2px]'
                            : isWinner
                                ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                : 'text-white/90'
                        }
                    `}
                >
                    {isRolling ? '?' : value}
                </span>

                <div className={`
                    absolute top-1 right-1.5 sm:top-1.5 sm:right-2
                    text-[8px] sm:text-[9px] font-mono
                    ${isWinner ? 'text-emerald-400/40' : 'text-white/15'}
                `}>
                    {String(index + 1).padStart(2, '0')}
                </div>
            </div>
        </div>
    );
};

const LINE_LABELS: Record<string, string> = {
    '0,1,2': 'Row 1',
    '3,4,5': 'Row 2',
    '6,7,8': 'Row 3',
    '0,3,6': 'Col 1',
    '1,4,7': 'Col 2',
    '2,5,8': 'Col 3',
    '0,4,8': 'Diag',
    '2,4,6': 'Diag',
};

const WinningLinesOverlay: React.FC<{
    winningLines: number[][];
    gridRef: React.RefObject<HTMLDivElement | null>;
}> = ({ winningLines, gridRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const grid = gridRef.current;
        if (!canvas || !grid || winningLines.length === 0) return;

        const rect = grid.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const tiles = grid.querySelectorAll('[data-tile-index]');
        const centers: { x: number; y: number }[] = [];

        tiles.forEach((tile) => {
            const tileRect = tile.getBoundingClientRect();
            centers.push({
                x: tileRect.left - rect.left + tileRect.width / 2,
                y: tileRect.top - rect.top + tileRect.height / 2,
            });
        });

        if (centers.length < 9) return;

        const colors = [
            'rgba(52, 211, 153, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(251, 191, 36, 0.7)',
            'rgba(244, 114, 182, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(99, 102, 241, 0.7)',
        ];

        winningLines.forEach((line, i) => {
            const start = centers[line[0]];
            const end = centers[line[2]];
            if (!start || !end) return;

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = colors[i % colors.length];
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;
        });
    }, [winningLines, gridRef]);

    if (winningLines.length === 0) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-20 pointer-events-none"
        />
    );
};

const PAYOUT_TABLE = [
    { label: '3 match', payout: '1x' },
    { label: '5 match', payout: '2x' },
    { label: '7 match', payout: '5x' },
    { label: 'Line', payout: '10x' },
];

const MyGameWindow: React.FC<MyGameWindowProps> = ({
    game,
    diceValues,
    isRolling,
    targetNumber,
    winningLines,
    winningIndices,
}) => {
    const muteSfx = false;
    const sfxVolume = 0.5;
    const gridRef = useRef<HTMLDivElement>(null);

    const [winSFX] = useSound('/submissions/number-dice/sfx/win.mp3', {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true
    });
    const [loseSFX] = useSound('/submissions/number-dice/sfx/lose.mp3', {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true
    });

    return (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-white">
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
                <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-7">
                    <div className="text-center">
                        <p className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-cyan-300/60">
                            Match numbers to win
                        </p>
                    </div>

                    <div className="relative">
                        <div ref={gridRef} className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
                            {diceValues.map((value, index) => (
                                <div key={index} data-tile-index={index}>
                                    <DiceTile
                                        value={value}
                                        index={index}
                                        isRolling={isRolling}
                                        isWinner={!isRolling && winningIndices.has(index)}
                                    />
                                </div>
                            ))}
                        </div>
                        <WinningLinesOverlay winningLines={winningLines} gridRef={gridRef} />
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs font-mono tracking-wide">
                        {PAYOUT_TABLE.map(({ label, payout }) => (
                            <span key={label} className="text-white/30">
                                <span className="text-white/50">{label}</span>
                                <span className="mx-1 text-white/20">=</span>
                                <span className="text-cyan-400/50">{payout}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyGameWindow;
