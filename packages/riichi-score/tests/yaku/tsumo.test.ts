import { createGameState } from "../../src/models/game-state";
import { createHandInterpretation } from "../../src/models/hand-interpretation";
import { createStandardGroup } from "../../src/models/standard-group";
import { createStandardPair } from "../../src/models/standard-pair";
import { detectMenzenTsumo } from "../../src/yaku/tsumo";
import { describe, it, expect } from "vitest";

describe("detectTanyao", () => {
  it("detects a menzen tsumo hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        isTsumo: true,
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

    const updatedHand = detectMenzenTsumo(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("menzen-tsumo");
  });

  it("does not detect menzen-tsumo on ron", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
        isTsumo: false,
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

    const updatedHand = detectMenzenTsumo(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("menzen-tsumo");
  });

  it("does not detect menzen-tsumo when there's an open group", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        isTsumo: true,
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
          open: true,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectMenzenTsumo(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("menzen-tsumo");
  });
});
