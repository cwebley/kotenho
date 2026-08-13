import { isSuitTile } from "../src/utils/is-suit-tile";
import { describe, it, expect } from "vitest";

describe("isSuitTile", () => {
  it("returns true when passed a suited tile", () => {
    expect(isSuitTile("1m")).toBe(true);
    expect(isSuitTile("8s")).toBe(true);
    expect(isSuitTile("5p")).toBe(true);
  });
  it("returns false when passed an honor tile", () => {
    expect(isSuitTile("3z")).toBe(false);
    expect(isSuitTile("5z")).toBe(false);
    expect(isSuitTile("7z")).toBe(false);
  });
});
