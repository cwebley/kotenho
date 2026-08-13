import { createGameState } from "../../src/models/game-state";
import { createHandInterpretation } from "../../src/models/hand-interpretation";
import { createStandardGroup } from "../../src/models/standard-group";
import { createStandardPair } from "../../src/models/standard-pair";
import { detectYakuhai } from "../../src/yaku/yakuhai";
import { describe, it, expect } from "vitest";

describe("detectYakuhai", () => {
  it("finds and adds round-wind to the yaku of a hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["3s", "3s", "3s"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["1z", "1z", "1z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("round-wind");
  });

  it("finds and adds seat-wind to the yaku of a hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["3s", "3s", "3s"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["2z", "2z", "2z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("seat-wind");
  });

  it("finds and adds double wind yakus", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["3s", "3s", "3s"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["1z", "1z", "1z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "east",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("seat-wind");
    expect(updatedHand.yaku.map((y) => y.name)).toContain("round-wind");
  });

  it("finds and adds haku", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["3s", "3s", "3s"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["5z", "5z", "5z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("haku");
  });

  it("finds and adds hatsu", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["3s", "3s", "3s"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["6z", "6z", "6z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("hatsu");
  });
  it("finds and adds chun", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["3s", "3s", "3s"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["7z", "7z", "7z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("chun");
  });

  it("finds multiple yakuhai", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "shanpon",
      winningTile: {
        tile: "3s",
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
        }),
        createStandardGroup({
          tiles: ["1z", "1z", "1z"],
          type: "set",
          open: false,
        }),
        createStandardGroup({
          tiles: ["7z", "7z", "7z"],
          type: "set",
          open: true,
          from: "west",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "east",
      }),
    });

    const updatedHand = detectYakuhai(testHand);
    expect(updatedHand.yaku.map((y) => y.name)).toContain("round-wind");
    expect(updatedHand.yaku.map((y) => y.name)).toContain("seat-wind");
    expect(updatedHand.yaku.map((y) => y.name)).toContain("chun");
  });
});
