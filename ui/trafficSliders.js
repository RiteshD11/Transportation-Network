/**
 * ui/trafficSliders.js
 * Traffic per-edge sliders in the left sidebar.
 */
const TrafficSliders = (() => {
  function refresh() {
    const container = document.getElementById("trafficSliderList");
    if (!container) return;
    const edges = Graph.getEdges();
    if (!edges.length) {
      container.innerHTML = '<div class="op-empty" style="padding:.5rem 0">No roads yet.</div>';
      return;
    }
    container.innerHTML = edges.map((e) => {
      const f = Graph.getNode(e.from)?.label || e.from;
      const t = Graph.getNode(e.to)?.label   || e.to;
      const ratio = e.capacity > 0 ? e.traffic / e.capacity : 0;
      const pct   = Math.round(ratio * 100);
      const color = FordFulkerson.congestionColor(ratio);
      return `
        <div class="traffic-edge-item" data-edge="${e.id}">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="te-route">${f} ↔ ${t}</span>
            <span class="te-status" style="color:${color}">${FordFulkerson.congestionLabel(ratio)}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <input type="range" class="form-range traf-slider flex-grow-1"
              min="0" max="${e.capacity}" step="1" value="${e.traffic}"
              style="accent-color:${color}" data-edge="${e.id}">
            <span class="te-value">${e.traffic}/${e.capacity}</span>
          </div>
          <div class="congestion-bar-wrap">
            <div class="congestion-bar" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".traf-slider").forEach((sl) => {
      sl.addEventListener("input", (ev) => {
        const eid = ev.target.dataset.edge;
        const val = parseInt(ev.target.value);
        Graph.setEdgeTraffic(eid, val);
        _updateItem(eid, val);
        GraphView.updateTrafficOverlay();
      });
    });
  }

  function _updateItem(eid, traffic) {
    const item = document.querySelector(`.traffic-edge-item[data-edge="${eid}"]`);
    if (!item) return;
    const e = Graph.getEdges().find((x) => x.id === eid);
    const cap   = e?.capacity || 1;
    const ratio = traffic / cap;
    const pct   = Math.round(ratio * 100);
    const color = FordFulkerson.congestionColor(ratio);
    const lbl   = FordFulkerson.congestionLabel(ratio);
    const s     = item.querySelector(".te-status");
    const v     = item.querySelector(".te-value");
    const b     = item.querySelector(".congestion-bar");
    const sl    = item.querySelector(".traf-slider");
    if (s)  { s.textContent = lbl; s.style.color = color; }
    if (v)   v.textContent  = `${traffic}/${cap}`;
    if (b)  { b.style.width = pct+"%"; b.style.background = color; }
    if (sl)  sl.style.accentColor = color;
  }

  function randomTraffic() {
    const intensity = parseInt(document.getElementById("trafficIntensitySlider")?.value || 60) / 100;
    Graph.getEdges().forEach((e) => {
      const lo  = Math.floor(e.capacity * 0.10);
      const hi  = Math.floor(e.capacity * intensity);
      const val = lo + Math.floor(Math.random() * (hi - lo + 1));
      Graph.setEdgeTraffic(e.id, val);
    });
    refresh();
    GraphView.updateTrafficOverlay();
    Controls.toast("Random traffic applied!", "info");
  }

  function clearTraffic() {
    Graph.getEdges().forEach((e) => Graph.setEdgeTraffic(e.id, 0));
    refresh();
    GraphView.updateTrafficOverlay();
    Controls.toast("Traffic cleared.", "info");
  }

  return { refresh, randomTraffic, clearTraffic };
})();
