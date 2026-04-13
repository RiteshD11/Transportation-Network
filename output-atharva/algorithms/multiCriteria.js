/**
 * algorithms/multiCriteria.js
 * Multi-Criteria Path Optimizer
 */

const MultiCriteria = (() => {

  const CRITERIA_META = {
    distance: { label: "Shortest Distance", unit: "km", icon: "bi-rulers", color: "#3b82f6", algo: "Dijkstra" },
    time:     { label: "Fastest Time", unit: "hr", icon: "bi-clock-fill", color: "#8b5cf6", algo: "Dijkstra" },
    cost:     { label: "Lowest Cost", unit: "₹", icon: "bi-currency-rupee", color: "#10b981", algo: "Dijkstra" },
    traffic:  { label: "Least Traffic", unit: "score", icon: "bi-speedometer2", color: "#f59e0b", algo: "Ford-Fulkerson Routing" },
    maxflow:  { label: "Maximum Flow", unit: "units", icon: "bi-water", color: "#a855f7", algo: "Ford-Fulkerson" },
    mst:      { label: "Min Spanning Tree", unit: "km", icon: "bi-diagram-3-fill", color: "#22c55e", algo: "Kruskal" },

    // ⭐ NEW A* ENTRY
    astar:    { label: "A* Optimized Path", unit: "", icon: "bi-stars", color: "#ff9800", algo: "A* Algorithm" }
  };

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

        // ⭐ NEW CONDITION FOR A*
        if (crit === "astar") {
          res = AStar.run(source, target, "distance");
        }

        else if (crit === "distance" || crit === "time" || crit === "cost") {
          res = Dijkstra.run(source, target, crit);
        }

        else if (crit === "traffic") {
          res = FordFulkerson.findBestRoute(source, target);
        }

        else if (crit === "maxflow") {
          res = FordFulkerson.run(source, target);
        }

        else if (crit === "mst") {
          res = MST.run();
          if (!res.error) res._isMST = true;
        }

        results[crit] = res;

        if (res && res.error)
          errors.push(`${CRITERIA_META[crit].label}: ${res.error}`);

      } catch (e) {
        results[crit] = { error: e.message };
        errors.push(`${CRITERIA_META[crit].label}: ${e.message}`);
      }
    });

    const pathCriteria = selectedCriteria.filter((c) =>
      ["distance","time","cost","traffic","astar"].includes(c)
    );

    let combined = null;

    if (pathCriteria.length >= 2) {
      combined = _computeCombined(pathCriteria, results, source, target);
    }

    else if (pathCriteria.length === 1) {
      const c = pathCriteria[0];
      const r = results[c];

      if (r && !r.error) {
        combined = {
          path: r.path || [],
          pathLabels: (r.path || []).map((id) => Graph.getNode(id)?.label || id),
          edgeIds: r.edges || r.edgeIds || [],
          score: 1.0,
          breakdown: _buildBreakdown([c], results),
          note: "Single criterion — combined path equals individual result.",
        };
      }
    }

    return { results, combined, meta: CRITERIA_META, errors, selectedCriteria };
  }

  function _computeCombined(pathCriteria, results, source, target) {
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

    const scored = candidates.map((cand) => {
      const metrics = _evaluatePath(cand.path, cand.edgeIds);
      return { ...cand, metrics };
    });

    const metricKeys = ["distance","time","cost","trafficScore"];
    const mins = {}, maxs = {};

    metricKeys.forEach((k) => {
      const vals = scored.map((s) => s.metrics[k]).filter((v) => isFinite(v));
      mins[k] = Math.min(...vals);
      maxs[k] = Math.max(...vals);
    });

    const weightMap = { distance: 0, time: 0, cost: 0, trafficScore: 0 };
    const critToMetric = { distance:"distance", time:"time", cost:"cost", traffic:"trafficScore", astar:"distance" };

    pathCriteria.forEach((c) => {
      const mk = critToMetric[c];
      if (mk) weightMap[mk] = 1 / pathCriteria.length;
    });

    scored.forEach((s) => {
      let totalScore = 0;

      metricKeys.forEach((k) => {
        if (weightMap[k] === 0) return;

        const range = maxs[k] - mins[k];
        const norm  = range > 0 ? (s.metrics[k] - mins[k]) / range : 0;

        totalScore += norm * weightMap[k];
      });

      s.combinedScore = totalScore;
    });

    scored.sort((a, b) => a.combinedScore - b.combinedScore);
    const best = scored[0];

    return {
      path: best.path,
      pathLabels: best.path.map((id) => Graph.getNode(id)?.label || id),
      edgeIds: best.edgeIds,
      score: parseFloat((1 - best.combinedScore).toFixed(3)),
      metrics: best.metrics,
      basedOn: best.crit,
      ranking: scored.map((s, i) => ({
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
      note: `Best overall path selected using multi-criteria scoring.`,
    };
  }

  function _evaluatePath(path, edgeIds) {
    const edges = Graph.getEdges();
    let dist = 0, time = 0, cost = 0, traffic = 0, cap = 0;

    edgeIds.forEach((eid) => {
      const e = edges.find((x) => x.id === eid);
      if (!e) return;

      dist    += e.distance || 0;
      time    += e.time || 0;
      cost    += e.cost || 0;
      traffic += e.traffic || 0;
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

      return {
        crit,
        meta,
        value: r.totalWeight || "",
        path: r.path || [],
        pathLabels: (r.path || []).map((id) => Graph.getNode(id)?.label || id),
        edgeIds: r.edges || r.edgeIds || [],
        result: r,
      };
    });
  }

  return { runAll, CRITERIA_META };
})();