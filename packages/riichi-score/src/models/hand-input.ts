import { MahjongTile } from "./mahjong-tile.js";
import { WinningTile } from "./winning-tile.js";
import { GroupType } from "./group-type.js";
import { GameState } from "./game-state.js";
import { Direction } from "./direction.js";

export interface HandInput {
  closedTiles: MahjongTile[];
  openMelds?: Meld[];
  winningTile: WinningTile;
  gameState: GameState;
}

/** Every meld shape that can only exist because a tile was called. */
export type CalledMeldType = Exclude<GroupType, "ankan">;

/**
 * A meld formed by calling a tile another player discarded. It is therefore
 * always open, always has a source seat, and always has one tile that came
 * from outside the hand.
 */
export interface CalledMeld {
  type: CalledMeldType;
  tiles: MahjongTile[];
  /**
   * The seat the called tile came from. For a `run` this is always the
   * winner's kamicha, since chi may only be called from the player on your
   * left; `calculate` rejects any other value.
   */
  from: Direction;
  /**
   * Index into `tiles` of the tile that was called. Tiles need not be sorted —
   * this indexes whatever order the caller supplied.
   *
   * Purely presentational: it decides which tile a renderer lays sideways, and
   * no scoring rule reads it. It is validated rather than merely carried, so a
   * meld that cannot be drawn is an error instead of a silent mis-render.
   */
  calledIndex: number;
}

/**
 * A kan formed entirely from the hand. It was never called, so it has no
 * source seat and no called tile. Those fields are *absent* rather than
 * carrying a sentinel — a concealed kan sourced from another player is not a
 * discouraged input, it is unrepresentable.
 */
export interface ConcealedKan {
  type: "ankan";
  tiles: MahjongTile[];
}

/**
 * Discriminated on `type`, for the same reason `WinningTile` is discriminated
 * on `isTsumo`: never infer whether a meld was called from the presence of a
 * field.
 */
export type Meld = CalledMeld | ConcealedKan;

export interface MeldOptions {
  type: GroupType;
  tiles: MahjongTile[];
  /** Required for every type but `ankan`, which must not supply one. */
  from?: Direction;
  /** Defaults to 0 — the first tile. Ignored for `ankan`. */
  calledIndex?: number;
}

/**
 * Factory function: applies defaults and returns the correct branch of the
 * union, so callers cannot accidentally build a called ankan.
 */
export function createMeld({
  type,
  tiles,
  from,
  calledIndex = 0,
}: MeldOptions): Meld {
  if (type === "ankan") {
    return { type, tiles };
  }
  if (!from) {
    throw new Error(
      `A ${type} meld is formed by calling a tile, so it needs a \`from\` seat.`,
    );
  }
  return { type, tiles, from, calledIndex };
}

/**
 * Takes in a handInput and flattens the tiles so that we can count akadora elsewhere
 */
export function flattenInputTiles(handInput: HandInput): MahjongTile[] {
  if (!handInput.openMelds) {
    handInput.openMelds = [];
  }
  const meldTiles = handInput.openMelds.reduce((acc: MahjongTile[], meld) => {
    acc.push(...meld.tiles);
    return acc;
  }, []);
  return [...handInput.closedTiles, handInput.winningTile.tile, ...meldTiles];
}
