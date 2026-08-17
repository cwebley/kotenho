# riichi-score

Score completed riichi mahjong hands in JavaScript or TypeScript. The scorer
returns every valid interpretation, ordered by kōtenhō (highest basic points
first), with yaku, fu, dora, basic points, and payment breakdowns.

Requires Node.js 20 or later.

## Install

```sh
npm install riichi-score
```

## Score A Hand

```ts
import { calculate, createGameState } from "riichi-score";

const analysis = calculate({
  closedTiles: [
    "2m", "3m", "4m", "3p", "4p", "5p", "4s", "5s", "6s", "6m", "7m", "8m", "5z",
  ],
  openMelds: [],
  winningTile: { tile: "5z", from: "west" },
  gameState: createGameState({
    roundWind: "east",
    seatWind: "south",
    doraIndicators: ["4p"],
    isRiichi: true,
  }),
});

if (!analysis.valid) throw new Error(analysis.errors.join("\n"));

const score = analysis.handInterpretations[0];
console.log(score.yaku, score.fu, score.han, score.basicPoints, score.seatPayments);
```

Use `{ tile, isTsumo: true }` for a self-drawn winning tile. For ron, set the
source seat with `{ tile, from }`.

## Rulesets

`createGameState({ ruleset })` accepts `RulesetOptions`. Defaults are
Tenhou-flavored and exported as `TENHOU_RULESET`.

Supported switches include open tanyao, double-wind pair fu, open-pinfu floor,
kiriage mangan, kazoe yakuman, red-five supply, Kansai chiitoitsu, and the four
local double-yakuman variants.

```ts
createGameState({
  ruleset: {
    openTanyao: false,
    doubleYakuman: { daisuushii: true },
    kansaiChiitoitsu: true,
  },
});
```

## Results

Each `HandInterpretation` contains the winning grouping, yaku, itemized fu,
dora/ura/aka counts, `basicPoints`, `seatPayments`, and `totalWinnings`.

Named yakuman use the `limit` field. Consumers should use `limit` and
`basicPoints` for limit hands; `han` remains the accumulated numeric han field
and is not the limit payout.

`calculate`, `createGameState`, `createRuleset`, tile notation helpers, and the
public input/result types are exported from the package entry point.
