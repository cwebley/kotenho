import { HandInterpretation } from "../src/models/hand-interpretation";
import { appendMeldsToGroups } from "../src/utils/append-melds-to-groups";
import { describe, it, expect } from "vitest";
import { Meld } from "../src/models/hand-input";
import { createGameState } from "../src/models/game-state";
import { createStandardPair } from "../src/models/standard-pair";
import { createStandardGroup } from "../src/models/standard-group";
import { createHandInterpretation } from "../src/models/hand-interpretation";

describe("appendMeldsToGroups", () => {
  it("appends open melds to a HandInterpretation", () => {
    const ryanmenInterpretation: HandInterpretation = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      pair: createStandardPair({
        tiles: ["5m", "5m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["3m", "4m", "5m"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
      ],
      winningTile: {
        tile: "5m",
        isTsumo: true,
      },
      gameState: createGameState(),
    });

    const openMelds: Meld[] = [
      {
        type: "set",
        tiles: ["7z", "7z", "7z"],
        from: "east",
      },
      {
        type: "run",
        tiles: ["0s", "3s", "4s"],
      },
    ];
    const updatedInterpretation = appendMeldsToGroups(
      openMelds,
      ryanmenInterpretation,
    );
    expect(updatedInterpretation.groups.length).toBe(3);
    expect(updatedInterpretation.groups[1].type).toBe("set");
    expect(updatedInterpretation.groups[2].tiles[0]).toBe("0s");
  });

  it("returns hands with undefined melds by returning the handInterpretation", () => {
    const ryanmenInterpretation: HandInterpretation = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      pair: createStandardPair({
        tiles: ["5m", "5m"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["3m", "4m", "5m"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
      ],
      winningTile: {
        tile: "5m",
        isTsumo: true,
      },
      gameState: createGameState(),
    });

    const updatedInterpretation = appendMeldsToGroups(
      undefined,
      ryanmenInterpretation,
    );
    expect(updatedInterpretation.groups.length).toBe(1);
    expect(updatedInterpretation.groups[0].type).toBe("run");
  });
});
