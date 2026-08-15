// M3 — analyze() lesson-authoring spike.
//
// Runs the same lesson-shaped specs across many deterministic probes. The
// purpose is not to prove correctness; it is to expose specs whose search is
// technically feasible but operationally poor or repetitive.

import { analyze } from "riichi-hand-generator";

const RUNS = Number(process.env.RUNS ?? 100);
const SAMPLE_SIZE = Number(process.env.SAMPLE_SIZE ?? 100);

const SPECS = [
  ["30 fu closed ron", { fu: 30, closed: true, winMethod: "ron" }],
  ["40 fu closed ron", { fu: 40, closed: true, winMethod: "ron" }],
  ["40 fu closed tsumo", { fu: 40, closed: true, winMethod: "tsumo" }],
  ["50 fu closed ron", { fu: 50, closed: true, winMethod: "ron" }],
  ["40 fu closed kanchan", { fu: 40, closed: true, waitType: "kanchan" }],
  [
    "40 fu closed shanpon, unambiguous",
    { fu: 40, closed: true, waitType: "shanpon" },
    { requireUnambiguousWait: true },
  ],
  ["chiitoitsu", { handShape: "chiitoitsu" }],
  ["Kansai chiitoitsu", { handShape: "chiitoitsu", ruleset: { kansaiChiitoitsu: true } }],
  ["40 fu one called meld", { fu: 40, openMeldCount: 1 }],
  ["50 fu one kan", { fu: 50, kanCount: 1, doraIndicatorCount: 2 }],
  ["tanyao + pinfu, 3 han", { yaku: ["tanyao", "pinfu"], han: 3 }],
  ["menzen-tsumo only", { yaku: ["menzen-tsumo"], closed: true, winMethod: "tsumo" }],
  ["riichi only", { yaku: ["riichi"], closed: true, winMethod: "ron" }],
  [
    "riichi + menzen-tsumo",
    { yaku: ["riichi", "menzen-tsumo"], closed: true, winMethod: "tsumo" },
  ],
  ["pinfu + 3 dora", { yaku: ["pinfu"], han: 4 }],
  ["tanyao + 1 aka", { yaku: ["tanyao"], akaDora: 1 }],
  ["tanyao, 2 han bonus mix", { yaku: ["tanyao"], han: 2 }],
  ["riichi + tanyao, 3 han bonus mix", { yaku: ["riichi", "tanyao"], han: 3 }],
  ["chanta", { yaku: ["chanta"] }],
  ["junchan", { yaku: ["junchan"] }],
  ["chanta + sanshoku", { yaku: ["chanta", "sanshoku"] }],
  ["honroutou + toitoi", { yaku: ["honroutou", "toitoi"] }],
  ["shousangen + two dragons", { yaku: ["shousangen", "haku", "hatsu"] }],
  ["daisangen", { yaku: ["daisangen"] }],
  ["shousuushii", { yaku: ["shousuushii"] }],
  ["daisuushii", { yaku: ["daisuushii"] }],
  ["chinroutou", { yaku: ["chinroutou"] }],
  ["tsuuiisou", { yaku: ["tsuuiisou"] }],
  ["tsuuiisou chiitoitsu", { yaku: ["tsuuiisou"], handShape: "chiitoitsu" }],
  ["ryuuiisou", { yaku: ["ryuuiisou"] }],
  ["chuuren-poutou", { yaku: ["chuuren-poutou"] }],
  ["kokushi-musou", { yaku: ["kokushi-musou"] }],
  ["rinshan-kaihou", { yaku: ["rinshan-kaihou"] }],
  ["chankan", { yaku: ["chankan"] }],
  ["tenhou", { yaku: ["tenhou"] }],
  ["chiihou", { yaku: ["chiihou"] }],
  ["junchan + chinitsu", { yaku: ["junchan", "chinitsu"] }],
  ["chiitoitsu + 1 dora", { handShape: "chiitoitsu", dora: 1 }],
  ["haitei", { yaku: ["haitei"] }],
  ["houtei", { yaku: ["houtei"] }],
];

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
};

const mean = (values) =>
  values.reduce((total, value) => total + value, 0) / (values.length || 1);

const pct = (value) => `${(100 * value).toFixed(1)}%`;

console.log(
  `M3 analyze spike — ${RUNS} probes/spec, ${SAMPLE_SIZE} candidate attempts/probe\n`,
);
console.log(
  `${"spec".padEnd(36)} ${"yield mean/p10/p90".padEnd(24)} ` +
    `${"distinct mean/p10/p90".padEnd(26)} zero-yield static-false`,
);
console.log("-".repeat(112));

for (const [label, spec, extra = {}] of SPECS) {
  const yields = [];
  const distinct = [];
  let staticFalse = 0;
  let zeroYield = 0;
  let reason;
  const rejections = {};

  for (let seed = 0; seed < RUNS; seed++) {
    const result = analyze(spec, {
      ...extra,
      seed,
      sampleSize: SAMPLE_SIZE,
    });
    if (!result.feasible) {
      staticFalse++;
      reason ??= result.reason;
      continue;
    }
    for (const [cause, count] of Object.entries(result.rejections)) {
      rejections[cause] = (rejections[cause] ?? 0) + count;
    }
    yields.push(result.estimatedYield);
    distinct.push(result.distinctRatio);
    if (result.estimatedYield === 0) zeroYield++;
  }

  const yieldSummary = yields.length
    ? `${pct(mean(yields))}/${pct(percentile(yields, 0.1))}/${pct(percentile(yields, 0.9))}`
    : "n/a";
  const distinctSummary = distinct.length
    ? `${pct(mean(distinct))}/${pct(percentile(distinct, 0.1))}/${pct(percentile(distinct, 0.9))}`
    : "n/a";
  console.log(
    `${label.padEnd(36)} ${yieldSummary.padEnd(24)} ${distinctSummary.padEnd(26)} ` +
      `${zeroYield} ${staticFalse}`,
  );
  if (reason) console.log(`  static reason: ${reason}`);
  const topRejections = Object.entries(rejections)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  if (topRejections.length) {
    console.log(
      `  rejection causes: ${topRejections
        .map(([cause, count]) => `${cause} ${count}`)
        .join("  ")}`,
    );
  }
}
