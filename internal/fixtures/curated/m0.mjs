// Hand-verified M0 regression corpus. This is intentionally data-only so both
// scorer and generator tests can consume the same expectations.
//
// Every expectation here was computed by hand from the fu table, NOT read back
// from the implementation. That is the whole point: differential testing finds
// places where two implementations disagree, but only hand-verified cases catch
// a rule both of them get wrong the same way.
//
// Between them these pin every line of the fu table:
//   base 20 · menzen ron +10 · tsumo +2 · triplets 2/4/8 · kans 8/16/32
//   pair 0/2/4 · wait 0/2 · pinfu 20/30 · chiitoi 25 · kuipinfu 30 floor
//   ron-completed triplet scores open
export const m0Fixtures = [
  // ---- special-case fu totals ----
  {
    name: "chiitoitsu tanyao menzen tsumo is 4 han 25 fu",
    handInput: {
      closedTiles: [
        "2m", "2m", "3m", "3m", "4p", "4p", "5p", "5p", "6s", "6s", "7s", "7s", "8s",
      ],
      winningTile: { tile: "8s", isTsumo: true },
      gameState: {},
    },
    expected: {
      rawFu: 25,
      fu: 25,
      han: 4,
      basicPoints: 1600,
      yaku: ["chiitoitsu", "tanyao", "menzen-tsumo"],
    },
  },
  {
    name: "pinfu closed ron is 30 fu",
    handInput: {
      closedTiles: [
        "1m", "2m", "3m", "9p", "9p", "1s", "2s", "3s", "3s", "4s", "5s", "7s", "8s",
      ],
      winningTile: { tile: "9s", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 30, fu: 30, han: 1, basicPoints: 240, yaku: ["pinfu"] },
  },
  {
    name: "pinfu closed tsumo is 20 fu and takes no tsumo bonus",
    handInput: {
      closedTiles: [
        "1m", "2m", "3m", "9p", "9p", "1s", "2s", "3s", "3s", "4s", "5s", "7s", "8s",
      ],
      winningTile: { tile: "9s", isTsumo: true },
      gameState: {},
    },
    expected: {
      rawFu: 20,
      fu: 20,
      han: 2,
      basicPoints: 320,
      yaku: ["menzen-tsumo", "pinfu"],
    },
  },
  {
    name: "open all-run ron uses the kuipinfu 30-fu floor",
    handInput: {
      closedTiles: [
        "3p", "4p", "5p", "4p", "5p", "6p", "4s", "5s", "5s", "5s",
      ],
      openMelds: [{ type: "run", tiles: ["2m", "3m", "4m"], from: "east" }],
      winningTile: { tile: "6s", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 20, fu: 30, han: 1, basicPoints: 240, yaku: ["tanyao"] },
  },

  // ---- triplets ----
  {
    name: "closed triplet of simples is 4 fu, with tsumo +2 and tanki +2",
    handInput: {
      closedTiles: [
        "2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "5s", "5s", "8p",
      ],
      winningTile: { tile: "8p", isTsumo: true },
      gameState: {},
    },
    expected: {
      rawFu: 28,
      fu: 30,
      han: 2,
      basicPoints: 480,
      yaku: ["menzen-tsumo", "tanyao"],
    },
  },
  {
    name: "open triplet of simples is 2 fu",
    handInput: {
      closedTiles: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "8p", "8p"],
      openMelds: [{ type: "set", tiles: ["5s", "5s", "5s"], from: "south" }],
      winningTile: { tile: "4p", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 22, fu: 30, han: 1, basicPoints: 240, yaku: ["tanyao"] },
  },
  {
    name: "closed triplet of terminals is 8 fu, with a double wind pair (4) and kanchan (2)",
    handInput: {
      closedTiles: [
        "2m", "3m", "4m", "6m", "7m", "8m", "9s", "9s", "9s", "4p", "6p", "1z", "1z",
      ],
      winningTile: { tile: "5p", from: "north" },
      gameState: { roundWind: "east", seatWind: "east", isRiichi: true },
    },
    expected: { rawFu: 44, fu: 50, han: 1, basicPoints: 400, yaku: ["riichi"] },
  },
  {
    name: "open triplet of honors is 4 fu",
    handInput: {
      closedTiles: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "9p", "9p"],
      openMelds: [{ type: "set", tiles: ["5z", "5z", "5z"], from: "south" }],
      winningTile: { tile: "4p", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 24, fu: 30, han: 1, basicPoints: 240, yaku: ["haku"] },
  },
  {
    name: "ron-completed shanpon triplet uses open-triplet fu",
    handInput: {
      closedTiles: [
        "1m", "2m", "3m", "2p", "3p", "4p", "7p", "8p", "9p", "8m", "8m", "4p", "4p",
      ],
      winningTile: { tile: "8m", from: "north" },
      gameState: { isRiichi: true },
    },
    expected: { rawFu: 32, fu: 40, han: 1, basicPoints: 320, yaku: ["riichi"] },
  },

  // ---- kans ----
  {
    name: "open kan of simples is 8 fu",
    handInput: {
      closedTiles: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "8p", "8p"],
      openMelds: [
        { type: "daiminkan", tiles: ["5s", "5s", "5s", "5s"], from: "south" },
      ],
      winningTile: { tile: "4p", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 28, fu: 30, han: 1, basicPoints: 240, yaku: ["tanyao"] },
  },
  {
    name: "closed kan of simples is 16 fu, with a penchan wait (2)",
    handInput: {
      closedTiles: ["1p", "2p", "4s", "5s", "6s", "7s", "8s", "9s", "2m", "2m"],
      openMelds: [
        { type: "ankan", tiles: ["5m", "5m", "5m", "5m"], from: "east" },
      ],
      winningTile: { tile: "3p", from: "north" },
      gameState: { isRiichi: true },
    },
    expected: { rawFu: 48, fu: 50, han: 1, basicPoints: 400, yaku: ["riichi"] },
  },
  {
    name: "open kan of honors is 16 fu",
    handInput: {
      closedTiles: ["2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "9p", "9p"],
      openMelds: [
        { type: "daiminkan", tiles: ["5z", "5z", "5z", "5z"], from: "west" },
      ],
      winningTile: { tile: "4p", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 36, fu: 40, han: 1, basicPoints: 320, yaku: ["haku"] },
  },
  {
    name: "concealed honor kan is 32 fu and keeps menzen tsumo",
    handInput: {
      closedTiles: [
        "1m", "2m", "3m", "4m", "5m", "6m", "7p", "8p", "5s", "5s",
      ],
      openMelds: [
        { type: "ankan", tiles: ["7z", "7z", "7z", "7z"], from: "east" },
      ],
      winningTile: { tile: "9p", isTsumo: true },
      gameState: {},
    },
    expected: {
      rawFu: 54,
      fu: 60,
      han: 2,
      basicPoints: 960,
      yaku: ["menzen-tsumo", "chun"],
    },
  },

  // ---- pair ----
  {
    name: "dragon pair is 2 fu and blocks pinfu",
    handInput: {
      closedTiles: [
        "2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5s", "6s", "7z", "7z",
      ],
      winningTile: { tile: "7s", from: "north" },
      gameState: { isRiichi: true },
    },
    expected: { rawFu: 32, fu: 40, han: 1, basicPoints: 320, yaku: ["riichi"] },
  },

  // ---- iipeiko / ryanpeikou ----
  {
    name: "two identical runs are iipeiko",
    handInput: {
      closedTiles: [
        "2m", "3m", "4m", "2m", "3m", "4m", "5p", "6p", "7p", "7s", "8s", "8s", "8s",
      ],
      winningTile: { tile: "9s", from: "north" },
      gameState: {},
    },
    expected: {
      rawFu: 30,
      fu: 30,
      han: 2,
      basicPoints: 480,
      yaku: ["pinfu", "iipeiko"],
    },
  },
  {
    // Also a legal chiitoitsu (seven distinct pairs). Chiitoi reads as
    // 3 han 25 fu = 800; ryanpeikou reads as 5 han = mangan. Kotenho requires
    // the higher, so this fixture pins the interpretation ordering as well as
    // ryanpeikou itself.
    name: "ryanpeikou outscores the chiitoitsu reading of the same tiles",
    handInput: {
      closedTiles: [
        "2m", "3m", "4m", "2m", "3m", "4m", "6p", "7p", "8p", "6p", "7p", "5s", "5s",
      ],
      winningTile: { tile: "8p", from: "north" },
      gameState: {},
    },
    expected: {
      rawFu: 30,
      fu: 30,
      han: 5,
      basicPoints: 2000,
      yaku: ["pinfu", "tanyao", "ryanpeikou"],
    },
  },

  // ---- sanankou / suuankou ----
  {
    name: "three concealed triplets are sanankou",
    handInput: {
      closedTiles: [
        "2m", "2m", "2m", "5p", "5p", "5p", "8s", "8s", "8s", "4s", "5s", "9m", "9m",
      ],
      winningTile: { tile: "3s", from: "north" },
      gameState: {},
    },
    expected: {
      rawFu: 42,
      fu: 50,
      han: 2,
      basicPoints: 800,
      yaku: ["sanankou"],
    },
  },
  {
    // The same three triplets, but the last one is claimed off a discard via a
    // shanpon. It is then a minko, leaving only two concealed triplets — so no
    // sanankou, and the triplet takes open-triplet fu (2 rather than 4).
    name: "a ron-completed triplet does not count toward sanankou",
    handInput: {
      closedTiles: [
        "2m", "2m", "2m", "5p", "5p", "5p", "8s", "8s", "3s", "4s", "5s", "9m", "9m",
      ],
      winningTile: { tile: "8s", from: "north" },
      gameState: { isRiichi: true },
    },
    expected: {
      rawFu: 40,
      fu: 40,
      han: 1,
      basicPoints: 320,
      yaku: ["riichi"],
    },
  },
  {
    name: "four concealed triplets are suuankou, and it suppresses lesser yaku",
    handInput: {
      closedTiles: [
        "2m", "2m", "5p", "5p", "5p", "8s", "8s", "8s", "3p", "3p", "3p", "9m", "9m",
      ],
      winningTile: { tile: "2m", isTsumo: true },
      gameState: {},
    },
    expected: {
      rawFu: 38,
      fu: 40,
      han: 0,
      basicPoints: 8000,
      yaku: ["suuankou"],
    },
  },

  // ---- toitoi / honitsu / chinitsu ----
  {
    name: "all triplets is toitoi",
    handInput: {
      closedTiles: ["2m", "2m", "2m", "5p", "5p", "5p", "8s", "8s", "3s", "3s"],
      openMelds: [{ type: "set", tiles: ["9m", "9m", "9m"], from: "east" }],
      winningTile: { tile: "8s", from: "north" },
      gameState: {},
    },
    expected: { rawFu: 34, fu: 40, han: 2, basicPoints: 640, yaku: ["toitoi"] },
  },
  {
    name: "one suit plus honors is honitsu, 3 han closed",
    handInput: {
      closedTiles: [
        "2s", "3s", "6s", "7s", "8s", "5z", "5z", "5z", "1z", "1z", "1z", "9s", "9s",
      ],
      winningTile: { tile: "4s", from: "north" },
      gameState: { roundWind: "south", seatWind: "west" },
    },
    expected: {
      rawFu: 46,
      fu: 50,
      han: 4,
      basicPoints: 2000,
      yaku: ["haku", "honitsu"],
    },
  },
  {
    name: "honitsu is 2 han once the hand is opened",
    handInput: {
      closedTiles: [
        "6s", "7s", "5z", "5z", "5z", "1z", "1z", "1z", "9s", "9s",
      ],
      openMelds: [{ type: "run", tiles: ["2s", "3s", "4s"], from: "east" }],
      winningTile: { tile: "8s", from: "north" },
      gameState: { roundWind: "south", seatWind: "west" },
    },
    expected: {
      rawFu: 36,
      fu: 40,
      han: 3,
      basicPoints: 1280,
      yaku: ["haku", "honitsu"],
    },
  },
  {
    name: "one suit with no honors is chinitsu, and replaces honitsu",
    handInput: {
      closedTiles: [
        "3s", "4s", "4s", "5s", "6s", "6s", "7s", "8s", "9s", "9s", "9s", "1s", "1s",
      ],
      winningTile: { tile: "2s", from: "north" },
      gameState: {},
    },
    expected: {
      rawFu: 38,
      fu: 40,
      han: 6,
      basicPoints: 3000,
      yaku: ["chinitsu"],
    },
  },

  // ---- chanta / junchan / honroutou ----
  {
    name: "every set contains a terminal or honor: chanta, 2 han closed",
    handInput: {
      closedTiles: [
        "1m", "2m", "7p", "8p", "9p", "1z", "1z", "1z", "9s", "9s", "9s", "9m", "9m",
      ],
      winningTile: { tile: "3m", from: "north" },
      gameState: { roundWind: "south", seatWind: "west" },
    },
    expected: {
      rawFu: 48,
      fu: 50,
      han: 2,
      basicPoints: 800,
      yaku: ["chanta"],
    },
  },
  {
    name: "the same shape without honors is junchan, 3 han closed",
    handInput: {
      closedTiles: [
        "1m", "2m", "7p", "8p", "9p", "1s", "1s", "1s", "9s", "9s", "9s", "9m", "9m",
      ],
      winningTile: { tile: "3m", from: "north" },
      gameState: { roundWind: "south", seatWind: "west" },
    },
    expected: {
      rawFu: 48,
      fu: 50,
      han: 3,
      basicPoints: 1600,
      yaku: ["junchan"],
    },
  },
  {
    // Nothing but terminals and honors, so no run is possible and the hand is
    // honroutou rather than chanta. Won by ron on a shanpon, which demotes that
    // triplet to a minko — leaving three concealed, so sanankou not suuankou.
    name: "all terminals and honors is honroutou, not chanta",
    handInput: {
      closedTiles: [
        "1m", "1m", "9p", "9p", "9p", "1z", "1z", "1z", "5z", "5z", "5z", "9s", "9s",
      ],
      winningTile: { tile: "1m", from: "north" },
      gameState: { roundWind: "south", seatWind: "west" },
    },
    expected: {
      rawFu: 58,
      fu: 60,
      han: 7,
      basicPoints: 3000,
      yaku: ["haku", "sanankou", "toitoi", "honroutou"],
    },
  },
];
