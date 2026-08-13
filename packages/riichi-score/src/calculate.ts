import { flattenInputTiles, HandInput } from "./models/hand-input.js";
import { appendMeldsToGroups } from "./utils/append-melds-to-groups.js";
import { rehydrateRedFives } from "./utils/rehydrate-red-fives.js";
import { createGameState } from "./models/game-state.js";
import { createHandInterpretation } from "./models/hand-interpretation.js";
import { HandAnalysis, createHandAnalysis } from "./models/hand-analysis.js";
import { isValidMeld } from "./utils/is-valid-meld.js";
import { isValidTile } from "./utils/is-valid-tile.js";
import { replaceAkadora } from "./utils/replace-akadora.js";
import { tileCompare } from "./utils/tile-compare.js";
import { createKokushiListing, detectKokushiWait } from "./yaku/kokushi.js";
import { createChiitoiListing, detectChiitoi } from "./yaku/chiitoi.js";
import { parseStandardHandCombinations } from "./parsing/standard-hand-combinations.js";
import { interpretWaitsFromGroups } from "./parsing/interpret-waits-from-groups.js";
import { detectStandardYaku } from "./yaku/index.js";
import { detectDeclaredYaku } from "./yaku/declared.js";
import { parseFu } from "./parsing/parse-fu.js";
import { flattenTiles } from "./utils/flatten-tiles.js";
import { countDora } from "./utils/count-dora.js";
import { countRedFives } from "./utils/count-red-fives.js";
import { roundFu } from "./utils/round-fu.js";
import { calculateBasicPoints } from "./utils/calculate-basic-points.js";
import { calcaulateSeatPayments } from "./utils/calculate-seat-payments.js";

