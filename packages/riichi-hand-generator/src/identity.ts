import type { HandInput } from "riichi-score";

/**
 * Identity used for variety measurements and future batch deduplication.
 * Ordering within a multiset does not make a materially different exercise,
 * but meld type/source and indicator sets do.
 */
export function normalizedHandSignature(input: HandInput): string {
  const melds = (input.openMelds ?? [])
    .map(
      (meld) =>
        `${meld.type}:${[...meld.tiles].sort().join(",")}:${meld.from ?? ""}`,
    )
    .sort()
    .join("|");
  const gameState = input.gameState;
  const dora = [...(gameState?.doraIndicators ?? [])].sort().join(",");
  const ura = [...(gameState?.uradoraIndicators ?? [])].sort().join(",");
  const declared = gameState
    ? [
        gameState.isRiichi && "riichi",
        gameState.isDoubleRiichi && "double-riichi",
        gameState.isIppatsu && "ippatsu",
        gameState.isHaitei && "haitei",
        gameState.isHoutei && "houtei",
        gameState.isRinshan && "rinshan",
        gameState.isChankan && "chankan",
        gameState.isTenhou && "tenhou",
        gameState.isChiihou && "chiihou",
      ]
        .filter(Boolean)
        .join(",")
    : "";
  const winning = input.winningTile;

  return [
    [...input.closedTiles].sort().join(","),
    melds,
    `${winning.tile}:${winning.isTsumo ? "tsumo" : `ron:${winning.from ?? ""}`}`,
    dora,
    ura,
    declared,
  ].join("/");
}
