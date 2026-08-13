// M1 — the convergence spike.
//
// Measures the real generate() loop, and scores every candidate a SECOND time
// with the reference scorer. That second opinion is the whole point: riichi-score
// still cannot see sanshoku, ittsuu, chanta, honitsu, toitoi or sanankou, so
// measured against itself the loop reports an acceptance rate that is too high
// by exactly the amount it is blind to.
//
// LIMITS: the reference scorer models neither open melds nor kans, so the
// dual-scoring comparison is restricted to closed, kan-free hands. Acceptance
// rates are reported for every spec; han agreement only where comparable.

import { generate } from "riichi-hand-generator";
import { allInterpretations, score } from "../src/index.mjs";

const WIND = { east: "1z", south: "2z", west: "3z", north: "4z" };

// The two scorers were written independently and name some yaku differently.
// Without this, riichi-score looks blind to dragons it detects perfectly well.
const CANONICAL = {
  "dragon-5z": "haku",
  "dragon-6z": "hatsu",
  "dragon-7z": "chun",
  chiitoi: "chiitoitsu",
};
const canonicalName = (name) => CANONICAL[name] ?? name;

function referenceBest(handInput) {
  const tiles = [...handInput.closedTiles, handInput.winningTile.tile];
  const readings = allInterpretations(tiles, handInput.winningTile.tile)
    .map((reading) =>
      score(reading, {
        open: false,
        tsumo: Boolean(handInput.winningTile.isTsumo),
        roundWind: WIND[handInput.gameState.roundWind],
        seatWind: WIND[handInput.gameState.seatWind],
        dora: 0,
      }),
    )
    .filter((entry) => entry.points > 0);
  if (!readings.length) return null;
  return readings.sort((a, b) => b.points - a.points)[0];
}

const comparable = (handInput) =>
  !handInput.openMelds?.length && handInput.closedTiles.length === 13;

const SPECS = [
  ["30 fu closed ron (pinfu)", { fu: 30, closed: true, winMethod: "ron" }],
  ["40 fu closed ron", { fu: 40, closed: true, winMethod: "ron" }],
  ["40 fu closed tsumo", { fu: 40, closed: true, winMethod: "tsumo" }],
  ["50 fu closed ron", { fu: 50, closed: true, winMethod: "ron" }],
  ["40 fu closed, kanchan", { fu: 40, closed: true, waitType: "kanchan" }],
  [
    "40 fu closed, shanpon, unambiguous wait",
    { fu: 40, closed: true, waitType: "shanpon" },
    { requireUnambiguousWait: true },
  ],
  ["chiitoitsu", { handShape: "chiitoitsu" }],
  ["40 fu, one called meld", { fu: 40, openMeldCount: 1 }],
  ["50 fu, one kan", { fu: 50, kanCount: 1 }],
];

const RUNS = 300;
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");

console.log(`M1 convergence spike — ${RUNS} generations per spec\n`);

for (const [label, spec, extra = {}] of SPECS) {
  let attempts = 0;
  let accepted = 0;
  let failed = 0;
  const rejections = {};
  const diagnoses = {};

  let compared = 0;
  let hanAgree = 0;
  const missedYaku = {};

  for (let seed = 0; seed < RUNS; seed++) {
    const result = generate(spec, { seed, ...extra, onAttempt: (r) => {
      attempts++;
      for (const cause of r.causes) rejections[cause] = (rejections[cause] ?? 0) + 1;
      if (r.diagnosis) diagnoses[r.diagnosis] = (diagnoses[r.diagnosis] ?? 0) + 1;
    } });

    if (result.status !== "ok") { failed++; continue; }
    accepted++;

    const { handInput, canonical } = result.hand;
    if (!comparable(handInput)) continue;
    const reference = referenceBest(handInput);
    if (!reference) continue;

    // riichi-score suppresses ordinary yaku under a yakuman and reports
    // han: 0 + limit; the reference scorer has no suppression and reports raw
    // han. Both agree on the payout, so compare points there rather than han.
    const isLimit = Boolean(canonical.limit) || reference.han >= 13;
    if (isLimit) {
      if (reference.points === canonical.basicPoints) hanAgree++;
      compared++;
      continue;
    }

    compared++;
    if (reference.han === canonical.han) hanAgree++;
    else {
      const known = new Set(canonical.yaku.map((y) => canonicalName(y.name)));
      for (const yaku of reference.yaku) {
        const name = canonicalName(yaku.name);
        if (!known.has(name)) {
          missedYaku[name] = (missedYaku[name] ?? 0) + 1;
        }
      }
    }
  }

  console.log(`${"─".repeat(72)}\n${label}`);
  console.log(
    `  generated ${accepted}/${RUNS}` +
      (failed ? `  (${failed} exhausted)` : "") +
      `   attempts/hand: ${(attempts / RUNS).toFixed(2)}` +
      `   acceptance: ${pct(accepted, attempts)}`,
  );
  const rej = Object.entries(rejections).sort((a, b) => b[1] - a[1]);
  if (rej.length) {
    console.log(
      `  rejections: ${rej.map(([k, v]) => `${k} ${pct(v, attempts)}`).join("  ")}`,
    );
  }
  const dia = Object.entries(diagnoses).sort((a, b) => b[1] - a[1]);
  if (dia.length) {
    console.log(`  diagnoses:  ${dia.map(([k, v]) => `${k} ${v}`).join("  ")}`);
  }
  if (compared) {
    console.log(
      `  han agreement vs reference: ${pct(hanAgree, compared)}  (${compared} comparable hands)`,
    );
    const missed = Object.entries(missedYaku).sort((a, b) => b[1] - a[1]);
    if (missed.length) {
      console.log(
        `  riichi-score is blind to: ${missed
          .map(([k, v]) => `${k} ${pct(v, compared)}`)
          .join("  ")}`,
      );
    }
  } else {
    console.log(`  han agreement: not comparable (open melds or kans)`);
  }
}
