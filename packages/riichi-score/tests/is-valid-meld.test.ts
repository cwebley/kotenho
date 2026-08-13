import { MahjongTile } from "../src/models/mahjong-tile";
import { Meld } from "../src/models/hand-input";
import { isValidMeld } from "../src/utils/is-valid-meld";
import { describe, it, expect } from "vitest";

describe("isValidMeld", () => {
  it("returns false when any tile within the meld is invalid", () => {
    const validChi: Meld = {
      tiles: ["1m", "2g" as MahjongTile, "3m"],
      type: "run",
      from: "east",
    };
    expect(isValidMeld(validChi)).toBe(false);
  });
  it("returns true for valid chi", () => {
    const validChi: Meld = {
      tiles: ["5m", "6m", "7m"],
      type: "run",
      from: "east",
    };
    expect(isValidMeld(validChi)).toBe(true);
  });
  it("returns false for a non-consecutive chi", () => {
    const testChi: Meld = {
      tiles: ["5m", "6m", "9m"],
      type: "run",
      from: "east",
    };
    expect(isValidMeld(testChi)).toBe(false);
  });
  it("returns false for chi that is too long", () => {
    const testChi: Meld = {
      tiles: ["5m", "6m", "7m", "8m"],
      type: "run",
      from: "east",
    };
    expect(isValidMeld(testChi)).toBe(false);
  });
  it("handles a chi with red 5s", () => {
    const testChi: Meld = {
      tiles: ["0m", "6m", "7m"],
      type: "run",
      from: "east",
    };
    expect(isValidMeld(testChi)).toBe(true);
  });

  it("returns true for valid pon", () => {
    const testPon: Meld = {
      tiles: ["5m", "5m", "5m"],
      type: "set",
      from: "east",
    };
    expect(isValidMeld(testPon)).toBe(true);
  });
  it("returns false for a non-identical pon", () => {
    const testPon: Meld = {
      tiles: ["5m", "4m", "5m"],
      type: "set",
      from: "east",
    };
    expect(isValidMeld(testPon)).toBe(false);
  });
  it("returns false for pon that is too long", () => {
    const testPon: Meld = {
      tiles: ["5m", "5m", "5m", "5m"],
      type: "set",
      from: "east",
    };
    expect(isValidMeld(testPon)).toBe(false);
  });
  it("returns true for valid daiminkan", () => {
    const testDaiminkan: Meld = {
      tiles: ["5m", "5m", "5m", "5m"],
      type: "daiminkan",
      from: "east",
    };
    expect(isValidMeld(testDaiminkan)).toBe(true);
  });
  it("returns false for a non-identical daiminkan", () => {
    const testDaiminkan: Meld = {
      tiles: ["5m", "4m", "5m", "5m"],
      type: "daiminkan",
      from: "east",
    };
    expect(isValidMeld(testDaiminkan)).toBe(false);
  });
  it("returns false for daiminkan that is too short", () => {
    const testDaiminkan: Meld = {
      tiles: ["5m", "5m", "5m"],
      type: "daiminkan",
      from: "east",
    };
    expect(isValidMeld(testDaiminkan)).toBe(false);
  });
  it("returns true for valid shouminkan", () => {
    const testShouminkan: Meld = {
      tiles: ["5m", "5m", "5m", "5m"],
      type: "shouminkan",
      from: "east",
    };
    expect(isValidMeld(testShouminkan)).toBe(true);
  });
  it("returns false for a non-identical shouminkan", () => {
    const testShouminkan: Meld = {
      tiles: ["5m", "4m", "5m", "5m"],
      type: "shouminkan",
      from: "east",
    };
    expect(isValidMeld(testShouminkan)).toBe(false);
  });
  it("returns false for shouminkan that is too short", () => {
    const testShouminkan: Meld = {
      tiles: ["5m", "5m", "5m"],
      type: "shouminkan",
      from: "east",
    };
    expect(isValidMeld(testShouminkan)).toBe(false);
  });
  it("returns true for valid ankan", () => {
    const testAnkan: Meld = {
      tiles: ["5m", "5m", "5m", "5m"],
      type: "ankan",
    };
    expect(isValidMeld(testAnkan)).toBe(true);
  });
  it("returns false for a non-identical ankan", () => {
    const testAnkan: Meld = {
      tiles: ["5m", "4m", "5m", "5m"],
      type: "ankan",
    };
    expect(isValidMeld(testAnkan)).toBe(false);
  });
  it("returns false for ankan that is too short", () => {
    const testAnkan: Meld = {
      tiles: ["5m", "5m", "5m"],
      type: "ankan",
    };
    expect(isValidMeld(testAnkan)).toBe(false);
  });
});
