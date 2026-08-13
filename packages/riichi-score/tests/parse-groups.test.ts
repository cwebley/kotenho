import { MahjongTile } from "../src/models/mahjong-tile";
import { parseGroups } from "../src/parsing/parse-groups";
import { describe, it, expect } from "vitest";

describe("parseGroups", () => {
  it("successfully parses a 4 set hand", () => {
    const parentHand: MahjongTile[] = [
      "2m",
      "2m",
      "2m",
      "6p",
      "6p",
      "6p",
      "9p",
      "9p",
      "9p",
      "7z",
      "7z",
      "7z",
    ];
    const handInterpretations = parseGroups(parentHand);
    expect(handInterpretations.length).toBe(1);
    handInterpretations[0].forEach((group) => {
      expect(group.type).toBe("set");
    });
    expect(handInterpretations[0][0].tiles[0]).toBe("2m");
    expect(handInterpretations[0][1].tiles[0]).toBe("6p");
  });
  it("successfully parses 4 runs", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "1p",
      "2p",
      "3p",
      "5p",
      "6p",
      "7p",
      "7p",
      "8p",
      "9p",
    ];
    const handInterpretations = parseGroups(parentHand);
    expect(handInterpretations.length).toBe(1);
    handInterpretations[0].forEach((group) => {
      expect(group.type).toBe("run");
    });
    expect(handInterpretations[0][0].tiles[0]).toBe("1m");
    expect(handInterpretations[0][1].tiles[0]).toBe("1p");
  });
  it("parses an ambiguous hand with triplets in sequence", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "1m",
      "1m",
      "2m",
      "2m",
      "2m",
      "3m",
      "3m",
      "3m",
      "4m",
      "4m",
      "4m",
    ];
    // this hand could be interpretted 3 ways:
    // 111 222 333 444
    // 111 234 234 234
    // 123 123 123 444
    const handInterpretations = parseGroups(parentHand);
    expect(handInterpretations.length).toBe(3);
  });
});
