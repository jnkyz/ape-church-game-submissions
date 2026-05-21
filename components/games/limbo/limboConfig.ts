import { Game } from "@/lib/games";

export const limboGame: Game = {
    title: "Limbo",
    description: "Set a target multiplier and try to hit it.",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/limbo/background.png",
    card: "/submissions/limbo/card.png",
    banner: "/submissions/limbo/banner.png",
    advanceToNextStateAsset: "/submissions/limbo/arrow_white.svg",
    themeColorBackground: "#22c55e",
    song: "/submissions/limbo/audio/song.mp3",
    payouts: {
        0: { 0: { 0: 10000 } },
    },
};

export const HOUSE_EDGE = 0.98;
export const MIN_TARGET_MULTIPLIER = 1.01;
export const MAX_TARGET_MULTIPLIER = 1000;
export const MIN_WIN_CHANCE = 0.01;
export const MAX_WIN_CHANCE = 98;
export const MAX_ROLL_MULTIPLIER = 1000;

const PRNG_MASK_64 = (BigInt(1) << BigInt(64)) - BigInt(1);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clampTargetMultiplier = (value: number) =>
    clamp(Number.isFinite(value) ? value : MIN_TARGET_MULTIPLIER, MIN_TARGET_MULTIPLIER, MAX_TARGET_MULTIPLIER);

export const clampWinChance = (value: number) =>
    clamp(Number.isFinite(value) ? value : MIN_WIN_CHANCE, MIN_WIN_CHANCE, MAX_WIN_CHANCE);

export const getWinChanceForTarget = (targetMultiplier: number, houseEdge = HOUSE_EDGE) => {
    const target = clampTargetMultiplier(targetMultiplier);
    const chance = (houseEdge / target) * 100;
    return Number(clampWinChance(chance).toFixed(8));
};

export const getTargetForWinChance = (winChance: number, houseEdge = HOUSE_EDGE) => {
    const clampedChance = clampWinChance(winChance);
    const target = houseEdge / (clampedChance / 100);
    return Number(clampTargetMultiplier(target).toFixed(2));
};

const randomWordToUnit = (randomWord: `0x${string}`): number => {
    const parsed = BigInt(randomWord) & PRNG_MASK_64;
    const normalized = Number(parsed) / Number(PRNG_MASK_64);
    return clamp(normalized, Number.EPSILON, 1 - Number.EPSILON);
};

export const drawLimboMultiplierFromWord = (randomWord: `0x${string}`, houseEdge = HOUSE_EDGE) => {
    const unit = randomWordToUnit(randomWord);
    const raw = houseEdge / unit;
    return clamp(raw, 1, MAX_ROLL_MULTIPLIER);
};