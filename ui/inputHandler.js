/**
 * ui/inputHandler.js
 * Handles city/road input forms — multi-criteria edge support.
 */
const InputHandler = (() => {
  const ALL_SELECTS = [
    "fromCity",
    "toCity",
    "spSource",
    "spTarget",
    "tspStart",
    "mfSource",
    "mfSink",
    "mcSource",
    "mcTarget",
  ];

  function refreshDropdowns() {
    const nodes = Graph.getNodes();
    ALL_SELECTS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const prev = el.value;
      const ph = el.options[0].cloneNode(true);
      el.innerHTML = "";
      el.appendChild(ph);
      nodes.forEach((n) => {
        const opt = document.createElement("option");
        opt.value = n.id;
        opt.textContent = n.label;
        el.appendChild(opt);
      });
      if (nodes.find((n) => n.id === prev)) el.value = prev;
    });
    refreshEdgeDropdown();
  }

  function refreshEdgeDropdown() {
    const el = document.getElementById("existingEdge");
    if (!el) return;
    const prev = el.value;
    const ph = el.options[0].cloneNode(true);
    el.innerHTML = "";
    el.appendChild(ph);
    const edges = Graph.getEdges();
    edges.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.from} → ${e.to}`;
      el.appendChild(opt);
    });
    if (edges.find((e) => e.id === prev)) el.value = prev;
  }

  function onExistingEdgeChange() {
    const edgeId = document.getElementById("existingEdge").value;
    if (!edgeId) {
      document.getElementById("fromCity").value = "";
      document.getElementById("toCity").value = "";
      document.getElementById("edgeDist").value = "";
      document.getElementById("edgeCost").value = "";
      document.getElementById("edgeTime").value = "";
      document.getElementById("edgeCap").value = "";
      return;
    }
    const edge = Graph.getEdge(edgeId);
    if (!edge) return;
    document.getElementById("fromCity").value = edge.from;
    document.getElementById("toCity").value = edge.to;
    document.getElementById("edgeDist").value = edge.distance || "";
    document.getElementById("edgeCost").value = edge.cost || "";
    document.getElementById("edgeTime").value = edge.time || "";
    document.getElementById("edgeCap").value = edge.capacity || "";
  }

  function updateEdge() {
    const edgeId = document.getElementById("existingEdge").value;
    if (!edgeId) {
      Controls.toast("Please select an existing edge to update.", "error");
      return;
    }
    const from = document.getElementById("fromCity").value;
    const to = document.getElementById("toCity").value;
    const distance = parseFloat(document.getElementById("edgeDist").value) || 0;
    const cost = parseFloat(document.getElementById("edgeCost").value) || 0;
    const time = parseFloat(document.getElementById("edgeTime").value) || 0;
    const capacity =
      parseFloat(document.getElementById("edgeCap").value) || 100;
    const traffic = 0;

    if (distance < 0 || time < 0 || cost < 0 || capacity < 0) {
      Controls.toast("!!!Negative values are not allowed!!!", "error");
      return;
    }

    if (!from || !to) {
      Controls.toast("Please select both cities.", "error");
      return;
    }
    if (from === to) {
      Controls.toast("From and To cities must be different.", "error");
      return;
    }

    try {
      Graph.updateEdge(edgeId, { distance, cost, time, capacity, traffic });
      refreshEdgeDropdown();
      GraphView.refresh();
      Controls.toast("Edge updated successfully!", "success");
    } catch (e) {
      Controls.toast("Error updating edge: " + e.message, "error");
    }
  }

  function deleteEdge() {
    const edgeId = document.getElementById("existingEdge").value;
    if (!edgeId) {
      Controls.toast("Please select an existing edge to delete.", "error");
      return;
    }
    if (!confirm("Are you sure you want to delete this edge?")) return;
    try {
      Graph.removeEdge(edgeId);
      refreshEdgeDropdown();
      GraphView.refresh();
      Controls.toast("Edge deleted successfully!", "success");
    } catch (e) {
      Controls.toast("Error deleting edge: " + e.message, "error");
    }
  }

  function refreshNodeList() {
    const nodes = Graph.getNodes();
    const list = document.getElementById("nodeList");
    const badge = document.getElementById("badgeNodes");
    const stat = document.getElementById("statNodes");
    if (list) list.innerHTML = "";
    if (badge) badge.textContent = nodes.length;
    _animateStat(stat, nodes.length);
    nodes.forEach((n) => {
      const chip = document.createElement("div");
      chip.className = "city-chip";
      chip.dataset.id = n.id;
      chip.innerHTML = `<i class="bi bi-geo-alt-fill" style="font-size:.65rem;color:var(--tsp)"></i>${n.label}
        <button class="remove-btn" title="Remove"><i class="bi bi-x"></i></button>`;
      chip
        .querySelector(".remove-btn")
        .addEventListener("click", () => removeCity(n.id));
      list.appendChild(chip);
    });
  }

  function refreshEdgeList() {
    const edges = Graph.getEdges();
    const list = document.getElementById("edgeList");
    const badge = document.getElementById("badgeEdges");
    const statE = document.getElementById("statEdges");
    const statW = document.getElementById("statWeight");
    const sel = document.getElementById("weightType")?.value || "distance";
    const unit =
      sel === "distance"
        ? "km"
        : sel === "time"
          ? "hr"
          : sel === "cost"
            ? "₹"
            : "";
    if (list) list.innerHTML = "";
    if (badge) badge.textContent = edges.length;
    _animateStat(statE, edges.length);
    _animateStat(statW, Graph.totalWeight(sel));
    edges.forEach((e) => {
      const fLbl = Graph.getNode(e.from)?.label || e.from;
      const tLbl = Graph.getNode(e.to)?.label || e.to;
      const val = e[sel] || e.distance || 0;
      const item = document.createElement("div");
      item.className = "edge-item";
      item.dataset.id = e.id;
      item.innerHTML = `
        <span class="edge-route">
          <i class="bi bi-circle-fill" style="font-size:.35rem;color:var(--tsp)"></i>
          ${fLbl} <i class="bi bi-arrow-left-right" style="font-size:.6rem;color:var(--text-3)"></i> ${tLbl}
        </span>
        <span style="display:flex;align-items:center;gap:4px">
          <span class="edge-wt">${val}${unit}</span>
          <button class="edge-rm" title="Remove edge"><i class="bi bi-x"></i></button>
        </span>`;
      item
        .querySelector(".edge-rm")
        .addEventListener("click", () => removeEdge(e.id));
      list.appendChild(item);
    });
  }

  function addCity() {
    const input = document.getElementById("cityName");
    const name = input.value.trim();
    const res = Graph.addNode(name);
    if (!res.ok) {
      Controls.toast(res.msg, "error");
      input.focus();
      return;
    }
    input.value = "";
    refreshAll();
    Controls.toast(`"${name}" added.`, "success");
  }

  function removeCity(id) {
    const node = Graph.getNode(id);
    Graph.removeNode(id);
    refreshAll();
    GraphView.refresh();
    Controls.toast(`"${node?.label}" removed.`, "info");
    OutputDisplay.clear();
    GraphView.resetHighlight();
  }

  function addEdge() {
    const from = document.getElementById("fromCity").value;
    const to = document.getElementById("toCity").value;
    const dist = parseFloat(document.getElementById("edgeDist")?.value) || 0;
    const time = parseFloat(document.getElementById("edgeTime")?.value) || 0;
    const cost = parseFloat(document.getElementById("edgeCost")?.value) || 0;
    const cap = parseFloat(document.getElementById("edgeCap")?.value) || 100;
    const traf = parseFloat(document.getElementById("edgeTraf")?.value) || 0;

    if (dist < 0 || time < 0 || cost < 0 || cap < 0) {
      Controls.toast("!!!Negative values are not allowed!!!", "error");
      return;
    }

    const res = Graph.addEdge(from, to, {
      distance: dist,
      time,
      cost,
      capacity: cap,
      traffic: traf,
    });
    if (!res.ok) {
      Controls.toast(res.msg, "error");
      return;
    }
    ["edgeDist", "edgeTime", "edgeCost", "edgeCap", "edgeTraf"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      },
    );
    refreshAll();
    Controls.toast(`Road added.`, "success");
  }

  function removeEdge(id) {
    Graph.removeEdge(id);
    refreshAll();
    GraphView.refresh();
    OutputDisplay.clear();
    GraphView.resetHighlight();
  }

  function refreshAll() {
    refreshDropdowns();
    refreshNodeList();
    refreshEdgeList();
    GraphView.refresh();
    if (typeof TrafficSliders !== "undefined") TrafficSliders.refresh();
  }

  function _animateStat(el, val) {
    if (!el) return;
    el.textContent = val;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  return {
    addCity,
    removeCity,
    addEdge,
    removeEdge,
    refreshAll,
    refreshDropdowns,
    updateEdge,
    deleteEdge,
    onExistingEdgeChange,
  };
})();
