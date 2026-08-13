// Dora placement: given a FINISHED hand, how many distinct ways can we hit a
// target dora count -- and are the "pair is dora" and "spread out" patterns
// both reachable?

const SUITS = ["m", "p", "s"];
const ALL = [];
for (const s of SUITS) for (let n = 1; n <= 9; n++) ALL.push(`${n}${s}`);
for (let n = 1; n <= 7; n++) ALL.push(`${n}z`);

// indicator -> dora tile
function next(t) {
  const n = +t[0], s = t[1];
  if (s === "z") return n <= 4 ? `${(n % 4) + 1}z` : `${((n - 4) % 3) + 5}z`;
  return `${(n % 9) + 1}${s}`;
}

function counts(tiles) {
  const c = {};
  for (const t of tiles) c[t] = (c[t] || 0) + 1;
  return c;
}

// where does a tile live in the hand's grouping?
function locate(tile, blocks) {
  const hits = [];
  blocks.forEach((b) => { for (const t of b.tiles) if (t === tile) hits.push(b.label); });
  return hits;
}

function combosWithRep(arr, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) return void out.push([...cur]);
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

function solveDora(blocks, K, D) {
  const tiles = blocks.flatMap((b) => b.tiles);
  const hand = counts(tiles);
  // an indicator is a real tile from the wall: need a spare copy
  const candidates = ALL.filter((t) => (hand[t] || 0) < 4);
  const sols = [];
  for (const combo of combosWithRep(candidates, K)) {
    const per = combo.map((i) => hand[next(i)] || 0);
    if (per.reduce((a, b) => a + b, 0) !== D) continue;
    // indicators are physical tiles too: can't use more copies than exist
    const ic = counts(combo);
    if (Object.entries(ic).some(([t, c]) => c + (hand[t] || 0) > 4)) continue;
    sols.push({ combo, per });
  }
  return sols;
}

function report(name, blocks, K, D) {
  const sols = solveDora(blocks, K, D);
  console.log(`\n${"=".repeat(72)}\n${name}`);
  console.log(`hand: ${blocks.map((b) => b.tiles.join("")).join("  ")}`);
  console.log(`${K} indicator slot(s), target ${D} dora  ->  ${sols.length} valid assignments`);

  // group by structural pattern: sorted contribution vector + where the dora sit
  const patterns = new Map();
  for (const s of sols) {
    const shape = s.combo
      .map((ind, i) => ({ ind, d: next(ind), n: s.per[i] }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.n}x in ${[...new Set(locate(x.d, blocks))].join("+")}`)
      .sort().join("  |  ") || "(no dora)";
    const key = `[${[...s.per].sort((a, b) => b - a).join(",")}]  ${shape}`;
    if (!patterns.has(key)) patterns.set(key, { count: 0, ex: s });
    patterns.get(key).count++;
  }
  console.log(`\n  distinct patterns: ${patterns.size}`);
  for (const [k, v] of [...patterns].sort((a, b) => b[1].count - a[1].count)) {
    const ex = v.ex.combo.map((i, j) => `${i}->${next(i)}(${v.ex.per[j]})`).join(", ");
    console.log(`    ${String(v.count).padStart(3)} ways  ${k}`);
    console.log(`             e.g. indicators ${ex}`);
  }
}

// ---- a pinfu hand whose pair can carry 2 dora ----
const handA = [
  { label: "run1", tiles: ["2m", "3m", "4m"] },
  { label: "run2", tiles: ["5m", "6m", "7m"] },
  { label: "run3", tiles: ["2p", "3p", "4p"] },
  { label: "run4", tiles: ["6s", "7s", "8s"] },
  { label: "PAIR", tiles: ["5p", "5p"] },
];

// ---- a pinfu hand with THREE copies of one tile spread across runs ----
const handB = [
  { label: "run1", tiles: ["2m", "3m", "4m"] },
  { label: "run2", tiles: ["3m", "4m", "5m"] },
  { label: "run3", tiles: ["4m", "5m", "6m"] },
  { label: "run4", tiles: ["6p", "7p", "8p"] },
  { label: "PAIR", tiles: ["9s", "9s"] },
];

report("A. pinfu, 2 indicators (someone at the table kanned), target 2 dora", handA, 2, 2);
report("B. pinfu, 1 indicator, target 3 dora  -- no triplet anywhere in the hand", handB, 1, 3);
report("C. pinfu, 1 indicator, target 2 dora", handA, 1, 2);
