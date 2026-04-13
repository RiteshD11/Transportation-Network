# 🚦 Transport Network using Set and Graph Theory

## 📌 Overview

This project models a **transport network** using concepts from **Set Theory** and **Graph Theory**.
It demonstrates how mathematical structures can be applied to solve real-world problems such as route optimization and network flow.

---

## 🧠 Concepts Used

* Set Theory (to represent nodes and connections)
* Graph Theory (to model the transport network)
* Weighted Graphs
* Directed/Undirected Graphs

---

## ⚙️ Algorithms Implemented

### 1. Dijkstra’s Algorithm

* Used to find the **shortest path** between nodes in the network
* Helps in determining the most efficient route between two locations

### 2. Ford-Fulkerson Algorithm

* Used to compute the **maximum flow** in the network
* Helps analyze capacity constraints in transport systems

---

## 🚀 Features

* Representation of transport systems as graphs
* Shortest path calculation
* Maximum flow analysis
* Efficient handling of network data

---

## 🛠️ Tech Stack

* Programming Language: (Add your language, e.g., Python / C++ / Java)
* Data Structures: Graphs, Sets

---

## 📂 Project Structure


## ▶️ How to Run

1. Clone the repository:
   git clone https://github.com/your-username/your-repo-name.git

2. Navigate to the project folder:
   cd your-repo-name

3. Run the program:
   (Add command based on your language)

---

## 📊 Applications

* Traffic management systems
* Route planning (like maps/navigation apps)
* Network optimization
* Logistics and supply chain

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit a pull request.

---

## 📜 License

This project is open-source and available under the MIT License.

---


# 🚦 Ford-Fulkerson Traffic Flow Algorithm

