export type YakuhaiName =
  | "round-wind"
  | "seat-wind"
  | "haku"
  | "hatsu"
  | "chun";

/**
 * Composite yakuman stack: two *different* yakuman in one hand is a genuine
 * double, and this is standard rather than a local rule. Distinct from the
 * local variation where a single hand (kokushi 13-wait, suuankou tanki) counts
 * double on its own — that is not applied here.
 */
export type Limit =
  | "yakuman"
  | "double-yakuman"
  | "triple-yakuman"
  | "quadruple-yakuman";

export const LIMIT_BY_COUNT: Limit[] = [
  "yakuman",
  "double-yakuman",
  "triple-yakuman",
  "quadruple-yakuman",
];

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
  | "toitoi"
  | "honitsu"
  | "chinitsu"
  | "chanta"
  | "junchan"
  | "honroutou"
  | "sanshoku"
  | "sanshoku-doukou"
  | "ittsuu"
  | "shousangen"
  | "sankantsu"
  | "daisangen"
  | "shousuushii"
  | "daisuushii"
  | "tsuuiisou"
  | "chinroutou"
  | "ryuuiisou"
  | "chuuren-poutou"
  | "suukantsu"
  | "tenhou"
  | "chiihou"
  | YakuhaiName;

export interface YakuListing {
  name: YakuName;
  han: number;
  limit?: Limit;
}
