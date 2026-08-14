import type { HandInput, MahjongTile, Ruleset } from "riichi-score";
import type { Rng } from "./rng.js";

type AkaSuit = "manzu" | "pinzu" | "souzu";

const AKA_SUIT: Record<string, AkaSuit | undefined> = {
  "5m": "manzu",
  "5p": "pinzu",
  "5s": "souzu",
};

interface TileSlot {
  tile: MahjongTile;
  suit: AkaSuit;
  replace: (tile: MahjongTile) => void;
}

/**
 * Replace exactly `count` physical fives with reds, respecting the ruleset's
 * per-suit supply. This runs before dora placement so indicator selection sees
 * the red as one of the four physical copies of its ordinary five.
 */
export function placeAka(
  handInput: HandInput,
  count: number,
  ruleset: Ruleset,
  rng: Rng,
): boolean {
  if (!Number.isInteger(count) || count < 0) return false;
  if (count === 0) return true;

  const slots: TileSlot[] = [];
  const addSlots = (tiles: MahjongTile[]): void => {
    tiles.forEach((tile, index) => {
      const suit = AKA_SUIT[tile];
      if (!suit) return;
      slots.push({
        tile,
        suit,
        replace: (red) => {
          tiles[index] = red;
        },
      });
    });
  };

  addSlots(handInput.closedTiles);
  for (const meld of handInput.openMelds ?? []) addSlots(meld.tiles);
  const winningSuit = AKA_SUIT[handInput.winningTile.tile];
  if (winningSuit) {
    slots.push({
      tile: handInput.winningTile.tile,
      suit: winningSuit,
      replace: (red) => {
        handInput.winningTile.tile = red;
      },
    });
  }

  const available = { ...ruleset.akaDora };
  const picked: TileSlot[] = [];
  for (const slot of rng.shuffled(slots)) {
    if (picked.length === count) break;
    if (available[slot.suit] === 0) continue;
    available[slot.suit]--;
    picked.push(slot);
  }
  if (picked.length !== count) return false;

  for (const slot of picked) {
    slot.replace(`0${slot.tile[1]}` as MahjongTile);
  }
  return true;
}
