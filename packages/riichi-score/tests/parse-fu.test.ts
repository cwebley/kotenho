import { createGameState } from "../src/models/game-state";
import { createHandInterpretation } from "../src/models/hand-interpretation";
import { createStandardGroup } from "../src/models/standard-group";
import { createStandardPair } from "../src/models/standard-pair";
import { describe, it, expect } from "vitest";
import { parseFu } from "../src/parsing/parse-fu";
import { createChiitoiListing } from "../src/yaku/chiitoi";
import { createKokushiListing } from "../src/yaku/kokushi";
import { createPinfuListing } from "../src/yaku/pinfu";

describe("parse fu", () => {
  it("parses fu for a chiitoi hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: false,
      waitType: "tanki",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      tiles: [
        "1m",
        "1m",
        "3m",
        "3m",
        "4p",
        "4p",
        "9p",
        "9p",
        "5s",
        "5s",
        "1z",
        "1z",
        "6z",
        "6z",
      ],
      yaku: [createChiitoiListing()],
      fuList: [],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("chiitoitsu");
  });

  it("handles kokushi double wind pair", () => {
    const testHand = createHandInterpretation({
      isStandardHand: false,
      waitType: "kokushi-wide",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      tiles: [
        "1m",
        "9m",
        "1p",
        "9p",
        "1s",
        "9s",
        "1z",
        "1z",
        "2z",
        "3z",
        "4z",
        "5z",
        "6z",
        "7z",
      ],
      yaku: [createKokushiListing()],
      fuList: [],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "east",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain(
      "double wind pair",
    );
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("tanki wait");
  });

  it("handles kokushi with yakuhai pair", () => {
    const testHand = createHandInterpretation({
      isStandardHand: false,
      waitType: "kokushi-wide",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      tiles: [
        "1m",
        "9m",
        "1p",
        "9p",
        "1s",
        "9s",
        "1z",
        "1z",
        "2z",
        "3z",
        "4z",
        "5z",
        "6z",
        "7z",
      ],
      yaku: [createKokushiListing()],
      fuList: [],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("yakuhai pair");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("tanki wait");
  });

  it("handles a standard hand with double wind pair", () => {
    // this hand doesnt really have a yaku... but it can still test some fu
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      yaku: [],
      fuList: [],
      pair: createStandardPair({
        tiles: ["1z", "1z"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
          type: "run",
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
        seatWind: "east",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain(
      "double wind pair",
    );
  });

  it("handles a standard hand with penchan wait and simple set", () => {
    // this hand also doesn't have yaku...
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "penchan",
      winningTile: {
        tile: "3m",
        from: "north",
      },
      yaku: [],
      fuList: [],
      pair: createStandardPair({
        tiles: ["4p", "4p"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
        createStandardGroup({
          tiles: ["2p", "3p", "4p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["7p", "8p", "9p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["8m", "8m", "8m"],
          type: "set",
          open: true,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("penchan wait");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain(
      "open triplet of simples",
    );
  });

  it("handles a standard hand with kanchan wait, a simple ankou, and a closed ron", () => {
    // this hand also doesn't have yaku...
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "kanchan",
      winningTile: {
        tile: "2m",
        from: "north",
      },
      yaku: [],
      fuList: [],
      pair: createStandardPair({
        tiles: ["4p", "4p"],
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
          tiles: ["8m", "8m", "8m"],
          type: "set",
          open: false,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("kanchan wait");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain(
      "closed triplet of simples",
    );
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("closed ron");
  });

  it("handles a standard hand with tanki wait, an open honor set, and a tsumo", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "tanki",
      winningTile: {
        tile: "4p",
        isTsumo: true,
      },
      yaku: [],
      fuList: [],
      pair: createStandardPair({
        tiles: ["4p", "4p"],
        isFinalWait: true,
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
          tiles: ["7p", "8p", "9p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["7z", "7z", "7z"],
          type: "set",
          open: true,
          from: "north",
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = parseFu(testHand);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("tanki wait");
    expect(updatedHand.fuList.map((y) => y.reason)).toContain(
      "open triplet of terminals/honors",
    );
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("tsumo");
  });

  it("handles closed pinfu", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "2p",
        isTsumo: true,
      },
      yaku: [createPinfuListing()],
      fuList: [],
      pair: createStandardPair({
        tiles: ["4p", "4p"],
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
          tiles: ["3s", "4s", "5s"],
          type: "run",
          open: true,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const updatedHand = parseFu(testHand);
    console.log("fulist: ", updatedHand.fuList);
    expect(updatedHand.fuList.map((y) => y.reason)).toContain("base");
    expect(updatedHand.fuList.map((y) => y.reason)).not.toContain("tsumo");
  });
});
