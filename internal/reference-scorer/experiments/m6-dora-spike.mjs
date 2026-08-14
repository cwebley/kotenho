// M6 spike: how hard is dora placement on real generated hands?
//
// Dora runs on a FINISHED hand — choosing indicators never changes the tiles —
// so it is a separate small search. The questions:
//
//   1. which (D, K) bands are solvable, and where does it fall off a cliff?
//   2. how often does the four-copy limit actually block an indicator?
//      (hand + omote + kan dora + ura all draw from the same 136 tiles)
//   3. how much pattern variety exists, i.e. is first-fit sampling biased?
//
// The prototype solver here is what M6 would build for real.

import { generate } from "riichi-hand-generator";

const SUITS = ["m", "p", "s"];
const ALL = [];
for (const s of SUITS) for (let n = 1; n <= 9; n++) ALL.push(`${n}${s}`);
for (let n = 1; n <= 7; n++) ALL.push(`${n}z`);

/** Indicator → the tile it makes dora. 9 wraps to 1; winds and dragons cycle. */
function next(tile) {
  const n = +tile[0];
  const suit = tile[1];
  if (suit === "z") return n <= 4 ? `${(n % 4) + 1}z` : `${((n - 4) % 3) + 5}z`;
  return `${(n % 9) + 1}${suit}`;
}

const counts = (tiles) => {
  const c = {};
  for (const t of tiles) c[t] = (c[t] || 0) + 1;
  return c;
};

function combosWithRep(items, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) return void out.push([...cur]);
    for (let i = start; i < items.length; i++) {
      cur.push(items[i]);
      rec(i, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

/**
 * All indicator multisets of size K whose dora total is exactly D.
 * Indicators are physical tiles, so they compete with the hand for copies.
 */
function solveDora(handTiles, K, D) {
  const hand = counts(handTiles);
  const candidates = ALL.filter((t) => (hand[t] ?? 0) < 4);
  const solutions = [];
  let blockedByCopies = 0;

  for (const combo of combosWithRep(candidates, K)) {
    const per = combo.map((ind) => hand[next(ind)] ?? 0);
    if (per.reduce((a, b) => a + b, 0) !== D) continue;
    const used = counts(combo);
    const overflows = Object.entries(used).some(
      ([tile, n]) => n + (hand[tile] ?? 0) > 4,
    );
    if (overflows) {
      blockedByCopies++;
      continue;
    }
    solutions.push({ combo, per });
  }
  // A "pattern" is the shape of the distribution, not the exact tiles: [2,0]
  // (both dora in one element) is pedagogically different from [1,1].
  const patterns = new Set(
    solutions.map((s) => [...s.per].sort((a, b) => b - a).join(",")),
  );
  return { solutions, patterns, blockedByCopies };
}

const SPECS = [
  ["pinfu (all runs)", { yaku: ["pinfu"] }],
  ["40 fu, mixed", { fu: 40, closed: true }],
  ["toitoi (all triplets)", { yaku: ["toitoi"] }],
  ["one kan", { kanCount: 1, doraIndicatorCount: 2 }],
  ["chiitoitsu", { handShape: "chiitoitsu" }],
];

const HANDS = 200;

console.log("solvable rate — share of hands admitting an exact-D indicator set\n");
console.log(
  `${"spec".padEnd(24)}${"K".padStart(2)}   ` +
    [0, 1, 2, 3, 4, 5, 6].map((d) => `D=${d}`.padStart(7)).join(""),
);
console.log("─".repeat(80));

for (const [label, spec] of SPECS) {
  const hands = [];
  for (let seed = 0; seed < HANDS * 3 && hands.length < HANDS; seed++) {
    const r = generate(spec, { seed });
    if (r.status !== "ok") continue;
    const h = r.hand.handInput;
    hands.push([
      ...h.closedTiles,
      h.winningTile.tile,
      ...(h.openMelds ?? []).flatMap((m) => m.tiles),
    ]);
  }
  if (!hands.length) continue;

  for (const K of [1, 2, 3]) {
    const row = [0, 1, 2, 3, 4, 5, 6].map((D) => {
      let solved = 0;
      for (const tiles of hands) {
        if (solveDora(tiles, K, D).solutions.length) solved++;
      }
      return `${((100 * solved) / hands.length).toFixed(0)}%`.padStart(7);
    });
    console.log(
      `${(K === 1 ? label : "").padEnd(24)}${String(K).padStart(2)}   ${row.join("")}`,
    );
  }
}

// ── variety and the copy limit, on a representative spec ──
console.log("\npattern variety and copy pressure (40 fu closed, K=2):\n");
let totalSolutions = 0;
let totalPatterns = 0;
let totalBlocked = 0;
let samples = 0;
for (let seed = 0; seed < 300; seed++) {
  const r = generate({ fu: 40, closed: true }, { seed });
  if (r.status !== "ok") continue;
  const h = r.hand.handInput;
  const tiles = [
    ...h.closedTiles,
    h.winningTile.tile,
    ...(h.openMelds ?? []).flatMap((m) => m.tiles),
  ];
  const { solutions, patterns, blockedByCopies } = solveDora(tiles, 2, 2);
  if (!solutions.length) continue;
  samples++;
  totalSolutions += solutions.length;
  totalPatterns += patterns.size;
  totalBlocked += blockedByCopies;
}
console.log(`  hands sampled            : ${samples}`);
console.log(`  mean solutions per hand  : ${(totalSolutions / samples).toFixed(1)}`);
console.log(`  mean distinct patterns   : ${(totalPatterns / samples).toFixed(1)}`);
console.log(
  `  indicator sets rejected by the 4-copy limit: ${(totalBlocked / samples).toFixed(1)} per hand`,
);
