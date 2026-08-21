export type Direction = "east" | "south" | "west" | "north";

/**
 * The seat to a player's left. Chi may only be called from this player, which
 * makes a run's `from` fully determined by the winner's seat wind — and makes
 * any other value an impossible board state. `calculate` enforces it, because
 * only it knows the seat wind.
 */
export const KAMICHA: Record<Direction, Direction> = {
  east: "north",
  south: "east",
  west: "south",
  north: "west",
};
