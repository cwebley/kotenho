export type YakuhaiName =
  | "round-wind"
  | "seat-wind"
  | "haku"
  | "hatsu"
  | "chun";

export type YakuName =
  | "chiitoitsu"
  | "kokushi-musou"
  | "menzen-tsumo"
  | "pinfu"
  | "riichi"
  | "tanyao"
  | YakuhaiName;

export interface YakuListing {
  name: YakuName;
  han: number;
}
