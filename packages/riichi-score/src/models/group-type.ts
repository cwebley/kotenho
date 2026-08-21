/**
 * The structural shape of a group. `triplet` covers both a concealed triplet
 * and a called pon; whether it was called is carried by the meld type union in
 * `hand-input.ts`, not by this name.
 */
export type GroupType =
  | "run"
  | "triplet"
  | "daiminkan"
  | "shouminkan"
  | "ankan";
