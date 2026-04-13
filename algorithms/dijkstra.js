/**
 * algorithms/dijkstra.js
 * Dijkstra's Shortest Path — supports multi-criteria (distance/time/cost/traffic)
 */
const Dijkstra = (() => {
  function run(source, target, criterion) {
    criterion = criterion || "distance";
    const nodes = Graph.getNodes();
    const adj   = Graph.getAdjList(criterion);

    if (!nodes.length) return { error: "Graph is empty. Add cities first." };
    if (!source || !target) return { error: "Please select both source and target cities." };
    if (source === target)  return { error: "Source and target must be different cities." };

    const dist = {}, prev = {}, prevEdge = {};
    const visited = new Set();
    nodes.forEach((n) => { dist[n.id] = Infinity; prev[n.id] = null; prevEdge[n.id] = null; });
    dist[source] = 0;

    const pq = [{ id: source, d: 0 }];
    while (pq.length) {
      pq.sort((a, b) => a.d - b.d);
      const { id: u } = pq.shift();
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === target) break;

      for (const { to: v, weight: w, edgeId } of adj[u] || []) {
        if (visited.has(v)) continue;
        const alt = dist[u] + w;
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
          prevEdge[v] = edgeId;
          pq.push({ id: v, d: alt });
        }
      }
    }

    if (dist[target] === Infinity)
      return { error: `No path exists between "${Graph.getNode(source)?.label}" and "${Graph.getNode(target)?.label}".` };

    const path = [], usedEdges = [];
    let cur = target;
    while (cur !== null) {
      path.unshift(cur);
      if (prevEdge[cur]) usedEdges.unshift(prevEdge[cur]);
      cur = prev[cur];
    }
    return { path, totalWeight: dist[target], edges: usedEdges, visited: [...visited], criterion };
  }
  return { run };
})();
