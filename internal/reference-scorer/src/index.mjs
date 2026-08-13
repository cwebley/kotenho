// Reference scorer — an INDEPENDENT riichi scoring implementation.
//
// Purpose (see docs/DESIGN.md §10 M1, §11.1):
//   1. the measurement verifier for the convergence spike, where riichi-score's
//      partial yaku coverage would inflate acceptance rates;
//   2. the differential-testing counterpart for riichi-score itself.
//
// It must NEVER share code with riichi-score and is NEVER published or imported
// at runtime. Its independence is the entire point: code shared with the thing
// it checks cannot catch that thing's bugs.


// ─────────────────────────── tiles ───────────────────────────
const SUITS = ["m", "p", "s"];
const ALL_TILES = [];
for (const s of SUITS) for (let n = 1; n <= 9; n++) ALL_TILES.push(`${n}${s}`);
for (let n = 1; n <= 7; n++) ALL_TILES.push(`${n}z`);
const IDX = Object.fromEntries(ALL_TILES.map((t, i) => [t, i]));

const num = (t) => +t[0];
const suit = (t) => t[1];
const isHonor = (t) => t[1] === "z";
const isDragon = (t) => isHonor(t) && num(t) >= 5;
const isTerminal = (t) => !isHonor(t) && (num(t) === 1 || num(t) === 9);
const isTH = (t) => isHonor(t) || isTerminal(t);
const isSimple = (t) => !isTH(t);

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

function toCounts(tiles) {
  const c = {};
  for (const t of tiles) c[t] = (c[t] || 0) + 1;
  return c;
}

// ─────────────────────────── parser ───────────────────────────
// Enumerate every way to read 14 tiles as 4 groups + a pair (plus chiitoi).

function decompose(counts) {
  const first = ALL_TILES.find((t) => counts[t] > 0);
  if (first === undefined) return [[]];
  const out = [];

  if (counts[first] >= 3) {
    counts[first] -= 3;
    for (const rest of decompose(counts))
      out.push([{ type: "trip", tiles: [first, first, first] }, ...rest]);
    counts[first] += 3;
  }
  if (!isHonor(first) && num(first) <= 7) {
    const b = `${num(first) + 1}${suit(first)}`;
    const c = `${num(first) + 2}${suit(first)}`;
    if (counts[b] > 0 && counts[c] > 0) {
      counts[first]--; counts[b]--; counts[c]--;
      for (const rest of decompose(counts))
        out.push([{ type: "run", tiles: [first, b, c] }, ...rest]);
      counts[first]++; counts[b]++; counts[c]++;
    }
  }
  return out;
}

function parseStandard(tiles) {
  const counts = toCounts(tiles);
  const out = [];
  for (const t of ALL_TILES) {
    if ((counts[t] || 0) < 2) continue;
    counts[t] -= 2;
    for (const groups of decompose(counts))
      if (groups.length === 4) out.push({ pair: t, groups });
    counts[t] += 2;
  }
  return out;
}

// For a parse, enumerate every position the winning tile could occupy.
function waitReadings(parse, winTile) {
  const out = [];
  if (parse.pair === winTile)
    out.push({ ...parse, wait: "tanki", hostIdx: -1 });

  parse.groups.forEach((g, i) => {
    if (!g.tiles.includes(winTile)) return;
    if (g.type === "trip") {
      out.push({ ...parse, wait: "shanpon", hostIdx: i });
      return;
    }
    const n = num(g.tiles[0]);
    const w = num(winTile);
    if (w === n + 1) { out.push({ ...parse, wait: "kanchan", hostIdx: i }); return; }
    // winning on an end: penchan iff the remaining two tiles are edge-locked
    if (w === n)      out.push({ ...parse, wait: n + 3 > 9 ? "penchan" : "ryanmen", hostIdx: i });
    else              out.push({ ...parse, wait: n - 1 < 1 ? "penchan" : "ryanmen", hostIdx: i });
  });
  return out;
}

const groupKey = (g) => `${g.type}:${g.tiles.join("")}`;
function interpKey(p) {
  const host = p.hostIdx >= 0 ? groupKey(p.groups[p.hostIdx]) : "pair";
  return `${p.pair}|${p.groups.map(groupKey).sort().join(",")}|${p.wait}|${host}`;
}

function allInterpretations(tiles, winTile) {
  const seen = new Map();
  for (const parse of parseStandard(tiles))
    for (const r of waitReadings(parse, winTile))
      if (!seen.has(interpKey(r))) seen.set(interpKey(r), r);
  // chiitoi
  const c = toCounts(tiles);
  const keys = Object.keys(c);
  if (keys.length === 7 && keys.every((k) => c[k] === 2))
    seen.set("chiitoi", { chiitoi: true, tiles, wait: "tanki", groups: [], pair: winTile, hostIdx: -1 });
  return [...seen.values()];
}

// ─────────────────────────── scoring ───────────────────────────

