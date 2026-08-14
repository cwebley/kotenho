// M4 spike: do multiple tile predicates compose under sequential placement?
//
// A compound spec like ["tanyao","pinfu","sanshoku"] has three placers competing
// for the same four blocks. The question is whether they can run in sequence —
// each ignorant of the others, rejecting on conflict — or whether each placer
// has to draw from a domain already narrowed by the rest.
//
// NAIVE : every placer picks freely from its own full domain.
// AWARE : required yaku first contribute domain constraints (suit lock, rank
//         range), and every placer draws only from what survives.
//
// Verified against riichi-score with exact set equality, so a hand carrying any
// unrequested yaku counts as a rejection — which is the actual M4 contract.

import { calculate, createGameState } from "riichi-score";

const SUITS = ["m", "p", "s"];
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const DRAGONS = ["5z", "6z", "7z"];

// ── domain constraints contributed by the required yaku ──
function domainFor(yaku) {
  const d = { suits: [...SUITS], minRank: 1, maxRank: 9, honors: true };
  if (yaku.includes("tanyao")) {
    d.minRank = 2;
    d.maxRank = 8;
    d.honors = false;
  }
  if (yaku.includes("chinitsu")) {
    d.suits = [pick(SUITS)];
    d.honors = false;
  } else if (yaku.includes("honitsu")) {
    d.suits = [pick(SUITS)];
  }
  return d;
}

const runStarts = (d) => {
  const out = [];
  for (let s = d.minRank; s + 2 <= d.maxRank; s++) out.push(s);
  return out;
};

// ── placement ──
// Returns { runs: [{suit,start}], pair } or null if the plan cannot be built.
function placeRuns(yaku, aware, bias) {
  const d = aware ? domainFor(yaku) : { suits: [...SUITS], minRank: 1, maxRank: 9, honors: true };
  const starts = runStarts(d);
  const runs = [];

  // Tightest predicates first: they fix the most blocks.
  if (yaku.includes("ittsuu")) {
    const suit = pick(d.suits);
    for (const start of [1, 4, 7]) {
      if (aware && !starts.includes(start)) return null;
      runs.push({ suit, start });
    }
  } else if (yaku.includes("sanshoku")) {
    const shared = pick(starts);
    for (const suit of SUITS) runs.push({ suit, start: shared });
  }

  if (yaku.includes("iipeiko") && runs.length <= 2) {
    const run = { suit: pick(d.suits), start: pick(starts) };
    runs.push(run, { ...run });
  }

  // Anti-yaku bias: accidental iipeiko is the dominant contaminant, and a
  // pool-narrowing yaku like honitsu makes it far likelier by shrinking the
  // run space. Sample free runs without replacement unless iipeiko is wanted.
  const wantsDuplicates =
    yaku.includes("iipeiko") || yaku.includes("ryanpeikou");
  let guard = 0;
  while (runs.length < 4) {
    const candidate = { suit: pick(d.suits), start: pick(starts) };
    const clashes = runs.some(
      (r) => r.suit === candidate.suit && r.start === candidate.start,
    );
    if (bias && !wantsDuplicates && clashes && guard++ < 40) continue;
    runs.push(candidate);
  }
  return runs.slice(0, 4);
}

function placePair(yaku, runs, aware, ctx) {
  const d = aware ? domainFor(yaku) : { suits: [...SUITS], minRank: 1, maxRank: 9, honors: true };
  // sanshoku/ittsuu already picked a suit for the runs; honitsu needs the whole
  // hand in that suit, so re-derive it rather than re-rolling.
  const suits = yaku.includes("honitsu") || yaku.includes("chinitsu")
    ? [runs[0].suit]
    : d.suits;

  const options = [];
  for (const suit of suits) {
    for (let r = d.minRank; r <= d.maxRank; r++) options.push(`${r}${suit}`);
  }
  // honitsu must contain at least one honor; pinfu forbids a value pair, so an
  // honour pair has to be a non-seat, non-round wind.
  if (yaku.includes("honitsu")) {
    const plainWinds = ["1z", "2z", "3z", "4z"].filter(
      (t) => t !== ctx.roundWindTile && t !== ctx.seatWindTile,
    );
    return pick(plainWinds);
  }
  if (!options.length) return null;
  return pick(options);
}

