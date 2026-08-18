import { describe, expect, it } from "vitest";
import type { Direction, MahjongTile } from "riichi-score";
import { generate } from "../src/generate.js";
import type { GenerateSpec } from "../src/types.js";

/** The player to your left — the only one you may chi from. */
const KAMICHA: Record<Direction, Direction> = {
  east: "north",
  south: "east",
  west: "south",
  north: "west",
};

const allTiles = (hand: {
  handInput: {
    closedTiles: readonly string[];
    winningTile: { tile: string };
    openMelds?: readonly { tiles: readonly string[] }[];
  };
}): string[] => [
  ...hand.handInput.closedTiles,
  hand.handInput.winningTile.tile,
  ...(hand.handInput.openMelds ?? []).flatMap((meld) => [...meld.tiles]),
];

/** Multiset containment: every pinned tile is physically in the hand. */
const contains = (hand: string[], group: string[]): boolean => {
  const pool = [...hand];
  return group.every((tile) => {
    const at = pool.indexOf(tile);
    if (at === -1) return false;
    pool.splice(at, 1);
    return true;
  });
};

const hands = (spec: GenerateSpec, count = 12, seed = 17) => {
  const result = generate(spec, { count, seed, budget: 60000 });
  if (result.status !== "ok" && result.status !== "shortfall") {
    throw new Error(
      `expected hands, got ${result.status}: ${"reason" in result ? result.reason : ""}`,
    );
  }
  expect(result.hands.length).toBeGreaterThan(0);
  return result.hands;
};

describe("requiredGroups", () => {
  it("puts every pinned group in the hand", () => {
    for (const hand of hands({
      requiredGroups: ["234p", "567p"],
      yaku: ["riichi"],
      yakuPolicy: "atLeast",
    })) {
      const tiles = allTiles(hand);
      expect(contains(tiles, ["2p", "3p", "4p"])).toBe(true);
      expect(contains(tiles, ["2p", "3p", "4p", "5p", "6p", "7p"])).toBe(true);
    }
  });

  it("accepts the explicit spelling as well as the compact one", () => {
    for (const hand of hands({
      requiredGroups: ["2p3p4p"],
      yaku: ["riichi"],
      yakuPolicy: "atLeast",
    })) {
      expect(contains(allTiles(hand), ["2p", "3p", "4p"])).toBe(true);
    }
  });

  it("wins on the pinned tile, and puts the sanmenchan shape in the hand", () => {
    for (const hand of hands({
      requiredGroups: ["234p", "567p"],
      requiredWinningTile: "7p",
      yaku: ["riichi"],
      yakuPolicy: "atLeast",
    })) {
      expect(hand.handInput.winningTile.tile).toBe("7p");
      // 23456p must be held before the win: that is the 1p/4p/7p wait.
      expect(
        contains([...hand.handInput.closedTiles], [
          "2p",
          "3p",
          "4p",
          "5p",
          "6p",
        ]),
      ).toBe(true);
    }
  });

  it("pins the pair", () => {
    for (const hand of hands({
      requiredGroups: ["234p", "567p"],
      requiredPair: "77p",
      requiredWinningTile: "7p",
      yaku: ["riichi"],
      yakuPolicy: "atLeast",
    })) {
      const closed = [...hand.handInput.closedTiles];
      expect(contains(closed, ["7p", "7p"])).toBe(true);
      expect(hand.handInput.winningTile.tile).toBe("7p");
    }
  });

  it("derives the wait from the group the winning tile completes", () => {
    const penchan = hands({
      requiredGroups: ["789p"],
      requiredWinningTile: "7p",
      waitType: "penchan",
      yaku: ["riichi"],
      yakuPolicy: "atLeast",
    });
    for (const hand of penchan) {
      expect(hand.canonical.waitType).toBe("penchan");
      expect(hand.handInput.winningTile.tile).toBe("7p");
    }

    const shanpon = hands({
      requiredGroups: ["555m"],
      requiredWinningTile: "5m",
      waitType: "shanpon",
      yaku: ["riichi"],
      yakuPolicy: "atLeast",
    });
    for (const hand of shanpon) {
      expect(hand.canonical.waitType).toBe("shanpon");
      expect(hand.handInput.winningTile.tile).toBe("5m");
    }
  });

  it("emits a pinned called group as an open meld", () => {
    for (const hand of hands({
      requiredGroups: [{ tiles: "234p", called: true }, "567p"],
      requiredWinningTile: "7p",
      yaku: ["tanyao"],
      yakuPolicy: "atLeast",
    })) {
      const melds = hand.handInput.openMelds ?? [];
      expect(
        melds.some(
          (meld) =>
            meld.type === "run" &&
            [...meld.tiles].sort().join("") === ["2p", "3p", "4p"].sort().join(""),
        ),
      ).toBe(true);
    }
  });

  it("honours a pinned meld type, including shouminkan", () => {
    // daiminkan and shouminkan are called, so they break menzen — tanyao is a
    // yaku all three kan types can carry.
    for (const type of ["ankan", "daiminkan", "shouminkan"] as const) {
      for (const hand of hands(
        {
          requiredGroups: [{ tiles: "5555s", meldType: type }],
          yaku: ["tanyao"],
          yakuPolicy: "atLeast",
          doraIndicatorCount: 2,
        },
        4,
      )) {
        const kan = (hand.handInput.openMelds ?? []).find((meld) =>
          meld.tiles.every((tile) => tile === "5s"),
        );
        expect(kan?.type).toBe(type);
      }
    }
  });

  it("rejects a spec whose pins cannot be satisfied", () => {
    const cases: [GenerateSpec, RegExp][] = [
      [{ requiredGroups: ["135p"] }, /not a run, triplet, or kan/],
      [{ requiredGroups: ["0p5p5p"] }, /red five/],
      [{ requiredGroups: ["555p", "555p"], requiredPair: "55p" }, /5 copies/],
      [
        { requiredGroups: [{ tiles: "234p", meldType: "ankan" }] },
        /needs a kan/,
      ],
      // A kan is never completed by the winning tile, and you cannot win into a call.
      [{ requiredGroups: ["5555p"], requiredWinningTile: "5p" }, /must complete/],
      [
        {
          requiredGroups: [{ tiles: "234p", called: true }],
          requiredWinningTile: "4p",
        },
        /must complete/,
      ],
      [{ requiredGroups: ["234p"], requiredWinningTile: "9s" }, /must complete/],
    ];
    for (const [spec, reason] of cases) {
      const result = generate(spec, { seed: 1, budget: 200 });
      expect(result.status).toBe("unsatisfiable");
      if (result.status === "unsatisfiable") {
        expect(result.reason).toMatch(reason);
      }
    }
  });

  it("still verifies every generated hand against the rest of the spec", () => {
    for (const hand of hands({
      requiredGroups: ["234p", "567p"],
      requiredWinningTile: "7p",
      yaku: ["riichi", "pinfu"],
      yakuPolicy: "exact",
      closed: true,
    })) {
      expect(hand.canonical.yaku.map((yaku) => yaku.name).sort()).toEqual([
        "pinfu",
        "riichi",
      ]);
    }
  });
});