export function calculate(handInput: HandInput): HandAnalysis {
  const handAnalysis = createHandAnalysis();

  // verify there's a winningTile
  if (!handInput.winningTile?.tile) {
    handAnalysis.valid = false;
    handAnalysis.errors.push("options.winningTile is not defined");
  }
  if (!handInput.winningTile.from && !handInput.winningTile.isTsumo) {
    handAnalysis.valid = false;
    handAnalysis.errors.push(
      "options.winningTile is neither a `ron` nor a `tsumo`",
    );
  }

  if (!handInput.openMelds) {
    handInput.openMelds = [];
  }

  // verify the hand size is correct
  const numberOfTiles =
    handInput.closedTiles.length + handInput.openMelds.length * 3 + 1; // count each kan as 3 tiles since effectively they are
  if (numberOfTiles !== 14) {
    handAnalysis.valid = false;
    handAnalysis.errors.push(
      `Number of tiles is incorrect. Found ${numberOfTiles}.`,
    );
  }

  // verify all the closed tiles are valid
  const invalidClosedTiles = handInput.closedTiles.filter(
    (tile) => !isValidTile(tile),
  );
  if (invalidClosedTiles.length) {
    handAnalysis.valid = false;
    handAnalysis.errors.push(
      `Some closed tiles are invalid. Invalid tiles: ${invalidClosedTiles}.`,
    );
  }
  if (!isValidTile(handInput.winningTile.tile)) {
    handAnalysis.valid = false;
    handAnalysis.errors.push(
      `Winning tile is invalid. Tile: ${handInput.winningTile.tile}.`,
    );
  }

  // verify all the melds are valid (tiles, count, type)
  const invalidMelds = handInput.openMelds.filter((meld) => !isValidMeld(meld));
  if (invalidMelds.length) {
    handAnalysis.valid = false;
    invalidMelds.forEach((invalidMeld) => {
      handAnalysis.errors.push(
        `Invalid meld of type ${invalidMeld.type}. Tiles: ${invalidMeld.tiles}`,
      );
    });
  }

  // Dora indicators are physical tiles drawn from the same 136-tile set, so
  // they count against the four-copy limit alongside the hand and its melds.
  const normalizedInputTiles = replaceAkadora([
    ...flattenInputTiles(handInput),
    ...(handInput.gameState?.doraIndicators ?? []),
    ...(handInput.gameState?.uradoraIndicators ?? []),
  ]);
  const tileCounts = new Map<string, number>();
  normalizedInputTiles.forEach((tile) => {
    tileCounts.set(tile, (tileCounts.get(tile) ?? 0) + 1);
  });
  const overrepresentedTiles = [...tileCounts].filter(([, count]) => count > 4);
  if (overrepresentedTiles.length) {
    handAnalysis.valid = false;
    handAnalysis.errors.push(
      `A tile appears more than four times: ${overrepresentedTiles
        .map(([tile, count]) => `${tile} (${count})`)
        .join(", ")}.`,
    );
  }

  if (handAnalysis.errors.length) {
    return handAnalysis;
  }

  const gameState = createGameState(handInput.gameState); // sets some default values that we can depend on

  // replace akadora with regular five tiles to make hand analysis easier
  // we'll repopulate them later
  const normalizedClosedTiles = replaceAkadora([
    ...handInput.closedTiles,
    handInput.winningTile.tile,
  ]);

  const sortedClosedTiles = normalizedClosedTiles.sort(tileCompare);

  if (sortedClosedTiles.length === 14) {
    const kokushiWaitType = detectKokushiWait(
      sortedClosedTiles,
      handInput.winningTile,
    );
    if (kokushiWaitType) {
      handAnalysis.handInterpretations.push(
        createHandInterpretation({
          isStandardHand: false,
          tiles: sortedClosedTiles,
          winningTile: handInput.winningTile,
          waitType: kokushiWaitType,
          gameState,
          yaku: [createKokushiListing()],
        }),
      );
    }

    const isChiitoi = detectChiitoi(sortedClosedTiles);
    if (isChiitoi) {
      handAnalysis.handInterpretations.push(
        createHandInterpretation({
          isStandardHand: false,
          tiles: sortedClosedTiles,
          winningTile: handInput.winningTile,
          waitType: "tanki", // chiitoi waits are always tanki
          gameState,
          yaku: [createChiitoiListing()],
        }),
      );
    }
  }

  const waitlessParsedClosedHands =
    parseStandardHandCombinations(sortedClosedTiles);
  const standardHandInterpretations = interpretWaitsFromGroups(
    waitlessParsedClosedHands,
    handInput,
  );

  // add the standard hand interpretations to the kokushi/chiitoi interpretations
  handAnalysis.handInterpretations.push(...standardHandInterpretations);
  if (!handAnalysis.handInterpretations.length) {
    handAnalysis.valid = false;
    handAnalysis.errors.push(
      "Tiles do not form a winning hand: no valid grouping completes with the winning tile.",
    );
    return handAnalysis;
  }

  const closedRedFives = [
    ...handInput.closedTiles,
    handInput.winningTile,
  ].filter((t) => t === "0m" || t === "0p" || t === "0s");

  handAnalysis.handInterpretations.forEach((hi) => {
    rehydrateRedFives(closedRedFives, hi);
  });
  // add the open melds to the parsedGroups
  handAnalysis.handInterpretations.forEach((hi) => {
    appendMeldsToGroups(handInput.openMelds, hi);
  });

  handAnalysis.handInterpretations.forEach((hi) => {
    detectDeclaredYaku(hi);
    detectStandardYaku(hi);
    parseFu(hi);

    const flattenedTiles = flattenTiles(hi);
    hi.gameState.doraIndicators.forEach((doraIndicator) => {
      hi.dora += countDora(doraIndicator, flattenedTiles);
    });
    if (hi.gameState.isRiichi || hi.gameState.isDoubleRiichi) {
      hi.gameState.uradoraIndicators.forEach((uradoraIndicator) => {
        hi.uradora += countDora(uradoraIndicator, flattenedTiles);
      });
    }
    const flattendHandInputTiles = flattenInputTiles(handInput);
    hi.akadora += countRedFives(flattendHandInputTiles);

    hi.han =
      hi.dora +
      hi.uradora +
      hi.akadora +
      hi.yaku.reduce((acc, yaku) => (acc += yaku.han), hi.han);
    // Yakuman stack: suuankou of all honors is both suuankou and tsuuiisou, and
    // is worth two. Three or more is currently still reported as double —
    // representing higher multiples needs the open decision on how limits are
    // expressed.
    const limits = hi.yaku.filter((yaku) => yaku.limit);
    hi.limit =
      limits.length >= 2 ? "double-yakuman" : limits[0]?.limit;

    hi.basicPoints = calculateBasicPoints(hi.han, hi.fu, hi.limit);
    hi.seatPayments = calcaulateSeatPayments(hi);
    hi.totalWinnings = hi.seatPayments.reduce(
      (acc, seat) => (acc += seat.value),
      0,
    );
  });

  // must have a yaku to be a valid winning hand
  handAnalysis.handInterpretations = handAnalysis.handInterpretations.filter(
    (hi) => hi.yaku.length > 0,
  );
  handAnalysis.valid = handAnalysis.handInterpretations.length > 0;
  if (!handAnalysis.valid) {
    handAnalysis.errors.push(
      "Hand has no yaku, so it is not a winning hand. Dora alone cannot win.",
    );
  }

  handAnalysis.handInterpretations.sort(
    (hiA, hiB) => hiB.basicPoints - hiA.basicPoints,
  );

  if (!handAnalysis.valid) {
    return handAnalysis;
  }

  return handAnalysis;
}
