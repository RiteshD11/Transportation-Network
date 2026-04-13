/**
 * ui/outputDisplay.js
 * Renders algorithm results into the right panel.
 */
const OutputDisplay = (() => {
  const LABELS = {
    sp:  { text: "Shortest Path",       icon: "bi-arrow-right-circle-fill", cls: "rb-sp"  },
    mst: { text: "Minimum Spanning Tree",icon: "bi-tree-fill",              cls: "rb-mst" },
    tsp: { text: "Travelling Salesman",  icon: "bi-arrow-repeat",           cls: "rb-tsp" },
    mf:  { text: "Max Flow",             icon: "bi-water",                  cls: "rb-mf"  },
  };

  function _unit() {
    const t = document.getElementById("weightType")?.value || "distance";
    return t === "distance" ? "km" : t === "time" ? "hr" : t === "cost" ? "₹" : "";
  }

  function _renderPath(nodeIds) {
    return nodeIds.map((id, i) => {
      const lbl = Graph.getNode(id)?.label || id;
      return `<span class="rp-node">${lbl}</span>${i < nodeIds.length-1 ? '<span class="rp-arrow">→</span>' : ""}`;
    }).join("");
  }

  function renderError(msg) {
    document.getElementById("outputContent").innerHTML =
      `<div class="result-error"><i class="bi bi-exclamation-triangle-fill"></i><span>${msg}</span></div>`;
  }

  function renderSP(result) {
    const unit = _unit();
    document.getElementById("outputContent").innerHTML = `
      <div class="result-block">
        <div class="result-type-badge rb-sp"><i class="bi bi-arrow-right-circle-fill"></i> Shortest Path</div>
        <div class="result-metric">
          <span class="rm-label">Total Weight</span>
          <span class="rm-value">${result.totalWeight}</span>
          <span class="rm-unit">${unit}</span>
        </div>
        <div class="result-metric">
          <span class="rm-label">Hops</span>
          <span class="rm-value" style="font-size:.95rem">${result.path.length-1}</span>
          <span class="rm-unit">roads</span>
        </div>
        <div class="result-path-label">Route</div>
        <div class="result-path">${_renderPath(result.path)}</div>
      </div>`;
  }

  function renderMST(result) {
    const unit = _unit();
    document.getElementById("outputContent").innerHTML = `
      <div class="result-block">
        <div class="result-type-badge rb-mst"><i class="bi bi-tree-fill"></i> Minimum Spanning Tree</div>
        <div class="result-metric">
          <span class="rm-label">Total MST Weight</span>
          <span class="rm-value">${result.totalWeight}</span>
          <span class="rm-unit">${unit}</span>
        </div>
        <div class="result-metric">
          <span class="rm-label">Edges in MST</span>
          <span class="rm-value" style="font-size:.95rem">${result.edges.length}</span>
          <span class="rm-unit">roads</span>
        </div>
        <div class="result-path-label">MST Edges</div>
        <div class="result-edges-list">
          ${result.edges.map((e) => {
            const f = Graph.getNode(e.from)?.label||e.from, t = Graph.getNode(e.to)?.label||e.to;
            return `<div class="re-item"><span>${f} ↔ ${t}</span><span class="re-weight">${e.weight}${unit}</span></div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function renderTSP(result) {
    const unit = _unit();
    document.getElementById("outputContent").innerHTML = `
      <div class="result-block">
        <div class="result-type-badge rb-tsp"><i class="bi bi-arrow-repeat"></i> Travelling Salesman</div>
        <div class="result-metric">
          <span class="rm-label">Tour Length</span>
          <span class="rm-value">${result.totalWeight}</span>
          <span class="rm-unit">${unit}</span>
        </div>
        <div class="result-metric">
          <span class="rm-label">Cities Visited</span>
          <span class="rm-value" style="font-size:.95rem">${result.tour.length-1}</span>
          <span class="rm-unit">cities</span>
        </div>
        <div class="result-path-label">Tour Route</div>
        <div class="result-path">${_renderPath(result.tour)}</div>
      </div>`;
  }

  function renderMF(result) {
    const augHTML = result.augPaths && result.augPaths.length
      ? `<div class="aug-paths-wrap">
           <button class="aug-paths-toggle" onclick="this.nextElementSibling.classList.toggle('open')">
             <i class="bi bi-diagram-3"></i> ${result.augPaths.length} augmenting path(s)
             <i class="bi bi-chevron-down ms-auto"></i>
           </button>
           <div class="aug-path-list">
             ${result.augPaths.map((ap,i)=>`
               <div class="aug-path-item">
                 <span>#${i+1} ${ap.pathLabels.join(" → ")}</span>
                 <span class="aug-path-flow">+${ap.flow}</span>
               </div>`).join("")}
           </div>
         </div>` : "";
    document.getElementById("outputContent").innerHTML = `
      <div class="result-block">
        <div class="result-type-badge rb-mf"><i class="bi bi-water"></i> Ford-Fulkerson Max Flow</div>
        <div class="result-metric">
          <span class="rm-label">Maximum Flow</span>
          <span class="rm-value">${result.maxFlow}</span>
          <span class="rm-unit">units</span>
        </div>
        <div class="result-metric">
          <span class="rm-label">Flow Segments</span>
          <span class="rm-value" style="font-size:.95rem">${result.flowEdges.length}</span>
          <span class="rm-unit">edges</span>
        </div>
        <div class="result-path-label">Flow Breakdown</div>
        <div class="result-edges-list">
          ${result.flowEdges.map((fe)=>{
            const f=Graph.getNode(fe.from)?.label||fe.from, t=Graph.getNode(fe.to)?.label||fe.to;
            const pct=Math.round((fe.utilisation||0)*100);
            return `<div class="re-item"><span>${f} → ${t}</span>
              <span class="re-weight">${fe.flow}/${fe.capacity} <span style="color:var(--text-3);font-size:.7rem">(${pct}%)</span></span></div>`;
          }).join("")}
        </div>
        ${augHTML}
      </div>`;
  }

  function clear() {
    document.getElementById("outputContent").innerHTML =
      '<div class="op-empty">Run an algorithm to see results here.</div>';
  }

  return { renderError, renderSP, renderMST, renderTSP, renderMF, clear };
})();
