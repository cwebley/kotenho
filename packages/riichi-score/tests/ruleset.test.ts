import { describe, expect, it } from "vitest";
import { createGameState } from "../src/models/game-state";
import { createHandInterpretation } from "../src/models/hand-interpretation";
import { createStandardGroup } from "../src/models/standard-group";
import { createStandardPair } from "../src/models/standard-pair";
import { parseFu } from "../src/parsing/parse-fu";
import { detectTanyao } from "../src/yaku/tanyao";
import { calculateBasicPoints } from "../src/utils/calculate-basic-points";
import { calculate } from "../src/calculate";
import type { MahjongTile } from "../src/models/mahjong-tile";

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

  it("scores a hand won on a red five", () => {
    const analysis = calculate({
      closedTiles: [
        "3m", "4m", "2p", "3p", "4p", "3s", "4s", "5s", "6s", "6s", "6s", "2m", "2m",
      ],
      winningTile: { tile: "0m", isTsumo: true },
      gameState: createGameState(),
    });

    expect(analysis.valid).toBe(true);
    expect(analysis.handInterpretations[0].akadora).toBe(1);
    expect(analysis.handInterpretations[0].yaku.map((yaku) => yaku.name)).toContain("tanyao");
  });

  it("suppresses chiitoitsu's ordinary yaku when it is tsuuiisou", () => {
    const analysis = calculate({
      closedTiles: [
        "1z", "1z", "2z", "2z", "3z", "3z", "4z", "4z", "5z", "5z", "6z", "6z", "7z",
      ],
      winningTile: { tile: "7z", isTsumo: true },
      gameState: createGameState(),
    });

    expect(analysis.handInterpretations[0].yaku.map((yaku) => yaku.name)).toEqual([
      "tsuuiisou",
    ]);
  });

  it("applies configured single-hand double yakuman variants", () => {
    const cases: {
      name: "daisuushii" | "kokushi-musou" | "suuankou" | "chuuren-poutou";
      flag: "daisuushii" | "kokushi13Wait" | "suuankouTanki" | "junseiChuuren";
      closedTiles: MahjongTile[];
      winningTile: MahjongTile;
      tsumo: boolean;
    }[] = [
      {
        name: "daisuushii",
        flag: "daisuushii",
        closedTiles: [
          "1z", "1z", "1z", "2z", "2z", "2z", "3z", "3z", "3z", "4z", "4z", "5m", "5m",
        ],
        winningTile: "4z",
        tsumo: false,
      },
      {
        name: "kokushi-musou",
        flag: "kokushi13Wait",
        closedTiles: [
          "1m", "9m", "1p", "9p", "1s", "9s", "1z", "2z", "3z", "4z", "5z", "6z", "7z",
        ],
        winningTile: "1m",
        tsumo: true,
      },
      {
        name: "suuankou",
        flag: "suuankouTanki",
        closedTiles: [
          "1m", "1m", "1m", "2p", "2p", "2p", "3s", "3s", "3s", "4z", "4z", "4z", "5m",
        ],
        winningTile: "5m",
        tsumo: true,
      },
      {
        name: "chuuren-poutou",
        flag: "junseiChuuren",
        closedTiles: [
          "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "9m", "9m",
        ],
        winningTile: "5m",
        tsumo: true,
      },
    ];

    for (const fixture of cases) {
      const input = (enabled: boolean) => ({
        closedTiles: fixture.closedTiles,
        openMelds: [],
        winningTile: fixture.tsumo
          ? { tile: fixture.winningTile, isTsumo: true as const }
          : { tile: fixture.winningTile, from: "south" as const },
        gameState: createGameState({
          ruleset: { doubleYakuman: { [fixture.flag]: enabled } },
        }),
      });
      const single = calculate(input(false)).handInterpretations[0];
      const doubled = calculate(input(true)).handInterpretations[0];

      expect(single.yaku).toContainEqual({ name: fixture.name, han: 0, limit: "yakuman" });
      expect(single.basicPoints).toBe(8000);
      expect(doubled.yaku).toContainEqual({ name: fixture.name, han: 0, limit: "double-yakuman" });
      expect(doubled.basicPoints).toBe(16000);
    }
  });

  it("stacks a configured double yakuman with a distinct yakuman", () => {
    const analysis = calculate({
      closedTiles: [
        "1z", "1z", "1z", "2z", "2z", "2z", "3z", "3z", "3z", "4z", "4z", "5z", "5z",
      ],
      openMelds: [],
      winningTile: { tile: "4z", from: "south" },
      gameState: createGameState({ ruleset: { doubleYakuman: { daisuushii: true } } }),
    });

    expect(analysis.handInterpretations[0].basicPoints).toBe(24000);
  });
});
