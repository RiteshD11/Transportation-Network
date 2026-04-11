/**
 * pages/multiCriteriaPage.js
 * Multi-Criteria Results Page — overlay panel with tabs per criterion + combined result.
 */
const MultiCriteriaPage = (() => {

  let _lastResult = null;
  let _activeTab  = "combined";

  function open(result) {
    _lastResult = result;
    _activeTab  = "combined";
    _render(result);
    document.getElementById("mcPageOverlay").classList.add("active");
    document.getElementById("mcPage").classList.add("active");
  }

  function close() {
    document.getElementById("mcPageOverlay").classList.remove("active");
    document.getElementById("mcPage").classList.remove("active");
  }

  function _render(result) {
    _renderTabs(result);
    _renderCombined(result);
  }

  function _renderTabs(result) {
    const bar = document.getElementById("mcTabBar");
    if (!bar) return;

    // Build tabs: Combined first, then each criterion
    const tabs = [{ id: "combined", label: "⭐ Combined", color: "#f59e0b" }];
    result.selectedCriteria.forEach((crit) => {
      const m = result.meta[crit];
      tabs.push({ id: crit, label: `<i class="bi ${m.icon}"></i> ${m.label}`, color: m.color });
    });

    bar.innerHTML = tabs.map((tab) => `
      <button class="mc-tab ${tab.id === _activeTab ? "active" : ""}"
              data-tab="${tab.id}"
              style="--tab-color:${tab.color}">
        ${tab.label}
      </button>`).join("");

    bar.querySelectorAll(".mc-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        _activeTab = btn.dataset.tab;
        bar.querySelectorAll(".mc-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (_activeTab === "combined") _renderCombined(_lastResult);
        else _renderCriterion(_lastResult, _activeTab);
      });
    });
  }

  function _renderCombined(result) {
    const body = document.getElementById("mcPageBody");
    const combined = result.combined;
    const meta     = result.meta;

    if (!combined) {
      body.innerHTML = `<div class="mc-empty-state">
        <i class="bi bi-exclamation-circle" style="font-size:2rem;color:var(--text-3)"></i>
        <p>Not enough path-based criteria selected for a combined result.<br>
           Select at least 2 of: Distance, Time, Cost, or Traffic.</p>
      </div>`;
      return;
    }

    // Per-criterion scores card
    const breakdownCards = (combined.breakdown || []).map((bd) => {
      if (bd.error) return `<div class="mc-score-card error">
        <div class="msc-head" style="background:${bd.meta?.color||"#e53e3e"}20;border-color:${bd.meta?.color||"#e53e3e"}40">
          <i class="bi ${bd.meta?.icon||"bi-x-circle"}"></i> ${bd.meta?.label||bd.crit}
        </div>
        <div class="msc-body"><div class="msc-error">${bd.error}</div></div>
      </div>`;
      return `<div class="mc-score-card" data-crit="${bd.crit}">
        <div class="msc-head" style="background:${bd.meta.color}18;border-color:${bd.meta.color}40">
          <i class="bi ${bd.meta.icon}" style="color:${bd.meta.color}"></i>
          <span>${bd.meta.label}</span>
          <span class="msc-algo">${bd.meta.algo}</span>
        </div>
        <div class="msc-body">
          <div class="msc-route">${bd.pathLabels.join(" → ")}</div>
          <div class="msc-value">${_formatValue(bd.crit, bd.value, bd.result)}</div>
          <button class="msc-view-btn" onclick="MultiCriteriaPage.switchTab('${bd.crit}')">
            View details <i class="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>`;
    }).join("");

    // Ranking table (if multiple candidates)
    const rankHTML = combined.ranking && combined.ranking.length > 1
      ? `<div class="mc-section-title mt-3 mb-2"><i class="bi bi-trophy"></i> Path Ranking</div>
         <div class="mc-rank-table">
           <div class="mrt-header">
             <span>Rank</span><span>Based On</span><span>Route</span><span>Distance</span><span>Time</span><span>Cost</span><span>Score</span>
           </div>
           ${combined.ranking.map((r) => `
             <div class="mrt-row ${r.rank===1?"mrt-best":""}">
               <span class="mrt-rank">${r.rank===1?"🥇":r.rank===2?"🥈":r.rank===3?"🥉":r.rank}</span>
               <span><span class="mrt-algo-badge" style="background:${meta[r.crit]?.color||"#888"}22;color:${meta[r.crit]?.color||"#888"}">${meta[r.crit]?.label||r.crit}</span></span>
               <span class="mrt-path">${r.pathLabels.join(" → ")}</span>
               <span>${_evalMetric(r.edgeIds,"distance")} km</span>
               <span>${_evalMetric(r.edgeIds,"time")} hr</span>
               <span>₹${_evalMetric(r.edgeIds,"cost")}</span>
               <span class="mrt-score">${(r.score*100).toFixed(0)}%</span>
             </div>`).join("")}
         </div>` : "";

    // Metrics summary for combined path
    const m = combined.metrics || {};
    body.innerHTML = `
      <!-- Combined banner -->
      <div class="mc-combined-banner">
        <div class="mcb-title">
          <span class="mcb-star">⭐</span>
          Optimal Combined Path
          <span class="mcb-score">${(combined.score*100).toFixed(0)}% overall score</span>
        </div>
        <div class="mcb-note">${combined.note}</div>
        <div class="mc-path-visual">
          ${combined.pathLabels.map((lbl, i) => `
            <span class="mpv-node">${lbl}</span>
            ${i < combined.pathLabels.length-1 ? '<span class="mpv-arrow">→</span>' : ""}
          `).join("")}
        </div>
        <div class="mcb-metrics">
          <div class="mcbm-item"><i class="bi bi-rulers"></i><span>${m.distance||"—"} km</span><small>Distance</small></div>
          <div class="mcbm-item"><i class="bi bi-clock-fill"></i><span>${m.time||"—"} hr</span><small>Time</small></div>
          <div class="mcbm-item"><i class="bi bi-currency-rupee"></i><span>${m.cost||"—"}</span><small>Cost</small></div>
          <div class="mcbm-item"><i class="bi bi-speedometer2"></i><span>${m.trafficScore!=null?Math.round(m.trafficScore*100)+"%":"—"}</span><small>Congestion</small></div>
        </div>
        <button class="btn mc-highlight-btn" onclick="MultiCriteriaPage.highlightCombined()">
          <i class="bi bi-eye-fill"></i> Highlight on Map
        </button>
      </div>

      <!-- Per-criterion cards -->
      <div class="mc-section-title mb-2"><i class="bi bi-grid-3x3-gap-fill"></i> Per-Criterion Results</div>
      <div class="mc-score-grid">${breakdownCards}</div>

      ${rankHTML}`;
  }

  function _renderCriterion(result, crit) {
    const body = document.getElementById("mcPageBody");
    const meta = result.meta[crit];
    const r    = result.results[crit];

    if (!r || r.error) {
      body.innerHTML = `<div class="mc-empty-state">
        <i class="bi bi-exclamation-triangle" style="font-size:2rem;color:#ef4444"></i>
        <p>${r?.error || "No result available for this criterion."}</p>
      </div>`;
      return;
    }

    let content = "";

    if (crit === "distance" || crit === "time" || crit === "cost") {
      const path = r.path || [];
      const edgeLabels = _buildHopTable(r.edges || [], crit);
      content = `
        <div class="mc-crit-banner" style="border-color:${meta.color}40;background:${meta.color}08">
          <div class="mcb-title" style="color:${meta.color}">
            <i class="bi ${meta.icon}"></i> ${meta.label}
            <span class="msc-algo">${meta.algo}</span>
          </div>
          <div class="mc-path-visual">
            ${path.map((id,i)=>`<span class="mpv-node">${Graph.getNode(id)?.label||id}</span>${i<path.length-1?'<span class="mpv-arrow">→</span>':""}`).join("")}
          </div>
          <div class="msc-metric-row">
            <span class="msc-big-val">${r.totalWeight}</span>
            <span class="msc-big-unit">${meta.unit}</span>
            <span class="msc-hops">${path.length-1} hop(s)</span>
          </div>
          <button class="btn mc-highlight-btn" onclick="MultiCriteriaPage.highlightCriterion('${crit}')">
            <i class="bi bi-eye-fill"></i> Highlight on Map
          </button>
        </div>
        <div class="mc-section-title mt-3 mb-2"><i class="bi bi-list-ul"></i> Hop Detail</div>
        <div class="mc-hop-table">${edgeLabels}</div>`;

    } else if (crit === "traffic") {
      const path = r.path || [];
      content = `
        <div class="mc-crit-banner" style="border-color:${meta.color}40;background:${meta.color}08">
          <div class="mcb-title" style="color:${meta.color}">
            <i class="bi ${meta.icon}"></i> ${meta.label}
            <span class="msc-algo">${meta.algo}</span>
          </div>
          <div class="mc-path-visual">
            ${path.map((id,i)=>`<span class="mpv-node">${Graph.getNode(id)?.label||id}</span>${i<path.length-1?'<span class="mpv-arrow">→</span>':""}`).join("")}
          </div>
          <div class="msc-metric-row">
            <span class="msc-big-val">${Math.round((r.trafficScore||0)*100)}%</span>
            <span class="msc-big-unit">avg congestion</span>
          </div>
          <button class="btn mc-highlight-btn" onclick="MultiCriteriaPage.highlightCriterion('${crit}')">
            <i class="bi bi-eye-fill"></i> Highlight on Map
          </button>
        </div>
        <div class="mc-section-title mt-3 mb-2"><i class="bi bi-list-ul"></i> Hop Detail</div>
        <div class="mc-hop-table">
          ${(r.edgeDetails||[]).map((d)=>`
            <div class="mht-row">
              <span class="mht-route">${d.from} → ${d.to}</span>
              <span class="mht-val"><span class="hop-dot" style="background:${d.color};width:8px;height:8px;border-radius:50%;display:inline-block"></span> ${d.status}</span>
              <span class="mht-extra">${d.traffic}/${d.capacity} units</span>
            </div>`).join("")}
        </div>`;

    } else if (crit === "maxflow") {
      content = `
        <div class="mc-crit-banner" style="border-color:${meta.color}40;background:${meta.color}08">
          <div class="mcb-title" style="color:${meta.color}">
            <i class="bi ${meta.icon}"></i> ${meta.label}
            <span class="msc-algo">${meta.algo}</span>
          </div>
          <div class="msc-metric-row">
            <span class="msc-big-val">${r.maxFlow}</span>
            <span class="msc-big-unit">units/hr</span>
          </div>
          <button class="btn mc-highlight-btn" onclick="MultiCriteriaPage.highlightCriterion('${crit}')">
            <i class="bi bi-eye-fill"></i> Highlight on Map
          </button>
        </div>
        <div class="mc-section-title mt-3 mb-2"><i class="bi bi-list-ul"></i> Flow Breakdown</div>
        <div class="mc-hop-table">
          ${(r.flowEdges||[]).map((fe)=>{
            const f=Graph.getNode(fe.from)?.label||fe.from, t=Graph.getNode(fe.to)?.label||fe.to;
            return `<div class="mht-row"><span class="mht-route">${f} → ${t}</span>
              <span class="mht-val">${fe.flow}/${fe.capacity}</span>
              <span class="mht-extra">${Math.round((fe.utilisation||0)*100)}% used</span></div>`;
          }).join("")}
        </div>`;

    } else if (crit === "mst") {
      content = `
        <div class="mc-crit-banner" style="border-color:${meta.color}40;background:${meta.color}08">
          <div class="mcb-title" style="color:${meta.color}">
            <i class="bi ${meta.icon}"></i> ${meta.label}
            <span class="msc-algo">${meta.algo}</span>
          </div>
          <div class="msc-metric-row">
            <span class="msc-big-val">${r.totalWeight}</span>
            <span class="msc-big-unit">km total</span>
            <span class="msc-hops">${r.edges?.length||0} edges</span>
          </div>
          <button class="btn mc-highlight-btn" onclick="MultiCriteriaPage.highlightCriterion('${crit}')">
            <i class="bi bi-eye-fill"></i> Highlight on Map
          </button>
        </div>
        <div class="mc-section-title mt-3 mb-2"><i class="bi bi-list-ul"></i> MST Edges</div>
        <div class="mc-hop-table">
          ${(r.edges||[]).map((e)=>{
            const f=Graph.getNode(e.from)?.label||e.from, t=Graph.getNode(e.to)?.label||e.to;
            return `<div class="mht-row"><span class="mht-route">${f} ↔ ${t}</span><span class="mht-val">${e.weight} km</span></div>`;
          }).join("")}
        </div>`;
    }

    body.innerHTML = content;
  }

  function _buildHopTable(edgeIds, criterion) {
    const edges = Graph.getEdges();
    const unit  = criterion === "distance" ? "km" : criterion === "time" ? "hr" : "₹";
    return (edgeIds || []).map((eid) => {
      const e = edges.find((x) => x.id === eid);
      if (!e) return "";
      const f = Graph.getNode(e.from)?.label || e.from;
      const t = Graph.getNode(e.to)?.label   || e.to;
      const v = e[criterion] || 0;
      return `<div class="mht-row">
        <span class="mht-route">${f} → ${t}</span>
        <span class="mht-val">${v} ${unit}</span>
        <span class="mht-extra">📏${e.distance}km ⏱${e.time}hr 💰₹${e.cost}</span>
      </div>`;
    }).join("");
  }

  function _formatValue(crit, value, result) {
    if (crit === "distance") return `${value} km`;
    if (crit === "time")     return `${value} hr`;
    if (crit === "cost")     return `₹${value}`;
    if (crit === "traffic")  return value || `${Math.round((result?.trafficScore||0)*100)}% congestion`;
    if (crit === "maxflow")  return `${result?.maxFlow} units`;
    if (crit === "mst")      return `${result?.totalWeight} km`;
    return value;
  }

  function _evalMetric(edgeIds, criterion) {
    const edges = Graph.getEdges();
    return (edgeIds || []).reduce((s, eid) => {
      const e = edges.find((x) => x.id === eid);
      return s + (e ? (e[criterion] || 0) : 0);
    }, 0);
  }

  function highlightCombined() {
    if (!_lastResult?.combined) return;
    GraphView.highlight(_lastResult.combined.edgeIds, "combined", _lastResult.combined.path);
    Controls.toast("Combined path highlighted on map.", "info");
  }

  function highlightCriterion(crit) {
    if (!_lastResult) return;
    const r    = _lastResult.results[crit];
    const meta = _lastResult.meta[crit];
    if (!r || r.error) return;
    const edgeIds  = r.edges || r.edgeIds || (r._isMST ? r.edgeIds : []);
    const nodePath = r.path || r.tour || null;
    const colorMap = { distance:"#3b82f6", time:"#8b5cf6", cost:"#10b981", traffic:"#f59e0b", maxflow:"#a855f7", mst:"#22c55e" };
    GraphView.highlight(edgeIds, crit, nodePath);
    Controls.toast(`${meta.label} path highlighted on map.`, "info");
  }

  function switchTab(crit) {
    _activeTab = crit;
    document.querySelectorAll(".mc-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === crit);
    });
    if (crit === "combined") _renderCombined(_lastResult);
    else _renderCriterion(_lastResult, crit);
  }

  function init() {
    document.getElementById("mcPageClose")?.addEventListener("click", close);
    document.getElementById("mcPageOverlay")?.addEventListener("click", close);
  }

  return { open, close, highlightCombined, highlightCriterion, switchTab, init };
})();
