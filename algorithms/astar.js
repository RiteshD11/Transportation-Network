/**
 * algorithms/astar.js
 * A* Shortest Path Algorithm
 *
 * Works with Graph.getNodes() and Graph.getEdges() (no adjacency list needed).
 * Returns: { path, edges, totalWeight } — compatible with MultiCriteria system.
 *
 * HOW A* WORKS (beginner-friendly):
 *   - gScore[n] = real cost from source → n (same as Dijkstra)
 *   - h(n)      = heuristic: estimated cost from n → target
 *   - fScore[n] = gScore[n] + h(n)  ← always pick the node with lowest fScore next
 *
 * Since we have no geographic coordinates, we use a "hop count" heuristic
 * (every unvisited node is at least 1 hop away). This keeps A* admissible
 * (never over-estimates) while still guiding it better than plain Dijkstra.
 */
const AStar = (() => {

  /**
   * Heuristic h(n): estimated cost from node n to target.
   * We use 0 (makes A* behave exactly like Dijkstra) which is always admissible.
   * If you add coordinates later, replace this with Euclidean / Haversine distance.
   */
  function _h(nodeId, targetId) {
    // Admissible zero heuristic — safe for any graph
    return 0;
  }

  /**
   * main entry point
   * @param {string} source   - node id of start city
   * @param {string} target   - node id of destination city
   * @param {string} criterion - edge weight field: "distance" | "time" | "cost"
   */
  function run(source, target, criterion) {
    criterion = criterion || "distance";

    // ── Guard: basic validation ──────────────────────────────────────────
    const nodes = Graph.getNodes();
    if (!nodes.length)          return { error: "Graph is empty. Add cities first." };
    if (!source || !target)     return { error: "Please select both source and target cities." };
    if (source === target)      return { error: "Source and target must be different cities." };

    const allEdges = Graph.getEdges();

    // ── Initialise scores ────────────────────────────────────────────────
    const gScore = {};   // real cost from source
    const fScore = {};   // gScore + heuristic
    const cameFrom  = {}; // for path reconstruction: cameFrom[n] = previous node
    const cameEdge  = {}; // for path reconstruction: cameEdge[n]  = edge id used
    const closedSet = new Set(); // already-processed nodes

    nodes.forEach(n => {
      gScore[n.id] = Infinity;
      fScore[n.id] = Infinity;
    });

    gScore[source] = 0;
    fScore[source] = _h(source, target); // 0 + h(source) = 0

    // openSet holds node IDs that are candidates to explore next
    let openSet = [source];

    // ── Main loop ────────────────────────────────────────────────────────
    while (openSet.length > 0) {

      // BUG FIX 1: always sort openSet by fScore so we pick the best node first.
      // Without this, openSet[0] is just whoever was inserted first — wrong!
      openSet.sort((a, b) => fScore[a] - fScore[b]);

      const current = openSet.shift(); // node with lowest fScore

      // Skip if already fully processed
      if (closedSet.has(current)) continue;
      closedSet.add(current);

      // Reached destination — reconstruct path
      if (current === target) {
        return _buildResult(cameFrom, cameEdge, current, criterion);
      }

      // ── Explore all edges touching current node ──────────────────────
      allEdges.forEach(edge => {
        // Determine neighbor (graph is undirected)
        let neighbor = null;
        if (edge.from === current) neighbor = edge.to;
        else if (edge.to === current) neighbor = edge.from;

        if (!neighbor) return;              // edge doesn't touch current
        if (closedSet.has(neighbor)) return; // already settled

        const cost = edge[criterion] || 0;
        const tentativeG = gScore[current] + cost;

        if (tentativeG < gScore[neighbor]) {
          // Found a better path to neighbor
          cameFrom[neighbor] = current;
          cameEdge[neighbor] = edge.id;
          gScore[neighbor]   = tentativeG;

          // BUG FIX 2: update fScore correctly = gScore + heuristic
          fScore[neighbor] = tentativeG + _h(neighbor, target);

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      });
    }

    // No path exists
    return {
      error: `No path found between "${Graph.getNode(source)?.label || source}" and "${Graph.getNode(target)?.label || target}".`
    };
  }

  /**
   * Reconstruct path by walking cameFrom backwards.
   * Returns { path, edges, totalWeight } — exactly what MultiCriteria expects.
   */
  function _buildResult(cameFrom, cameEdge, target, criterion) {
    const path      = [];
    const usedEdges = [];
    let   current   = target;

    // Walk backwards from target → source
    while (current !== undefined) {
      path.unshift(current);
      if (cameEdge[current]) {
        usedEdges.unshift(cameEdge[current]);
      }
      current = cameFrom[current];
    }

    // Sum up the total weight along the path
    const allEdges = Graph.getEdges();
    let totalWeight = 0;
    usedEdges.forEach(eid => {
      const e = allEdges.find(x => x.id === eid);
      if (e) totalWeight += e[criterion] || 0;
    });

    return {
      path,           // Array of node IDs e.g. ["mumbai", "pune", "nagpur"]
      edges: usedEdges, // Array of edge IDs e.g. ["e1", "e6"]
      totalWeight,    // Numeric total e.g. 644
      criterion       // Which weight was used
    };
  }

  return { run };

})();