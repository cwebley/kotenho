import { createGameState } from "../../src/models/game-state";
import { createHandInterpretation } from "../../src/models/hand-interpretation";
import { createStandardGroup } from "../../src/models/standard-group";
import { createStandardPair } from "../../src/models/standard-pair";
import { detectTanyao } from "../../src/yaku/tanyao";
import { describe, it, expect } from "vitest";

describe("detectTanyao", () => {
  it("detects a tanyao hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["2m", "2m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["2m", "3m", "4m"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["2p", "3p", "4p"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
        createStandardGroup({
          tiles: ["6p", "6p", "6p"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["4s", "5s", "6s"],
          type: "run",
          open: false,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectTanyao(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("tanyao");
  });
  it("does not detect tanyao when the final wait it finds a terminal", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["2m", "2m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["2m", "3m", "4m"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["2p", "3p", "4p"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
        createStandardGroup({
          tiles: ["6p", "6p", "6p"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["4s", "5s", "6s"],
          type: "run",
          open: false,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectTanyao(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
  it("does not detect tanyao when it finds an honor tiles", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["6z", "6z"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["2m", "3m", "4m"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["2p", "3p", "4p"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
        createStandardGroup({
          tiles: ["6p", "6p", "6p"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["4s", "5s", "6s"],
          type: "run",
          open: false,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectTanyao(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("tanyao");
  });
});
