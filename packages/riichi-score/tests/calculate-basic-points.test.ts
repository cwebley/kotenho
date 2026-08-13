import { describe, expect, it } from "vitest";
import { calculateBasicPoints } from "../src/utils/calculate-basic-points";

describe("countDora", () => {
  describe("handles limit values", () => {
    it("returns yakuman value for 13 han", () => {
      const basicPoints = calculateBasicPoints(13, 30);
      expect(basicPoints).toBe(8000);
    });
    it("returns sanbaiman value for 11 han", () => {
      const basicPoints = calculateBasicPoints(11, 30);
      expect(basicPoints).toBe(6000);
    });
    it("returns baiman value for 8 han", () => {
      const basicPoints = calculateBasicPoints(8, 30);
      expect(basicPoints).toBe(4000);
    });
    it("returns haneman value for 6 han", () => {
      const basicPoints = calculateBasicPoints(6, 30);
      expect(basicPoints).toBe(3000);
    });
    it("returns mangan value for 5 han", () => {
      const basicPoints = calculateBasicPoints(5, 30);
      expect(basicPoints).toBe(2000);
    });
    it("returns the mangan limit value for 4han 40fu", () => {
      const basicPoints = calculateBasicPoints(4, 40);
      expect(basicPoints).toBe(2000);
    });
    it("returns the mangan limit value for 3han 70fu", () => {
      const basicPoints = calculateBasicPoints(3, 70);
      expect(basicPoints).toBe(2000);
    });
  });
  describe("handles calculated values", () => {
    it("handles 3han 30fu", () => {
      const basicPoints = calculateBasicPoints(3, 30);
      expect(basicPoints).toBe(960);
    });
    it("handles 1han 20fu", () => {
      const basicPoints = calculateBasicPoints(1, 20);
      expect(basicPoints).toBe(160);
    });
  });
});