> **Module:** `algorithms/fordFulkerson.js` · **UI:** `ui/trafficPanel.js`  
> Part of the [TransNet — Transportation Network Optimizer](https://github.com/RiteshD11/Transportation-Network)

---

## 📐 Mathematical Model

The Ford-Fulkerson algorithm models the transportation network as a **flow network**:

```
Network  N = (G, s, t, c)
Graph    G = (V, E)
Capacity c : E → ℝ⁺      (road capacity in units/hr)
Traffic  f : E → ℝ⁺      (current live flow)

Feasibility constraints:
  0 ≤ f(e) ≤ c(e)          ∀ e ∈ E      (capacity constraint)
  Σ f(u,v) = Σ f(v,w)     ∀ v ≠ s,t    (flow conservation)

Objective:
  Maximise  |f| = Σ f(s,v)  over all edges (s,v)
```

**Residual graph** at each iteration:

```
c_f(u,v) = c(u,v) − f(u,v)    (remaining forward capacity)
c_f(v,u) = f(u,v)              (backward / cancellation capacity)
```

**Max-flow Min-cut Theorem** (Ford & Fulkerson, 1956):

```
max { |f| : f is a feasible flow } = min { c(S,T) : (S,T) is an s-t cut }
```

**Traffic-aware edge cost** used for routing:

```
cost(u,v) = w(u,v) × (1 + α × ρ(u,v)²)

where:
  w(u,v)   = base road weight (distance / time / cost)
  ρ(u,v)   = f(u,v) / c(u,v)  ∈ [0,1]   (congestion ratio)
  α        = congestion penalty factor (default: 5)
```

---

## ⚙️ Algorithm Details

### Variant: Edmonds-Karp (BFS Augmentation)

This implementation uses **Breadth-First Search** to find augmenting paths, giving the **Edmonds-Karp** variant which has a guaranteed polynomial time complexity — unlike naive DFS Ford-Fulkerson which can loop on irrational capacities.

```
Algorithm: Ford-Fulkerson (Edmonds-Karp)
─────────────────────────────────────────
Input:  Graph G, source s, sink t, capacities c[][], traffic f[][]
Output: Maximum flow value, flow on each edge, augmenting path log

1.  Initialise residual capacity:
      c_r[u][v] ← max(0, c[u][v] − f[u][v])   for all (u,v)

2.  While BFS finds an augmenting path P from s to t in G_r:
    a. Bottleneck ← min { c_r[u][v] : (u,v) ∈ P }
    b. For each edge (u,v) ∈ P:
         c_r[u][v] ← c_r[u][v] − Bottleneck
         c_r[v][u] ← c_r[v][u] + Bottleneck
    c. maxFlow ← maxFlow + Bottleneck
    d. Record path in augPaths log

3.  Return maxFlow, flowEdges, augPaths
```

**Time Complexity:** O(V × E²)  
**Space Complexity:** O(V²) for the residual matrix

### Traffic-Aware Routing (Modified Dijkstra)

```
Algorithm: Least-Congestion Dijkstra
─────────────────────────────────────
Input:  Graph G, source s, target t, live traffic f[]
Output: Optimal path, per-hop congestion details

1.  dist[s] ← 0,  dist[v] ← ∞  for all v ≠ s

2.  While priority queue not empty:
    a. u ← node with minimum dist
    b. For each neighbour v of u:
         ρ ← f[e(u,v)] / c[e(u,v)]
         cost ← w(u,v) × (1 + α × ρ²)
         if dist[u] + cost < dist[v]:
           dist[v] ← dist[u] + cost
           prev[v] ← u

3.  Reconstruct path from s to t via prev[]
4.  Compute per-hop congestion labels and colours
```

---

## 🚀 Features

| Feature | Description |
|---|---|
| **Max Flow (Edmonds-Karp)** | Finds maximum transport capacity from source to sink, accounting for current road traffic |
| **Traffic Layer** | Each road has an independent real-time traffic value (0 → capacity) |
| **Manual Traffic Setting** | Drag a slider for any road to set exact congestion level |
| **Random Traffic Simulation** | One-click generation of realistic random traffic at adjustable intensity (20%–95%) |
| **Traffic-Aware Routing** | Finds the least-congested path between any two cities using modified Dijkstra |
| **Augmenting Path Log** | Shows every BFS augmenting path found, with flow units per path |
| **Congestion Overlay** | Graph edges recolour live: 🟢 Free → 🟡 Light → 🟠 Moderate → 🔴 Heavy → ⬛ Gridlock |
| **Hop-by-Hop Traffic Report** | Route result shows per-segment traffic, capacity, and congestion status |

---

## 🗂️ File Structure

```
Transportation-Network/
│
├── algorithms/
│   ├── dijkstra.js          # Shortest path (existing)
│   ├── mst.js               # Kruskal MST (existing)
│   ├── tsp.js               # TSP Nearest Neighbour (existing)
│   ├── maxflow.js           # Original MaxFlow (legacy, kept)
│   └── fordFulkerson.js     # ✨ NEW — Full FF with traffic layer
│
├── ui/
│   ├── controls.js          # Button wiring (updated for FF)
│   ├── inputHandler.js      # Input forms (updated for TrafficPanel sync)
│   ├── outputDisplay.js     # Result renderer (renderMF + renderRoute added)
│   └── trafficPanel.js      # ✨ NEW — Traffic Management UI panel
│
├── visualization/
│   └── graphView.js         # vis-network wrapper (+ updateTrafficOverlay)
│
├── data/
│   └── graph.js             # Core graph model (+ getEdgeById)
│
├── index.html               # Updated: new scripts, legend, FF card
├── style.css                # Updated: traffic colours and components
└── README.md
```

---

## 💻 Usage

### 1. Load the project

Open `index.html` directly in a browser (no build step required). Click **Sample Graph** to load the Maharashtra city network.

### 2. Simulate Traffic

In the **Traffic Management** panel (right sidebar, below the algorithms):

- Drag any road's slider to set its traffic load manually
- Click **Random Traffic** to auto-generate realistic congestion
- Adjust the **Simulation intensity** slider (20%–95%) before clicking
- Click the eraser icon to **Clear All Traffic**

The graph canvas updates **instantly** — edge colours shift from green → amber → red as congestion rises.

### 3. Find Maximum Flow

1. Select **Source city** and **Sink city** in the Ford-Fulkerson card
2. Click **Compute Max Flow**
3. Results panel shows:
   - Total maximum flow (units/hr)
   - Flow breakdown per edge (flow/capacity + utilisation %)
   - Collapsible list of every augmenting path found

> **Note:** The algorithm uses `available_capacity = edge_weight − current_traffic` for each edge, so adding traffic reduces the computable max flow — exactly modelling a congested network.

### 4. Find Traffic-Aware Route

In the **Traffic-Aware Route** section inside the Traffic Management panel:

1. Select **From** and **To** cities
2. Click **Find Best Route**
3. Results show:
   - The optimal path (avoids heavily congested roads)
   - Average congestion % with status label
   - Per-hop breakdown: segment, status, traffic/capacity

---

## 🔌 API Reference

All functions are available on the global `FordFulkerson` object:

```javascript
// ── Traffic Management ─────────────────────────────────────────────

// Set traffic on an edge (clamped to [0, capacity])
FordFulkerson.setTraffic(edgeId, amount)
// → { ok: true, edgeId, amount }

// Get current traffic for one edge
FordFulkerson.getTraffic(edgeId)
// → number

// Get all traffic values
FordFulkerson.getAllTraffic()
// → { edgeId: number, ... }

// Remove all traffic
FordFulkerson.clearTraffic()

// Generate random traffic (intensity: 0.2–0.95)
FordFulkerson.generateRandomTraffic(intensity = 0.6)
// → { edgeId: number, ... }

// Congestion ratio [0,1] for an edge
FordFulkerson.getCongestion(edgeId)
// → number

// Human-readable status label
FordFulkerson.congestionLabel(ratio)
// → "Free flow" | "Light" | "Moderate" | "Heavy" | "Gridlock"

// Hex colour for congestion level
FordFulkerson.congestionColor(ratio)
// → "#22c55e" | "#84cc16" | "#f59e0b" | "#ef4444" | "#7f1d1d"


// ── Core Ford-Fulkerson ────────────────────────────────────────────

FordFulkerson.run(sourceId, sinkId)
/*
Returns:
{
  maxFlow:     number,          // total units that can flow s→t
  flowEdges: [{
    from, to,                   // node ids
    flow, capacity,             // values
    utilisation,                // ratio [0,1]
    edgeId                      // graph edge id
  }],
  edgeIds:    string[],         // edges in flow network
  augPaths: [{
    path:       string[],       // node id sequence
    flow:       number,         // bottleneck of this path
    pathLabels: string[]        // city names
  }],
  residualCap: { u: { v: number } },
  error?:     string            // only on failure
}
*/


// ── Traffic-Aware Routing ──────────────────────────────────────────

FordFulkerson.findBestRoute(sourceId, targetId, congestionPenalty = 5)
/*
Returns:
{
  path:         string[],       // ordered node ids
  pathLabels:   string[],       // ordered city names
  totalCost:    number,         // weighted route cost
  baseDistance: number,         // sum of raw edge weights
  trafficScore: number,         // average congestion [0,1]
  edgeIds:      string[],       // edges on path
  edgeDetails: [{
    from, to,                   // city labels
    weight, traffic, capacity,  // values
    congestion,                 // ratio [0,1]
    status,                     // "Free flow" | ...
    color,                      // hex
    edgeId
  }],
  error?:       string
}
*/
```

---

## 📊 Congestion Legend

| Ratio | Label | Colour | Meaning |
|---|---|---|---|
| 0–39% | Free flow | 🟢 `#22c55e` | Roads are clear |
| 40–64% | Light | 🟡 `#84cc16` | Minor delay expected |
| 65–84% | Moderate | 🟠 `#f59e0b` | Noticeable slowdowns |
| 85–94% | Heavy | 🔴 `#ef4444` | Significant congestion |
| 95–100% | Gridlock | ⬛ `#7f1d1d` | Road near / at capacity |

---

## 🧪 Testing the Algorithm

A quick test sequence to verify Ford-Fulkerson is working correctly:

```
1. Load Sample Graph              → 7 Indian cities, 10 roads
2. Click "Random Traffic" (60%)   → edges colour from green → red
3. Ford-Fulkerson: Mumbai → Nagpur, click Compute Max Flow
   Expected: max flow ≤ total edge capacity on any cut
4. Set Mumbai–Pune traffic to max (slider right)
   → Road shows "Gridlock", FF result decreases
5. Clear traffic, run FF again
   → Max flow restores to full capacity
6. Find Best Route: Mumbai → Solapur
   → Path avoids heavy roads even if they're shorter
```

---

## 📚 References

- Ford, L.R. & Fulkerson, D.R. (1956). *Maximal flow through a network.* Canadian Journal of Mathematics, 8, 399–404.
- Edmonds, J. & Karp, R.M. (1972). *Theoretical improvements in algorithmic efficiency for network flow problems.* Journal of the ACM, 19(2), 248–264.
- Cormen, T.H. et al. (2009). *Introduction to Algorithms* (3rd ed.), Chapter 26: Maximum Flow. MIT Press.

---



---

*This module is part of the TransNet project. All other algorithms (Dijkstra, Kruskal MST, TSP) remain fully functional alongside the Ford-Fulkerson extension.*
