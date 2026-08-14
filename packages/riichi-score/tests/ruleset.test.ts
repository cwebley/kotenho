import { describe, expect, it } from "vitest";
import { createGameState } from "../src/models/game-state";
import { createHandInterpretation } from "../src/models/hand-interpretation";
import { createStandardGroup } from "../src/models/standard-group";
import { createStandardPair } from "../src/models/standard-pair";
import { parseFu } from "../src/parsing/parse-fu";
import { detectTanyao } from "../src/yaku/tanyao";
import { calculateBasicPoints } from "../src/utils/calculate-basic-points";
import { calculate } from "../src/calculate";

function allRunHand(options: {
  open?: boolean;
  pair?: ["1z", "1z"] | ["2m", "2m"];
  ruleset?: Parameters<typeof createGameState>[0]["ruleset"];
}) {
  return createHandInterpretation({
    isStandardHand: true,
    winningTile: { tile: "4p", from: "north" },
    waitType: "ryanmen",
    gameState: createGameState({
      roundWind: options.pair?.[0] === "1z" ? "east" : undefined,
      seatWind: options.pair?.[0] === "1z" ? "east" : undefined,
      ruleset: options.ruleset,
    }),
    pair: createStandardPair({ tiles: options.pair ?? ["2m", "2m"] }),
    groups: [
      createStandardGroup({ tiles: ["2m", "3m", "4m"], type: "run", open: options.open }),
      createStandardGroup({ tiles: ["2p", "3p", "4p"], type: "run", isFinalWait: true }),
      createStandardGroup({ tiles: ["3s", "4s", "5s"], type: "run" }),
      createStandardGroup({ tiles: ["4s", "5s", "6s"], type: "run" }),
    ],
  });
}

describe("ruleset", () => {
  it("can disable open tanyao without affecting concealed tanyao", () => {
    const open = allRunHand({ open: true, ruleset: { openTanyao: false } });
    const closed = allRunHand({ ruleset: { openTanyao: false } });

    expect(detectTanyao(open).yaku).toEqual([]);
    expect(detectTanyao(closed).yaku.map((yaku) => yaku.name)).toEqual(["tanyao"]);
  });

  it("applies configured fu rules", () => {
    const openPinfu = parseFu(
      allRunHand({ open: true, ruleset: { openPinfuMinimumFu: 20 } }),
    );
    const doubleWind = parseFu(
      allRunHand({
        pair: ["1z", "1z"],
        ruleset: { doubleWindPairFu: 2 },
      }),
    );

    expect(openPinfu.fu).toBe(20);
    expect(doubleWind.fuList).toContainEqual({ reason: "double wind pair", value: 2 });
  });

  it("applies kiriage and kazoe point caps", () => {
    expect(
      calculateBasicPoints(4, 30, 0, { kiriageMangan: false, kazoeYakuman: true }),
    ).toBe(1920);
    expect(
      calculateBasicPoints(4, 30, 0, { kiriageMangan: true, kazoeYakuman: true }),
    ).toBe(2000);
    expect(
      calculateBasicPoints(13, 30, 0, { kiriageMangan: false, kazoeYakuman: false }),
    ).toBe(6000);
  });

  it("enforces configured red-five availability", () => {
    const analysis = calculate({
      closedTiles: Array.from({ length: 13 }, () => "0m" as const),
      winningTile: { tile: "0m", isTsumo: true },
      gameState: createGameState({ ruleset: { akaDora: { manzu: 0 } } }),
    });

    expect(analysis.errors).toContain(
      "Too many red fives in manzu: 14 exceeds the ruleset limit of 0.",
    );
  });
});
