import { Game } from "@/lib/games";

export const rpsGame: Game = {
  title: "Rock Paper Scissors",
  description:
    "Classic Rock Paper Scissors — pick your hand and beat the house! Win for 1.96x, keep going for compounding multipliers up to 1,000,000x!",
  gameAddress: "0x0000000000000000000000000000000000000000",
  gameBackground: "/submissions/rock-paper-scissors/background.png",
  card: "/submissions/rock-paper-scissors/card.png",
  banner: "/submissions/rock-paper-scissors/banner.png",
  themeColorBackground: "#1E88E5",
  payouts: {
    0: { 0: { 0: 0 }, 1: { 0: 0 }, 2: { 0: 196 } },
    1: { 0: { 0: 196 }, 1: { 0: 0 }, 2: { 0: 0 } },
    2: { 0: { 0: 0 }, 1: { 0: 196 }, 2: { 0: 0 } },
  },
};
