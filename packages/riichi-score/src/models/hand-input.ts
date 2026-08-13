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

export interface Meld {
  type: GroupType;
  tiles: MahjongTile[];
  from: Direction;
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
