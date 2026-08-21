import { describe, expect, it } from "vitest";
import {
  calculate,
  createGameState,
  createMeld,
  KAMICHA,
} from "../src/index.js";
import type {
  CalledMeld,
  HandInterpretation,
  MahjongTile,
  Meld,
} from "../src/index.js";
import { isValidMeld } from "../src/utils/is-valid-meld.js";

/** East seat, so a chi must come from north. Tanyao, tsumo, 3p tanki. */
const handWithCalledRun = (meld: Meld) => ({
  closedTiles: [
    "5s", "6s", "7s", "2s", "3s", "4s", "6p", "7p", "8p", "3p",
  ] as MahjongTile[],
  openMelds: [meld],
  winningTile: { tile: "3p", isTsumo: true } as const,
  gameState: createGameState({ roundWind: "east", seatWind: "east" }),
});

/** Narrows off the interpretation union — only standard hands carry groups. */
const openRunGroup = (interpretation: HandInterpretation) => {
  if (!interpretation.isStandardHand) {
    throw new Error("expected a standard hand interpretation");
  }
  return interpretation.groups.find(
    (group) => group.open && group.type === "run",
  );
};

const run = (calledIndex: number, from = KAMICHA.east): CalledMeld => ({
  type: "run",
  tiles: ["2m", "3m", "4m"],
  from,
  calledIndex,
});

describe("called-tile metadata", () => {
  it("preserves meld tile order and calledIndex through calculate()", () => {
    // The renderer reads these off the parsed group, so the passthrough is a
    // contract, not an implementation detail. Nothing else would catch a sort.
    for (const calledIndex of [0, 1, 2]) {
      const result = calculate({ ...handWithCalledRun(run(calledIndex)) });
      expect(result.valid).toBe(true);

      const group = openRunGroup(result.handInterpretations[0]);

      expect(group?.tiles).toEqual(["2m", "3m", "4m"]);
      expect(group?.calledIndex).toBe(calledIndex);
      expect(group?.from).toBe("north");
    }
  });

  it("does not let calledIndex change the score", () => {
    const scores = [0, 1, 2].map((calledIndex) => {
      const hi = calculate({ ...handWithCalledRun(run(calledIndex)) })
        .handInterpretations[0];
      return `${hi.han}/${hi.fu}/${hi.basicPoints}`;
    });
    expect(new Set(scores).size).toBe(1);
  });

  it("keeps a caller-supplied tile order rather than sorting it", () => {
    const result = calculate({
      ...handWithCalledRun({
        type: "run",
        tiles: ["4m", "2m", "3m"],
        from: KAMICHA.east,
        calledIndex: 0,
      }),
    });

    const group = openRunGroup(result.handInterpretations[0]);
    expect(group?.tiles).toEqual(["4m", "2m", "3m"]);
  });

  it("rejects a calledIndex that points outside the meld", () => {
    expect(isValidMeld(run(3))).toBe(false);
    expect(isValidMeld(run(-1))).toBe(false);
    expect(isValidMeld({ ...run(0), calledIndex: 1.5 })).toBe(false);
    expect(isValidMeld(run(2))).toBe(true);
  });

  it("rejects a chi called from any seat but the caller's kamicha", () => {
    // An east seat can only chi from north. The hand scores identically from
    // any seat, which is exactly why nothing else would reject it.
    for (const from of ["east", "south", "west"] as const) {
      const result = calculate({ ...handWithCalledRun(run(0, from)) });
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes("can only chi from"))).toBe(true);
    }
    expect(calculate({ ...handWithCalledRun(run(0)) }).valid).toBe(true);
  });
});

describe("createMeld", () => {
  it("omits from and calledIndex on a concealed kan", () => {
    const meld = createMeld({ type: "ankan", tiles: ["5m", "5m", "5m", "5m"] });
    expect(meld).toEqual({ type: "ankan", tiles: ["5m", "5m", "5m", "5m"] });
    expect("from" in meld).toBe(false);
    expect("calledIndex" in meld).toBe(false);
  });

  it("ignores a from supplied for a concealed kan", () => {
    const meld = createMeld({
      type: "ankan",
      tiles: ["5m", "5m", "5m", "5m"],
      from: "west",
    });
    expect("from" in meld).toBe(false);
  });

  it("defaults calledIndex to the first tile", () => {
    expect(
      createMeld({ type: "triplet", tiles: ["5s", "5s", "5s"], from: "west" }),
    ).toEqual({
      type: "triplet",
      tiles: ["5s", "5s", "5s"],
      from: "west",
      calledIndex: 0,
    });
  });

  it("throws when a called meld has no source seat", () => {
    expect(() =>
      createMeld({ type: "triplet", tiles: ["5s", "5s", "5s"] }),
    ).toThrow(/needs a `from` seat/);
  });
});
