import { generate } from "../dist/index.js";
import { formatTiles } from "riichi-score";

// Change these to explore different lesson shapes.
const spec = {
  yaku: ["honroutou", "toitoi"],
  han: 6,
};

const options = {
  count: 10,
  seed: 7,
  budget: 1_000,
};

const result = generate(spec, options);

if (result.status === "unsatisfiable") {
  throw new Error(`Spec is unsatisfiable: ${result.reason}`);
}
if (result.status === "exhausted") {
  throw new Error(
    `No hand found after ${result.attempts} attempts: ${JSON.stringify(result.rejections)}`,
  );
}

console.log(
  result.status === "ok"
    ? `Generated ${result.hands.length} distinct hands`
    : `Shortfall: ${result.reason}`,
);
console.log(`Attempts: ${result.attempts}`);
console.log(`Rejections: ${JSON.stringify(result.rejections)}`);

for (const [index, hand] of result.hands.entries()) {
  const { handInput, canonical, seed, stats } = hand;
  const state = handInput.gameState;
  const melds = handInput.openMelds?.length
    ? handInput.openMelds
        .map((meld) => `${meld.type}: ${formatTiles(meld.tiles)}`)
        .join(" | ")
    : "none";
  const win = handInput.winningTile.isTsumo
    ? "tsumo"
    : `ron from ${handInput.winningTile.from}`;

  console.log(`\nHand ${index + 1} (seed ${seed}, ${stats.attempts} attempts)`);
  console.log(`  Closed: ${formatTiles(handInput.closedTiles)}`);
  console.log(`  Melds: ${melds}`);
  console.log(`  Round / seat: ${state.roundWind} / ${state.seatWind}`);
  console.log(`  Win: ${handInput.winningTile.tile} (${win})`);
  console.log(`  Dora indicators: ${formatTiles(state.doraIndicators)}`);
  if (state.isRiichi || state.isDoubleRiichi) {
    console.log(`  Ura indicators: ${formatTiles(state.uradoraIndicators)}`);
  }
  console.log(
    `  Score: ${canonical.han} han, ${canonical.fu} fu, ${canonical.basicPoints} basic points`,
  );
  console.log(`  Yaku: ${canonical.yaku.map((yaku) => yaku.name).join(", ")}`);
}