describe("called melds", () => {
  it("only ever calls a chi from the player to the left", () => {
    let chi = 0;
    for (const hand of hands(
      { openMeldCount: 2, yaku: ["tanyao"], yakuPolicy: "atLeast" },
      40,
      5,
    )) {
      const seat = hand.handInput.gameState!.seatWind as Direction;
      for (const meld of hand.handInput.openMelds ?? []) {
        if (meld.type !== "run") continue;
        chi++;
        expect(meld.from).toBe(KAMICHA[seat]);
      }
    }
    expect(chi).toBeGreaterThan(0);
  });

  it("keeps a concealed kan attributed to the winner", () => {
    for (const hand of hands(
      { kanCount: 1, closed: true, doraIndicatorCount: 2 },
      8,
    )) {
      for (const meld of hand.handInput.openMelds ?? []) {
        if (meld.type !== "ankan") continue;
        expect(meld.from).toBe(hand.handInput.gameState!.seatWind);
      }
    }
  });
});

describe("four-copy pressure", () => {
  it("never asks for a fifth copy of a tile", () => {
    for (const hand of hands(
      { requiredGroups: ["234p", "567p"], requiredWinningTile: "7p" },
      30,
      9,
    )) {
      const counts = new Map<string, number>();
      for (const tile of allTiles(hand)) {
        const key: string = tile[0] === "0" ? `5${tile[1]}` : tile;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      for (const [tile, count] of counts) {
        expect(count, `${tile} appears ${count} times`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("keeps kan tiles spread across suits when a suit is already pinned", () => {
    // The pinned 234p/567p hold one copy of 2p-7p, so a pinzu kan of those
    // ranks is impossible. Counting-blind sampling used to pick them anyway and
    // throw the whole assignment away, starving pinzu of kans.
    const suits = new Map<string, number>();
    for (const hand of hands(
      {
        requiredGroups: ["234p", "567p"],
        requiredWinningTile: "7p",
        kanCount: 1,
        doraIndicatorCount: 2,
      },
      60,
      3,
    )) {
      for (const meld of hand.handInput.openMelds ?? []) {
        if (!meld.type.includes("kan")) continue;
        const suit = meld.tiles[0][1] as string;
        suits.set(suit, (suits.get(suit) ?? 0) + 1);
      }
    }
    // Pinzu kans are still possible (8p, 9p, 1p and the honors are untouched),
    // so the suit must not be wiped out entirely.
    expect(suits.size).toBeGreaterThan(1);
  });
});

describe("avoidDuplicateRuns", () => {
  it("allows duplicate runs in an open hand, where iipeiko cannot form", () => {
    const signature = (tiles: readonly MahjongTile[]): string =>
      [...tiles].map((t) => (t[0] === "0" ? `5${t[1]}` : t)).sort().join("");
    let withDuplicates = 0;
    const generated = hands(
      { yaku: ["haku"], yakuPolicy: "exact", openMeldCount: 1 },
      120,
      909,
    );
    for (const hand of generated) {
      const runs = hand.canonical.groups
        .filter((group) => group.type === "run")
        .map((group) => signature(group.tiles));
      if (new Set(runs).size !== runs.length) withDuplicates++;
    }
    expect(withDuplicates).toBeGreaterThan(0);
  });

  it("still keeps duplicate runs out of an exact concealed spec", () => {
    for (const hand of hands(
      { yaku: ["tanyao"], yakuPolicy: "exact", closed: true },
      30,
      11,
    )) {
      expect(hand.canonical.yaku.map((yaku) => yaku.name)).not.toContain(
        "iipeiko",
      );
    }
  });
});
