/**
 * algorithms/fordFulkerson.js
 * Ford-Fulkerson Max Flow (Edmonds-Karp BFS) — traffic-capacity aware
 * Traffic-aware routing via modified Dijkstra
 */
const FordFulkerson = (() => {

  // ── BFS augmenting path ────────────────────────────────────────────
  function _bfs(source, sink, cap, nodeIds) {
    const visited = new Set([source]);
    const parent  = { [source]: null };
    const queue   = [source];
    while (queue.length) {
      const u = queue.shift();
      for (const v of nodeIds) {
        if (!visited.has(v) && (cap[u]?.[v] || 0) > 0) {
          visited.add(v);
          parent[v] = u;
          if (v === sink) {
            const path = [];
            let cur = sink;
            while (cur !== null) { path.unshift(cur); cur = parent[cur]; }
            return path;
          }
          queue.push(v);
        }
      }
    }
    return null;
  }

  // ── Core Ford-Fulkerson ────────────────────────────────────────────
  function run(sourceId, sinkId) {
    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();
    if (nodes.length < 2)          return { error: "Need at least 2 cities." };
    if (!sourceId || !sinkId)      return { error: "Select both source and sink." };
    if (sourceId === sinkId)       return { error: "Source and sink must differ." };

    const nodeIds = nodes.map((n) => n.id);
    const cap = {}, edgeRef = {};
    nodeIds.forEach((a) => { cap[a] = {}; edgeRef[a] = {}; nodeIds.forEach((b) => { cap[a][b] = 0; edgeRef[a][b] = null; }); });

    edges.forEach((e) => {
      const avail = Math.max(0, e.capacity - e.traffic);
      cap[e.from][e.to] += avail;
      edgeRef[e.from][e.to] = e.id;
      edgeRef[e.to][e.from] = e.id;
    });

    const flow = {};
    nodeIds.forEach((a) => { flow[a] = {}; nodeIds.forEach((b) => { flow[a][b] = 0; }); });

    let maxFlow = 0;
    const augPaths = [];
    let path;
    while ((path = _bfs(sourceId, sinkId, cap, nodeIds)) !== null) {
      let bottleneck = Infinity;
      for (let i = 0; i < path.length - 1; i++)
        bottleneck = Math.min(bottleneck, cap[path[i]][path[i+1]]);
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i], v = path[i+1];
        cap[u][v] -= bottleneck; cap[v][u] += bottleneck;
        flow[u][v] += bottleneck; flow[v][u] -= bottleneck;
      }
      maxFlow += bottleneck;
      augPaths.push({ path: [...path], flow: bottleneck, pathLabels: path.map((id) => Graph.getNode(id)?.label || id) });
      if (augPaths.length > 200) break;
    }

    if (maxFlow === 0)
      return { error: `No available capacity from "${Graph.getNode(sourceId)?.label}" to "${Graph.getNode(sinkId)?.label}". Roads may be fully saturated.` };

    const flowEdges = [], usedEdgeIds = new Set();
    nodeIds.forEach((a) => {
      nodeIds.forEach((b) => {
        if (flow[a][b] > 0) {
          const origCap = flow[a][b] + cap[a][b];
          flowEdges.push({ from: a, to: b, flow: flow[a][b], capacity: origCap, utilisation: origCap > 0 ? flow[a][b]/origCap : 0, edgeId: edgeRef[a][b] });
          if (edgeRef[a][b]) usedEdgeIds.add(edgeRef[a][b]);
        }
      });
    });

    return { maxFlow, flowEdges, edgeIds: [...usedEdgeIds], augPaths,
      sourceLabel: Graph.getNode(sourceId)?.label, sinkLabel: Graph.getNode(sinkId)?.label };
  }

  // ── Traffic-aware routing ──────────────────────────────────────────
  function findBestRoute(sourceId, targetId) {
    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();
    if (!sourceId || !targetId) return { error: "Select source and destination." };
    if (sourceId === targetId)  return { error: "Source and destination must differ." };

    const nodeIds = nodes.map((n) => n.id);
    const dist = {}, prev = {}, prevEdge = {};
    const visited = new Set();
    nodeIds.forEach((id) => { dist[id] = Infinity; prev[id] = null; prevEdge[id] = null; });
    dist[sourceId] = 0;
    const pq = [{ id: sourceId, d: 0 }];

    while (pq.length) {
      pq.sort((a, b) => a.d - b.d);
      const { id: u } = pq.shift();
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === targetId) break;

      edges.forEach((e) => {
        let v = null;
        if (e.from === u) v = e.to;
        else if (e.to === u) v = e.from;
        if (!v || visited.has(v)) return;
        const ratio = e.capacity > 0 ? e.traffic / e.capacity : 0;
        const penalty = 1 + 5 * Math.pow(ratio, 2);
        const edgeCost = (e.distance || 1) * penalty;
        const alt = dist[u] + edgeCost;
        if (alt < dist[v]) { dist[v] = alt; prev[v] = u; prevEdge[v] = e.id; pq.push({ id: v, d: alt }); }
      });
    }

    if (dist[targetId] === Infinity)
      return { error: `No route from "${Graph.getNode(sourceId)?.label}" to "${Graph.getNode(targetId)?.label}".` };

    const path = [], edgeIds = [];
    let cur = targetId;
    while (cur !== null) { path.unshift(cur); if (prevEdge[cur]) edgeIds.unshift(prevEdge[cur]); cur = prev[cur]; }

    const edgeDetails = [];
    for (let i = 0; i < path.length - 1; i++) {
      const eid = edgeIds[i];
      const e = edges.find((x) => x.id === eid);
      const ratio = e ? (e.capacity > 0 ? e.traffic / e.capacity : 0) : 0;
      edgeDetails.push({
        from: Graph.getNode(path[i])?.label || path[i],
        to:   Graph.getNode(path[i+1])?.label || path[i+1],
        distance: e?.distance || 0, time: e?.time || 0, cost: e?.cost || 0,
        traffic: e?.traffic || 0, capacity: e?.capacity || 0,
        congestion: ratio, status: _congLabel(ratio), color: _congColor(ratio), edgeId: eid,
      });
    }
    const avg = edgeDetails.length ? edgeDetails.reduce((s, d) => s + d.congestion, 0) / edgeDetails.length : 0;
    return {
      path, pathLabels: path.map((id) => Graph.getNode(id)?.label || id),
      totalDistance: edgeDetails.reduce((s,d)=>s+d.distance,0),
      totalTime:     edgeDetails.reduce((s,d)=>s+d.time,0),
      totalCost:     edgeDetails.reduce((s,d)=>s+d.cost,0),
      trafficScore: avg, edgeIds, edgeDetails,
    };
  }

  function congestionColor(ratio) {
    if (ratio < 0.40) return "#22c55e";
    if (ratio < 0.65) return "#84cc16";
    if (ratio < 0.85) return "#f59e0b";
    if (ratio < 0.95) return "#ef4444";
    return "#7f1d1d";
  }
  function congestionLabel(ratio) {
    if (ratio < 0.40) return "Free flow";
    if (ratio < 0.65) return "Light";
    if (ratio < 0.85) return "Moderate";
    if (ratio < 0.95) return "Heavy";
    return "Gridlock";
  }
  function _congColor(r) { return congestionColor(r); }
  function _congLabel(r) { return congestionLabel(r); }

  return { run, findBestRoute, congestionColor, congestionLabel };
})();
