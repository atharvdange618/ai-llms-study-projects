const dot = (a: number[], b: number[]) =>
  a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0);
const normalize = (v: number[]) => {
  const length = Math.hypot(...v);
  return v.map((x) => x / length);
};
const argmax = (xs: number[]) => xs.indexOf(Math.max(...xs));

/**
 * K-means on cosine similarity. Returns k clusters of indices into `vectors`,
 * each sorted from the point nearest its centre to the farthest.
 */
export function clusterByCosine(
  vectors: number[][],
  k: number,
  iterations = 20,
): number[][] {
  if (vectors.length < k)
    throw new Error(`Need at least ${k} vectors, got ${vectors.length}`);
  const points = vectors.map(normalize);

  // Deterministic start instead of random: begin at point 0, then keep adding the point
  // least similar to every centre chosen so far. Same input, same clusters, every run.
  const centroids: number[][] = [points[0]!];
  while (centroids.length < k) {
    const nearestCentre = points.map((p) =>
      Math.max(...centroids.map((c) => dot(p, c))),
    );
    centroids.push(points[nearestCentre.indexOf(Math.min(...nearestCentre))]!);
  }

  let assignment: number[] = [];
  for (let it = 0; it < iterations; it++) {
    assignment = points.map((p) => argmax(centroids.map((c) => dot(p, c))));
    centroids.forEach((_, c) => {
      const members = points.filter((_, i) => assignment[i] === c);
      if (members.length === 0) return;
      centroids[c] = normalize(
        members[0]!.map((_, d) => members.reduce((sum, m) => sum + m[d]!, 0)),
      );
    });
  }

  return centroids.map((centre, c) =>
    points
      .map((p, i) => ({ i, similarity: dot(p, centre) }))
      .filter(({ i }) => assignment[i] === c)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ i }) => i),
  );
}
