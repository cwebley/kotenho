// Feasibility probe for the constrained hand generator.
// Q1: is the skeleton space small enough to enumerate, and does fu invert exactly?
// Q2: at the tile-assignment stage, how often does random assignment produce
//     accidental yaku (i.e. what is the rejection rate for "exclusive" mode)?

// ---------- Q1: skeleton space ----------

const BLOCKS = [
  { id: "run.closed",   kind: "run",  called: false, fu: 0,  th: false },
  { id: "run.called",   kind: "run",  called: true,  fu: 0,  th: false },
  { id: "trip.closed.s",kind: "trip", called: false, fu: 4,  th: false },
  { id: "trip.called.s",kind: "trip", called: true,  fu: 2,  th: false },
  { id: "trip.closed.t",kind: "trip", called: false, fu: 8,  th: true  },
  { id: "trip.called.t",kind: "trip", called: true,  fu: 4,  th: true  },
  { id: "kan.ankan.s",  kind: "kan",  called: false, fu: 16, th: false },
  { id: "kan.open.s",   kind: "kan",  called: true,  fu: 8,  th: false },
  { id: "kan.ankan.t",  kind: "kan",  called: false, fu: 32, th: true  },
  { id: "kan.open.t",   kind: "kan",  called: true,  fu: 16, th: true  },
];

const PAIRS = ["plain", "yakuhai", "doubleWind"];
const WAITS = ["ryanmen", "kanchan", "penchan", "shanpon", "tanki"];

function combosWithRep(arr, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length === k) return void out.push([...cur]);
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

// fu is a PURE FUNCTION of the skeleton -- no tiles involved.
function fuOf(sk) {
  const { blocks, pair, wait, tsumo, shanponHost } = sk;
  const menzen = blocks.every((b) => !b.called);   // ankan keeps the hand closed
  const allRuns = blocks.every((b) => b.kind === "run");
  const pinfuShape = allRuns && pair === "plain" && wait === "ryanmen";

  if (pinfuShape && menzen) return { fu: tsumo ? 20 : 30, pinfuShape: true };
  if (pinfuShape && !menzen) return { fu: 30, pinfuShape: false }; // kuipinfu floor

  let f = 20;
  if (!tsumo && menzen) f += 10;      // menzen ron
  if (tsumo) f += 2;                  // tsumo (pinfu handled above)

  let downgraded = false;
  for (const b of blocks) {
    let bf = b.fu;
    // a concealed triplet completed by RON scores as an open triplet
    if (!tsumo && wait === "shanpon" && !downgraded && b.id === shanponHost) {
      bf = b.th ? 4 : 2;
      downgraded = true;
    }
    f += bf;
  }
  f += pair === "yakuhai" ? 2 : pair === "doubleWind" ? 4 : 0;
  f += (wait === "kanchan" || wait === "penchan" || wait === "tanki") ? 2 : 0;

  return { fu: Math.ceil(f / 10) * 10, pinfuShape: false };
}

const skeletons = [];
for (const blocks of combosWithRep(BLOCKS, 4)) {
  if (blocks.filter((b) => b.kind === "kan").length > 4) continue;
  const closedRuns = blocks.filter((b) => b.kind === "run" && !b.called);
  const closedTrips = blocks.filter((b) => b.kind === "trip" && !b.called);
  for (const wait of WAITS) {
    // the wait must be hostable by a CONCEALED block (you cannot win into a call)
    let hosts = [null];
    if (wait === "ryanmen" || wait === "kanchan" || wait === "penchan") {
      if (!closedRuns.length) continue;
    } else if (wait === "shanpon") {
      if (!closedTrips.length) continue;
      hosts = [...new Set(closedTrips.map((b) => b.id))]; // host type changes fu on ron
    }
    for (const host of hosts)
      for (const pair of PAIRS)
        for (const tsumo of [false, true]) {
          const sk = { blocks, pair, wait, tsumo, shanponHost: host };
          const { fu, pinfuShape } = fuOf(sk);
          skeletons.push({ ...sk, fu, pinfuShape,
            menzen: blocks.every((b) => !b.called),
            calledMelds: blocks.filter((b) => b.called).length,
            kans: blocks.filter((b) => b.kind === "kan").length });
        }
  }
}

console.log(`skeleton space (standard shape): ${skeletons.length} entries\n`);

