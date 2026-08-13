export type Suit = "m" | "p" | "s";

/** Rank for suits can be 0..9 (0 for a red 5). */
export type SuitRank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Honor = "z";

/** Honor rank can be 1..7 (East, South, West, North, Haku, Hatsu, Chun). */
export type HonorRank = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SuitTile = `${SuitRank}${Suit}`;

/**
 * An honor tile is like '1z'..'7z'.
 */
export type HonorTile = `${HonorRank}${Honor}`;

/**
 * A MahjongTile can be either a suit tile or an honor tile.
 */
export type MahjongTile = SuitTile | HonorTile;
