/**
 * visualization/graphView.js
 * vis-network graph canvas — multi-criteria aware
 */
const GraphView = (() => {
  let network = null, visNodes = null, visEdges = null;
  let visRoot = null;

  const COLORS = {
    node: { bg: "#f8fafc", border: "#cbd5e1", font: "#1a1d23" },
    edge: { color: "#cbd5e1", highlight: "#64748b" },
    sp: "#e53e3e", mst: "#22c55e", tsp: "#3b82f6",
    mf: "#a855f7", route: "#06b6d4", combined: "#f59e0b",
    distance: "#3b82f6", time: "#8b5cf6", cost: "#10b981", traffic: "#f59e0b",
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
    smooth: { type: "continuous", roundness: 0.2 },
    shadow: { enabled: false }, selectionWidth: 3, hoverWidth: 1.5,
  };

  function _weightUnit() {
    const sel = document.getElementById("weightType");
    const t   = sel ? sel.value : "distance";
    return t === "distance" ? "km" : t === "time" ? "hr" : t === "cost" ? "₹" : "";
  }

  function _edgeLabel(e) {
    const sel = document.getElementById("weightType");
    const t   = sel ? sel.value : "distance";
    const val = e[t] || e.distance || e.weight || 0;
    const unit = _weightUnit();
    const traf = e.traffic > 0 ? `\n🚗${e.traffic}/${e.capacity}` : "";
    return `${val}${unit}${traf}`;
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

    container.style.width = "100%";
    container.style.height = "100%";
    visNodes = new visRoot.DataSet();
    visEdges = new visRoot.DataSet();
    const options = {
      nodes: NODE_OPT, edges: EDGE_OPT,
      physics: {
        enabled: true,
        stabilization: { iterations: 150, updateInterval: 25 },
        barnesHut: { gravitationalConstant: -4000, centralGravity: 0.35, springLength: 130, springConstant: 0.04, damping: 0.12 },
      },
      interaction: { hover: true, tooltipDelay: 150, zoomView: true, dragView: true },
      layout: { improvedLayout: true },
    };
    network = new visRoot.Network(container, { nodes: visNodes, edges: visEdges }, options);
    network.on("stabilized", () => network.setOptions({ physics: { enabled: false } }));
    network.fit();
    network.redraw();
  }

  function refresh() {
    if (!network) init();
    if (!network) return;
    const nodes = Graph.getNodes();
    const edges = Graph.getEdges();
    visNodes.clear();
    visNodes.add(nodes.map((n) => ({ id: n.id, label: n.label, title: `<b>${n.label}</b>` })));
    visEdges.clear();
    visEdges.add(edges.map((e) => ({
      id: e.id, from: e.from, to: e.to,
      label: _edgeLabel(e),
      title: `${Graph.getNode(e.from)?.label} ↔ ${Graph.getNode(e.to)?.label}<br>
              📏 ${e.distance}km | ⏱ ${e.time}hr | 💰 ₹${e.cost}<br>
              🚗 Traffic: ${e.traffic}/${e.capacity}`,
      ...EDGE_OPT,
    })));
    const ph = document.getElementById("canvasPlaceholder");
    if (ph) nodes.length > 0 ? ph.classList.add("hidden") : ph.classList.remove("hidden");
    if (nodes.length > 0) {
      network.setOptions({ physics: { enabled: true } });
      network.redraw();
      network.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });
      setTimeout(() => network.setOptions({ physics: { enabled: false } }), 1500);
    }
  }

  function highlight(edgeIds, type, nodePath) {
    if (!network) return;
    const color = COLORS[type] || COLORS.sp;
    visEdges.update(Graph.getEdges().map((e) => ({
      id: e.id, label: _edgeLabel(e),
      color: { color: "#cbd5e1", highlight: "#64748b", hover: "#94a3b8" }, width: 2, shadow: { enabled: false },
    })));
    visNodes.update(Graph.getNodes().map((n) => ({
      id: n.id, color: { background: "#f8fafc", border: "#cbd5e1",
        highlight: { background: "#1a1d23", border: "#1a1d23" },
        hover: { background: "#e2e8f0", border: "#94a3b8" } },
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
    // segments: [{ edgeIds, nodePath, color }]
    if (!network) return;
    visEdges.update(Graph.getEdges().map((e) => ({
      id: e.id, label: _edgeLabel(e),
      color: { color: "#cbd5e1", highlight: "#64748b", hover: "#94a3b8" }, width: 2, shadow: { enabled: false },
    })));
    visNodes.update(Graph.getNodes().map((n) => ({
      id: n.id, color: { background: "#f8fafc", border: "#cbd5e1",
        highlight: { background: "#1a1d23", border: "#1a1d23" },
        hover: { background: "#e2e8f0", border: "#94a3b8" }},
      borderWidth: 2, size: 16, font: { color: "#1a1d23" },
    })));
    segments.forEach(({ edgeIds, nodePath, color }) => {
      if (edgeIds) visEdges.update(edgeIds.filter(Boolean).map((id) => ({
        id, color: { color, highlight: color, hover: color }, width: 3,
        shadow: { enabled: true, size: 6, x: 0, y: 0, color: color + "55" },
      })));
      if (nodePath) visNodes.update(nodePath.map((id, i) => ({
        id, color: { background: (i===0||i===nodePath.length-1)?color:_lighten(color), border: color,
          highlight:{background:color,border:color}, hover:{background:_lighten(color),border:color}},
        borderWidth: 3, size: (i===0||i===nodePath.length-1)?20:16,
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
        shadow: ratio > 0.6 ? { enabled: true, size: 6, x: 0, y: 0, color: color+"44" } : { enabled: false },
      };
    }));
  }

  function resetHighlight() {
    if (!network) return;
    visEdges.update(Graph.getEdges().map((e) => ({
      id: e.id, label: _edgeLabel(e),
      color: { color: "#cbd5e1", highlight: "#64748b", hover: "#94a3b8" }, width: 2, shadow: { enabled: false },
    })));
    visNodes.update(Graph.getNodes().map((n) => ({
      id: n.id, color: { background: "#f8fafc", border: "#cbd5e1",
        highlight: { background: "#1a1d23", border: "#1a1d23" },
        hover: { background: "#e2e8f0", border: "#94a3b8" }},
      borderWidth: 2, size: 16, font: { color: "#1a1d23" },
    })));
  }

  function fitView() {
    if (network) network.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });
  }

  function _lighten(hex, amount = 0.6) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.round(r+(255-r)*amount)},${Math.round(g+(255-g)*amount)},${Math.round(b+(255-b)*amount)})`;
  }

  return { init, refresh, highlight, highlightMultiple, updateTrafficOverlay, resetHighlight, fitView };
})();
document.addEventListener("DOMContentLoaded", () => { GraphView.init(); });
