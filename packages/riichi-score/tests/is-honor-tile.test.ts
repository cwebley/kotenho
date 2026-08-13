import { isHonorTile } from "../src/utils/is-honor-tile";
import { describe, it, expect } from "vitest";

describe("isHonorTile", () => {
  it("returns true for all terminal tiles", () => {
    expect(isHonorTile("1z")).toBe(true);
    expect(isHonorTile("4z")).toBe(true);
    expect(isHonorTile("7z")).toBe(true);
  });
  it("returns false for terminals and simples", () => {
    expect(isHonorTile("4p")).toBe(false);
    expect(isHonorTile("8s")).toBe(false);
    expect(isHonorTile("9s")).toBe(false);
    expect(isHonorTile("9p")).toBe(false);
    expect(isHonorTile("1m")).toBe(false);
  });
});
