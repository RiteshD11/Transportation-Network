/**
 * ui/controls.js
 * Wires all button handlers. Multi-criteria aware.
 */
const Controls = (() => {
  function toast(msg, type, duration) {
    duration = duration || 2400;
    type = type || "info";
    const container = document.getElementById("toastContainer");
    const icon =
      {
        success: "bi-check-circle-fill",
        error: "bi-exclamation-triangle-fill",
        info: "bi-info-circle-fill",
      }[type] || "bi-info-circle-fill";
    const el = document.createElement("div");
    el.className = `tn-toast ${type}`;
    el.innerHTML = `<i class="bi ${icon}"></i><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "all .2s ease";
      setTimeout(() => el.remove(), 200);
    }, duration);
  }

  function setLoading(btn, loading) {
    if (loading) btn.classList.add("btn-running");
    else btn.classList.remove("btn-running");
    btn.disabled = loading;
  }

  function _tick() {
    return new Promise((r) => setTimeout(r, 50));
  }

  function _rebuildPriorityList() {
    const PATH_CRITERIA = ["distance", "time", "cost", "traffic", "astar"];
    const LABELS = {
      distance: "📏 Distance",
      time: "⏱ Time",
      cost: "💰 Cost",
      traffic: "🚦 Traffic",
      astar: "⭐ A* Optimized",
    };
    const COLORS = {
      distance: "#3b82f6",
      time: "#8b5cf6",
      cost: "#10b981",
      traffic: "#f59e0b",
      astar: "#ff9800",
    };

    const checked = [...document.querySelectorAll(".mc-check:checked")]
      .map((cb) => cb.value)
      .filter((v) => PATH_CRITERIA.includes(v));

    const section = document.getElementById("mcPrioritySection");
    const list = document.getElementById("mcPriorityList");
    if (!section || !list) return;

    if (checked.length < 2) {
      section.style.display = "none";
      return;
    }
    section.style.display = "block";

    const existing = [...list.querySelectorAll(".mc-priority-item")].map(
      (el) => el.dataset.crit,
    );
    const ordered = [
      ...existing.filter((c) => checked.includes(c)),
      ...checked.filter((c) => !existing.includes(c)),
    ];

    list.innerHTML = ordered
      .map(
        (c, i) => `
      <div class="mc-priority-item" data-crit="${c}" draggable="true">
        <span class="mc-pri-rank" style="background:${COLORS[c]}22;color:${COLORS[c]};border:1px solid ${COLORS[c]}55">#${i + 1}</span>
        <span class="mc-pri-label">${LABELS[c]}</span>
        <span class="mc-pri-drag-icon"><i class="bi bi-grip-vertical"></i></span>
      </div>`,
      )
      .join("");

    let dragSrc = null;
    list.querySelectorAll(".mc-priority-item").forEach((row) => {
      row.addEventListener("dragstart", (e) => {
        dragSrc = row;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        dragSrc = null;
        list
          .querySelectorAll(".mc-priority-item")
          .forEach((r) => r.classList.remove("dragging", "drag-over"));
        _refreshRankBadges();
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (row !== dragSrc) row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () =>
        row.classList.remove("drag-over"),
      );
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        if (!dragSrc || dragSrc === row) return;
        const allItems = [...list.querySelectorAll(".mc-priority-item")];
        const srcIdx = allItems.indexOf(dragSrc);
        const tgtIdx = allItems.indexOf(row);
        if (tgtIdx < srcIdx) list.insertBefore(dragSrc, row);
        else list.insertBefore(dragSrc, row.nextSibling);
        _refreshRankBadges();
      });
    });

    function _refreshRankBadges() {
      list.querySelectorAll(".mc-priority-item").forEach((el, i) => {
        const c = el.dataset.crit;
        const spn = el.querySelector(".mc-pri-rank");
        if (spn) spn.textContent = `#${i + 1}`;
      });
    }
  }

  function initMobileToggles() {
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.id = "sidebarBackdrop";
    document.body.appendChild(backdrop);
    const leftPanel = document.getElementById("leftPanel");
    const rightPanel = document.getElementById("rightPanel");
    const btnLeft = document.getElementById("mobileToggleInput");
    const btnRight = document.getElementById("mobileToggleOutput");
    function closeAll() {
      leftPanel.classList.remove("open");
      rightPanel.classList.remove("open");
      backdrop.classList.remove("active");
    }
    if (btnLeft)
      btnLeft.addEventListener("click", () => {
        const o = leftPanel.classList.contains("open");
        closeAll();
        if (!o) {
          leftPanel.classList.add("open");
          backdrop.classList.add("active");
        }
      });
    if (btnRight)
      btnRight.addEventListener("click", () => {
        const o = rightPanel.classList.contains("open");
        closeAll();
        if (!o) {
          rightPanel.classList.add("open");
          backdrop.classList.add("active");
        }
      });
    backdrop.addEventListener("click", closeAll);
  }

  function initWeightUnitSync() {
    const sel = document.getElementById("weightType");
    const unitEl = document.getElementById("weightUnit");
    function updateUnit() {
      const t = sel.value;
      if (unitEl)
        unitEl.textContent =
          t === "distance" ? "km" : t === "time" ? "hr" : "₹";
      GraphView.refresh();
    }
    sel.addEventListener("change", updateUnit);
  }

  function initAlgoButtons() {
    // Dijkstra
    document
      .getElementById("btnDijkstra")
      ?.addEventListener("click", async () => {
        const btn = document.getElementById("btnDijkstra");
        setLoading(btn, true);
        await _tick();
        try {
          const src = document.getElementById("spSource").value;
          const tgt = document.getElementById("spTarget").value;
          const crit =
            document.getElementById("weightType")?.value || "distance";
          const res = Dijkstra.run(src, tgt, crit);
          if (res.error) {
            OutputDisplay.renderError(res.error);
            toast(res.error, "error");
            GraphView.resetHighlight();
          } else {
            OutputDisplay.renderSP(res);
            GraphView.highlight(res.edges, "sp", res.path);
            toast("Shortest path found!", "success");
          }
        } finally {
          setLoading(btn, false);
        }
      });

    // MST
    document.getElementById("btnMST")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnMST");
      setLoading(btn, true);
      await _tick();
      try {
        const res = MST.run();
        if (res.error) {
          OutputDisplay.renderError(res.error);
          toast(res.error, "error");
          GraphView.resetHighlight();
        } else {
          OutputDisplay.renderMST(res);
          GraphView.highlight(
            res.edgeIds,
            "mst",
            Graph.getNodes().map((n) => n.id),
          );
          toast("MST computed!", "success");
        }
      } finally {
        setLoading(btn, false);
      }
    });

    // TSP
    document.getElementById("btnTSP")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnTSP");
      setLoading(btn, true);
      await _tick();
      try {
        const start = document.getElementById("tspStart").value;
        const res = TSP.run(start);
        if (res.error) {
          OutputDisplay.renderError(res.error);
          toast(res.error, "error");
          GraphView.resetHighlight();
        } else {
          OutputDisplay.renderTSP(res);
          GraphView.highlight(res.edgeIds, "tsp", res.tour);
          toast("TSP tour found!", "success");
        }
      } finally {
        setLoading(btn, false);
      }
    });

    // Max Flow
    document
      .getElementById("btnMaxFlow")
      ?.addEventListener("click", async () => {
        const btn = document.getElementById("btnMaxFlow");
        setLoading(btn, true);
        await _tick();
        try {
          const src = document.getElementById("mfSource").value;
          const sink = document.getElementById("mfSink").value;
          const res = FordFulkerson.run(src, sink);
          if (res.error) {
            OutputDisplay.renderError(res.error);
            toast(res.error, "error");
            GraphView.resetHighlight();
          } else {
            OutputDisplay.renderMF(res);
            GraphView.highlight(res.edgeIds, "mf");
            toast(`Max flow: ${res.maxFlow} units`, "success");
          }
        } finally {
          setLoading(btn, false);
        }
      });

    // Multi-Criteria
    document
      .getElementById("btnMultiCriteria")
      ?.addEventListener("click", async () => {
        const btn = document.getElementById("btnMultiCriteria");
        setLoading(btn, true);
        await _tick();
        try {
          const src = document.getElementById("mcSource").value;
          const tgt = document.getElementById("mcTarget").value;
          const selected = [
            ...document.querySelectorAll(".mc-check:checked"),
          ].map((cb) => cb.value);

          const priorityItems = [
            ...document.querySelectorAll(".mc-priority-item"),
          ];
          const priorityOrder = priorityItems.length
            ? priorityItems.map((el) => el.dataset.crit)
            : selected;

          const res = MultiCriteria.runAll(selected, src, tgt, priorityOrder);
          if (res.error) {
            toast(res.error, "error");
            return;
          }
          if (res.errors && res.errors.length)
            res.errors.forEach((e) => toast(e, "error", 3000));
          // Open results page
          MultiCriteriaPage.open(res);
          toast("Multi-criteria analysis complete!", "success", 3000);
        } finally {
          setLoading(btn, false);
        }
      });

    // Traffic buttons
    document
      .getElementById("btnRandomTraffic")
      ?.addEventListener("click", () => TrafficSliders.randomTraffic());
    document
      .getElementById("btnClearTraffic")
      ?.addEventListener("click", () => TrafficSliders.clearTraffic());

    // Close output
    document.getElementById("btnCloseOutput")?.addEventListener("click", () => {
      OutputDisplay.clear();
      GraphView.resetHighlight();
    });
  }

  function initGlobalButtons() {
    document
      .getElementById("btnAddCity")
      ?.addEventListener("click", () => InputHandler.addCity());
    document.getElementById("cityName")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") InputHandler.addCity();
    });
    document
      .getElementById("btnAddEdge")
      ?.addEventListener("click", () => InputHandler.addEdge());
    document
      .getElementById("btnUpdateEdge")
      ?.addEventListener("click", () => InputHandler.updateEdge());
    document
      .getElementById("btnDeleteEdge")
      ?.addEventListener("click", () => InputHandler.deleteEdge());
    document
      .getElementById("existingEdge")
      ?.addEventListener("change", () => InputHandler.onExistingEdgeChange());

    document.getElementById("btnLoadSample")?.addEventListener("click", () => {
      Graph.loadSample();
      InputHandler.refreshAll();
      toast("Sample graph loaded!", "info");
      GraphView.fitView();
    });

    document.getElementById("btnClearAll")?.addEventListener("click", () => {
      if (!Graph.getNodes().length) return;
      Graph.clear();
      InputHandler.refreshAll();
      OutputDisplay.clear();
      GraphView.resetHighlight();
      toast("Graph cleared.", "info");
    });

    // Intensity label
    document
      .getElementById("trafficIntensitySlider")
      ?.addEventListener("input", (e) => {
        const lbl = document.getElementById("intensityLabel");
        if (lbl) lbl.textContent = e.target.value + "%";
      });
  }

  function init() {
    initGlobalButtons();
    initAlgoButtons();
    initMobileToggles();
    initWeightUnitSync();

    // Rebuild priority list when criteria checkboxes change
    document.querySelectorAll(".mc-check").forEach((cb) => {
      cb.addEventListener("change", _rebuildPriorityList);
    });
    _rebuildPriorityList();
  }

  return { init, toast, setLoading };
})();
// Mobile panel toggles — paste this if the buttons aren't wired yet
document.getElementById("mobileToggleInput")?.addEventListener("click", () => {
  document.getElementById("leftPanel").classList.toggle("open");
  document.getElementById("rightPanel").classList.remove("open");
  document.querySelector(".sidebar-backdrop").classList.toggle("active");
});

document.getElementById("mobileToggleOutput")?.addEventListener("click", () => {
  document.getElementById("rightPanel").classList.toggle("open");
  document.getElementById("leftPanel").classList.remove("open");
  document.querySelector(".sidebar-backdrop").classList.toggle("active");
});

document.querySelector(".sidebar-backdrop")?.addEventListener("click", () => {
  document.getElementById("leftPanel").classList.remove("open");
  document.getElementById("rightPanel").classList.remove("open");
  document.querySelector(".sidebar-backdrop").classList.remove("active");
});
