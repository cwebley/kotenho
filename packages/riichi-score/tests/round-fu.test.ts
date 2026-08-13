import { describe, expect, it } from "vitest";
import { roundFu } from "../src/utils/round-fu";

describe("roundFu", () => {
  it("rounds 22 up to 30", () => {
    expect(roundFu(22)).toBe(30);
  });
  it("keeps 20 fu at 20 fu", () => {
    expect(roundFu(20)).toBe(20);
  });
  it("rounds 56 up to 60", () => {
    expect(roundFu(56)).toBe(60);
  });
  it("rounds 102 up to 110", () => {
    expect(roundFu(102)).toBe(110);
  });
});
