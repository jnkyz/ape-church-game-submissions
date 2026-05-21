import { Game } from "@/lib/games";

export const myGame: Game = {
    title: "Number Dice",
    description: "Roll 9 dice and match numbers! Get 3 matches for 1x, 5 for 2x, 7 for 5x. Complete a row, column, or diagonal for 10x each. Lines stack!",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/number-dice/background.svg",
    card: "/submissions/number-dice/card.png",
    banner: "/submissions/number-dice/banner.png",
    themeColorBackground: "#0ea5e9",
    song: "/submissions/number-dice/audio/song.mp3",
    payouts: {
        3: { 0: { 0: 1 } },
        5: { 0: { 0: 2 } },
        7: { 0: { 0: 5 } },
        10: { 0: { 0: 10 } },
    },
};