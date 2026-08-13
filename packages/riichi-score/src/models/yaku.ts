export type YakuhaiName =
  | "round-wind"
  | "seat-wind"
  | "haku"
  | "hatsu"
  | "chun";

export type Limit = "yakuman" | "double-yakuman";

export type YakuName =
  | "chiitoitsu"
  | "kokushi-musou"
  | "menzen-tsumo"
  | "pinfu"
  | "riichi"
  | "double-riichi"
  | "ippatsu"
  | "haitei"
  | "houtei"
  | "rinshan-kaihou"
  | "chankan"
  | "tanyao"
  | "iipeiko"
  | "ryanpeikou"
  | "sanankou"
  | "suuankou"
  | YakuhaiName;

export interface YakuListing {
  name: YakuName;
  han: number;
  limit?: Limit;
}
