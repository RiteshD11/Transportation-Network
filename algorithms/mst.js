/**
 * algorithms/mst.js
 * Kruskal's Minimum Spanning Tree Algorithm
 * Connects all cities with minimum total weight using Union-Find.
 */

const MST = (() => {
  // Union-Find (Disjoint Set Union) for cycle detection
  function makeUF(ids) {
    const parent = {};
    const rank = {};
    ids.forEach((id) => {
      parent[id] = id;
      rank[id] = 0;
    });

    function find(x) {
      if (parent[x] !== x) parent[x] = find(parent[x]); // path compression
      return parent[x];
    }

    function union(x, y) {
      const rx = find(x),
        ry = find(y);
      if (rx === ry) return false; // already in same set → cycle
      if (rank[rx] < rank[ry]) {
        parent[rx] = ry;
      } else if (rank[rx] > rank[ry]) {
        parent[ry] = rx;
      } else {
        parent[ry] = rx;
        rank[rx]++;
      }
      return true;
    }

    return { find, union };
  }

  /**
   * Run Kruskal's MST.
   * @returns { edges: Edge[], totalWeight: number, edgeIds: string[] }
   *          or { error: string }
   */
  function run() {
    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();

    if (nodes.length < 2)
      return { error: "Need at least 2 cities to compute MST." };
    if (edges.length < nodes.length - 1)
      return { error: "Not enough roads — graph may be disconnected." };

    // Sort edges by weight (ascending)
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);
    const uf = makeUF(nodes.map((n) => n.id));

    const mstEdges = [];
    let total = 0;

    for (const edge of sorted) {
      if (uf.union(edge.from, edge.to)) {
        mstEdges.push(edge);
        total += edge.weight;
        if (mstEdges.length === nodes.length - 1) break; // MST complete
      }
    }

    if (mstEdges.length < nodes.length - 1) {
      return { error: "Graph is not connected — cannot form a spanning tree." };
    }

    return {
      edges: mstEdges,
      totalWeight: total,
      edgeIds: mstEdges.map((e) => e.id),
    };
  }

  return { run };
})();
