// Does a hand containing kans ever admit two score-tied readings that disagree
// on fu or han BELOW the mangan cap?
//
// DESIGN §5 left this open. The earlier measurement (0 of 27,121 tied sets)
// had no kans in the sample, and kans are where fu ranges widest.
//
// Two mechanisms are separated here, because they have different consequences:
//   - a true fu x 2^han COLLISION (30fu/3han == 60fu/2han) would mean the
//     answer key itself is ambiguous and the API needs fu/han flags;
//   - the MANGAN CAP flattening two different scores to 2000 is harmless for
//     "what is it worth", but still makes fu ambiguous on limit hands.

import { generate } from "riichi-hand-generator";
import { scoreHand } from "../src/index.mjs";

const distinct = (values) => new Set(values).size;

const SPECS = [
  ["1 kan, 50 fu", { fu: 50, kanCount: 1 }],
  ["1 kan, 60 fu", { fu: 60, kanCount: 1 }],
  ["1 kan, 70 fu", { fu: 70, kanCount: 1 }],
  ["2 kans", { kanCount: 2 }],
  ["3 kans", { kanCount: 3 }],
  ["no kans (control)", { kanCount: 0 }],
];

for (const [label, spec] of SPECS) {
  const seen = new Set();
  let hands = 0;
  let tiedSets = 0;
  let capFlattened = 0;
  let trueCollision = 0;
  let waitOnly = 0;
  let example = null;

  for (let seed = 0; seed < 30000; seed++) {
    generate(spec, {
      seed,
      budget: 60,
      onAttempt: (record) => {
        if (!record.handInput) return;
        const key = JSON.stringify(record.handInput.closedTiles) +
          record.handInput.winningTile.tile;
        if (seen.has(key)) return;
        seen.add(key);

        const { readings } = scoreHand(record.handInput);
        if (readings.length < 2) return;
        hands++;

        const best = readings[0].points;
        const tied = readings.filter((r) => r.points === best);
        if (tied.length < 2) return;
        tiedSets++;

        const fuDiffers = distinct(tied.map((r) => r.fu)) > 1;
        const hanDiffers = distinct(tied.map((r) => r.han)) > 1;
        if (!fuDiffers && !hanDiffers) {
          if (distinct(tied.map((r) => r.wait)) > 1) waitOnly++;
          return;
        }
        if (best >= 2000) {
          capFlattened++;
        } else {
          trueCollision++;
          example ??= { handInput: record.handInput, tied };
        }
      },
    });
  }

  console.log(`${"─".repeat(70)}\n${label}`);
  console.log(`  distinct hands examined : ${hands}`);
  console.log(`  with a tied top set     : ${tiedSets}`);
  console.log(`    wait differs only     : ${waitOnly}`);
  console.log(`    fu/han differ, MANGAN+: ${capFlattened}   (cap artefact)`);
  console.log(`    fu/han differ, BELOW  : ${trueCollision}   <- true collision`);
  if (example) {
    console.log(`\n  EXAMPLE of a sub-mangan collision:`);
    console.log(`    ${[...example.handInput.closedTiles].sort().join(" ")} + ${example.handInput.winningTile.tile}`);
    for (const r of example.tied) {
      console.log(`      ${String(r.wait).padEnd(8)} ${r.fu}fu ${r.han}han ${r.points}pts`);
    }
  }
}
