/**
 * ui/controls.js
 * Wires all button handlers. Multi-criteria aware.
 */
const Controls = (() => {

  function toast(msg, type, duration) {
    duration = duration || 2400;
    type     = type     || "info";
    const container = document.getElementById("toastContainer");
    const icon = { success:"bi-check-circle-fill", error:"bi-exclamation-triangle-fill", info:"bi-info-circle-fill" }[type] || "bi-info-circle-fill";
    const el = document.createElement("div");
    el.className = `tn-toast ${type}`;
    el.innerHTML = `<i class="bi ${icon}"></i><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity="0"; el.style.transform="translateY(6px)"; el.style.transition="all .2s ease"; setTimeout(()=>el.remove(),200); }, duration);
  }

  function setLoading(btn, loading) {
    if (loading) btn.classList.add("btn-running"); else btn.classList.remove("btn-running");
    btn.disabled = loading;
  }

  function _tick() { return new Promise((r) => setTimeout(r, 50)); }

  function initMobileToggles() {
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop"; backdrop.id = "sidebarBackdrop";
    document.body.appendChild(backdrop);
    const leftPanel  = document.getElementById("leftPanel");
    const rightPanel = document.getElementById("rightPanel");
    const btnLeft    = document.getElementById("mobileToggleInput");
    const btnRight   = document.getElementById("mobileToggleOutput");
    function closeAll() {
      leftPanel.classList.remove("open"); rightPanel.classList.remove("open"); backdrop.classList.remove("active");
    }
    if (btnLeft)  btnLeft.addEventListener("click",  () => { const o=leftPanel.classList.contains("open");  closeAll(); if(!o){leftPanel.classList.add("open");  backdrop.classList.add("active");} });
    if (btnRight) btnRight.addEventListener("click", () => { const o=rightPanel.classList.contains("open"); closeAll(); if(!o){rightPanel.classList.add("open"); backdrop.classList.add("active");} });
    backdrop.addEventListener("click", closeAll);
  }

  function initWeightUnitSync() {
    const sel    = document.getElementById("weightType");
    const unitEl = document.getElementById("weightUnit");
    function updateUnit() {
      const t = sel.value;
      if (unitEl) unitEl.textContent = t==="distance"?"km":t==="time"?"hr":"₹";
      GraphView.refresh();
    }
    sel.addEventListener("change", updateUnit);
  }

  function initAlgoButtons() {
    // Dijkstra
    document.getElementById("btnDijkstra")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnDijkstra");
      setLoading(btn, true); await _tick();
      try {
        const src  = document.getElementById("spSource").value;
        const tgt  = document.getElementById("spTarget").value;
        const crit = document.getElementById("weightType")?.value || "distance";
        const res  = Dijkstra.run(src, tgt, crit);
        if (res.error) { OutputDisplay.renderError(res.error); toast(res.error,"error"); GraphView.resetHighlight(); }
        else           { OutputDisplay.renderSP(res); GraphView.highlight(res.edges,"sp",res.path); toast("Shortest path found!","success"); }
      } finally { setLoading(btn, false); }
    });

    // MST
    document.getElementById("btnMST")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnMST");
      setLoading(btn, true); await _tick();
      try {
        const res = MST.run();
        if (res.error) { OutputDisplay.renderError(res.error); toast(res.error,"error"); GraphView.resetHighlight(); }
        else           { OutputDisplay.renderMST(res); GraphView.highlight(res.edgeIds,"mst",Graph.getNodes().map((n)=>n.id)); toast("MST computed!","success"); }
      } finally { setLoading(btn, false); }
    });

    // TSP
    document.getElementById("btnTSP")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnTSP");
      setLoading(btn, true); await _tick();
      try {
        const start = document.getElementById("tspStart").value;
        const res   = TSP.run(start);
        if (res.error) { OutputDisplay.renderError(res.error); toast(res.error,"error"); GraphView.resetHighlight(); }
        else           { OutputDisplay.renderTSP(res); GraphView.highlight(res.edgeIds,"tsp",res.tour); toast("TSP tour found!","success"); }
      } finally { setLoading(btn, false); }
    });

    // Max Flow
    document.getElementById("btnMaxFlow")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnMaxFlow");
      setLoading(btn, true); await _tick();
      try {
        const src  = document.getElementById("mfSource").value;
        const sink = document.getElementById("mfSink").value;
        const res  = FordFulkerson.run(src, sink);
        if (res.error) { OutputDisplay.renderError(res.error); toast(res.error,"error"); GraphView.resetHighlight(); }
        else           { OutputDisplay.renderMF(res); GraphView.highlight(res.edgeIds,"mf"); toast(`Max flow: ${res.maxFlow} units`,"success"); }
      } finally { setLoading(btn, false); }
    });

    // Multi-Criteria
    document.getElementById("btnMultiCriteria")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnMultiCriteria");
      setLoading(btn, true); await _tick();
      try {
        const src  = document.getElementById("mcSource").value;
        const tgt  = document.getElementById("mcTarget").value;
        const selected = [...document.querySelectorAll(".mc-check:checked")].map((cb) => cb.value);
        const res  = MultiCriteria.runAll(selected, src, tgt);
        if (res.error) { toast(res.error, "error"); return; }
        if (res.errors && res.errors.length) res.errors.forEach((e) => toast(e, "error", 3000));
        // Open results page
        MultiCriteriaPage.open(res);
        toast("Multi-criteria analysis complete!", "success", 3000);
      } finally { setLoading(btn, false); }
    });

    // Traffic buttons
    document.getElementById("btnRandomTraffic")?.addEventListener("click", () => TrafficSliders.randomTraffic());
    document.getElementById("btnClearTraffic")?.addEventListener("click",  () => TrafficSliders.clearTraffic());

    // Close output
    document.getElementById("btnCloseOutput")?.addEventListener("click", () => { OutputDisplay.clear(); GraphView.resetHighlight(); });
  }

  function initGlobalButtons() {
    document.getElementById("btnAddCity")?.addEventListener("click", () => InputHandler.addCity());
    document.getElementById("cityName")?.addEventListener("keydown", (e) => { if (e.key==="Enter") InputHandler.addCity(); });
    document.getElementById("btnAddEdge")?.addEventListener("click", () => InputHandler.addEdge());

    document.getElementById("btnLoadSample")?.addEventListener("click", () => {
      Graph.loadSample();
      InputHandler.refreshAll();
      toast("Sample graph loaded!", "info");
      GraphView.fitView();
    });

    document.getElementById("btnClearAll")?.addEventListener("click", () => {
      if (!Graph.getNodes().length) return;
      Graph.clear(); InputHandler.refreshAll(); OutputDisplay.clear(); GraphView.resetHighlight();
      toast("Graph cleared.", "info");
    });

    // Intensity label
    document.getElementById("trafficIntensitySlider")?.addEventListener("input", (e) => {
      const lbl = document.getElementById("intensityLabel");
      if (lbl) lbl.textContent = e.target.value + "%";
    });
  }

  function init() {
    initGlobalButtons();
    initAlgoButtons();
    initMobileToggles();
    initWeightUnitSync();
  }

  return { init, toast, setLoading };
})();