function fuOf(p, ctx) {
  if (p.chiitoi) return { raw: 25, fu: 25 };
  const menzen = !ctx.open;
  const allRuns = p.groups.every((g) => g.type === "run");
  const pairYaku = isDragon(p.pair) || p.pair === ctx.roundWind || p.pair === ctx.seatWind;
  const pinfuShape = allRuns && !pairYaku && p.wait === "ryanmen";
  if (pinfuShape && menzen) return { raw: 20, fu: ctx.tsumo ? 20 : 30 };
  if (pinfuShape) return { raw: 20, fu: 30 };

  let f = 20;
  if (!ctx.tsumo && menzen) f += 10;
  if (ctx.tsumo) f += 2;
  p.groups.forEach((g, i) => {
    if (g.type !== "trip") return;
    // a triplet completed by RON scores as an open triplet
    const openTrip = !ctx.tsumo && p.wait === "shanpon" && i === p.hostIdx;
    const th = isTH(g.tiles[0]);
    f += openTrip ? (th ? 4 : 2) : th ? 8 : 4;
  });
  if (p.pair === ctx.roundWind && p.pair === ctx.seatWind) f += 4;
  else if (pairYaku) f += 2;
  if (["kanchan", "penchan", "tanki"].includes(p.wait)) f += 2;
  return { raw: f, fu: Math.ceil(f / 10) * 10 };
}

function yakuOf(p, ctx) {
  const y = [];
  const add = (n, h) => y.push({ name: n, han: h });
  if (p.chiitoi) {
    add("chiitoi", 2);
    if (p.tiles.every(isSimple)) add("tanyao", 1);
    if (ctx.tsumo && !ctx.open) add("menzen-tsumo", 1);
    const suits = new Set(p.tiles.filter((t) => !isHonor(t)).map(suit));
    if (suits.size === 1 && p.tiles.every((t) => !isHonor(t))) add("chinitsu", 6);
    else if (suits.size === 1) add("honitsu", 3);
    return y;
  }

  const all = [p.pair, p.pair, ...p.groups.flatMap((g) => g.tiles)];
  const runs = p.groups.filter((g) => g.type === "run");
  const trips = p.groups.filter((g) => g.type === "trip");
  const closed = !ctx.open;

  if (ctx.tsumo && closed) add("menzen-tsumo", 1);

  const pairYaku = isDragon(p.pair) || p.pair === ctx.roundWind || p.pair === ctx.seatWind;
  if (closed && runs.length === 4 && !pairYaku && p.wait === "ryanmen") add("pinfu", 1);

  if (all.every(isSimple)) add("tanyao", 1);

  for (const g of trips) {
    const t = g.tiles[0];
    if (t === ctx.roundWind) add("round-wind", 1);
    if (t === ctx.seatWind) add("seat-wind", 1);
    if (isDragon(t)) add(`dragon-${t}`, 1);
  }

  if (closed) {
    const rc = {};
    for (const r of runs) rc[r.tiles.join("")] = (rc[r.tiles.join("")] || 0) + 1;
    const pairs = Object.values(rc).reduce((a, n) => a + Math.floor(n / 2), 0);
    if (pairs >= 2) add("ryanpeikou", 3);
    else if (pairs === 1) add("iipeiko", 1);
  }

  for (let n = 1; n <= 7; n++)
    if (SUITS.every((s) => runs.some((r) => r.tiles[0] === `${n}${s}`))) { add("sanshoku", closed ? 2 : 1); break; }
  for (let n = 1; n <= 9; n++)
    if (SUITS.every((s) => trips.some((t) => t.tiles[0] === `${n}${s}`))) { add("sanshoku-doukou", 2); break; }
  for (const s of SUITS)
    if ([1, 4, 7].every((n) => runs.some((r) => r.tiles[0] === `${n}${s}`))) { add("ittsuu", closed ? 2 : 1); break; }

  if (trips.length === 4) add("toitoi", 2);
  const concealedTrips = trips.filter((g) => {
    const i = p.groups.indexOf(g);
    return !(!ctx.tsumo && p.wait === "shanpon" && i === p.hostIdx);
  }).length;
  if (concealedTrips >= 4) add("suuankou", 13);
  else if (concealedTrips === 3) add("sanankou", 2);

  const sets = [{ tiles: [p.pair] }, ...p.groups];
  if (sets.every((g) => g.tiles.some(isTH))) {
    if (all.every(isTH)) add("honroutou", 2);
    else if (all.every((t) => !isHonor(t))) add("junchan", closed ? 3 : 2);
    else add("chanta", closed ? 2 : 1);
  }

  const nonHonorSuits = new Set(all.filter((t) => !isHonor(t)).map(suit));
  const anyHonor = all.some(isHonor);
  if (nonHonorSuits.size === 1 && !anyHonor) add("chinitsu", closed ? 6 : 5);
  else if (nonHonorSuits.size === 1 && anyHonor) add("honitsu", closed ? 3 : 2);

  return y;
}

function basicPoints(han, fu) {
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return 2000;
  return Math.min(fu * 2 ** (2 + han), 2000);
}

function score(p, ctx) {
  const { fu } = fuOf(p, ctx);
  const yaku = yakuOf(p, ctx);
  const han = yaku.reduce((a, y) => a + y.han, 0) + ctx.dora;
  return { fu, yaku, han, points: yaku.length ? basicPoints(han, fu) : -1 };
}


export {
  ALL_TILES, SUITS, num, suit, isHonor, isDragon, isTerminal, isTH, isSimple,
  toCounts, decompose, parseStandard, waitReadings, groupKey, interpKey,
  allInterpretations, fuOf, yakuOf, basicPoints, score,
};
