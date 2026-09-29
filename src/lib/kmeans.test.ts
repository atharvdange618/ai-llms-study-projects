import { describe, expect, it } from "vitest";
import { clusterByCosine } from "./kmeans.js";

describe("clusterByCosine", () => {
  const vectors = [
    [1, 0.1],
    [1, 0],
    [0, 1],
    [0.1, 1],
    [0.9, 0.2],
  ];

  it("groups vectors pointing the same way", () => {
    const clusters = clusterByCosine(vectors, 2).map((c) => [...c].sort());
    expect(clusters).toContainEqual([0, 1, 4]);
    expect(clusters).toContainEqual([2, 3]);
  });

  it("sorts each cluster from nearest the centre outward", () => {
    const xCluster = clusterByCosine(vectors, 2).find((c) => c.includes(0));
    expect(xCluster).toEqual([0, 1, 4]);
  });

  it("ignores vector length, only direction counts", () => {
    const clusters = clusterByCosine(
      [
        [1, 0],
        [100, 1],
        [0, 1],
        [1, 50],
      ],
      2,
    ).map((c) => [...c].sort());
    expect(clusters).toContainEqual([0, 1]);
    expect(clusters).toContainEqual([2, 3]);
  });

  it("throws when there are fewer vectors than clusters", () => {
    expect(() => clusterByCosine([[1, 0]], 2)).toThrow();
  });
});
