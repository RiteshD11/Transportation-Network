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

  function runAll(selectedCriteria, source, target, priorityOrder) {
    if (!source || !target) return { error: "Please select source and destination cities." };
    if (source === target)  return { error: "Source and destination must be different." };
    if (!selectedCriteria || selectedCriteria.length === 0)
      return { error: "Please select at least one requirement." };

    const results = {};
    const errors  = [];

    selectedCriteria.forEach((crit) => {
      try {
        let res;

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

    const orderedPriority = Array.isArray(priorityOrder) && priorityOrder.length
      ? priorityOrder.filter((c) => selectedCriteria.includes(c))
      : [...selectedCriteria];

    const orderedPathCriteria = orderedPriority.filter((c) => pathCriteria.includes(c));
    pathCriteria.forEach((c) => { if (!orderedPathCriteria.includes(c)) orderedPathCriteria.push(c); });

    let combined = null;

    if (orderedPathCriteria.length >= 2) {
      combined = _computeCombined(orderedPathCriteria, results, source, target);
    }

    else if (orderedPathCriteria.length === 1) {
      const c = orderedPathCriteria[0];
      const r = results[c];

      if (r && !r.error) {
        combined = {
          path: r.path || [],
          pathLabels: (r.path || []).map((id) => Graph.getNode(id)?.label || id),
          edgeIds: r.edges || r.edgeIds || [],
          score: 1.0,
          breakdown: _buildBreakdown([c], results),
          note: "Single criterion — combined path equals individual result.",
          priorityOrder: orderedPathCriteria,
        };
      }
    }

    return { results, combined, meta: CRITERIA_META, errors, selectedCriteria, priorityOrder: orderedPathCriteria };
  }

  function _computeCombined(orderedPathCriteria, results, source, target) {
    const candidates = [];

    orderedPathCriteria.forEach((crit) => {
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

    const critToMetric = { distance:"distance", time:"time", cost:"cost", traffic:"trafficScore", astar:"distance" };
    const metricLabel = { distance:"distance", time:"travel time", cost:"cost", trafficScore:"congestion" };
    const orderedWeights = {};
    const totalPriorities = orderedPathCriteria.length;
    const denom = (totalPriorities * (totalPriorities + 1)) / 2;
    orderedPathCriteria.forEach((c, idx) => {
      const mk = critToMetric[c];
      if (mk) orderedWeights[mk] = (totalPriorities - idx) / denom;
    });

    scored.forEach((s) => {
      let totalScore = 0;
      metricKeys.forEach((k) => {
        if (!orderedWeights[k]) return;
        const range = maxs[k] - mins[k];
        const norm  = range > 0 ? (s.metrics[k] - mins[k]) / range : 0;
        totalScore += norm * orderedWeights[k];
      });
      s.combinedScore = totalScore;
    });

    scored.sort((a, b) => a.combinedScore - b.combinedScore);
    const best = scored[0];
    const topCrit = orderedPathCriteria[0];
    const topMetric = critToMetric[topCrit] || "distance";

    const advisories = [];
    const swapSuggestions = [];

    const findCandidate = (crit) => scored.find((s) => s.crit === crit);
    const bestTraffic = findCandidate("traffic");

    if (bestTraffic && topCrit === "distance" && best.crit !== "traffic") {
      const highTraffic = best.metrics.trafficScore > 0.45;
      const trafficGain = best.metrics.trafficScore - bestTraffic.metrics.trafficScore;
      const distanceSacrifice = best.metrics.distance > 0 ? (best.metrics.distance - bestTraffic.metrics.distance) / best.metrics.distance : 0;
      if (highTraffic && trafficGain > 0.10 && distanceSacrifice <= 0.20) {
        const trafficDiff = Math.round(trafficGain * 100);
        const distanceDiff = Math.round(distanceSacrifice * 100);
        advisories.push({
          type: "warning",
          icon: "bi-exclamation-triangle-fill",
          color: "#f59e0b",
          title: "⚠️ Distance route has heavy traffic",
          message: `You prioritised Distance first, so the chosen route is shortest. But this path has ${Math.round(best.metrics.trafficScore * 100)}% congestion. A traffic-optimised route reduces congestion by ${trafficDiff}% while increasing distance by only ${distanceDiff}%. Consider making Traffic your higher priority for a more feasible route.`,
        });
        swapSuggestions.push({
          swapTo: "traffic",
          gain: `${trafficDiff}% less congestion`,
          cost: `${distanceDiff}% more distance`,
        });
      }
    }

    orderedPathCriteria.slice(1).forEach((otherCrit) => {
      const otherMetric = critToMetric[otherCrit];
      if (!otherMetric) return;
      const otherCand = findCandidate(otherCrit);
      if (!otherCand || otherCand === best) return;

      const bestOtherVal = best.metrics[otherMetric];
      const otherVal = otherCand.metrics[otherMetric];
      const primaryBest = best.metrics[topMetric];
      const primaryOther = otherCand.metrics[topMetric];

      const secondaryDiff = otherVal > 0 ? (bestOtherVal - otherVal) / otherVal : 0;
      const primaryDiff = primaryBest > 0 ? (primaryOther - primaryBest) / primaryBest : 0;

      if (secondaryDiff > 0.18 && primaryDiff <= 0.25) {
        advisories.push({
          type: "info",
          icon: "bi-info-circle",
          color: "#3b82f6",
          title: `ℹ️ ${CRITERIA_META[otherCrit].label} shows a better tradeoff`,
          message: `The ${CRITERIA_META[otherCrit].label} route is ${Math.round(secondaryDiff * 100)}% better on ${metricLabel[otherMetric]} while costing only ${Math.round(primaryDiff * 100)}% more on your top priority (${CRITERIA_META[topCrit].label}).`,
        });
        swapSuggestions.push({
          swapTo: otherCrit,
          gain: `${Math.round(secondaryDiff * 100)}% better ${metricLabel[otherMetric]}`,
          cost: `${Math.round(primaryDiff * 100)}% more ${metricLabel[topMetric]}`,
        });
      }
    });

    return {
      path: best.path,
      pathLabels: best.path.map((id) => Graph.getNode(id)?.label || id),
      edgeIds: best.edgeIds,
      score: parseFloat((1 - best.combinedScore).toFixed(3)),
      metrics: best.metrics,
      basedOn: best.crit,
      priorityOrder: orderedPathCriteria,
      advisories,
      swapSuggestions,
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
      breakdown: _buildBreakdown(orderedPathCriteria, results),
      note: `Best path chosen according to your priorities: ${orderedPathCriteria.map((c) => CRITERIA_META[c]?.label || c).join(" > ")}.`,
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