import { createGameState } from "../../src/models/game-state";
import { createHandInterpretation } from "../../src/models/hand-interpretation";
import { createStandardGroup } from "../../src/models/standard-group";
import { createStandardPair } from "../../src/models/standard-pair";
import { detectPinfu } from "../../src/yaku/pinfu";
import { describe, it, expect } from "vitest";

describe("detectPinfu", () => {
  it("detects a pinfu hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["1m", "1m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
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

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("pinfu");
  });
  it("does not detect pinfu when the final wait is not rynamen", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "kanchan",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["1m", "1m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["4s", "5s", "6s"],
          type: "run",
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
  it("does not detect pinfu when one of the groups is a set", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["1m", "1m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["4s", "4s", "4s"],
          type: "set",
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
  it("does not detect a pinfu hand when one of the groups is open", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["1m", "1m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["4s", "5s", "6s"],
          type: "run",
          from: "west",
          open: true,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
  it("does not detect a pinfu hand when the pair is a seat-wind", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["2z", "2z"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
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

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
  it("does not detect a pinfu hand when the pair is a round-wind", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["1z", "1z"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
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

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
  it("does not detect a pinfu hand when the pair is a dragon tile", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      pair: createStandardPair({
        tiles: ["5z", "5z"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
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

    const updatedHand = detectPinfu(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).not.toContain("pinfu");
  });
});
