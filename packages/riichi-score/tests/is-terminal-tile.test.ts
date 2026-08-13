import { isTerminalTile } from "../src/utils/is-terminal-tile";
import { describe, it, expect } from "vitest";

describe("isTerminalTile", () => {
  it("returns true for all terminal tiles", () => {
    expect(isTerminalTile("1m")).toBe(true);
    expect(isTerminalTile("9m")).toBe(true);
    expect(isTerminalTile("1p")).toBe(true);
    expect(isTerminalTile("9p")).toBe(true);
    expect(isTerminalTile("1s")).toBe(true);
    expect(isTerminalTile("9s")).toBe(true);
  });
  it("returns false for non terminals and honors", () => {
    expect(isTerminalTile("2m")).toBe(false);
    expect(isTerminalTile("4p")).toBe(false);
    expect(isTerminalTile("8s")).toBe(false);
    expect(isTerminalTile("1z")).toBe(false);
    expect(isTerminalTile("3z")).toBe(false);
    expect(isTerminalTile("7z")).toBe(false);
  });
});
