// Reference scorer — an INDEPENDENT riichi scoring implementation.
//
// Purpose:
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

// groupCount is 4 minus the number of declared melds: melds are fixed and must
// not be re-parsed, so only the concealed portion is decomposed.
function parseStandard(tiles, groupCount = 4) {
  const counts = toCounts(tiles);
  const out = [];
  for (const t of ALL_TILES) {
    if ((counts[t] || 0) < 2) continue;
    counts[t] -= 2;
    for (const groups of decompose(counts))
      if (groups.length === groupCount) out.push({ pair: t, groups });
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

// Openness is read off the groups (a called meld sets `called`), never passed
// in — an ankan is a declared meld that leaves the hand concealed.
const isMenzen = (p) => p.groups.every((g) => !g.called);

function fuOf(p, ctx) {
  if (p.chiitoi) return { raw: 25, fu: 25 };
  const menzen = isMenzen(p);
  const allRuns = p.groups.every((g) => g.type === "run");
  const pairYaku = isDragon(p.pair) || p.pair === ctx.roundWind || p.pair === ctx.seatWind;
  const pinfuShape = allRuns && !pairYaku && p.wait === "ryanmen";
  if (pinfuShape && menzen) return { raw: 20, fu: ctx.tsumo ? 20 : 30 };
  if (pinfuShape) return { raw: 20, fu: 30 };

  let f = 20;
  if (!ctx.tsumo && menzen) f += 10;
  if (ctx.tsumo) f += 2;
  p.groups.forEach((g, i) => {
    if (g.type === "run") return;
    const th = isTH(g.tiles[0]);
    if (g.type === "kan") {
      f += g.called ? (th ? 16 : 8) : th ? 32 : 16;
      return;
    }
    // A called triplet is open; so is one completed by RON, even though the
    // hand itself stays concealed.
    const open =
      g.called || (!ctx.tsumo && p.wait === "shanpon" && i === p.hostIdx);
    f += open ? (th ? 4 : 2) : th ? 8 : 4;
  });
  if (p.pair === ctx.roundWind && p.pair === ctx.seatWind) f += 4;
  else if (pairYaku) f += 2;
  if (["kanchan", "penchan", "tanki"].includes(p.wait)) f += 2;
  return { raw: f, fu: Math.ceil(f / 10) * 10 };
}

// Yaku declared by game state rather than hand shape. They never appear by
// accident, but a hand whose only yaku is riichi is invalid without them.
function addDeclaredYaku(add, p, ctx) {
  const menzen = p.chiitoi || isMenzen(p);
  if (menzen && ctx.doubleRiichi) add("double-riichi", 2);
  else if (menzen && ctx.riichi) add("riichi", 1);
  if (menzen && (ctx.riichi || ctx.doubleRiichi) && ctx.ippatsu) {
    add("ippatsu", 1);
  }
  if (ctx.tsumo && ctx.haitei) add("haitei", 1);
  if (!ctx.tsumo && ctx.houtei) add("houtei", 1);
  if (ctx.tsumo && ctx.rinshan) add("rinshan-kaihou", 1);
  if (!ctx.tsumo && ctx.chankan) add("chankan", 1);
}

function yakuOf(p, ctx) {
  const y = [];
  const add = (n, h) => y.push({ name: n, han: h });
  addDeclaredYaku(add, p, ctx);
  if (p.chiitoi) {
    add("chiitoi", 2);
    if (p.tiles.every(isSimple)) add("tanyao", 1);
    if (ctx.tsumo) add("menzen-tsumo", 1); // chiitoi is always concealed
    const suits = new Set(p.tiles.filter((t) => !isHonor(t)).map(suit));
    if (suits.size === 1 && p.tiles.every((t) => !isHonor(t))) add("chinitsu", 6);
    else if (suits.size === 1) add("honitsu", 3);
    return y;
  }

  const all = [p.pair, p.pair, ...p.groups.flatMap((g) => g.tiles)];
  const runs = p.groups.filter((g) => g.type === "run");
  // Kans behave as triplets for every yaku that counts them.
  const trips = p.groups.filter((g) => g.type === "trip" || g.type === "kan");
  const closed = isMenzen(p);

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
    if (g.called) return false;
    const i = p.groups.indexOf(g);
    return !(!ctx.tsumo && p.wait === "shanpon" && i === p.hostIdx);
  }).length;
  if (concealedTrips >= 4) add("suuankou", 13);
  else if (concealedTrips === 3) add("sanankou", 2);

  const kans = p.groups.filter((g) => g.type === "kan").length;
  if (kans >= 4) add("suukantsu", 13);
  else if (kans === 3) add("sankantsu", 2);

  const isWind = (t) => isHonor(t) && num(t) <= 4;
  const dragonTrips = trips.filter((g) => isDragon(g.tiles[0])).length;
  if (dragonTrips >= 3) add("daisangen", 13);
  else if (dragonTrips === 2 && isDragon(p.pair)) add("shousangen", 2);

  const windTrips = trips.filter((g) => isWind(g.tiles[0])).length;
  if (windTrips >= 4) add("daisuushii", 13);
  else if (windTrips === 3 && isWind(p.pair)) add("shousuushii", 13);

  // 1112345678999 of one suit plus any duplicate, fully concealed.
  if (closed && all.length === 14 && !all.some(isHonor) &&
      new Set(all.map(suit)).size === 1) {
    const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    const counts = new Array(9).fill(0);
    for (const t of all) counts[num(t) - 1]++;
    let surplus = 0;
    let ok = true;
    for (let i = 0; i < 9; i++) {
      const extra = counts[i] - base[i];
      if (extra < 0) ok = false;
      surplus += extra;
    }
    if (ok && surplus === 1) add("chuuren-poutou", 13);
  }

  const sets = [{ tiles: [p.pair] }, ...p.groups];
  if (sets.every((g) => g.tiles.some(isTH))) {
    if (all.every(isTH)) add("honroutou", 2);
    else if (all.every((t) => !isHonor(t))) add("junchan", closed ? 3 : 2);
    else add("chanta", closed ? 2 : 1);
  }

  const GREEN = ["2s", "3s", "4s", "6s", "8s", "6z"];
  if (all.every(isHonor)) add("tsuuiisou", 13);
  else if (all.every(isTerminal)) add("chinroutou", 13);
  else if (all.every((t) => GREEN.includes(t))) add("ryuuiisou", 13);

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

// Every yakuman in this file is registered at 13 han; no ordinary yaku is.
const YAKUMAN_HAN = 13;

function score(p, ctx) {
  const { fu } = fuOf(p, ctx);
  const yaku = yakuOf(p, ctx);
  const han = yaku.reduce((a, y) => a + y.han, 0) + ctx.dora;
  // Yakuman stack: an all-honors hand of concealed triplets is both suuankou
  // and tsuuiisou, and is worth two.
  const yakumanCount = yaku.filter((y) => y.han === YAKUMAN_HAN).length;
  const points = yakumanCount
    ? 8000 * yakumanCount
    : basicPoints(han, fu);
  return { fu, yaku, han, points: yaku.length ? points : -1 };
}


// ─────────────────────── meld-aware entry point ───────────────────────

const AKA = { "0m": "5m", "0p": "5p", "0s": "5s" };
const norm = (t) => AKA[t] ?? t;

const MELD_KIND = {
  run: { type: "run", called: true },
  set: { type: "trip", called: true },
  daiminkan: { type: "kan", called: true },
  shouminkan: { type: "kan", called: true },
  ankan: { type: "kan", called: false }, // concealed: does not open the hand
};

/**
 * Score a riichi-score HandInput independently. Taking the same input shape is
 * deliberate — it removes a translation layer from the differential harness
 * that could itself introduce the bugs we are hunting. No scoring code is
 * shared; only the input format.
 *
 * Returns every valid reading, highest score first (kotenho).
 */
function scoreHand(handInput) {
  const melds = (handInput.openMelds ?? []).map((meld) => {
    const kind = MELD_KIND[meld.type];
    if (!kind) throw new Error(`unknown meld type: ${meld.type}`);
    return { ...kind, tiles: meld.tiles.map(norm) };
  });

  const winTile = norm(handInput.winningTile.tile);
  const concealed = [...handInput.closedTiles.map(norm), winTile];
  const ctx = {
    tsumo: Boolean(handInput.winningTile.isTsumo),
    roundWind: { east: "1z", south: "2z", west: "3z", north: "4z" }[
      handInput.gameState?.roundWind ?? "east"
    ],
    seatWind: { east: "1z", south: "2z", west: "3z", north: "4z" }[
      handInput.gameState?.seatWind ?? "south"
    ],
    riichi: Boolean(handInput.gameState?.isRiichi),
    doubleRiichi: Boolean(handInput.gameState?.isDoubleRiichi),
    ippatsu: Boolean(handInput.gameState?.isIppatsu),
    haitei: Boolean(handInput.gameState?.isHaitei),
    houtei: Boolean(handInput.gameState?.isHoutei),
    rinshan: Boolean(handInput.gameState?.isRinshan),
    chankan: Boolean(handInput.gameState?.isChankan),
    dora: 0,
  };

  const readings = [];
  for (const parse of parseStandard(concealed, 4 - melds.length)) {
    // The winning tile can only land in the concealed portion; melds are
    // appended afterwards so they are never treated as the wait.
    for (const reading of waitReadings(parse, winTile)) {
      readings.push({ ...reading, groups: [...reading.groups, ...melds] });
    }
  }

  if (!melds.length) {
    const counts = toCounts(concealed);
    const keys = Object.keys(counts);
    if (keys.length === 7 && keys.every((k) => counts[k] === 2)) {
      readings.push({
        chiitoi: true,
        tiles: concealed,
        wait: "tanki",
        groups: [],
        pair: winTile,
        hostIdx: -1,
      });
    }
  }

  const seen = new Map();
  for (const reading of readings) {
    const key = reading.chiitoi ? "chiitoi" : interpKey(reading);
    if (!seen.has(key)) seen.set(key, { ...reading, ...score(reading, ctx) });
  }

  const scored = [...seen.values()]
    .filter((entry) => entry.yaku.length > 0)
    .sort((a, b) => b.points - a.points);

  return { valid: scored.length > 0, readings: scored };
}

export {
  ALL_TILES, SUITS, num, suit, isHonor, isDragon, isTerminal, isTH, isSimple,
  toCounts, decompose, parseStandard, waitReadings, groupKey, interpKey,
  allInterpretations, fuOf, yakuOf, basicPoints, score, scoreHand,
};
