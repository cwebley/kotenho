import { describe, expect, it } from "vitest";
import type { MahjongTile } from "riichi-score";
import { winFromRun } from "../src/assign.js";
import { createRng } from "../src/rng.js";

describe("winFromRun", () => {
  const cases: [string, MahjongTile[], MahjongTile[]][] = [
    ["123", ["1m", "2m", "3m"], ["1m"]],
    ["234", ["2m", "3m", "4m"], ["2m", "4m"]],
    ["456", ["4m", "5m", "6m"], ["4m", "6m"]],
    ["567", ["5m", "6m", "7m"], ["5m", "7m"]],
    ["678", ["6m", "7m", "8m"], ["6m", "8m"]],
    ["789", ["7m", "8m", "9m"], ["9m"]],
  ];

  it.each(cases)(
    "returns the legal ryanmen endpoints for %s",
    (_, run, expected) => {
      const selected = new Set<MahjongTile>();
      for (let seed = 0; seed < 100; seed++) {
        selected.add(winFromRun(run, "ryanmen", createRng(seed))!);
      }
      expect(selected).toEqual(new Set(expected));
    },
  );

  it("keeps kanchan and penchan deterministic", () => {
    expect(winFromRun(["3m", "4m", "5m"], "kanchan", createRng(1))).toBe("4m");
    expect(winFromRun(["1m", "2m", "3m"], "penchan", createRng(1))).toBe("3m");
    expect(winFromRun(["7m", "8m", "9m"], "penchan", createRng(1))).toBe("7m");
  });
});
