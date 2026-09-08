/* =========================================================
   KRUSKAL LAB — graph builder + Union-Find animation
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";
const PIXELS_PER_UNIT = 70;

const KRUSKAL_TIMING = {
  makeset: 280,
  sortShow: 700,
  consider: 650,
  findStep: 520,
  findResult: 480,
  reject: 700,
  accept: 550,
  union: 900,
  between: 280,
  finish: 700
};

const svg = document.getElementById("graph-canvas");
const edgeLayer = document.getElementById("graph-edge-layer");
const edgeLabelLayer = document.getElementById("graph-edge-label-layer");
const nodeLayer = document.getElementById("graph-node-layer");
const builderMessage = document.getElementById("graph-builder-message");
const lockLabel = document.getElementById("graph-lock-label");
const runButton = document.getElementById("run-kruskal-button");
const pauseButton = document.getElementById("pause-kruskal-button");
const resumeButton = document.getElementById("resume-kruskal-button");
const clearGraphButton = document.getElementById("clear-graph-button");
const randomGraphButton = document.getElementById("random-graph-button");
const randomNodeCountInput = document.getElementById("random-node-count");
const weightModeNote = document.getElementById("weight-mode-note");
const modeLabel = document.getElementById("kruskal-mode-label");
const ufParentArray = document.getElementById("uf-parent-array");
const ufForest = document.getElementById("uf-forest");
const opTitle = document.getElementById("kruskal-operation-title");
const opDetail = document.getElementById("kruskal-operation-detail");

const graph = {
  nodes: [],
  edges: [],
  nextNodeId: 0,
  nextEdgeId: 0
};

let weightMode = "euclidean";
let editingEdgeId = null;
let weightInlineInput = null;
let closingWeightEditor = false;
const nodeElements = new Map();
const edgeElements = new Map();
let currentTool = "node";
let edgeStartNodeId = null;
let draggingNodeId = null;

function createEmptyRunState() {
  return {
    active: false,
    finished: false,
    mstEdgeIds: new Set(),
    consideringEdgeId: null,
    rejectedEdgeIds: new Set(),
    parent: new Map(),
    rank: new Map(),
    findHighlight: [],
    unionHighlight: null
  };
}

let run = createEmptyRunState();
let runToken = 0;
let kruskalPaused = false;
let kruskalPlaying = false;
let lastParentSnapshot = new Map();

function wait(ms) {
  return new Promise((resolve) => {
    let remaining = ms;
    let sliceStart = performance.now();

    function tick() {
      if (kruskalPaused) {
        if (sliceStart !== null) {
          remaining -= Math.max(0, performance.now() - sliceStart);
          sliceStart = null;
        }
        const poll = () => {
          if (kruskalPaused) {
            window.setTimeout(poll, 40);
            return;
          }
          sliceStart = performance.now();
          tick();
        };
        window.setTimeout(poll, 40);
        return;
      }

      if (sliceStart === null) sliceStart = performance.now();
      const left = remaining - (performance.now() - sliceStart);
      if (left <= 0) {
        resolve();
        return;
      }
      window.setTimeout(tick, Math.min(50, left));
    }

    tick();
  });
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function getNode(nodeId) {
  return graph.nodes.find((node) => node.id === nodeId);
}

function getEdge(edgeId) {
  return graph.edges.find((edge) => edge.id === edgeId);
}

function nodeLabel(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function svgPoint(event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function isGraphLocked() {
  return run.active || run.finished;
}

function setBuilderMessage(text) {
  if (builderMessage) builderMessage.textContent = text;
}

function setKruskalOperation(title, detail) {
  if (opTitle) opTitle.textContent = title;
  if (opDetail) opDetail.textContent = detail;
}

function setTool(tool) {
  if (isGraphLocked()) return;
  currentTool = tool;
  edgeStartNodeId = null;

  document.querySelectorAll(".graph-edit-tool").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });

  if (tool === "node") {
    setBuilderMessage("Click anywhere on the canvas to create a vertex.");
  } else if (tool === "edge") {
    setBuilderMessage("Select two vertices to create an edge.");
  } else if (tool === "move") {
    setBuilderMessage(
      weightMode === "euclidean"
        ? "Drag a vertex to move it. Edge weights update with Euclidean distance."
        : "Drag a vertex to move it. Random edge weights stay fixed."
    );
  } else if (tool === "delete") {
    setBuilderMessage("Click a vertex or edge to delete it.");
  }

  syncNodeClasses();
}

function setEditingEnabled(enabled) {
  document.querySelectorAll(".graph-edit-tool").forEach((button) => {
    button.disabled = !enabled;
  });
  if (clearGraphButton) clearGraphButton.disabled = !enabled;
  document.querySelectorAll(".weight-mode-button").forEach((button) => {
    button.disabled = !enabled;
  });
  if (lockLabel) {
    lockLabel.textContent = enabled ? "EDIT MODE" : "GRAPH LOCKED";
  }
}

function addNode(x, y) {
  if (graph.nodes.length >= 20) {
    setBuilderMessage("Maximum 20 vertices are supported.");
    return;
  }

  const node = {
    id: `v${graph.nextNodeId}`,
    label: nodeLabel(graph.nextNodeId),
    x: Math.max(40, Math.min(960, x)),
    y: Math.max(40, Math.min(380, y))
  };

  graph.nextNodeId += 1;
  graph.nodes.push(node);
  createNodeElement(node);
  syncNodeClasses();
}

function createNodeElement(node) {
  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("graph-node");
  group.dataset.nodeId = node.id;

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("r", "24");
  circle.classList.add("graph-node-circle");

  const label = document.createElementNS(SVG_NS, "text");
  label.classList.add("graph-node-label");
  label.textContent = node.label;
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dy", "5");

  group.append(circle, label);
  nodeLayer.appendChild(group);
  nodeElements.set(node.id, { group, circle, label });
  updateNodePosition(node.id);

  group.addEventListener("pointerdown", (event) => {
    if (run.active || run.finished) return;
    if (currentTool !== "move") return;
    event.preventDefault();
    event.stopPropagation();
    draggingNodeId = node.id;
    svg.setPointerCapture(event.pointerId);
  });

  group.addEventListener("click", (event) => {
    event.stopPropagation();
    handleNodeClick(node.id);
  });
}

function updateNodePosition(nodeId) {
  const node = getNode(nodeId);
  const element = nodeElements.get(nodeId);
  if (!node || !element) return;
  element.group.setAttribute("transform", `translate(${node.x} ${node.y})`);
}

function calculateEuclideanWeight(nodeA, nodeB) {
  const pixelDistance = Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y);
  return Math.max(0.1, round1(pixelDistance / PIXELS_PER_UNIT));
}

function randomEdgeWeight() {
  return round1(1 + Math.random() * 9);
}

function assignEdgeWeight(nodeA, nodeB) {
  if (weightMode === "random") return randomEdgeWeight();
  return calculateEuclideanWeight(nodeA, nodeB);
}

function updateWeightModeNote() {
  if (!weightModeNote) return;
  weightModeNote.textContent =
    weightMode === "euclidean"
      ? "click label to edit · moves update distance"
      : "click label to edit · random 1.0–10.0";
}

function setWeightMode(mode) {
  if (mode !== "euclidean" && mode !== "random") return;
  if (isGraphLocked()) return;
  weightMode = mode;

  document.querySelectorAll(".weight-mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.weightMode === mode);
  });
  updateWeightModeNote();

  graph.edges.forEach((edge) => {
    const nodeA = getNode(edge.u);
    const nodeB = getNode(edge.v);
    if (!nodeA || !nodeB) return;
    edge.weight = assignEdgeWeight(nodeA, nodeB);
    edge.userSet = false;
    updateEdgeGeometry(edge.id, false);
  });
}

function addEdge(nodeAId, nodeBId) {
  if (nodeAId === nodeBId) {
    setBuilderMessage("A self-loop is not used in this lab.");
    return;
  }

  const duplicate = graph.edges.some(
    (edge) =>
      (edge.u === nodeAId && edge.v === nodeBId) ||
      (edge.u === nodeBId && edge.v === nodeAId)
  );
  if (duplicate) {
    setBuilderMessage("That edge already exists.");
    return;
  }

  const nodeA = getNode(nodeAId);
  const nodeB = getNode(nodeBId);
  if (!nodeA || !nodeB) return;

  const edge = {
    id: `e${graph.nextEdgeId}`,
    u: nodeAId,
    v: nodeBId,
    weight: assignEdgeWeight(nodeA, nodeB),
    userSet: false
  };

  graph.nextEdgeId += 1;
  graph.edges.push(edge);
  createEdgeElement(edge);
  syncEdgeClasses();
}

function createEdgeElement(edge) {
  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("graph-edge");
  group.dataset.edgeId = edge.id;

  const hitLine = document.createElementNS(SVG_NS, "line");
  hitLine.classList.add("graph-edge-hit");
  const line = document.createElementNS(SVG_NS, "line");
  line.classList.add("graph-edge-line");

  const weightBox = document.createElementNS(SVG_NS, "rect");
  weightBox.classList.add("graph-edge-weight-box", "is-editable");
  weightBox.setAttribute("width", "58");
  weightBox.setAttribute("height", "30");
  weightBox.setAttribute("rx", "6");

  const weight = document.createElementNS(SVG_NS, "text");
  weight.classList.add("graph-edge-weight");
  weight.setAttribute("text-anchor", "middle");
  weight.setAttribute("dy", "6");

  group.append(hitLine, line);
  edgeLayer.appendChild(group);
  if (edgeLabelLayer) edgeLabelLayer.append(weightBox, weight);
  else group.append(weightBox, weight);

  edgeElements.set(edge.id, { group, hitLine, line, weightBox, weight });
  updateEdgeGeometry(edge.id);

  weightBox.addEventListener("click", (event) => {
    event.stopPropagation();
    editEdgeWeight(edge.id);
  });

  group.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isGraphLocked()) return;
    if (currentTool === "delete") deleteEdge(edge.id);
  });
}

function restoreWeightLabelVisibility(edgeId) {
  const element = edgeElements.get(edgeId);
  if (!element) return;
  element.weightBox.style.opacity = "";
  element.weight.style.opacity = "";
}

function closeWeightEditor(options = {}) {
  const apply = options.apply === true;
  const edgeId = editingEdgeId;
  const input = weightInlineInput;
  if (!input && edgeId === null) return;

  closingWeightEditor = true;
  weightInlineInput = null;
  editingEdgeId = null;

  if (apply && input && edgeId !== null && !isGraphLocked()) {
    const edge = getEdge(edgeId);
    const value = Number(input.value);
    if (edge && Number.isFinite(value) && value > 0) {
      edge.weight = round1(value);
      edge.userSet = true;
      updateEdgeGeometry(edge.id, false);
    } else if (input.value.trim() !== "") {
      setBuilderMessage("Weight must be a positive number.");
    }
  }

  if (edgeId !== null) restoreWeightLabelVisibility(edgeId);
  if (input) input.remove();
  closingWeightEditor = false;
}

function openWeightEditor(edgeId) {
  if (isGraphLocked()) return;
  if (editingEdgeId === edgeId && weightInlineInput) {
    weightInlineInput.focus();
    weightInlineInput.select();
    return;
  }

  closeWeightEditor({ apply: false });

  const edge = getEdge(edgeId);
  const element = edgeElements.get(edgeId);
  const wrapper = document.querySelector(".graph-canvas-wrapper");
  if (!edge || !element || !wrapper) return;

  const nodeA = getNode(edge.u);
  const nodeB = getNode(edge.v);
  if (!nodeA || !nodeB) return;

  const boxRect = element.weightBox.getBoundingClientRect();
  const wrapRect = wrapper.getBoundingClientRect();
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0.1";
  input.step = "0.1";
  input.inputMode = "decimal";
  input.className = "weight-inline-input";
  input.value = edge.weight.toFixed(1);
  input.setAttribute(
    "aria-label",
    `Weight for edge ${nodeA.label} ${nodeB.label}`
  );
  input.style.left = `${boxRect.left - wrapRect.left}px`;
  input.style.top = `${boxRect.top - wrapRect.top}px`;
  input.style.width = `${Math.max(boxRect.width, 46)}px`;
  input.style.height = `${Math.max(boxRect.height, 26)}px`;

  element.weightBox.style.opacity = "0";
  element.weight.style.opacity = "0";
  wrapper.appendChild(input);
  editingEdgeId = edgeId;
  weightInlineInput = input;

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeWeightEditor({ apply: true });
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeWeightEditor({ apply: false });
    }
  });
  input.addEventListener("blur", () => {
    if (closingWeightEditor) return;
    closeWeightEditor({ apply: true });
  });

  window.requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function editEdgeWeight(edgeId) {
  openWeightEditor(edgeId);
}

function updateEdgeGeometry(edgeId) {
  const edge = getEdge(edgeId);
  const element = edgeElements.get(edgeId);
  if (!edge || !element) return;

  const nodeA = getNode(edge.u);
  const nodeB = getNode(edge.v);
  if (!nodeA || !nodeB) return;

  if (weightMode === "euclidean" && !edge.userSet) {
    edge.weight = calculateEuclideanWeight(nodeA, nodeB);
  }

  [element.hitLine, element.line].forEach((line) => {
    line.setAttribute("x1", nodeA.x);
    line.setAttribute("y1", nodeA.y);
    line.setAttribute("x2", nodeB.x);
    line.setAttribute("y2", nodeB.y);
  });

  const midX = (nodeA.x + nodeB.x) / 2;
  const midY = (nodeA.y + nodeB.y) / 2;
  const dx = nodeB.x - nodeA.x;
  const dy = nodeB.y - nodeA.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = 14;
  const labelX = midX - (dy / length) * offset;
  const labelY = midY + (dx / length) * offset;

  element.weightBox.setAttribute("x", labelX - 29);
  element.weightBox.setAttribute("y", labelY - 15);
  element.weight.setAttribute("x", labelX);
  element.weight.setAttribute("y", labelY);
  element.weight.textContent = edge.weight.toFixed(1);
}

function updateIncidentEdges(nodeId) {
  graph.edges
    .filter((edge) => edge.u === nodeId || edge.v === nodeId)
    .forEach((edge) => updateEdgeGeometry(edge.id));
}

function handleNodeClick(nodeId) {
  if (run.active) return;

  if (currentTool === "edge") {
    if (edgeStartNodeId === null) {
      edgeStartNodeId = nodeId;
      setBuilderMessage(
        `First vertex selected: ${getNode(nodeId).label}. Select the second vertex.`
      );
      syncNodeClasses();
    } else {
      const first = edgeStartNodeId;
      edgeStartNodeId = null;
      addEdge(first, nodeId);
      setBuilderMessage("Select two vertices to create another edge.");
      syncNodeClasses();
    }
    return;
  }

  if (currentTool === "delete") deleteNode(nodeId);
}

function deleteEdge(edgeId) {
  if (editingEdgeId === edgeId) closeWeightEditor();
  const element = edgeElements.get(edgeId);
  if (element) {
    element.group.remove();
    element.weightBox.remove();
    element.weight.remove();
  }
  graph.edges = graph.edges.filter((edge) => edge.id !== edgeId);
  edgeElements.delete(edgeId);
}

function deleteNode(nodeId) {
  graph.edges
    .filter((edge) => edge.u === nodeId || edge.v === nodeId)
    .map((edge) => edge.id)
    .forEach(deleteEdge);

  const element = nodeElements.get(nodeId);
  if (element) element.group.remove();
  nodeElements.delete(nodeId);
  graph.nodes = graph.nodes.filter((node) => node.id !== nodeId);
  syncNodeClasses();
}

function clearGraph(force = false) {
  if (!force && isGraphLocked()) return;
  graph.nodes = [];
  graph.edges = [];
  graph.nextNodeId = 0;
  graph.nextEdgeId = 0;
  nodeElements.clear();
  edgeElements.clear();
  nodeLayer.replaceChildren();
  edgeLayer.replaceChildren();
  if (edgeLabelLayer) edgeLabelLayer.replaceChildren();
  edgeStartNodeId = null;
  closeWeightEditor();
  setBuilderMessage(
    "Click anywhere on the canvas to create a vertex, or generate a random graph."
  );
}

function findRootInstant(nodeId) {
  let current = nodeId;
  const seen = new Set();
  while (run.parent.has(current) && run.parent.get(current) !== current) {
    if (seen.has(current)) break;
    seen.add(current);
    current = run.parent.get(current);
  }
  return current;
}

function syncNodeClasses() {
  graph.nodes.forEach((node) => {
    const element = nodeElements.get(node.id);
    if (!element) return;
    const group = element.group;
    group.classList.toggle("is-edge-start", edgeStartNodeId === node.id);
    group.classList.remove("is-component", "is-root");
    element.circle.style.stroke = "";
    element.circle.style.strokeWidth = "";
  });
}

function syncEdgeClasses() {
  graph.edges.forEach((edge) => {
    const element = edgeElements.get(edge.id);
    if (!element) return;
    element.group.classList.toggle("is-mst-edge", run.mstEdgeIds.has(edge.id));
    element.group.classList.toggle(
      "is-considering",
      run.consideringEdgeId === edge.id
    );
    element.group.classList.toggle(
      "is-rejected",
      run.rejectedEdgeIds.has(edge.id)
    );
  });
}

function isUndirectedGraphConnected() {
  if (graph.nodes.length <= 1) return true;
  const adjacency = new Map();
  graph.nodes.forEach((node) => adjacency.set(node.id, []));
  graph.edges.forEach((edge) => {
    adjacency.get(edge.u).push(edge.v);
    adjacency.get(edge.v).push(edge.u);
  });

  const startId = graph.nodes[0].id;
  const visited = new Set([startId]);
  const stack = [startId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    for (const neighborId of adjacency.get(currentId)) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        stack.push(neighborId);
      }
    }
  }
  return visited.size === graph.nodes.length;
}

function validateGraph() {
  if (graph.nodes.length < 2) {
    setBuilderMessage("Create at least two vertices.");
    return false;
  }
  if (graph.edges.length === 0) {
    setBuilderMessage("Create at least one edge.");
    return false;
  }
  if (!isUndirectedGraphConnected()) {
    setBuilderMessage(
      "The graph must be connected. Add edges so every vertex is reachable."
    );
    return false;
  }
  return true;
}

function updatePlaybackControls() {
  if (pauseButton) pauseButton.disabled = !kruskalPlaying || kruskalPaused;
  if (resumeButton) resumeButton.disabled = !kruskalPlaying || !kruskalPaused;
  if (runButton) runButton.disabled = kruskalPlaying;
}

function pauseKruskal() {
  if (!kruskalPlaying || kruskalPaused) return;
  kruskalPaused = true;
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "PAUSED";
}

function resumeKruskal() {
  if (!kruskalPlaying || !kruskalPaused) return;
  kruskalPaused = false;
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "RUNNING";
}

function resetUfPanels() {
  lastParentSnapshot = new Map();
  if (ufParentArray) {
    ufParentArray.innerHTML = '<div class="uf-empty">No sets yet.</div>';
  }
  if (ufForest) {
    ufForest.innerHTML =
      '<div class="uf-empty">Makeset(u) for every vertex will appear here.</div>';
  }
}


function resetExecution() {
  kruskalPaused = false;
  kruskalPlaying = false;
  runToken += 1;
  run = createEmptyRunState();
  setEditingEnabled(true);
  if (modeLabel) modeLabel.textContent = "READY";
  updatePlaybackControls();
  syncNodeClasses();
  syncEdgeClasses();
  resetUfPanels();
  setKruskalOperation(
    "READY",
    "Build a connected weighted graph, then press RUN."
  );
}

function renderParentArray() {
  if (!ufParentArray) return;
  if (run.parent.size === 0) {
    ufParentArray.innerHTML = '<div class="uf-empty">No sets yet.</div>';
    lastParentSnapshot = new Map();
    return;
  }

  const table = document.createElement("div");
  table.className = "uf-parent-table";
  table.setAttribute("role", "table");
  table.setAttribute("aria-label", "Parent array parent[u]");

  const labelCol = document.createElement("div");
  labelCol.className = "uf-parent-col is-label-col";
  labelCol.innerHTML =
    '<div class="uf-parent-node is-label">u</div><div class="uf-parent-value is-label">parent[u]</div>';
  table.appendChild(labelCol);

  const nextSnapshot = new Map();

  graph.nodes.forEach((node) => {
    if (!run.parent.has(node.id)) return;

    const parentId = run.parent.get(node.id);
    const parentNode = getNode(parentId);
    if (!parentNode) return;

    nextSnapshot.set(node.id, parentId);
    const prevParent = lastParentSnapshot.get(node.id);
    const changed =
      lastParentSnapshot.size > 0 &&
      (prevParent === undefined || prevParent !== parentId);

    const col = document.createElement("div");
    col.className = "uf-parent-col";
    if (run.findHighlight.includes(node.id)) col.classList.add("is-find-path");
    if (run.unionHighlight && run.unionHighlight.includes(node.id)) {
      col.classList.add("is-union");
    }
    if (parentId === node.id) col.classList.add("is-root-col");

    const top = document.createElement("div");
    top.className = "uf-parent-node";
    top.textContent = node.label;

    const bottom = document.createElement("div");
    bottom.className = "uf-parent-value";
    if (changed) bottom.classList.add("is-changed");
    bottom.textContent = parentNode.label;

    col.append(top, bottom);
    table.appendChild(col);
  });

  ufParentArray.replaceChildren(table);
  lastParentSnapshot = nextSnapshot;
}

function scrollRunViewport() {
  const anchor = runButton || document.querySelector(".graph-run-controls");
  if (!anchor) return;
  const top = anchor.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function renderForest() {
  if (!ufForest) return;
  if (run.parent.size === 0) {
    ufForest.innerHTML =
      '<div class="uf-empty">Makeset(u) for every vertex will appear here.</div>';
    return;
  }

  const children = new Map();
  run.parent.forEach((_parent, nodeId) => {
    children.set(nodeId, []);
  });

  run.parent.forEach((parent, nodeId) => {
    if (parent !== nodeId && children.has(parent)) {
      children.get(parent).push(nodeId);
    }
  });

  const roots = [...run.parent.keys()].filter(
    (nodeId) => run.parent.get(nodeId) === nodeId
  );

  function buildTree(nodeId) {
    const node = getNode(nodeId);
    if (!node) return document.createTextNode("");

    const tree = document.createElement("div");
    tree.className = "uf-tree-node";
    if (run.parent.get(nodeId) === nodeId) tree.classList.add("is-root");

    const badge = document.createElement("div");
    badge.className = "uf-tree-badge";
    badge.textContent = node.label;
    tree.appendChild(badge);

    const kids = children.get(nodeId) || [];
    if (kids.length > 0) {
      const childRow = document.createElement("div");
      childRow.className = "uf-tree-children";
      kids.forEach((childId) => childRow.appendChild(buildTree(childId)));
      tree.appendChild(childRow);
    }
    return tree;
  }

  const findRoots = new Set(
    run.findHighlight
      .filter((id) => run.parent.has(id))
      .map((id) => findRootInstant(id))
  );
  const unionRoots = new Set(
    (run.unionHighlight || [])
      .filter((id) => run.parent.has(id))
      .map((id) => findRootInstant(id))
  );

  ufForest.replaceChildren();
  const forest = document.createElement("div");
  forest.className = "uf-forest-row";
  roots.forEach((rootId) => {
    const card = document.createElement("div");
    card.className = "uf-component-card";
    if (findRoots.has(rootId)) card.classList.add("is-find-set");
    if (unionRoots.has(rootId)) card.classList.add("is-union-set");
    card.appendChild(buildTree(rootId));
    forest.appendChild(card);
  });
  ufForest.appendChild(forest);
}

function refreshUfVisuals() {
  renderParentArray();
  renderForest();
  syncNodeClasses();
}

async function makesetAll(token) {
  if (token !== runToken) return;

  run.parent.clear();
  run.rank.clear();
  lastParentSnapshot = new Map();

  for (const node of graph.nodes) {
    run.parent.set(node.id, node.id);
    run.rank.set(node.id, 0);
  }

  setKruskalOperation(
    "INITIALIZE",
    `for all u ∈ V do makeset(u)\nCreated |V| = ${graph.nodes.length} singleton sets`
  );
  refreshUfVisuals();
  await wait(KRUSKAL_TIMING.makeset);
}

async function animatedFind(nodeId, token, label) {
  const path = [];
  let current = nodeId;

  while (true) {
    if (token !== runToken) return null;
    path.push(current);
    run.findHighlight = [...path];
    refreshUfVisuals();

    const parent = run.parent.get(current);

    if (parent === current) {
      await wait(KRUSKAL_TIMING.findResult);
      break;
    }

    await wait(KRUSKAL_TIMING.findStep);
    current = parent;
  }

  const root = current;
  // Path compression
  for (const id of path) {
    if (id !== root) run.parent.set(id, root);
  }
  run.findHighlight = path;
  refreshUfVisuals();
  await wait(KRUSKAL_TIMING.findResult * 0.6);
  run.findHighlight = [];
  refreshUfVisuals();
  return root;
}

async function animatedUnion(rootA, rootB, token) {
  if (token !== runToken) return;
  const rankA = run.rank.get(rootA);
  const rankB = run.rank.get(rootB);

  run.unionHighlight = [rootA, rootB];
  refreshUfVisuals();

  if (rankA < rankB) {
    run.parent.set(rootA, rootB);
  } else if (rankA > rankB) {
    run.parent.set(rootB, rootA);
  } else {
    run.parent.set(rootB, rootA);
    run.rank.set(rootA, rankA + 1);
  }

  refreshUfVisuals();
  await wait(KRUSKAL_TIMING.union);
  run.unionHighlight = null;
  refreshUfVisuals();
}

async function startKruskal() {
  if (!validateGraph()) {
    setKruskalOperation(
      "NEED GRAPH",
      builderMessage
        ? builderMessage.textContent
        : "Build a connected graph before running Kruskal."
    );
    return;
  }

  runToken += 1;
  const token = runToken;
  run = createEmptyRunState();
  run.active = true;
  kruskalPlaying = true;
  kruskalPaused = false;
  setEditingEnabled(false);
  if (runButton) runButton.disabled = true;
  if (modeLabel) modeLabel.textContent = "RUNNING";
  updatePlaybackControls();
  syncEdgeClasses();
  syncNodeClasses();

  scrollRunViewport();

  const sortedEdges = [...graph.edges].sort((a, b) => {
    if (a.weight !== b.weight) return a.weight - b.weight;
    return a.id.localeCompare(b.id);
  });

  setKruskalOperation("START", "X ← {}\nInitialize disjoint sets for every vertex.");
  await makesetAll(token);
  if (token !== runToken) return;

  setKruskalOperation(
    "SORT EDGES",
    `Sort |E| = ${sortedEdges.length} edges by increasing weight.`
  );
  await wait(KRUSKAL_TIMING.sortShow);
  if (token !== runToken) return;

  let mstCount = 0;
  const need = graph.nodes.length - 1;

  for (const edge of sortedEdges) {
    if (token !== runToken) return;
    if (mstCount >= need) break;

    const nodeA = getNode(edge.u);
    const nodeB = getNode(edge.v);

    run.consideringEdgeId = edge.id;
    syncEdgeClasses();

    setKruskalOperation(
      "CONSIDER EDGE",
      `Inspect {${nodeA.label}, ${nodeB.label}} with weight ${edge.weight.toFixed(1)}\nif find(${nodeA.label}) ≠ find(${nodeB.label}) then accept`
    );
    await wait(KRUSKAL_TIMING.consider);
    if (token !== runToken) return;

    const rootA = await animatedFind(edge.u, token, nodeA.label);
    if (token !== runToken) return;
    const rootB = await animatedFind(edge.v, token, nodeB.label);
    if (token !== runToken) return;

    if (rootA === rootB) {
      run.rejectedEdgeIds.add(edge.id);
      run.consideringEdgeId = null;
      syncEdgeClasses();
      setKruskalOperation(
        "REJECT EDGE",
        `find(${nodeA.label}) = find(${nodeB.label}) = ${getNode(rootA).label}\nSame component → skip (would form a cycle)`
      );
      await wait(KRUSKAL_TIMING.reject);
    } else {
      run.mstEdgeIds.add(edge.id);
      mstCount += 1;
      run.consideringEdgeId = null;
      syncEdgeClasses();
        setKruskalOperation(
        "ACCEPT EDGE",
        `find(${nodeA.label}) ≠ find(${nodeB.label})\nAdd {${nodeA.label}, ${nodeB.label}} to X  (${mstCount}/${need})`
      );
      await wait(KRUSKAL_TIMING.accept);
      if (token !== runToken) return;
      await animatedUnion(rootA, rootB, token);
    }

    await wait(KRUSKAL_TIMING.between);
  }

  if (token !== runToken) return;

  run.consideringEdgeId = null;
  run.active = false;
  run.finished = true;
  kruskalPlaying = false;
  kruskalPaused = false;
  syncEdgeClasses();
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "DONE";
  if (runButton) runButton.disabled = false;

  const totalWeight = [...run.mstEdgeIds].reduce((sum, id) => {
    const edge = getEdge(id);
    return sum + (edge ? edge.weight : 0);
  }, 0);

  setKruskalOperation(
    "COMPLETE",
    `MST has ${run.mstEdgeIds.size} edges.\nTotal weight = ${totalWeight.toFixed(1)}`
  );
  refreshUfVisuals();
  await wait(KRUSKAL_TIMING.finish);
}

function shuffleInPlace(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = values[i];
    values[i] = values[j];
    values[j] = temp;
  }
  return values;
}

function generateRandomGraph() {
  if (run.active || run.finished) resetExecution();

  let n = Number.parseInt(
    randomNodeCountInput ? randomNodeCountInput.value : "6",
    10
  );
  if (Number.isNaN(n)) n = 6;
  n = Math.max(2, Math.min(12, n));
  if (randomNodeCountInput) randomNodeCountInput.value = String(n);

  clearGraph(true);

  const minX = 80;
  const maxX = 920;
  const minY = 70;
  const maxY = 350;
  const placed = [];

  for (let i = 0; i < n; i += 1) {
    let best = null;
    let bestDistance = -1;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY)
      };
      let nearest = Infinity;
      for (const point of placed) {
        nearest = Math.min(
          nearest,
          Math.hypot(candidate.x - point.x, candidate.y - point.y)
        );
      }
      if (nearest > bestDistance) {
        best = candidate;
        bestDistance = nearest;
      }
    }
    placed.push(best);
    addNode(best.x, best.y);
  }

  const nodeIds = graph.nodes.map((node) => node.id);
  const possible = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      possible.push([nodeIds[i], nodeIds[j]]);
    }
  }
  shuffleInPlace(possible);

  const parent = {};
  for (const id of nodeIds) parent[id] = id;
  function find(id) {
    if (parent[id] !== id) parent[id] = find(parent[id]);
    return parent[id];
  }
  function unite(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[rb] = ra;
    return true;
  }

  const minEdges = n - 1;
  const maxEdges = (n * (n - 1)) / 2;
  const edgeTarget =
    minEdges + Math.floor(Math.random() * (maxEdges - minEdges + 1));

  let edgeCount = 0;
  const leftover = [];
  for (const [a, b] of possible) {
    if (edgeCount < minEdges && unite(a, b)) {
      addEdge(a, b);
      edgeCount += 1;
    } else {
      leftover.push([a, b]);
    }
  }
  shuffleInPlace(leftover);
  for (const [a, b] of leftover) {
    if (edgeCount >= edgeTarget) break;
    addEdge(a, b);
    edgeCount += 1;
  }

  setTool("node");
  setEditingEnabled(true);
  setBuilderMessage(
    "Click anywhere on the canvas to create a vertex, or generate a random graph."
  );
  syncNodeClasses();
  syncEdgeClasses();
}

if (svg) {
  svg.addEventListener("click", (event) => {
    if (isGraphLocked()) return;
    if (currentTool !== "node") return;
    const point = svgPoint(event);
    addNode(point.x, point.y);
  });

  svg.addEventListener("pointermove", (event) => {
    if (draggingNodeId === null) return;
    const node = getNode(draggingNodeId);
    if (!node) return;
    const point = svgPoint(event);
    node.x = Math.max(40, Math.min(960, point.x));
    node.y = Math.max(40, Math.min(380, point.y));
    updateNodePosition(node.id);
    updateIncidentEdges(node.id);
  });

  svg.addEventListener("pointerup", (event) => {
    draggingNodeId = null;
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
  });
}

document.querySelectorAll(".graph-edit-tool").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

document.querySelectorAll(".weight-mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    setWeightMode(button.dataset.weightMode);
  });
});

updateWeightModeNote();

if (clearGraphButton) {
  clearGraphButton.addEventListener("click", () => clearGraph(false));
}

if (randomGraphButton) {
  randomGraphButton.addEventListener("click", generateRandomGraph);
}

if (randomNodeCountInput) {
  randomNodeCountInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") generateRandomGraph();
  });
}

if (runButton) {
  runButton.addEventListener("click", async () => {
    if (run.finished) resetExecution();
    if (kruskalPlaying) return;
    await startKruskal();
  });
}

if (pauseButton) pauseButton.addEventListener("click", pauseKruskal);
if (resumeButton) resumeButton.addEventListener("click", resumeKruskal);

updatePlaybackControls();
setTool("node");
