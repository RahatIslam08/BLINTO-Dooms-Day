import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { getTopologicalPrerequisites, hasCircularDependency } from "../src/services/movieGraph.js";
import { calculateMinimumBundles } from "../src/services/bundleOptimizer.js";

describe("movie dependency graph", () => {
  it("rejects direct and indirect cycles", () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const movies = [
      { _id: a, prerequisites: [b] },
      { _id: b, prerequisites: [] },
    ];
    expect(hasCircularDependency(a, [b], movies)).toBe(false);
    expect(hasCircularDependency(a, [b], [{ _id: a, prerequisites: [b] }, { _id: b, prerequisites: [a] }])).toBe(true);
  });

  it("returns dependencies once in prerequisite-first order", () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const c = new mongoose.Types.ObjectId();
    const movies = [
      { _id: a, prerequisites: [b, c] },
      { _id: b, prerequisites: [c] },
      { _id: c, prerequisites: [] },
    ];
    expect(getTopologicalPrerequisites(a, movies)).toEqual([String(c), String(b)]);
  });
});

describe("bundle optimizer", () => {
  it("uses the minimum exact bundle count", () => {
    expect(calculateMinimumBundles(6, [5, 3])).toEqual({
      impossible: false,
      minimumBundles: 2,
      bundleQuantities: { 3: 2 },
    });
  });

  it("returns impossible when no exact sum exists", () => {
    expect(calculateMinimumBundles(7, [4, 6]).impossible).toBe(true);
  });

  it("rejects invalid group sizes", () => {
    expect(calculateMinimumBundles(10001, [5]).impossible).toBe(true);
  });
});
