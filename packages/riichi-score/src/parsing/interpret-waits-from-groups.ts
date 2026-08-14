import { HandInput } from "../models/hand-input.js";
import { isTerminalTile } from "../utils/is-terminal-tile.js";
import {
  createHandInterpretation,
  HandInterpretation,
} from "../models/hand-interpretation.js";
import { ParsedClosedTiles } from "./standard-hand-combinations.js";
import { createStandardPair } from "../models/standard-pair.js";
import { createStandardGroup } from "../models/standard-group.js";
import { createGameState } from "../models/game-state.js";

export function interpretWaitsFromGroups(
  waitlessHandInterpretations: ParsedClosedTiles[],
  handInput: HandInput,
): HandInterpretation[] {
  const allHandInterpretations: HandInterpretation[] = [];
  // Groups have been normalized to ordinary fives for parsing. Keep the original
  // winning tile on the result, but compare against its normalized identity.
  const winningTile =
    handInput.winningTile.tile[0] === "0"
      ? (`5${handInput.winningTile.tile[1]}` as typeof handInput.winningTile.tile)
      : handInput.winningTile.tile;
  // we need to account for the wait since it impacts the scoring
  // each wait that is different gives us another hand interpretation
  // loop through the pair and all the groups for each waitlessHandInterpretation to look for the winningTile.
  waitlessHandInterpretations.forEach((whi) => {
    if (whi.pair.tiles[0] === winningTile) {
      // found a single tile wait (tanki) interpretation
      allHandInterpretations.push(
        createHandInterpretation({
          isStandardHand: true,
          waitType: "tanki",
          pair: createStandardPair({ ...whi.pair, isFinalWait: true }),
          groups: [...whi.groups],
          winningTile: handInput.winningTile,
          gameState: createGameState(handInput.gameState),
        }),
      );
    }

    whi.groups.forEach((parsedGroup, i) => {
      if (parsedGroup.tiles.includes(winningTile)) {
        if (parsedGroup.tiles[0] === parsedGroup.tiles[1]) {
          allHandInterpretations.push(
            createHandInterpretation({
              isStandardHand: true,
              waitType: "shanpon",
              pair: { ...whi.pair },
              groups: [
                ...whi.groups.slice(0, i),
                createStandardGroup({
                  ...parsedGroup,
                  isFinalWait: true,
                }),
                ...whi.groups.slice(i + 1),
              ],
              winningTile: handInput.winningTile,
              gameState: createGameState(handInput.gameState),
            }),
          );
          return;
        }

        if (parsedGroup.tiles[1] === winningTile) {
          allHandInterpretations.push(
            createHandInterpretation({
              isStandardHand: true,
              waitType: "kanchan",
              pair: { ...whi.pair },
              groups: [
                ...whi.groups.slice(0, i),
                createStandardGroup({
                  ...parsedGroup,
                  isFinalWait: true,
                }),
                ...whi.groups.slice(i + 1),
              ],
              winningTile: handInput.winningTile,
              yaku: [],
              fuList: [],
              gameState: createGameState(handInput.gameState),
              dora: 0,
              akadora: 0,
              uradora: 0,
            }),
          );
          return;
        }

        if (
          (isTerminalTile(parsedGroup.tiles[0]) ||
            isTerminalTile(parsedGroup.tiles[2])) &&
          !isTerminalTile(winningTile)
        ) {
          allHandInterpretations.push(
            createHandInterpretation({
              isStandardHand: true,
              waitType: "penchan",
              pair: { ...whi.pair },
              groups: [
                ...whi.groups.slice(0, i),
                createStandardGroup({
                  ...parsedGroup,
                  isFinalWait: true,
                }),
                ...whi.groups.slice(i + 1),
              ],
              winningTile: handInput.winningTile,
              yaku: [],
              fuList: [],
              gameState: createGameState(handInput.gameState),
              dora: 0,
              akadora: 0,
              uradora: 0,
            }),
          );
          return;
        }
        allHandInterpretations.push(
          createHandInterpretation({
            isStandardHand: true,
            waitType: "ryanmen",
            pair: { ...whi.pair },
            groups: [
              ...whi.groups.slice(0, i),
              createStandardGroup({
                ...parsedGroup,
                isFinalWait: true,
              }),
              ...whi.groups.slice(i + 1),
            ],
            winningTile: handInput.winningTile,
            yaku: [],
            fuList: [],
            gameState: createGameState(handInput.gameState),
            dora: 0,
            akadora: 0,
            uradora: 0,
          }),
        );
      }
    });
  });
  return allHandInterpretations;
}
