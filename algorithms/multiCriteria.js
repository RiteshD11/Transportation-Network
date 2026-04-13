/**
 * algorithms/multiCriteria.js
 * Multi-Criteria Path Optimizer
 *
 * Runs each selected requirement through its respective algorithm,
 * then computes a COMBINED optimal path using weighted scoring.
 *
 * Criteria supported:
 *   distance  → Dijkstra on distance weights
 *   time      → Dijkstra on time weights
 *   cost      → Dijkstra on cost weights
 *   traffic   → Ford-Fulkerson traffic-aware routing
 *   maxflow   → Ford-Fulkerson max flow
 *   mst       → Kruskal MST
 */

const MultiCriteria = (() => {

  // Label/unit map for display
  const CRITERIA_META = {
    distance: { label: "Shortest Distance", unit: "km",    icon: "bi-rulers",              color: "#3b82f6", algo: "Dijkstra" },
    time:     { label: "Fastest Time",      unit: "hr",    icon: "bi-clock-fill",           color: "#8b5cf6", algo: "Dijkstra" },
    cost:     { label: "Lowest Cost",       unit: "₹",     icon: "bi-currency-rupee",       color: "#10b981", algo: "Dijkstra" },
    traffic:  { label: "Least Traffic",     unit: "score", icon: "bi-speedometer2",         color: "#f59e0b", algo: "Ford-Fulkerson Routing" },
    maxflow:  { label: "Maximum Flow",      unit: "units", icon: "bi-water",                color: "#a855f7", algo: "Ford-Fulkerson" },
    mst:      { label: "Min Spanning Tree", unit: "km",    icon: "bi-diagram-3-fill",       color: "#22c55e", algo: "Kruskal" },
  };

  /**
   * Run all selected criteria from source → target.
   * @param {string[]} selectedCriteria  e.g. ["distance","time","traffic"]
   * @param {string}   source
   * @param {string}   target
   * @returns { results: { [criterion]: result }, combined: CombinedResult, error? }
   */
  function runAll(selectedCriteria, source, target) {
    if (!source || !target) return { error: "Please select source and destination cities." };
    if (source === target)  return { error: "Source and destination must be different." };
    if (!selectedCriteria || selectedCriteria.length === 0)
      return { error: "Please select at least one requirement." };

    const results = {};
    const errors  = [];

    selectedCriteria.forEach((crit) => {
      try {
        let res;
        if (crit === "distance" || crit === "time" || crit === "cost") {
          res = Dijkstra.run(source, target, crit);
        } else if (crit === "traffic") {
          res = FordFulkerson.findBestRoute(source, target);
        } else if (crit === "maxflow") {
          res = FordFulkerson.run(source, target);
        } else if (crit === "mst") {
          res = MST.run();
          // Annotate for display
          if (!res.error) res._isMST = true;
        }
        results[crit] = res;
        if (res && res.error) errors.push(`${CRITERIA_META[crit].label}: ${res.error}`);
      } catch (e) {
        results[crit] = { error: e.message };
        errors.push(`${CRITERIA_META[crit].label}: ${e.message}`);
      }
    });

    // Only compute combined for path-based criteria (not MST/maxflow alone)
    const pathCriteria = selectedCriteria.filter((c) =>
      ["distance","time","cost","traffic"].includes(c)
    );

    let combined = null;
    if (pathCriteria.length >= 2) {
      combined = _computeCombined(pathCriteria, results, source, target);
    } else if (pathCriteria.length === 1) {
      // Combined = same as the single result
      const c = pathCriteria[0];
      const r = results[c];
      if (r && !r.error) {
        combined = {
          path:        r.path || [],
          pathLabels:  (r.path || []).map((id) => Graph.getNode(id)?.label || id),
          edgeIds:     r.edges || r.edgeIds || [],
          score:       1.0,
          breakdown:   _buildBreakdown([c], results),
          note:        "Single criterion — combined path equals individual result.",
        };
      }
    }

    return { results, combined, meta: CRITERIA_META, errors, selectedCriteria };
  }

  /**
   * Score-based combination: for each candidate path (from each criterion),
   * evaluate it against ALL other criteria and pick the path with best overall rank.
   */
  function _computeCombined(pathCriteria, results, source, target) {
    // Collect all unique candidate paths (by criterion)
    const candidates = [];
    pathCriteria.forEach((crit) => {
      const r = results[crit];
      if (!r || r.error) return;
      const path    = r.path || [];
      const edgeIds = r.edges || r.edgeIds || [];
      if (path.length < 2) return;
      candidates.push({ crit, path, edgeIds });
    });

    if (!candidates.length) return null;

    // For each candidate path evaluate all criteria metrics
    const scored = candidates.map((cand) => {
      const metrics = _evaluatePath(cand.path, cand.edgeIds);
      return { ...cand, metrics };
    });

    // Normalise each metric across candidates
    const metricKeys = ["distance","time","cost","trafficScore"];
    const mins = {}, maxs = {};
    metricKeys.forEach((k) => {
      const vals = scored.map((s) => s.metrics[k]).filter((v) => isFinite(v));
      mins[k] = Math.min(...vals);
      maxs[k] = Math.max(...vals);
    });

    // Assign weights equally across selected path criteria
    const weightMap = { distance: 0, time: 0, cost: 0, trafficScore: 0 };
    const critToMetric = { distance:"distance", time:"time", cost:"cost", traffic:"trafficScore" };
    pathCriteria.forEach((c) => {
      const mk = critToMetric[c];
      if (mk) weightMap[mk] = 1 / pathCriteria.length;
    });

    // Score each candidate (lower is better for all metrics)
    scored.forEach((s) => {
      let totalScore = 0;
      metricKeys.forEach((k) => {
        if (weightMap[k] === 0) return;
        const range = maxs[k] - mins[k];
        const norm  = range > 0 ? (s.metrics[k] - mins[k]) / range : 0;
        totalScore += norm * weightMap[k];
      });
      s.combinedScore = totalScore; // 0=best, 1=worst
    });

    // Pick best (lowest score)
    scored.sort((a, b) => a.combinedScore - b.combinedScore);
    const best = scored[0];

    return {
      path:       best.path,
      pathLabels: best.path.map((id) => Graph.getNode(id)?.label || id),
      edgeIds:    best.edgeIds,
      score:      parseFloat((1 - best.combinedScore).toFixed(3)),
      metrics:    best.metrics,
      basedOn:    best.crit,
      ranking:    scored.map((s, i) => ({
        rank: i + 1,
        crit: s.crit,
        label: CRITERIA_META[s.crit]?.label,
        score: parseFloat((1 - s.combinedScore).toFixed(3)),
        metrics: s.metrics,
        path: s.path,
        pathLabels: s.path.map((id) => Graph.getNode(id)?.label || id),
        edgeIds: s.edgeIds,
      })),
      breakdown: _buildBreakdown(pathCriteria, results),
      note: `Best overall path selected from ${candidates.length} candidate(s) using equal-weighted scoring.`,
    };
  }

  /** Evaluate a path's metrics across all 4 dimensions. */
  function _evaluatePath(path, edgeIds) {
    const edges = Graph.getEdges();
    let dist = 0, time = 0, cost = 0, traffic = 0, cap = 0;
    edgeIds.forEach((eid) => {
      const e = edges.find((x) => x.id === eid);
      if (!e) return;
      dist    += e.distance || 0;
      time    += e.time     || 0;
      cost    += e.cost     || 0;
      traffic += e.traffic  || 0;
      cap     += e.capacity || 0;
    });
    const trafficScore = cap > 0 ? traffic / cap : 0;
    return { distance: dist, time, cost, trafficScore, hops: path.length - 1 };
  }

  function _buildBreakdown(pathCriteria, results) {
    return pathCriteria.map((crit) => {
      const r    = results[crit];
      const meta = CRITERIA_META[crit];
      if (!r || r.error) return { crit, meta, error: r?.error || "Failed" };

      let value, path, edgeIds;
      if (crit === "distance") { value = r.totalWeight; path = r.path; edgeIds = r.edges; }
      else if (crit === "time")  { value = r.totalWeight; path = r.path; edgeIds = r.edges; }
      else if (crit === "cost")  { value = r.totalWeight; path = r.path; edgeIds = r.edges; }
      else if (crit === "traffic") {
        value = Math.round((r.trafficScore || 0) * 100) + "% congestion";
        path = r.path; edgeIds = r.edgeIds;
      }
      return {
        crit, meta, value,
        path: path || [],
        pathLabels: (path || []).map((id) => Graph.getNode(id)?.label || id),
        edgeIds: edgeIds || [],
        result: r,
      };
    });
  }

  return { runAll, CRITERIA_META };
})();
