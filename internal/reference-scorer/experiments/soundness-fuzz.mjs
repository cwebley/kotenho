// Soundness fuzz — DESIGN.md §11.3.
//
// An "unsatisfiable" verdict is supposed to be a PROOF. Nothing downstream can
// correct it: the static engine returns before a hand is built, so a wrong
// claim silently refuses a spec that was actually possible.
//
// Three surfaces can produce one, and each has already had a bug found by hand:
//   · the incompatibility table   (~80 pairs, all hand-written)
//   · shape exclusion             (suuankou wrongly excluded by sanankou)
//   · dora reachability           (pinfu + 3 dora, before runs were allowed to stack)
//
// Method: sample random specs. Whenever the engine says impossible, re-run with
// the inferred checks bypassed and a large budget. If a hand comes out, the
// claim was false and the fuzz reports the spec.

import { generate } from "riichi-hand-generator";

const REQUESTABLE = [
  "pinfu", "tanyao", "menzen-tsumo", "chiitoitsu", "toitoi", "sanankou",
  "sanshoku", "ittsuu", "iipeiko", "ryanpeikou", "honitsu", "chinitsu",
  "haku", "hatsu", "chun", "round-wind", "seat-wind", "riichi",
  "sankantsu", "suuankou", "suukantsu",
];
const FU = [20, 25, 30, 40, 50, 60, 70];
const WAITS = ["ryanmen", "kanchan", "penchan", "shanpon", "tanki"];
const WINDS = ["east", "south", "west", "north"];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSpec(rand) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const spec = {};
  const yakuCount = Math.floor(rand() * 3);
  if (yakuCount) {
    const chosen = new Set();
    for (let i = 0; i < yakuCount; i++) chosen.add(pick(REQUESTABLE));
    spec.yaku = [...chosen];
  }
  if (rand() < 0.4) spec.fu = pick(FU);
  if (rand() < 0.3) spec.waitType = pick(WAITS);
  if (rand() < 0.3) spec.closed = rand() < 0.7;
  if (rand() < 0.2) spec.winMethod = rand() < 0.5 ? "ron" : "tsumo";
  if (rand() < 0.15) spec.kanCount = Math.floor(rand() * 3);
  if (rand() < 0.2) spec.openMeldCount = Math.floor(rand() * 3);
  if (rand() < 0.3) spec.dora = Math.floor(rand() * 4);
  if (rand() < 0.15) spec.doraIndicatorCount = 1 + Math.floor(rand() * 3);
  if (rand() < 0.15) spec.han = 1 + Math.floor(rand() * 6);
  if (rand() < 0.1) spec.roundWind = pick(WINDS);
  if (rand() < 0.1) spec.seatWind = pick(WINDS);
  if (spec.yaku?.includes("riichi")) spec.riichi = true;
  return spec;
}

const N = 1500;
const rand = mulberry(20260814);
let unsatisfiable = 0;
let ok = 0;
let exhausted = 0;
const falseClaims = [];

for (let i = 0; i < N; i++) {
  const spec = randomSpec(rand);
  const result = generate(spec, { seed: i, budget: 400 });
  if (result.status === "ok") {
    ok++;
    continue;
  }
  if (result.status === "exhausted") {
    exhausted++;
    continue;
  }
  unsatisfiable++;

  // Challenge it: same spec, inferred checks off, a much larger budget.
  const challenge = generate(spec, {
    seed: i,
    budget: 4000,
    __unsafeSkipInferredChecks: true,
  });
  if (challenge.status === "ok") {
    falseClaims.push({
      spec,
      reason: result.reason,
      hand: challenge.hand.canonical.yaku.map((y) => y.name).join("+"),
      fu: challenge.hand.canonical.fu,
      han: challenge.hand.canonical.han,
      dora: challenge.hand.canonical.dora,
    });
  }
}

console.log(`specs sampled       : ${N}`);
console.log(`  generated         : ${ok}`);
console.log(`  exhausted         : ${exhausted}`);
console.log(`  claimed impossible: ${unsatisfiable}`);
console.log(`\nFALSE IMPOSSIBILITY CLAIMS: ${falseClaims.length}`);
for (const claim of falseClaims.slice(0, 12)) {
  console.log(`\n  spec   ${JSON.stringify(claim.spec)}`);
  console.log(`  said   ${claim.reason}`);
  console.log(`  but    ${claim.han}han ${claim.fu}fu dora=${claim.dora} [${claim.hand}]`);
}
