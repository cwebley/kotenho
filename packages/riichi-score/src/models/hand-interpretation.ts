import { MahjongTile } from "./mahjong-tile.js";
import { WaitType } from "./wait-type.js";
import { GameState } from "./game-state.js";
import { WinningTile } from "./winning-tile.js";
import { YakuListing } from "./yaku.js";
import { FuListing, TotalFuValue } from "../parsing/parse-fu.js";
import { StandardPair } from "./standard-pair.js";
import { StandardGroup } from "./standard-group.js";
import { SeatPayment } from "../utils/calculate-seat-payments.js";

export interface BaseHandInterpretation {
  winningTile: WinningTile;
  waitType: WaitType;
  gameState: GameState;
  yaku: YakuListing[];
  fuList: FuListing[];
  rawFu: number;
  fu: TotalFuValue;
  basicPoints: number;
  han: number;
  seatPayments: SeatPayment[];
  totalWinnings: number;
  isTsumo?: boolean;
  dora: number;
  akadora: number;
  uradora: number;
}

export interface StandardHandInterpretation extends BaseHandInterpretation {
  isStandardHand: true;
  pair: StandardPair;
  groups: StandardGroup[];
}

export interface NonStandardHandInterpretation extends BaseHandInterpretation {
  isStandardHand?: false;
  tiles: MahjongTile[];
}

export type HandInterpretation =
  | StandardHandInterpretation
  | NonStandardHandInterpretation;

export interface HandInterpretationOptions {
  isStandardHand: boolean;

  // only for standard hands
  pair?: StandardPair;
  groups?: StandardGroup[];

  // only for non standard hands
  tiles?: MahjongTile[];

  // for all hands
  winningTile: WinningTile;
  waitType: WaitType;
  gameState: GameState;

  basicPoints?: number;
  isTsumo?: boolean;
  yaku?: YakuListing[];
  fuList?: FuListing[];
  rawFu?: number;
  fu?: TotalFuValue;
  han?: number;
  seatPayments?: SeatPayment[];
  totalWinnings?: number;
  dora?: number;
  akadora?: number;
  uradora?: number;
}

export function createHandInterpretation(
  hio: HandInterpretationOptions,
): HandInterpretation {
  if (hio.isStandardHand) {
    return {
      ...hio,
      isStandardHand: true,
      pair: hio.pair!,
      groups: hio.groups!,

      basicPoints: hio.basicPoints ?? 0,
      seatPayments: hio.seatPayments ?? [],
      totalWinnings: hio.totalWinnings ?? 0,
      isTsumo: hio.isTsumo ?? false,
      yaku: hio.yaku ?? [],
      fuList: hio.fuList ?? [],
      rawFu: hio.rawFu ?? 0,
      fu: hio.fu ?? 0,
      han: hio.han ?? 0,
      dora: hio.dora ?? 0,
      akadora: hio.akadora ?? 0,
      uradora: hio.uradora ?? 0,
    };
  } else {
    return {
      ...hio,
      isStandardHand: false,
      tiles: hio.tiles!,

      basicPoints: hio.basicPoints ?? 0,
      seatPayments: hio.seatPayments ?? [],
      totalWinnings: hio.totalWinnings ?? 0,
      isTsumo: hio.isTsumo ?? false,
      yaku: hio.yaku ?? [],
      fuList: hio.fuList ?? [],
      rawFu: hio.rawFu ?? 0,
      fu: hio.fu ?? 0,
      han: hio.han ?? 0,
      dora: hio.dora ?? 0,
      akadora: hio.akadora ?? 0,
      uradora: hio.uradora ?? 0,
    };
  }
}
