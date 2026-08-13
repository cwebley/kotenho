import { MahjongTile } from "./mahjong-tile.js";
import { Direction } from "./direction.js";
import { GroupType } from "./group-type.js";

/**
 * Options for creating a StandardGroup. Some properties are optional
 * because we have defaults (e.g., open=false, isFinalWait=false).
 */
export interface StandardGroupOptions {
  tiles: MahjongTile[];
  type: GroupType;
  open?: boolean; // defaults to false
  from?: Direction; // only relevant if open is true
  isFinalWait?: boolean; // defaults to false
}

/**
 * The fully-initialized StandardGroup after defaults are applied.
 */
export interface StandardGroup {
  tiles: MahjongTile[];
  type: GroupType;
  open: boolean;
  from?: Direction;
  isFinalWait: boolean;
}

/**
 * Factory function: merges defaults and returns a StandardGroup.
 */
export function createStandardGroup({
  tiles,
  type,
  open = false,
  from,
  isFinalWait = false,
}: StandardGroupOptions): StandardGroup {
  return {
    tiles,
    type,
    open,
    from, // remains undefined if omitted
    isFinalWait,
  };
}
