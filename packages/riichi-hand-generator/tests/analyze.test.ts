import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";

describe("analyze", () => {
  it("returns static proofs without probing", () => {
    const result = analyze(
      { yaku: ["pinfu"], openMeldCount: 1 },
      { sampleSize: 100, seed: 7 },
    );

    expect(result).toEqual({
      feasible: false,
      reason: "pinfu only exists on a concealed hand",
      estimatedYield: 0,
      distinctRatio: 0,
      sampleSize: 0,
    });
  });

  it("measures a fixed number of candidate attempts", () => {
    const result = analyze(
      { fu: 40, closed: true },
      { seed: 7 },
    );

    expect(result.feasible).toBe(true);
    expect(result.sampleSize).toBe(100);
    expect(result.estimatedYield).toBeGreaterThan(0);
    expect(result.estimatedYield).toBeLessThanOrEqual(1);
    expect(result.distinctRatio).toBeGreaterThan(0);
    expect(result.distinctRatio).toBeLessThanOrEqual(1);
  });

  it("is deterministic for a seed", () => {
    const spec = { yaku: ["tanyao", "pinfu"] as const };
    expect(analyze(spec, { seed: 19 })).toEqual(
      analyze(spec, { seed: 19 }),
    );
  });

  it("does not turn a zero-size probe into an impossibility proof", () => {
    expect(analyze({ fu: 40 }, { sampleSize: 0, seed: 1 })).toEqual({
      feasible: true,
      estimatedYield: 0,
      distinctRatio: 0,
      sampleSize: 0,
    });
  });

  it("reports unambiguous-wait filtering as a yield cost", () => {
    const spec = { fu: 40, waitType: "shanpon" as const };
    const ordinary = analyze(spec, { sampleSize: 100, seed: 23 });
    const unambiguous = analyze(spec, {
      sampleSize: 100,
      seed: 23,
      requireUnambiguousWait: true,
    });

    expect(unambiguous.feasible).toBe(true);
    expect(unambiguous.estimatedYield).toBeLessThanOrEqual(
      ordinary.estimatedYield,
    );
  });

  it("rejects invalid sample sizes", () => {
    expect(() => analyze({}, { sampleSize: -1 })).toThrow(
      "sampleSize must be a non-negative integer",
    );
    expect(() => analyze({}, { sampleSize: 1.5 })).toThrow(
      "sampleSize must be a non-negative integer",
    );
  });
});
