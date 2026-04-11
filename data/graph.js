/**
 * data/graph.js
 * Core graph data model — G = (V, E, W)
 * Extended: each edge carries distance, time, cost AND traffic capacity.
 */

const Graph = (() => {
  let nodes = [];
  let edges = [];
  let _nextEdgeId = 1;

  function addNode(label) {
    const id = label.trim().toLowerCase().replace(/\s+/g, "_");
    if (!label.trim()) return { ok: false, msg: "City name cannot be empty." };
    if (nodes.find((n) => n.id === id))
      return { ok: false, msg: `"${label}" already exists.` };
    nodes.push({ id, label: label.trim() });
    return { ok: true, id };
  }

  function removeNode(id) {
    nodes = nodes.filter((n) => n.id !== id);
    edges = edges.filter((e) => e.from !== id && e.to !== id);
  }

  function addEdge(from, to, weights) {
    // Support both old single-weight API and new multi-criteria API
    let distance, time, cost, capacity, traffic;
    if (typeof weights === "object" && weights !== null && !Array.isArray(weights)) {
      distance = parseFloat(weights.distance) || 0;
      time     = parseFloat(weights.time)     || 0;
      cost     = parseFloat(weights.cost)     || 0;
      capacity = parseFloat(weights.capacity) || 100;
      traffic  = parseFloat(weights.traffic)  || 0;
    } else {
      // Legacy: single number = distance
      distance = parseFloat(weights) || 0;
      time     = Math.round(distance / 60 * 10) / 10;
      cost     = Math.round(distance * 1.8);
      capacity = 100;
      traffic  = 0;
    }

    if (from === to)
      return { ok: false, msg: "Source and destination cannot be the same." };
    if (distance <= 0 && time <= 0 && cost <= 0)
      return { ok: false, msg: "At least one of Distance/Time/Cost must be positive." };
    if (!getNode(from) || !getNode(to))
      return { ok: false, msg: "One or both cities not found." };

    const dup = edges.find(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (dup)
      return {
        ok: false,
        msg: `Road between "${getNode(from).label}" and "${getNode(to).label}" already exists.`,
      };

    const id = `e${_nextEdgeId++}`;
    edges.push({ id, from, to,
      weight: distance, // backward compat
      distance, time, cost, capacity, traffic
    });
    return { ok: true, id };
  }

  function setEdgeTraffic(edgeId, value) {
    const e = edges.find((x) => x.id === edgeId);
    if (!e) return false;
    e.traffic = Math.max(0, Math.min(parseFloat(value) || 0, e.capacity));
    return true;
  }

  function removeEdge(id) {
    edges = edges.filter((e) => e.id !== id);
  }

  function getNode(id)  { return nodes.find((n) => n.id === id) || null; }
  function getNodes()   { return [...nodes]; }
  function getEdges()   { return [...edges]; }

  function getAdjList(criterion) {
    criterion = criterion || "distance";
    const adj = {};
    nodes.forEach((n) => { adj[n.id] = []; });
    edges.forEach((e) => {
      const w = (e[criterion] != null ? e[criterion] : e.weight) || 1;
      adj[e.from].push({ to: e.to, weight: w, edgeId: e.id });
      adj[e.to].push({ to: e.from, weight: w, edgeId: e.id });
    });
    return adj;
  }

  function totalWeight(criterion) {
    criterion = criterion || "distance";
    return edges.reduce((s, e) => s + (e[criterion] || 0), 0);
  }

  function clear() {
    nodes = [];
    edges = [];
    _nextEdgeId = 1;
  }

  function loadSample() {
    clear();
    const cities = ["Mumbai","Pune","Nashik","Aurangabad","Nagpur","Solapur","Kolhapur"];
    cities.forEach((c) => addNode(c));

    // [from, to, dist(km), time(hr), cost(₹), capacity, traffic]
    const roads = [
      ["mumbai",     "pune",       148, 2.5,  250, 200, 60],
      ["mumbai",     "nashik",     167, 3.0,  280, 150, 40],
      ["pune",       "nashik",     211, 4.0,  320, 120, 30],
      ["pune",       "aurangabad", 235, 4.5,  380, 130, 50],
      ["nashik",     "aurangabad", 109, 2.0,  190, 100, 20],
      ["aurangabad", "nagpur",     496, 8.0,  750, 160, 70],
      ["pune",       "solapur",    248, 4.2,  400, 140, 45],
      ["solapur",    "nagpur",     540, 9.0,  820, 150, 80],
      ["pune",       "kolhapur",   228, 3.8,  360, 120, 35],
      ["kolhapur",   "solapur",    253, 4.3,  410, 110, 55],
    ];
    roads.forEach(([f, t, dist, tm, cst, cap, trf]) =>
      addEdge(f, t, { distance: dist, time: tm, cost: cst, capacity: cap, traffic: trf })
    );
  }

  return {
    addNode, removeNode,
    addEdge, removeEdge, setEdgeTraffic,
    getNode, getNodes, getEdges,
    getAdjList, totalWeight,
    clear, loadSample,
  };
})();
