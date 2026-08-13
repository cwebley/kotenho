import { tileCompare } from "../src/utils/tile-compare";
import { describe, it, expect } from "vitest";

describe("tileCompare", () => {
  it("compares manzu tiles correctly", () => {
    expect(tileCompare("3m", "1m")).toBeGreaterThan(0);
    expect(tileCompare("8m", "9m")).toBeLessThan(0);
  });
  it("compares pinzu tiles correctly", () => {
    expect(tileCompare("3p", "1p")).toBeGreaterThan(0);
    expect(tileCompare("8p", "9p")).toBeLessThan(0);
  });
  it("compares souzu tiles correctly", () => {
    expect(tileCompare("3s", "1s")).toBeGreaterThan(0);
    expect(tileCompare("8s", "9s")).toBeLessThan(0);
  });
  it("compares honor tiles correctly", () => {
    expect(tileCompare("7z", "5z")).toBeGreaterThan(0);
    expect(tileCompare("2z", "6z")).toBeLessThan(0);
  });
  it("compares suits by sorting manzu tiles first", () => {
    expect(tileCompare("9m", "1p")).toBeLessThan(0);
    expect(tileCompare("8m", "9p")).toBeLessThan(0);
    expect(tileCompare("9m", "1s")).toBeLessThan(0);
    expect(tileCompare("8m", "9s")).toBeLessThan(0);
    expect(tileCompare("9m", "1z")).toBeLessThan(0);
    expect(tileCompare("8m", "7z")).toBeLessThan(0);
  });
  it("compares suits by sorting pinzu tiles second", () => {
    expect(tileCompare("9p", "1m")).toBeGreaterThan(0);
    expect(tileCompare("8p", "9m")).toBeGreaterThan(0);
    expect(tileCompare("9p", "1s")).toBeLessThan(0);
    expect(tileCompare("8p", "9s")).toBeLessThan(0);
    expect(tileCompare("9p", "1z")).toBeLessThan(0);
    expect(tileCompare("8p", "7z")).toBeLessThan(0);
  });
  it("compares suits by sorting souzu tiles third", () => {
    expect(tileCompare("9s", "1m")).toBeGreaterThan(0);
    expect(tileCompare("8s", "9m")).toBeGreaterThan(0);
    expect(tileCompare("9s", "1p")).toBeGreaterThan(0);
    expect(tileCompare("8s", "9p")).toBeGreaterThan(0);
    expect(tileCompare("9s", "1z")).toBeLessThan(0);
    expect(tileCompare("8s", "7z")).toBeLessThan(0);
  });
  it("compares suits by sorting honor tiles last", () => {
    expect(tileCompare("9z", "1m")).toBeGreaterThan(0);
    expect(tileCompare("8z", "9m")).toBeGreaterThan(0);
    expect(tileCompare("9z", "1p")).toBeGreaterThan(0);
    expect(tileCompare("8z", "9p")).toBeGreaterThan(0);
    expect(tileCompare("9z", "1s")).toBeGreaterThan(0);
    expect(tileCompare("8z", "7s")).toBeGreaterThan(0);
  });

  it("works in conjuction with `sort` to sort a 14 tile hand", () => {
    const shuffledTiles = [
      "2z",
      "1m",
      "2p",
      "2p",
      "8s",
      "2z",
      "7z",
      "3m",
      "9s",
      "7z",
      "2z",
      "2m",
      "7s",
      "2p",
    ];
    const expectedSortedTiles = [
      "1m",
      "2m",
      "3m",
      "2p",
      "2p",
      "2p",
      "7s",
      "8s",
      "9s",
      "2z",
      "2z",
      "2z",
      "7z",
      "7z",
    ];

    const sortedTiles = shuffledTiles.sort(tileCompare);
    sortedTiles.forEach((t, i) => {
      expect(t).toEqual(expectedSortedTiles[i]);
    });
  });
});
