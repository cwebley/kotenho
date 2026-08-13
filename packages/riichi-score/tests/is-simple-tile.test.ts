import { isSimpleTile } from "../src/utils/is-simple-tile";
import { describe, it, expect } from "vitest";

describe("isSimpleTile", () => {
  it("returns true for simple tiles", () => {
    expect(isSimpleTile("2m")).toBe(true);
    expect(isSimpleTile("3m")).toBe(true);
    expect(isSimpleTile("4p")).toBe(true);
    expect(isSimpleTile("5p")).toBe(true);
    expect(isSimpleTile("7s")).toBe(true);
    expect(isSimpleTile("8s")).toBe(true);
  });
  it("returns true for red fives", () => {
    expect(isSimpleTile("0s")).toBe(true);
    expect(isSimpleTile("0p")).toBe(true);
    expect(isSimpleTile("0m")).toBe(true);
  });
  it("returns false for terminals and honors", () => {
    expect(isSimpleTile("1m")).toBe(false);
    expect(isSimpleTile("9m")).toBe(false);
    expect(isSimpleTile("1s")).toBe(false);
    expect(isSimpleTile("9s")).toBe(false);
    expect(isSimpleTile("1p")).toBe(false);
    expect(isSimpleTile("9p")).toBe(false);
    expect(isSimpleTile("1z")).toBe(false);
    expect(isSimpleTile("2z")).toBe(false);
    expect(isSimpleTile("7z")).toBe(false);
  });
});
