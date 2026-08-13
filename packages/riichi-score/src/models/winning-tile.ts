import { MahjongTile } from "./mahjong-tile.js";
import { Direction } from "./direction.js";

interface RonWinningTile {
  tile: MahjongTile;
  from: Direction; // must be present
  isTsumo?: false; // either omitted or false
}

interface TsumoWinningTile {
  tile: MahjongTile;
  from?: undefined; // must be undefined
  isTsumo: true; // must be true
}

// aka `agari hai`
export type WinningTile = RonWinningTile | TsumoWinningTile;
