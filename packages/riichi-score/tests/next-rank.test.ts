import { nextRank } from "../src/utils/next-rank";
import { describe, it, expect } from "vitest";

describe("nextRank", () => {
  it("returns the next rank for a suit tile", () => {
    expect(nextRank("3m")).toBe("4m");
    expect(nextRank("8s")).toBe("9s");
  });

  it("handles 9m gracefully by returning 10m", () => {
    expect(nextRank("9m")).toBe("10m");
  });
});
