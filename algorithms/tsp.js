/**
 * algorithms/tsp.js
 * Travelling Salesman Problem — Nearest Neighbor Heuristic
 * Greedy tour: always visit the closest unvisited city.
 */

const TSP = (() => {
  /**
   * Run Nearest Neighbor TSP from `startId`.
   * @returns { tour: string[], totalWeight: number, edgeIds: string[], steps: object[] }
   *          or { error: string }
   */
  function run(startId) {
    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();

    if (nodes.length < 3) return { error: "TSP requires at least 3 cities." };
    if (!startId) return { error: "Please select a starting city." };

    // Build weight matrix (Infinity if no direct road)
    const nodeIds = nodes.map((n) => n.id);
    const weight = {};
    const edgeMap = {};
    nodeIds.forEach((a) => {
      weight[a] = {};
      edgeMap[a] = {};
      nodeIds.forEach((b) => {
        weight[a][b] = Infinity;
        edgeMap[a][b] = null;
      });
      weight[a][a] = 0;
    });
    edges.forEach((e) => {
      weight[e.from][e.to] = Math.min(weight[e.from][e.to], e.weight);
      weight[e.to][e.from] = Math.min(weight[e.to][e.from], e.weight);
      edgeMap[e.from][e.to] = e.id;
      edgeMap[e.to][e.from] = e.id;
    });

    // Nearest Neighbor greedy
    const visited = new Set([startId]);
    const tour = [startId];
    const usedEdgeIds = [];
    const steps = [];
    let total = 0;
    let cur = startId;

    while (visited.size < nodeIds.length) {
      let nearest = null,
        minW = Infinity;

      for (const id of nodeIds) {
        if (!visited.has(id) && weight[cur][id] < minW) {
          minW = weight[cur][id];
          nearest = id;
        }
      }

      if (nearest === null || minW === Infinity) {
        return {
          error:
            "Graph is not fully connected — TSP requires all cities to be reachable from each other.",
        };
      }

      steps.push({ from: cur, to: nearest, weight: minW });
      visited.add(nearest);
      tour.push(nearest);
      usedEdgeIds.push(edgeMap[cur][nearest]);
      total += minW;
      cur = nearest;
    }

    // Return to start
    const returnWeight = weight[cur][startId];
    if (returnWeight === Infinity) {
      return {
        error: "Cannot return to starting city — graph is not fully connected.",
      };
    }
    total += returnWeight;
    tour.push(startId);
    usedEdgeIds.push(edgeMap[cur][startId]);
    steps.push({ from: cur, to: startId, weight: returnWeight });

    return {
      tour,
      totalWeight: total,
      edgeIds: usedEdgeIds.filter(Boolean),
      steps,
    };
  }

  return { run };
})();
