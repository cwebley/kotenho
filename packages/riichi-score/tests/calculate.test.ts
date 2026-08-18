import { describe, it, expect } from "vitest";
import { calculate, createGameState } from "../src/index.js";
import { HandInput } from "../dist/models/hand-input.js";

describe("calculate", () => {
  it("should handle a pinfu only hand (ron)", () => {
    const handInput: HandInput = {
      closedTiles: [
        "1m",
        "2m",
        "3m",
        "9p",
        "9p",
        "1s",
        "2s",
        "3s",
        "3s",
        "4s",
        "5s",
        "7s",
        "8s",
      ],
      openMelds: [],
      winningTile: {
        tile: "9s",
        from: "north",
      },
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
        doraIndicators: [],
        uradoraIndicators: [],
      }),
    };

    const handAnalysis = calculate(handInput);
    expect(handAnalysis.valid).toBe(true);
    expect(handAnalysis.handInterpretations.length).toBe(1);
    expect(handAnalysis.handInterpretations[0].yaku.length).toBe(1);
    expect(handAnalysis.handInterpretations[0].yaku[0].name).toBe("pinfu");
    expect(handAnalysis.handInterpretations[0].basicPoints).toBe(240);
    expect(handAnalysis.handInterpretations[0].seatPayments.length).toBe(1);
    expect(handAnalysis.handInterpretations[0].seatPayments[0].seat).toBe(
      "north",
    );
    expect(handAnalysis.handInterpretations[0].seatPayments[0].value).toBe(
      1000,
    );
    expect(handAnalysis.handInterpretations[0].totalWinnings).toBe(1000);
  });

  it("handles menpin", () => {
    const handInput: HandInput = {
      closedTiles: [
        "1m",
        "2m",
        "3m",
        "9p",
        "9p",
        "1s",
        "2s",
        "3s",
        "3s",
        "4s",
        "5s",
        "7s",
        "8s",
      ],
      openMelds: [],
      winningTile: {
        tile: "9s",
        isTsumo: true,
      },
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
        doraIndicators: [],
        uradoraIndicators: [],
      }),
    };

    const handAnalysis = calculate(handInput);
    expect(handAnalysis.valid).toBe(true);
    expect(handAnalysis.handInterpretations.length).toBe(1);
    expect(handAnalysis.handInterpretations[0].yaku.length).toBe(2);
    const yakuNames = handAnalysis.handInterpretations[0].yaku.map(
      (y) => y.name,
    );
    expect(yakuNames).toContain("pinfu");
    expect(yakuNames).toContain("menzen-tsumo");
    expect(handAnalysis.handInterpretations[0].basicPoints).toBe(320);
    expect(handAnalysis.handInterpretations[0].seatPayments.length).toBe(3);
    const northSeatPayment =
      handAnalysis.handInterpretations[0].seatPayments.filter(
        (s) => s.seat === "north",
      )[0];
    expect(northSeatPayment.value).toBe(400);
    const eastSeatPayment =
      handAnalysis.handInterpretations[0].seatPayments.filter(
        (s) => s.seat === "east",
      )[0];
    expect(eastSeatPayment.value).toBe(700);
    expect(handAnalysis.handInterpretations[0].totalWinnings).toBe(1500);
  });

  it("chooses pinfu over the higher-fu tanki interpretation when riichi is declared", () => {
    const handInput: HandInput = {
      closedTiles: [
        "1p",
        "2p",
        "3p",
        "4p",
        "5p",
        "6p",
        "6p",
        "7p",
        "8p",
        "2m",
        "3m",
        "4m",
        "4m",
      ],
      openMelds: [],
      winningTile: {
        tile: "4m",
        from: "north",
      },
      gameState: createGameState({ isRiichi: true }),
    };

    const handAnalysis = calculate(handInput);

    expect(handAnalysis.valid).toBe(true);
    expect(handAnalysis.handInterpretations).toHaveLength(2);
    expect(handAnalysis.handInterpretations[0]).toMatchObject({
      waitType: "ryanmen",
      han: 2,
      fu: 30,
      basicPoints: 480,
      totalWinnings: 2000,
    });
    expect(handAnalysis.handInterpretations[0].yaku.map((y) => y.name)).toEqual([
      "riichi",
      "pinfu",
    ]);
    expect(handAnalysis.handInterpretations[1]).toMatchObject({
      waitType: "tanki",
      han: 1,
      fu: 40,
      basicPoints: 320,
      totalWinnings: 1300,
    });
    expect(handAnalysis.handInterpretations[1].yaku.map((y) => y.name)).toEqual([
      "riichi",
    ]);
  });

  it("discards the tanki interpretation when it has no yaku", () => {
    const handInput: HandInput = {
      closedTiles: [
        "1p",
        "2p",
        "3p",
        "4p",
        "5p",
        "6p",
        "6p",
        "7p",
        "8p",
        "2m",
        "3m",
        "4m",
        "4m",
      ],
      openMelds: [],
      winningTile: {
        tile: "4m",
        from: "north",
      },
      gameState: createGameState(),
    };

    const handAnalysis = calculate(handInput);

    expect(handAnalysis.valid).toBe(true);
    expect(handAnalysis.handInterpretations).toHaveLength(1);
    expect(handAnalysis.handInterpretations[0]).toMatchObject({
      waitType: "ryanmen",
      han: 1,
      fu: 30,
      basicPoints: 240,
      totalWinnings: 1000,
    });
    expect(handAnalysis.handInterpretations[0].yaku.map((y) => y.name)).toEqual([
      "pinfu",
    ]);
  });
});
