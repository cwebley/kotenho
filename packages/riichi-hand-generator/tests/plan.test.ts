import { describe, expect, it } from "vitest";
import type { Skeleton } from "../src/skeleton.js";
import { planTiles } from "../src/plan.js";
import { createRng } from "../src/rng.js";

const skeleton = (kind: "run" | "triplet"): Skeleton => ({
  shape: "standard",
  blocks: Array.from({ length: 4 }, () => ({
    kind,
    called: false,
    edge: "simple",
  })),
  pair: "plain",
  wait: "ryanmen",
  waitHost: 0,
  tsumo: false,
  fu: 30,
  rawFu: 30,
  menzen: true,
  calledMelds: 0,
  kanCount: 0,
  pinfuShape: kind === "run",
  concealedTriplets: kind === "triplet" ? 4 : 0,
});

describe("planTiles", () => {
  it("varies which run slots carry ittsuu", () => {
    const fixedSlotSets = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const ittsuuSkeleton = skeleton("run");
      ittsuuSkeleton.blocks[0].edge = "terminalRun";
      ittsuuSkeleton.blocks[1].edge = "terminalRun";
      const plan = planTiles(
        ittsuuSkeleton,
        ["ittsuu"],
        "east",
        "south",
        createRng(seed),
      );
      expect(plan).not.toBeNull();
      fixedSlotSets.add([...plan!.fixed.keys()].sort().join(","));
    }
    expect(fixedSlotSets.size).toBeGreaterThan(1);
  });

  it("allows tsuuiisou to use an unused wind or dragon as the pair", () => {
    const pairs = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const plan = planTiles(
        skeleton("triplet"),
        ["tsuuiisou"],
        "east",
        "south",
        createRng(seed),
      );
      expect(plan).not.toBeNull();
      pairs.add(plan!.pair!);
    }
    expect([...pairs].some((tile) => Number(tile[0]) <= 4)).toBe(true);
    expect([...pairs].some((tile) => Number(tile[0]) >= 5)).toBe(true);
  });

  it("varies equal-priority yaku placement independently of input order", () => {
    const placements = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const plan = planTiles(
        skeleton("triplet"),
        ["haku", "hatsu"],
        "east",
        "south",
        createRng(seed),
      );
      expect(plan).not.toBeNull();
      placements.add(
        [...plan!.fixed.entries()]
          .map(([index, tiles]) => `${index}:${tiles[0]}`)
          .sort()
          .join(","),
      );
    }
    expect(placements.size).toBeGreaterThan(1);
  });
});
