import { Direction } from "../models/direction.js";
import { HandInterpretation } from "../models/hand-interpretation.js";

export interface SeatPayment {
  seat: Direction;
  value: number;
}

/**
 * Given a HandInterpretation that has basicPoints calculated, it adds a seatPayments array showing what each seat owes
 * TODO: add tests for this
 */
export function calcaulateSeatPayments(
  handInterpretation: HandInterpretation,
): SeatPayment[] {
  const ALL_DIRECTIONS: Direction[] = ["east", "south", "west", "north"];

  const otherSeats: Direction[] = ALL_DIRECTIONS.filter(
    (dir) => dir !== handInterpretation.gameState.seatWind,
  );

  let seatPayments: SeatPayment[] = [];

  // handle winning hand is the dealer
  if (handInterpretation.gameState.seatWind === "east") {
    if (handInterpretation.winningTile.isTsumo) {
      seatPayments = otherSeats.map((seat) => {
        return {
          seat,
          value: Math.ceil((2 * handInterpretation.basicPoints) / 100) * 100,
        };
      });
    } else {
      seatPayments.push({
        seat: handInterpretation.winningTile.from!,
        value: Math.ceil((6 * handInterpretation.basicPoints) / 100) * 100,
      });
    }
  }

  // handle winning hand is not the dealer
  if (handInterpretation.gameState.seatWind !== "east") {
    if (handInterpretation.winningTile.isTsumo) {
      return otherSeats.map((seat) => {
        if (seat === "east") {
          // dealer pays 2x basic points
          return {
            seat,
            value: Math.ceil((2 * handInterpretation.basicPoints) / 100) * 100,
          };
        }
        // non dealer pays 1x basic points
        return {
          seat,
          value: Math.ceil((1 * handInterpretation.basicPoints) / 100) * 100,
        };
      });
    } else {
      seatPayments.push({
        seat: handInterpretation.winningTile.from!,
        value: Math.ceil((4 * handInterpretation.basicPoints) / 100) * 100,
      });
    }
  }
  return seatPayments;
}
