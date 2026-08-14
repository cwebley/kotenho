// Why does "menzen-tsumo and nothing else" take so many attempts?
//
// Declared yaku impose no shape of their own, so the spec is really "build a
// hand carrying no other yaku". That is a negative construction problem, and
// the current planner has nothing to aim at — it fills randomly and hopes.
//
// Measures the attempt distribution and, for every rejected candidate, which
// yaku actually turned up. The contaminant histogram is what a bias would have
// to target.

import { calculate, createGameState } from "riichi-score";
import { generate } from "riichi-hand-generator";

const SPECS = [
  ["menzen-tsumo only", { yaku: ["menzen-tsumo"], closed: true, winMethod: "tsumo" }],
  ["riichi only", { yaku: ["riichi"], closed: true, winMethod: "ron" }],
  ["riichi + menzen-tsumo", { yaku: ["riichi", "menzen-tsumo"], closed: true, winMethod: "tsumo" }],
];

const SEEDS = 400;

for (const [label, spec] of SPECS) {
  const attemptsPerHand = [];
  const contaminants = {};
  const causes = {};
  let ok = 0;
  let exhausted = 0;

  for (let seed = 0; seed < SEEDS; seed++) {
    const result = generate(spec, {
      seed,
      budget: 4000,
      onAttempt: (record) => {
        for (const cause of record.causes) {
          causes[cause] = (causes[cause] ?? 0) + 1;
        }
        if (!record.handInput || record.outcome === "accepted") return;
        if (!record.causes.includes("yaku-mismatch")) return;
        // Which yaku actually showed up that we did not ask for?
        const analysis = calculate({
          ...record.handInput,
          gameState: createGameState(record.handInput.gameState),
        });
        if (!analysis.valid) return;
        const want = new Set(spec.yaku);
        for (const yaku of analysis.handInterpretations[0].yaku) {
          if (want.has(yaku.name)) continue;
          contaminants[yaku.name] = (contaminants[yaku.name] ?? 0) + 1;
        }
      },
    });
    if (result.status === "ok") {
      ok++;
      attemptsPerHand.push(result.hand.stats.attempts);
    } else {
      exhausted++;
    }
  }

  attemptsPerHand.sort((a, b) => a - b);
  const at = (q) => attemptsPerHand[Math.floor(attemptsPerHand.length * q)] ?? 0;
  const mean =
    attemptsPerHand.reduce((a, b) => a + b, 0) / (attemptsPerHand.length || 1);

  console.log(`${"─".repeat(70)}\n${label}`);
  console.log(
    `  generated ${ok}/${SEEDS}${exhausted ? `  (${exhausted} exhausted)` : ""}` +
      `   mean ${mean.toFixed(0)} attempts   median ${at(0.5)}   p90 ${at(0.9)}   max ${attemptsPerHand.at(-1) ?? 0}`,
  );
  const total = Object.values(causes).reduce((a, b) => a + b, 0);
  console.log(
    `  causes: ${Object.entries(causes)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${((100 * v) / total).toFixed(0)}%`)
      .join("  ")}`,
  );
  const cTotal = Object.values(contaminants).reduce((a, b) => a + b, 0);
  console.log(`  what actually turned up instead (${cTotal} sightings):`);
  for (const [name, count] of Object.entries(contaminants)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)) {
    console.log(
      `      ${name.padEnd(16)} ${((100 * count) / cTotal).toFixed(1).padStart(5)}%`,
    );
  }
}
