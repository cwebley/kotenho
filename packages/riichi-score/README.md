# riichi-score

A JavaScript/TypeScript library for calculating riichi mahjong hand scores.

## Features

- Automatically calculates fu (hand points), han (hand value), and final basic points.
- Handles standard and non-standard hands, open and closed melds, seat winds, dora indicators, and more.
- Returns details such as fu breakdown, yaku list, and seat payments.

## Installation

```bash
npm install riichi-score
```

## Usage

```js
import { calculate, createGameState } from "riichi-score";

// 1. Create or structure your hand data
const handData = {
  closedTiles: ["1m", "2m", "3m", "9p", "9p", "9p", "4z", "4z", "4z", "7z"],
  openMelds: [
    {
      type: "set",
      tiles: ["6z", "6z", "6z"],
      from: "north",
    },
  ],
  winningTile: {
    tile: "7z",
    from: "north", // ron
    // for tsumo, you can set isTsumo: true and omit `from`.
  },
  gameState: createGameState({
    roundWind: "east",
    seatWind: "east",
    doraIndicators: ["1m"],
    uradoraIndicators: ["6z"],
  }),
};

// 2. Calculate the hand result
const result = calculate(handData);

/*
{
    "valid": true,
    "errors": [],
    "handInterpretations": [
        {
            "isStandardHand": true,
            "waitType": "tanki",
            "pair": {
                "tiles": [
                    "7z",
                    "7z"
                ],
                "isFinalWait": true
            },
            "groups": [
                {
                    "tiles": [
                        "1m",
                        "2m",
                        "3m"
                    ],
                    "type": "run",
                    "open": false,
                    "isFinalWait": false
                },
                {
                    "tiles": [
                        "9p",
                        "9p",
                        "9p"
                    ],
                    "type": "set",
                    "open": false,
                    "isFinalWait": false
                },
                {
                    "tiles": [
                        "4z",
                        "4z",
                        "4z"
                    ],
                    "type": "set",
                    "open": false,
                    "isFinalWait": false
                },
                {
                    "tiles": [
                        "6z",
                        "6z",
                        "6z"
                    ],
                    "type": "set",
                    "open": true,
                    "from": "north",
                    "isFinalWait": false
                }
            ],
            "winningTile": {
                "tile": "7z",
                "from": "north"
            },
            "gameState": {
                "roundWind": "east",
                "seatWind": "east",
                "doraIndicators": [
                    "1m"
                ],
                "uradoraIndicators": [
                    "6z"
                ],
                "isRiichi": false,
                "honbaCount": 0
            },
            "basicPoints": 2000,
            "seatPayments": [
                {
                    "seat": "north",
                    "value": 12000
                }
            ],
            "totalWinnings": 12000,
            "isTsumo": false,
            "yaku": [
                {
                    "name": "hatsu",
                    "han": 1
                }
            ],
            "fuList": [
                {
                    "reason": "base",
                    "value": 20
                },
                {
                    "reason": "yakuhai pair",
                    "value": 2
                },
                {
                    "reason": "tanki wait",
                    "value": 2
                },
                {
                    "reason": "closed triplet of terminals/honors",
                    "value": 8
                },
                {
                    "reason": "closed triplet of terminals/honors",
                    "value": 8
                },
                {
                    "reason": "open triplet of terminals/honors",
                    "value": 4
                }
            ],
            "rawFu": 44,
            "fu": 50,
            "han": 4,
            "dora": 1,
            "akadora": 0,
            "uradora": 2
        }
    ]
}
*/
```

```

```
