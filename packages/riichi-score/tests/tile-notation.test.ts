import { describe, expect, it } from "vitest";
import { formatTiles, parseTiles, sortTiles } from "../src/index.js";

describe("tile notation", () => {
  it("sorts red fives in the five position before ordinary fives", () => {
    expect(sortTiles(["6p", "5p", "0p", "4p"])).toEqual([
      "4p",
      "0p",
      "5p",
      "6p",
    ]);
  });

  it("formats sorted compact notation", () => {
    expect(
      formatTiles([
        "5m", "6m", "5p", "6p", "7p", "6m", "7m", "8m", "3m", "4m", "5m", "3p", "3p",
      ]),
    ).toBe("34556678m33567p");
    expect(formatTiles(["6p", "0p", "5p", "4p"])).toBe("4056p");
  });

  it("parses compact notation without losing red fives", () => {
    expect(parseTiles("4056p123z")).toEqual([
      "4p",
      "0p",
      "5p",
      "6p",
      "1z",
      "2z",
      "3z",
    ]);
  });

  it("rejects malformed compact notation", () => {
    for (const notation of ["123", "m", "08z", "123x", "12m3"]) {
      expect(() => parseTiles(notation)).toThrow("Invalid tile notation");
    }
  });
});
