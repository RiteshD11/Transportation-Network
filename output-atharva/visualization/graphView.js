/**
 * visualization/graphView.js
 * vis-network graph canvas — multi-criteria aware
 */
const GraphView = (() => {
  let network = null, visNodes = null, visEdges = null;
  let visRoot = null;

  // Tracks whether the graph has been laid out at least once.
  // After the first stabilization we never auto-fit again — the user is free
  // to zoom / pan without the view snapping back.
  let _initialFitDone = false;

  // Guard that prevents the stabilized handler from re-enabling physics
  // in a loop when we call network.setOptions ourselves.
  let _physicsSettling = false;

  const COLORS = {
    node: { bg: "#f8fafc", border: "#cbd5e1", font: "#1a1d23" },
    edge: { color: "#cbd5e1", highlight: "#64748b" },
    sp: "#e53e3e", mst: "#22c55e", tsp: "#3b82f6",
    mf: "#a855f7", route: "#06b6d4", combined: "#f59e0b",
    distance: "#3b82f6", time: "#8b5cf6", cost: "#10b981",
    traffic: "#f59e0b", astar: "#ff9800",
  };

  const NODE_OPT = {
    shape: "dot", size: 16,
    font: { face: "DM Sans", size: 12, color: "#1a1d23" },
    color: {
      background: "#ffffff", border: "#64748b",
      highlight: { background: "#1a1d23", border: "#1a1d23" },
      hover: { background: "#e2e8f0", border: "#334155" },
    },
    borderWidth: 2, borderWidthSelected: 3,
    shadow: { enabled: true, size: 6, x: 0, y: 2, color: "rgba(0,0,0,.12)" },
  };

  const EDGE_OPT = {
    width: 2.5,
    color: { color: "#64748b", highlight: "#334155", hover: "#334155" },
    font: { face: "DM Mono", size: 10, color: "#5a6070", strokeWidth: 0, background: "rgba(255,255,255,0.85)" },
    smooth: false,   // FIX: curved edges cause zoom-shake; straight is stable
    shadow: { enabled: false }, selectionWidth: 3, hoverWidth: 1.5,
  };

  function _weightUnit() {
    const sel = document.getElementById("weightType");
    const t   = sel ? sel.value : "distance";
    return t === "distance" ? "km" : t === "time" ? "hr" : t === "cost" ? "INR" : "";
  }

  function _edgeLabel(e) {
    const sel = document.getElementById("weightType");
    const t   = sel ? sel.value : "distance";
    const val = e[t] || e.distance || e.weight || 0;
    const unit = _weightUnit();
    return `${val}${unit}`;
  }

  function _edgeTooltip(e) {
    const fromLabel = Graph.getNode(e.from)?.label || e.from;
    const toLabel   = Graph.getNode(e.to)?.label   || e.to;
    return `${fromLabel} to ${toLabel} | ${e.distance}km | ${e.time}hr | ${e.cost}INR | Traffic: ${e.traffic}/${e.capacity}`;
  }

  function init() {
    if (network) return;
    const container = document.getElementById("networkCanvas");
    if (!container) return;

    visRoot = window.vis || window.visNetwork || window.visualization || null;
    if (!visRoot || typeof visRoot.Network !== "function" || typeof visRoot.DataSet !== "function") {
      console.error("vis-network library failed to load. Ensure vis-network is available before graphView.js.");
      const placeholder = document.getElementById("canvasPlaceholder");
      if (placeholder) placeholder.textContent = "Graph library failed to load.";
      return;
    }

    container.style.width  = "100%";
    container.style.height = "100%";

    visNodes = new visRoot.DataSet();
    visEdges = new visRoot.DataSet();

    const options = {
      nodes: NODE_OPT,
      edges: EDGE_OPT,
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25,
          fit: false,   // FIX: we handle fit ourselves, exactly once
        },
        barnesHut: {
          gravitationalConstant: -4000,
          centralGravity: 0.35,
          springLength: 130,
          springConstant: 0.04,
          damping: 1,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        zoomView: true,
        dragView: true,
        dragNodes: true,
        navigationButtons: false,
        keyboard: { enabled: false },
        zoomSpeed: 0.5,   // FIX: slower zoom feels stable, not jumpy
      },
      layout: { improvedLayout: true },
    };

    network = new visRoot.Network(container, { nodes: visNodes, edges: visEdges }, options);

    // FIX: stabilized fires once per layout run.
    // Turn physics OFF immediately so the graph goes rigid.
    // Fit to view only on the very first layout, never again automatically
    // so user zoom/pan is never interrupted.
    network.on("stabilized", () => {
      if (_physicsSettling) return;

      _physicsSettling = true;
      network.setOptions({ physics: { enabled: false } });
      _physicsSettling = false;

      if (!_initialFitDone) {
        _initialFitDone = true;
        network.fit({
          animation: { duration: 500, easingFunction: "easeInOutQuad" },
        });
      }
    });
  }

  function refresh() {
    if (!network) init();
    if (!network) return;

    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();

    visNodes.clear();
    visNodes.add(nodes.map((n) => ({
      id: n.id,
      label: n.label,
      title: `${n.label}`,
    })));

    visEdges.clear();
    visEdges.add(edges.map((e) => ({
      id: e.id, from: e.from, to: e.to,
      label: _edgeLabel(e),
      title: _edgeTooltip(e),
      ...EDGE_OPT,
    })));

    const ph = document.getElementById("canvasPlaceholder");
    if (ph) {
      if (nodes.length > 0) ph.classList.add("hidden");
      else ph.classList.remove("hidden");
    }

    if (nodes.length > 0) {
      // Reset fit-guard so the next stabilization fits the new layout
      _initialFitDone = false;
      // FIX: removed the old setTimeout fallback — that was the root cause
      // of the zoom shake (it fired network.fit() 1.5s after refresh,
      // mid-zoom). The stabilized event handles everything cleanly.
      network.setOptions({ physics: { enabled: true } });
    }
  }

  function highlight(edgeIds, type, nodePath) {
    if (!network) return;
    const color = COLORS[type] || COLORS.sp;

    visEdges.update(Graph.getEdges().map((e) => ({
      id: e.id, label: _edgeLabel(e),
      color: { color: "#cbd5e1", highlight: "#64748b", hover: "#94a3b8" },
      width: 2, shadow: { enabled: false },
    })));

    visNodes.update(Graph.getNodes().map((n) => ({
      id: n.id, color: {
        background: "#f8fafc", border: "#cbd5e1",
        highlight: { background: "#1a1d23", border: "#1a1d23" },
        hover: { background: "#e2e8f0", border: "#94a3b8" },
      },
      borderWidth: 2, size: 16, font: { color: "#1a1d23" },
    })));

    if (!edgeIds || !edgeIds.length) return;

    visEdges.update(edgeIds.filter(Boolean).map((id) => ({
      id,
      color: { color, highlight: color, hover: color },
      width: type === "mf" ? 5 : 3,
      shadow: { enabled: true, size: 8, x: 0, y: 0, color: color + "55" },
    })));

    if (nodePath && nodePath.length) {
      visNodes.update(nodePath.map((id, i) => ({
        id,
        color: {
          background: (i === 0 || i === nodePath.length - 1) ? color : _lighten(color),
          border: color,
          highlight: { background: color, border: color },
          hover: { background: _lighten(color), border: color },
        },
        borderWidth: 3,
        size: (i === 0 || i === nodePath.length - 1) ? 20 : 17,
        font: { color: (i === 0 || i === nodePath.length - 1) ? "#fff" : "#1a1d23" },
      })));
    }

    network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
  }

  function highlightMultiple(segments) {
    if (!network) return;

    visEdges.update(Graph.getEdges().map((e) => ({
      id: e.id, label: _edgeLabel(e),
      color: { color: "#cbd5e1", highlight: "#64748b", hover: "#94a3b8" },
      width: 2, shadow: { enabled: false },
    })));

    visNodes.update(Graph.getNodes().map((n) => ({
      id: n.id, color: {
        background: "#f8fafc", border: "#cbd5e1",
        highlight: { background: "#1a1d23", border: "#1a1d23" },
        hover: { background: "#e2e8f0", border: "#94a3b8" },
      },
      borderWidth: 2, size: 16, font: { color: "#1a1d23" },
    })));

    segments.forEach(({ edgeIds, nodePath, color }) => {
      if (edgeIds)
        visEdges.update(edgeIds.filter(Boolean).map((id) => ({
          id, color: { color, highlight: color, hover: color }, width: 3,
          shadow: { enabled: true, size: 6, x: 0, y: 0, color: color + "55" },
        })));
      if (nodePath)
        visNodes.update(nodePath.map((id, i) => ({
          id,
          color: {
            background: (i === 0 || i === nodePath.length - 1) ? color : _lighten(color),
            border: color,
            highlight: { background: color, border: color },
            hover: { background: _lighten(color), border: color },
          },
          borderWidth: 3,
          size: (i === 0 || i === nodePath.length - 1) ? 20 : 16,
        })));
    });

    network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
  }

  function updateTrafficOverlay() {
    if (!network) return;
    visEdges.update(Graph.getEdges().map((e) => {
      const ratio = e.capacity > 0 ? e.traffic / e.capacity : 0;
      const color = FordFulkerson.congestionColor(ratio);
      return {
        id: e.id, label: _edgeLabel(e),
        color: { color, highlight: color, hover: color },
        width: 1.5 + ratio * 3.5,
        shadow: ratio > 0.6
          ? { enabled: true, size: 6, x: 0, y: 0, color: color + "44" }
          : { enabled: false },
      };
    }));
  }

  function resetHighlight() {
    if (!network) return;
    visEdges.update(Graph.getEdges().map((e) => ({
      id: e.id, label: _edgeLabel(e),
      color: { color: "#cbd5e1", highlight: "#64748b", hover: "#94a3b8" },
      width: 2, shadow: { enabled: false },
    })));
    visNodes.update(Graph.getNodes().map((n) => ({
      id: n.id, color: {
        background: "#f8fafc", border: "#cbd5e1",
        highlight: { background: "#1a1d23", border: "#1a1d23" },
        hover: { background: "#e2e8f0", border: "#94a3b8" },
      },
      borderWidth: 2, size: 16, font: { color: "#1a1d23" },
    })));
  }

  /**
   * deleteSelected()
   * Deletes the currently selected node(s) or edge(s) from both the
   * Graph model and the vis-network DataSets.
   */
  function deleteSelected() {
    if (!network) return;

    const selectedNodes = network.getSelectedNodes();
    const selectedEdges = network.getSelectedEdges();

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      console.warn("GraphView.deleteSelected: nothing is selected.");
      return;
    }

    selectedNodes.forEach((nodeId) => {
      const connectedEdges = Graph.getEdges().filter(
        (e) => e.from === nodeId || e.to === nodeId,
      );
      connectedEdges.forEach((e) => {
        Graph.removeEdge(e.id);
        visEdges.remove(e.id);
      });
      Graph.removeNode(nodeId);
      visNodes.remove(nodeId);
    });

    selectedEdges.forEach((edgeId) => {
      const stillExists = Graph.getEdges().some((e) => e.id === edgeId);
      if (stillExists) {
        Graph.removeEdge(edgeId);
        visEdges.remove(edgeId);
      }
    });

    network.unselectAll();

    const ph = document.getElementById("canvasPlaceholder");
    if (ph && Graph.getNodes().length === 0) {
      ph.classList.remove("hidden");
    }
  }

  function fitView() {
    if (network)
      network.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });
  }

  function _lighten(hex, amount = 0.6) {
    const r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
  }

  return { init, refresh, highlight, highlightMultiple, updateTrafficOverlay, resetHighlight, deleteSelected, fitView };
})();

document.addEventListener("DOMContentLoaded", () => { GraphView.init(); });