function buildHand(yaku, aware, ctx, bias) {
  const runs = placeRuns(yaku, aware, bias);
  if (!runs) return null;
  const pair = placePair(yaku, runs, aware, ctx);
  if (!pair) return null;

  const tiles = [];
  for (const r of runs) {
    for (let k = 0; k < 3; k++) tiles.push(`${r.start + k}${r.suit}`);
  }
  tiles.push(pair, pair);

  const counts = {};
  for (const t of tiles) counts[t] = (counts[t] ?? 0) + 1;
  if (Object.values(counts).some((n) => n > 4)) return null;

  // pinfu needs a ryanmen: win on a run end that leaves a two-sided wait.
  const opts = [];
  runs.forEach((r) => {
    if (r.start + 3 <= 9) opts.push(`${r.start}${r.suit}`);
    if (r.start - 1 >= 1) opts.push(`${r.start + 2}${r.suit}`);
  });
  if (!opts.length) return null;
  const winTile = pick(opts);

  const closed = [...tiles];
  closed.splice(closed.indexOf(winTile), 1);
  return {
    closedTiles: closed,
    winningTile: { tile: winTile, from: "north" },
    gameState: createGameState({ roundWind: "east", seatWind: "south" }),
  };
}

// ── verification: exact set equality, the real M4 contract ──
function accepts(handInput, want) {
  const r = calculate(handInput);
  if (!r.valid) return false;
  const best = r.handInterpretations[0].basicPoints;
  const tied = r.handInterpretations.filter((h) => h.basicPoints === best);
  const target = [...want].sort().join("+");
  return tied.every(
    (h) =>
      h.yaku
        .map((y) => y.name)
        .sort()
        .join("+") === target,
  );
}

const SPECS = [
  ["tanyao + pinfu", ["tanyao", "pinfu"]],
  ["tanyao + pinfu + sanshoku", ["tanyao", "pinfu", "sanshoku"]],
  ["tanyao + pinfu + iipeiko", ["tanyao", "pinfu", "iipeiko"]],
  ["pinfu + ittsuu", ["pinfu", "ittsuu"]],
  ["tanyao + pinfu + ittsuu", ["tanyao", "pinfu", "ittsuu"]],
  ["honitsu + pinfu", ["honitsu", "pinfu"]],
];

const N = 20000;
const ctx = { roundWindTile: "1z", seatWindTile: "2z" };

console.log(`M4 composition spike — ${N} attempts per spec per mode\n`);
console.log(
  `${"spec".padEnd(28)} ${"naive".padStart(9)} ${"aware".padStart(9)} ${"+bias".padStart(10)}   E[att]`,
);
console.log("─".repeat(70));

for (const [label, yaku] of SPECS) {
  const rate = (aware, bias = false) => {
    let ok = 0;
    let built = 0;
    for (let i = 0; i < N; i++) {
      const h = buildHand(yaku, aware, ctx, bias);
      if (!h) continue;
      built++;
      if (accepts(h, yaku)) ok++;
    }
    return built ? ok / N : 0;
  };
  const naive = rate(false);
  const aware = rate(true);
  const biased = rate(true, true);
  const e = biased > 0 ? (1 / biased).toFixed(1) : "∞";
  console.log(
    `${label.padEnd(28)} ${(100 * naive).toFixed(2).padStart(8)}% ${(100 * aware)
      .toFixed(2)
      .padStart(8)}% ${(100 * biased).toFixed(2).padStart(9)}%   ${e.padStart(6)}`,
  );
}
