import { Game } from "@/lib/games";

export const DIFFICULTY_MIN = 5;
export const DIFFICULTY_MAX = 95;
export const DIFFICULTY_PRESETS = [10, 25, 50, 75, 90];
export const MIN_BET = 1;
export const MAX_BET = 500;
export const MAX_PROFIT = 1000;
export const SCORE_MIN = 1;
export const SCORE_MAX = 100;

export const METER_COUNT_DURATION_MS = 2000;
export const BAG_DROP_DURATION_MS = 333;
export const PUNCH_ANIMATION_DURATION_MS = 1500;
// The authored impact was frame 31 of the original 60-frame punch.
export const PUNCH_IMPACT_OFFSET_MS = Math.round(
  PUNCH_ANIMATION_DURATION_MS * (31 / 60),
);
// Wade_Punch and Machine_Punch are both 1.5s and start after the bag drop.
export const RESULT_ANIM_DELAY_MS =
  BAG_DROP_DURATION_MS + PUNCH_ANIMATION_DURATION_MS;
export const RESULT_SFX_DUCK_MULTIPLIER = 0.26;
export const RESULT_SFX_RESTORE_DELAY_MS = 260;
export const WIN_SFX_DURATION_MS = 3402;
export const LOSE_SFX_DURATION_MS = 6467;

export interface MegaBonkGameState {
  betAmount: number;
  difficulty: number;
  score: number | null;
  won: boolean | null;
  payout: number | null;
}

export const initialGameState: MegaBonkGameState = {
  betAmount: 0,
  difficulty: 50,
  score: null,
  won: null,
  payout: null,
};

export const getWinChance = (difficulty: number): number => 100 - difficulty;

export const calcPotentialPayout = (betAmount: number, difficulty: number): number => {
  const winChance = getWinChance(difficulty);
  if (winChance <= 0 || betAmount <= 0) return 0;
  return parseFloat(((betAmount * 100) / winChance).toFixed(4));
};

export const megaBonk: Game = {
  title: "Mega Bonk",
  description:
    "Set your target difficulty, place your APE bet, and BONK the machine. Score higher than the target to win!",
  gameAddress: "",
  gameBackground: "/submissions/mega-bonk/background.png",
  card: "/submissions/mega-bonk/card.png",
  banner: "/submissions/mega-bonk/banner.png",
  song: "/submissions/mega-bonk/audio/music.mp3",
  themeColorBackground: "#12181C",
  payouts: {},
};
