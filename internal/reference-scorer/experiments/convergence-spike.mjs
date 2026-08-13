import {
  ALL_TILES, SUITS, num, isHonor, isSimple, toCounts,
  allInterpretations, interpKey, score,
} from "../src/index.mjs";

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

// ─────────────────────────── generators ───────────────────────────

const randRun = () => { const s = pick(SUITS), n = 1 + rnd(7); return { type: "run", tiles: [`${n}${s}`, `${n + 1}${s}`, `${n + 2}${s}`] }; };
const randTrip = () => { const t = pick(ALL_TILES); return { type: "trip", tiles: [t, t, t] }; };

function legal(groups, pair) {
  const c = toCounts([...groups.flatMap((g) => g.tiles), pair, pair]);
  return Object.values(c).every((n) => n <= 4);
}

// pinfu: 4 closed runs + plain pair, ryanmen wait, closed ron -> 30 fu
function genPinfu(ctx) {
  const groups = [randRun(), randRun(), randRun(), randRun()];
  const pair = pick(ALL_TILES.filter((t) => !isHonor(t)));
  if (!legal(groups, pair)) return null;
  // a ryanmen-capable end of some run
  const opts = [];
  groups.forEach((g, i) => {
    const n = num(g.tiles[0]);
    if (n + 3 <= 9) opts.push({ w: g.tiles[0], i });
    if (n - 1 >= 1) opts.push({ w: g.tiles[2], i });
  });
  if (!opts.length) return null;
  const { w, i } = pick(opts);
  return { groups, pair, wait: "ryanmen", hostIdx: i, winTile: w,
           tiles: [...groups.flatMap((g) => g.tiles), pair, pair] };
}

// 3 closed runs + 1 closed simple triplet + plain pair, kanchan wait -> 40 fu
function genKanchan() {
  const groups = [randRun(), randRun(), randRun(),
                  { type: "trip", tiles: Array(3).fill(pick(ALL_TILES.filter(isSimple))) }];
  const pair = pick(ALL_TILES.filter((t) => !isHonor(t)));
  if (!legal(groups, pair)) return null;
  const i = rnd(3);
  return { groups, pair, wait: "kanchan", hostIdx: i, winTile: groups[i].tiles[1],
           tiles: [...groups.flatMap((g) => g.tiles), pair, pair] };
}

// 3 closed runs + 1 triplet completed by ron (shanpon) + plain pair -> 40 fu
function genShanpon() {
  const groups = [randRun(), randRun(), randRun(),
                  { type: "trip", tiles: Array(3).fill(pick(ALL_TILES.filter(isSimple))) }];
  const pair = pick(ALL_TILES.filter((t) => !isHonor(t)));
  if (!legal(groups, pair)) return null;
  return { groups, pair, wait: "shanpon", hostIdx: 3, winTile: groups[3].tiles[0],
           tiles: [...groups.flatMap((g) => g.tiles), pair, pair] };
}

// ─────────────────────────── experiment ───────────────────────────

function run(name, gen, targetFu, targetYaku, N = 60000) {
  const ctx = { open: false, tsumo: false, roundWind: "1z", seatWind: "2z", dora: 0 };
  let built = 0, contentOk = 0, uniqueMax = 0, tied = 0, beaten = 0;
  let tieSameScore = 0, tieDiffWait = 0, beatenSpecStillOk = 0;
  const beatenBy = {};

  for (let k = 0; k < N; k++) {
    const h = gen(ctx);
    if (!h) continue;
    built++;
    const intended = { pair: h.pair, groups: h.groups, wait: h.wait, hostIdx: h.hostIdx };
    const si = score(intended, ctx);

    // content filter: does the INTENDED reading match the spec exactly?
    const names = si.yaku.map((y) => y.name).sort();
    if (si.fu !== targetFu || names.join() !== targetYaku.join()) continue;
    contentOk++;

    const interps = allInterpretations(h.tiles, h.winTile).map((p) => ({ p, s: score(p, ctx) }));
    const best = Math.max(...interps.map((x) => x.s.points));
    const winners = interps.filter((x) => x.s.points === best);
    const iKey = interpKey(intended);
    const isWinner = winners.some((x) => interpKey(x.p) === iKey);

    if (isWinner && winners.length === 1) uniqueMax++;
    else if (isWinner) {
      tied++;
      const others = winners.filter((x) => interpKey(x.p) !== iKey);
      if (others.every((x) => x.s.fu === si.fu)) tieSameScore++;
      if (others.some((x) => x.p.wait !== h.wait)) tieDiffWait++;
    } else {
      beaten++;
      const w = winners[0];
      const wn = w.s.yaku.map((y) => y.name).sort();
      if (w.s.fu === targetFu && wn.join() === targetYaku.join()) beatenSpecStillOk++;
      const label = `${w.p.wait} ${w.s.fu}fu ${wn.join("+") || "-"}`;
      beatenBy[label] = (beatenBy[label] || 0) + 1;
    }
  }

  const pct = (x) => `${((100 * x) / contentOk).toFixed(1)}%`;
  console.log(`\n${"═".repeat(70)}\n${name}`);
  console.log(`  built ${built}, of which ${contentOk} match the spec on the intended reading`);
  console.log(`  ── does the intended reading survive as canonical? ──`);
  console.log(`    unique highest score : ${pct(uniqueMax).padStart(7)}   ${uniqueMax}`);
  console.log(`    tied for highest     : ${pct(tied).padStart(7)}   ${tied}`);
  console.log(`        same fu & score  : ${tieSameScore}   (answer key identical -> harmless)`);
  console.log(`        different wait   : ${tieDiffWait}   (ambiguous if the lesson asks for the wait)`);
  console.log(`    beaten               : ${pct(beaten).padStart(7)}   ${beaten}`);
  console.log(`        winner still meets spec : ${beatenSpecStillOk}  (recoverable -- relabel, don't discard)`);
  const salvage = uniqueMax + tied + beatenSpecStillOk;
  console.log(`  ── USABLE HANDS: ${pct(salvage)} ──`);
  if (beaten) {
    console.log(`  beaten by:`);
    for (const [k, v] of Object.entries(beatenBy).sort((a, b) => b[1] - a[1]).slice(0, 6))
      console.log(`      ${String(v).padStart(5)}  ${k}`);
  }
}

run("SPEC A — pinfu only, 30 fu, closed ron", genPinfu, 30, ["pinfu"]);
run("SPEC B — 40 fu kanchan, no yaku but tanyao, closed ron", genKanchan, 40, ["tanyao"]);
run("SPEC C — 40 fu shanpon, no yaku but tanyao, closed ron", genShanpon, 40, ["tanyao"]);
