/**
 * algorithms/maxflow.js
 * Ford-Fulkerson Maximum Flow Algorithm
 * Uses BFS (Edmonds-Karp) to find augmenting paths in a directed capacity network.
 * Edge weights are treated as capacities.
 */

const MaxFlow = (() => {
  /**
   * BFS to find an augmenting path from source to sink.
   * @returns path as array of node ids, or null if none exists.
   */
  function bfs(source, sink, capacity, nodeIds) {
    const visited = new Set([source]);
    const parent = { [source]: null };
    const queue = [source];

    while (queue.length) {
      const u = queue.shift();
      for (const v of nodeIds) {
        if (!visited.has(v) && capacity[u] && capacity[u][v] > 0) {
          visited.add(v);
          parent[v] = u;
          if (v === sink) {
            // Reconstruct path
            const path = [];
            let cur = sink;
            while (cur !== null) {
              path.unshift(cur);
              cur = parent[cur];
            }
            return path;
          }
          queue.push(v);
        }
      }
    }
    return null; // No augmenting path
  }

  /**
   * Run Ford-Fulkerson (Edmonds-Karp variant) max flow.
   * @returns { maxFlow: number, flowEdges: {from,to,flow,capacity}[], edgeIds: string[] }
   *          or { error: string }
   */
  function run(sourceId, sinkId) {
    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();

    if (nodes.length < 2) return { error: "Need at least 2 cities." };
    if (!sourceId || !sinkId)
      return { error: "Please select both source and sink cities." };
    if (sourceId === sinkId)
      return { error: "Source and sink must be different cities." };

    const nodeIds = nodes.map((n) => n.id);

    // Build capacity matrix (directed: use both directions from undirected edges)
    const capacity = {};
    const edgeRef = {}; // capacity[u][v] → edge id
    nodeIds.forEach((a) => {
      capacity[a] = {};
      edgeRef[a] = {};
      nodeIds.forEach((b) => {
        capacity[a][b] = 0;
        edgeRef[a][b] = null;
      });
    });
    edges.forEach((e) => {
      capacity[e.from][e.to] += e.weight; // treat weight as capacity
      edgeRef[e.from][e.to] = e.id;
      // Also add reverse edge with 0 initial capacity (residual graph)
      edgeRef[e.to][e.from] = e.id;
    });

    // Track flow on each (u,v) pair
    const flow = {};
    nodeIds.forEach((a) => {
      flow[a] = {};
      nodeIds.forEach((b) => {
        flow[a][b] = 0;
      });
    });

    let maxFlow = 0;

    // Augment while path exists
    let path;
    while ((path = bfs(sourceId, sinkId, capacity, nodeIds)) !== null) {
      // Find bottleneck
      let bottleneck = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        bottleneck = Math.min(bottleneck, capacity[path[i]][path[i + 1]]);
      }

      // Update residual capacities
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i],
          v = path[i + 1];
        capacity[u][v] -= bottleneck;
        capacity[v][u] += bottleneck;
        flow[u][v] += bottleneck;
        flow[v][u] -= bottleneck;
      }
      maxFlow += bottleneck;
    }

    if (maxFlow === 0) {
      return {
        error: `No flow path exists from "${Graph.getNode(sourceId)?.label}" to "${Graph.getNode(sinkId)?.label}".`,
      };
    }

    // Collect edges with positive flow
    const flowEdges = [];
    const usedEdgeIds = new Set();
    nodeIds.forEach((a) => {
      nodeIds.forEach((b) => {
        if (flow[a][b] > 0) {
          flowEdges.push({
            from: a,
            to: b,
            flow: flow[a][b],
            capacity: flow[a][b] + capacity[a][b],
            edgeId: edgeRef[a][b],
          });
          if (edgeRef[a][b]) usedEdgeIds.add(edgeRef[a][b]);
        }
      });
    });

    return {
      maxFlow,
      flowEdges,
      edgeIds: [...usedEdgeIds],
    };
  }

  return { run };
})();
