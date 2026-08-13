import { determineDoraTile } from "../src/utils/determine-dora-tile";
import { describe, it, expect } from "vitest";

describe("determineDoraTile", () => {
  it("returns the next rank for a suit tile", () => {
    expect(determineDoraTile("3m")).toBe("4m");
    expect(determineDoraTile("8s")).toBe("9s");
  });

  it("loops over the top of a suit", () => {
    expect(determineDoraTile("9m")).toBe("1m");
    expect(determineDoraTile("9s")).toBe("1s");
    expect(determineDoraTile("9p")).toBe("1p");
    expect(determineDoraTile("4z")).toBe("1z");
    expect(determineDoraTile("7z")).toBe("5z");
  });
});
