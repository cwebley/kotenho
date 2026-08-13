import { generate } from "../dist/index.js";

const result = generate({ fu: 110 }, { budget: 1_000 });

if (result.status !== "ok") {
  throw new Error(
    result.status === "unsatisfiable"
      ? `30-fu hand is unsatisfiable: ${result.reason}`
      : `30-fu hand generation exhausted after ${result.attempts} attempts`,
  );
}

const { handInput, canonical, seed, stats } = result.hand;

console.log("Generated 30-fu hand");
console.log(`Seed: ${seed}`);
console.log(`Closed tiles: ${handInput.closedTiles.join(" ")}`);
console.log(
  `Open melds: ${
    handInput.openMelds?.map((meld) => meld.tiles.join(" ")).join(" | ") ??
    "none"
  }`,
);
console.log(
  `Winning tile: ${handInput.winningTile.tile} (${handInput.winningTile.isTsumo ? "tsumo" : `ron from ${handInput.winningTile.from}`})`,
);
console.log(
  `Score: ${canonical.han} han, ${canonical.fu} fu, ${canonical.basicPoints} basic points`,
);
console.log(`Yaku: ${canonical.yaku.map((yaku) => yaku.name).join(", ")}`);
console.log(`Attempts: ${stats.attempts}`);
