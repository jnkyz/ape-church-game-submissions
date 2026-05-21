import { Game } from "@/lib/games";

export const myGame: Game = {
    title: "HiLo",
    description: "Pick higher or lower and cash out at the right time.",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/hilo/background.png",
    card: "/submissions/hilo/card.png",
    banner: "/submissions/hilo/banner.png",
    advanceToNextStateAsset: "/submissions/hilo/advance-button.png",
    themeColorBackground: "#22c55e",
    song: "/submissions/hilo/audio/song.mp3",
    payouts: {
        0: { 0: { 0: 10000 } },
    },
};

export type GuessDirection = "higher" | "lower" | "same";
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export const HOUSE_EDGE = 0.98;
export const TOTAL_RANKS = 13;

export interface Card {
    rank: number;
    suit: Suit;
}

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANK_LABELS: Record<number, string> = {
    1: "A",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "10",
    11: "J",
    12: "Q",
    13: "K",
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
};

export interface HiloOutcomes {
    higher: number;
    lower: number;
    equal: number;
}

const PRNG_MASK_64 = (BigInt(1) << BigInt(64)) - BigInt(1);
const PRNG_A = BigInt("6364136223846793005");
const PRNG_C = BigInt("1442695040888963407");

const normalizeRandomWord = (randomWord: `0x${string}`): bigint => {
    const parsed = BigInt(randomWord);
    return (parsed & PRNG_MASK_64) || BigInt(1);
};

const nextSeed = (seed: bigint): bigint => ((seed * PRNG_A + PRNG_C) & PRNG_MASK_64) || BigInt(1);

export function createDeckFromRandomWord(randomWord: `0x${string}`, length = 512): Card[] {
    const cards: Card[] = [];
    let seed = normalizeRandomWord(randomWord);

    for (let i = 0; i < length; i += 1) {
        seed = nextSeed(seed);
        const rank = Number(seed % BigInt(TOTAL_RANKS)) + 1;

        seed = nextSeed(seed);
        const suit = SUITS[Number((seed >> BigInt(32)) % BigInt(SUITS.length))];

        cards.push({ rank, suit });
    }

    return cards;
}

export function createShuffledDeck(randomWord: `0x${string}` = "0x1"): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (let rank = 1; rank <= 13; rank += 1) {
            deck.push({ rank, suit });
        }
    }

    let seed = normalizeRandomWord(randomWord);
    for (let i = deck.length - 1; i > 0; i -= 1) {
        seed = nextSeed(seed);
        const j = Number(seed % BigInt(i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

export function getCardLabel(card: Card): string {
    return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

export function getCardRankLabel(card: Card): string {
    return RANK_LABELS[card.rank];
}

export function getOutcomes(currentRank: number, remainingDeck: Card[]): HiloOutcomes {
    const outcomes: HiloOutcomes = { higher: 0, lower: 0, equal: 0 };
    for (const card of remainingDeck) {
        if (card.rank > currentRank) outcomes.higher += 1;
        else if (card.rank < currentRank) outcomes.lower += 1;
        else outcomes.equal += 1;
    }
    return outcomes;
}

export function getStepMultiplier(outs: number, total: number, houseEdge: number): number {
    if (outs <= 0 || total <= 0) return 0;
    return Number(((total / outs) * houseEdge).toFixed(2));
}

export function drawRandomCard(randomWord: `0x${string}` = "0x1", cursor = 0): Card {
    let seed = normalizeRandomWord(randomWord) + BigInt(cursor + 1);
    seed = nextSeed(seed);
    const rank = Number(seed % BigInt(TOTAL_RANKS)) + 1;
    seed = nextSeed(seed);
    const suit = SUITS[Number(seed % BigInt(SUITS.length))];
    return { rank, suit };
}

export function getRankOutcomes(currentRank: number): HiloOutcomes {
    return {
        higher: Math.max(0, TOTAL_RANKS - currentRank),
        lower: Math.max(0, currentRank - 1),
        equal: 1,
    };
}