const dist = {};
for (const s of skeletons) dist[s.fu] = (dist[s.fu] || 0) + 1;
console.log("fu distribution across skeleton space:");
for (const fu of Object.keys(dist).map(Number).sort((a, b) => a - b))
  console.log(`  ${String(fu).padStart(3)} fu : ${String(dist[fu]).padStart(4)}  ${"#".repeat(Math.round(dist[fu] / 25))}`);

const q = (label, pred) =>
  console.log(`  ${String(skeletons.filter(pred).length).padStart(4)}  ${label}`);

console.log("\nexact inversion -- 'give me a spec' becomes a table lookup:");
q("30 fu, closed, ron, ryanmen wait", (s) => s.fu === 30 && s.menzen && !s.tsumo && s.wait === "ryanmen");
q("30 fu, closed, ron  (any wait)",   (s) => s.fu === 30 && s.menzen && !s.tsumo);
q("40 fu, exactly one called meld",   (s) => s.fu === 40 && s.calledMelds === 1);
q("40 fu, closed, tsumo",             (s) => s.fu === 40 && s.menzen && s.tsumo);
q("25 fu (standard shape)",           (s) => s.fu === 25);
q("110 fu, any",                      (s) => s.fu === 110);
q("20 fu, any",                       (s) => s.fu === 20);
q("pinfu-shape + kanchan wait",       (s) => s.pinfuShape && s.wait === "kanchan");

// ---------- Q2: accidental yaku at the tile stage ----------

const SUITS = ["m", "p", "s"];
const rnd = (n) => Math.floor(Math.random() * n);

function samplePinfuTiles() {
  // 4 runs + 1 non-yakuhai pair, all suited (the pinfu skeleton)
  const runs = [];
  for (let i = 0; i < 4; i++) runs.push({ s: SUITS[rnd(3)], n: 1 + rnd(7) });
  const pair = { s: SUITS[rnd(3)], n: 1 + rnd(9) };
  const count = {};
  const bump = (s, n) => (count[`${n}${s}`] = (count[`${n}${s}`] || 0) + 1);
  for (const r of runs) for (let k = 0; k < 3; k++) bump(r.s, r.n + k);
  bump(pair.s, pair.n); bump(pair.s, pair.n);
  if (Object.values(count).some((c) => c > 4)) return null;   // 4-copy limit
  return { runs, pair, count };
}

function accidentalYaku({ runs, pair, count }) {
  const found = [];
  const key = (r) => `${r.n}${r.s}`;
  const keys = runs.map(key);

  const dupPairs = keys.filter((k, i) => keys.indexOf(k) !== i).length;
  if (dupPairs >= 2) found.push("ryanpeikou");
  else if (dupPairs === 1) found.push("iipeiko");

  for (let n = 1; n <= 7; n++)
    if (SUITS.every((s) => keys.includes(`${n}${s}`))) { found.push("sanshoku"); break; }

  for (const s of SUITS)
    if ([1, 4, 7].every((n) => keys.includes(`${n}${s}`))) { found.push("ittsuu"); break; }

  const tiles = Object.keys(count);
  if (tiles.every((t) => +t[0] >= 2 && +t[0] <= 8)) found.push("tanyao");
  if (new Set(tiles.map((t) => t[1])).size === 1) found.push("chinitsu");

  const hasTerm = (r) => r.n === 1 || r.n + 2 === 9;
  if (runs.every(hasTerm) && (pair.n === 1 || pair.n === 9)) found.push("junchan");

  return found;
}

let ok = 0, rejected = 0, invalid = 0;
const tally = {};
const N = 300000;
for (let i = 0; i < N; i++) {
  const h = samplePinfuTiles();
  if (!h) { invalid++; continue; }
  const acc = accidentalYaku(h);
  if (acc.length === 0) ok++;
  else { rejected++; for (const y of acc) tally[y] = (tally[y] || 0) + 1; }
}
const legal = N - invalid;
console.log(`\naccidental-yaku rejection at the tile stage (pinfu skeleton, ${legal} legal samples):`);
console.log(`  clean (exclusive pinfu only) : ${(100 * ok / legal).toFixed(1)}%  <- acceptance rate`);
console.log(`  rejected for extra yaku      : ${(100 * rejected / legal).toFixed(1)}%`);
for (const [y, c] of Object.entries(tally).sort((a, b) => b[1] - a[1]))
  console.log(`      ${y.padEnd(11)} ${(100 * c / legal).toFixed(2).padStart(6)}%`);
