import { MahjongTile } from "../../src/models/mahjong-tile.ts";
import { WinningTile } from "../../src/models/winning-tile.ts";
import { detectKokushiWait } from "../../src/yaku/kokushi.ts";
import { describe, it, expect } from "vitest";

describe("detectKokushiWait", () => {
  it("returns a the correct kokushi-single wait type", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "1m",
      "9m",
      "1p",
      "9p",
      "1s",
      "9s",
      "1z",
      "2z",
      "3z",
      "4z",
      "5z",
      "6z",
      "7z",
    ];
    const winningTile: WinningTile = {
      tile: "9m",
    };
    const kokushiWaitType = detectKokushiWait(testHand, winningTile);
    expect(kokushiWaitType).toBeTruthy();
    expect(kokushiWaitType).toBe("kokushi-single");
  });

  it("returns a the correct kokushi-wide wait type", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "1m",
      "9m",
      "1p",
      "9p",
      "1s",
      "9s",
      "1z",
      "2z",
      "3z",
      "4z",
      "5z",
      "6z",
      "7z",
    ];
    const winningTile: WinningTile = {
      tile: "1m",
    };
    const kokushiWaitType = detectKokushiWait(testHand, winningTile);
    expect(kokushiWaitType).toBeTruthy();
    expect(kokushiWaitType).toBe("kokushi-wide");
  });

  it("returns false when its not a valid kokushi hand", () => {
    const testHand: MahjongTile[] = [
      "1m",
      "2m",
      "9m",
      "1p",
      "9p",
      "1s",
      "9s",
      "1z",
      "2z",
      "3z",
      "4z",
      "5z",
      "6z",
      "7z",
    ];
    const winningTile: WinningTile = {
      tile: "1m",
    };
    const kokushiWaitType = detectKokushiWait(testHand, winningTile);
    expect(kokushiWaitType).toBe(false);
  });
});
