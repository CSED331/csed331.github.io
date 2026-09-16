/* =========================================================
   PRIM LAB — graph builder + binary-heap Prim MST animation
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";
const PIXELS_PER_UNIT = 70;

const PRIM_TIMING = {
  init: 500,
  deletemin: 700,
  scan: 400,
  decrease: 550,
  accept: 600,
  between: 250,
  finish: 700
};

const svg = document.getElementById("graph-canvas");
const edgeLayer = document.getElementById("graph-edge-layer");
const edgeLabelLayer = document.getElementById("graph-edge-label-layer");
const nodeLayer = document.getElementById("graph-node-layer");
const builderMessage = document.getElementById("graph-builder-message");
const lockLabel = document.getElementById("graph-lock-label");
const runButton = document.getElementById("run-prim-button");
const pauseButton = document.getElementById("pause-prim-button");
const resumeButton = document.getElementById("resume-prim-button");
const clearGraphButton = document.getElementById("clear-graph-button");
const randomGraphButton = document.getElementById("random-graph-button");
const randomNodeCountInput = document.getElementById("random-node-count");
const weightModeNote = document.getElementById("weight-mode-note");
const modeLabel = document.getElementById("prim-mode-label");
const priorityQueueElement = document.getElementById("priority-queue");
const opTitle = document.getElementById("prim-operation-title");
const opDetail = document.getElementById("prim-operation-detail");

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
    cost: new Map(),
    prev: new Map(),
    inHeap: new Set(),
    inTree: new Set(),
    heap: [],
    heapPos: new Map(),
    mstEdgeIds: new Set(),
    candidateEdgeIds: new Set(),
    consideringEdgeId: null,
    startId: null
  };
}

let run = createEmptyRunState();
let runToken = 0;
let primPaused = false;
let primPlaying = false;

function wait(ms) {
  return new Promise((resolve) => {
    let remaining = ms;
    let sliceStart = performance.now();

    function tick() {
      if (primPaused) {
        if (sliceStart !== null) {
          remaining -= Math.max(0, performance.now() - sliceStart);
          sliceStart = null;
        }
        const poll = () => {
          if (primPaused) {
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

function findEdgeBetween(nodeAId, nodeBId) {
  return graph.edges.find(
    (edge) =>
      (edge.u === nodeAId && edge.v === nodeBId) ||
      (edge.u === nodeBId && edge.v === nodeAId)
  );
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

function setPrimOperation(title, detail) {
  if (opTitle) opTitle.textContent = title;
  if (opDetail) opDetail.textContent = detail;
}

function formatEdgeWeight(weight) {
  const rounded = Math.round(weight * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatCost(value) {
  if (value === undefined || value === null || value === Infinity) return "∞";
  return formatEdgeWeight(value);
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
    updateEdgeGeometry(edge.id, { skipLabel: true });
  });
  relayoutAllEdgeLabels();
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
      updateEdgeGeometry(edge.id, { skipLabel: true });
      relayoutAllEdgeLabels();
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

function updateEdgeGeometry(edgeId, options = {}) {
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

  if (options.skipLabel) {
    element.weight.textContent = edge.weight.toFixed(1);
    return;
  }

  const avoidCenters =
    options.avoidCenters || collectEdgeLabelCenters(edgeId);
  const { x: labelX, y: labelY } = chooseEdgeLabelPosition(
    edge,
    avoidCenters
  );
  applyEdgeLabelPosition(edgeId, labelX, labelY);
}

function collectEdgeLabelCenters(exceptEdgeId = null) {
  const centers = [];
  graph.edges.forEach((edge) => {
    if (exceptEdgeId && edge.id === exceptEdgeId) return;
    const element = edgeElements.get(edge.id);
    if (!element) return;
    const x = Number(element.weight.getAttribute("x"));
    const y = Number(element.weight.getAttribute("y"));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      centers.push({ x, y });
    }
  });
  return centers;
}

function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const LABEL_HALF_W = 30;
const LABEL_HALF_H = 16;

function labelSamplePoints(x, y) {
  const wx = LABEL_HALF_W * 0.85;
  const hy = LABEL_HALF_H * 0.85;
  return [
    { x, y },
    { x: x - wx, y },
    { x: x + wx, y },
    { x, y: y - hy },
    { x, y: y + hy },
    { x: x - wx, y: y - hy },
    { x: x + wx, y: y - hy },
    { x: x - wx, y: y + hy },
    { x: x + wx, y: y + hy }
  ];
}

function weightLabelsOverlap(x1, y1, x2, y2) {
  return (
    Math.abs(x1 - x2) < LABEL_HALF_W * 2.15 &&
    Math.abs(y1 - y2) < LABEL_HALF_H * 2.15
  );
}

function minDistLabelToOtherEdges(x, y, edge) {
  let minDist = Infinity;
  const samples = labelSamplePoints(x, y);
  graph.edges.forEach((other) => {
    if (other.id === edge.id) return;
    const oA = getNode(other.u);
    const oB = getNode(other.v);
    if (!oA || !oB) return;
    samples.forEach((sample) => {
      const d = distPointToSegment(
        sample.x,
        sample.y,
        oA.x,
        oA.y,
        oB.x,
        oB.y
      );
      if (d < minDist) minDist = d;
    });
  });
  return minDist;
}

function labelConflictScore(x, y, edge, avoidCenters) {
  let score = 0;

  avoidCenters.forEach((center) => {
    if (weightLabelsOverlap(x, y, center.x, center.y)) score += 40;
    else {
      const dx = Math.abs(x - center.x);
      const dy = Math.abs(y - center.y);
      if (dx < LABEL_HALF_W * 2.6 && dy < LABEL_HALF_H * 2.6) {
        score += 8;
      }
    }
  });

  const edgeClearance = minDistLabelToOtherEdges(x, y, edge);
  // Hard: label footprint sits on another edge.
  if (edgeClearance < 12) score += 80;
  else if (edgeClearance < 18) score += 35;
  else if (edgeClearance < 26) score += 12;
  else if (edgeClearance < 34) score += 3;

  graph.nodes.forEach((node) => {
    if (node.id === edge.u || node.id === edge.v) return;
    if (Math.hypot(x - node.x, y - node.y) < 40) score += 10;
  });

  const nodeA = getNode(edge.u);
  const nodeB = getNode(edge.v);
  if (nodeA && Math.hypot(x - nodeA.x, y - nodeA.y) < 36) score += 8;
  if (nodeB && Math.hypot(x - nodeB.x, y - nodeB.y) < 36) score += 8;

  // Prefer roomy spots so the weight clearly belongs to this edge only.
  score += Math.max(0, 30 - Math.min(edgeClearance, 30)) * 0.4;
  return score;
}

function homeLabelPosition(edge) {
  const nodeA = getNode(edge.u);
  const nodeB = getNode(edge.v);
  const midX = (nodeA.x + nodeB.x) / 2;
  const midY = (nodeA.y + nodeB.y) / 2;
  const dx = nodeB.x - nodeA.x;
  const dy = nodeB.y - nodeA.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const upSide = ny <= 0 ? 1 : -1;
  const offset = 13;
  return {
    x: midX + nx * offset * upSide,
    y: midY + ny * offset * upSide,
    nx,
    ny,
    dx,
    dy,
    length,
    upSide,
    offset,
    nodeA,
    nodeB
  };
}

function pointOnEdgeLabel(home, t, side, offset) {
  const ax = home.nodeA.x + home.dx * t;
  const ay = home.nodeA.y + home.dy * t;
  return {
    x: ax + home.nx * offset * side,
    y: ay + home.ny * offset * side,
    t
  };
}

function chooseEdgeLabelPosition(edge, avoidCenters) {
  const home = homeLabelPosition(edge);

  // Dense samples along the edge — move clearly when something conflicts.
  const tValues = [];
  for (let i = 0; i <= 28; i += 1) {
    tValues.push(0.12 + (0.76 * i) / 28);
  }

  const candidates = [];
  for (const t of tValues) {
    candidates.push({
      ...pointOnEdgeLabel(home, t, home.upSide, home.offset),
      rank: 0
    });
  }
  for (const t of tValues) {
    candidates.push({
      ...pointOnEdgeLabel(home, t, -home.upSide, home.offset),
      rank: 1
    });
  }
  for (const offset of [11, 15, 18, 22]) {
    for (const side of [home.upSide, -home.upSide]) {
      for (const t of tValues) {
        candidates.push({
          ...pointOnEdgeLabel(home, t, side, offset),
          rank: offset === home.offset ? 1 : 2
        });
      }
    }
  }

  let best = { x: home.x, y: home.y, t: 0.5 };
  let bestKey = null;

  candidates.forEach((candidate) => {
    const conflicts = labelConflictScore(
      candidate.x,
      candidate.y,
      edge,
      avoidCenters
    );
    const clearance = minDistLabelToOtherEdges(
      candidate.x,
      candidate.y,
      edge
    );
    const along = Math.abs(candidate.t - 0.5);
    // Minimize conflicts first, then maximize clearance from other edges,
    // then keep closer to midpoint / preferred side.
    const key =
      conflicts * 100000 +
      Math.max(0, 40 - clearance) * 200 +
      candidate.rank * 80 +
      along * 25;
    if (bestKey === null || key < bestKey) {
      bestKey = key;
      best = candidate;
    }
  });

  return { x: best.x, y: best.y };
}

function applyEdgeLabelPosition(edgeId, labelX, labelY) {
  const edge = getEdge(edgeId);
  const element = edgeElements.get(edgeId);
  if (!edge || !element) return;
  element.weightBox.setAttribute("x", labelX - 29);
  element.weightBox.setAttribute("y", labelY - 15);
  element.weight.setAttribute("x", labelX);
  element.weight.setAttribute("y", labelY);
  element.weight.textContent = edge.weight.toFixed(1);
}

function relayoutAllEdgeLabels() {
  graph.edges.forEach((edge) => {
    updateEdgeGeometry(edge.id, { skipLabel: true });
  });

  const ordered = [...graph.edges].sort((a, b) => {
    const da = nodePairDistance(a.u, a.v);
    const db = nodePairDistance(b.u, b.v);
    return db - da;
  });
  const positions = new Map();

  function placePass() {
    ordered.forEach((edge) => {
      const avoid = [];
      positions.forEach((pos, id) => {
        if (id !== edge.id) avoid.push(pos);
      });
      const pos = chooseEdgeLabelPosition(edge, avoid);
      positions.set(edge.id, pos);
      applyEdgeLabelPosition(edge.id, pos.x, pos.y);
    });
  }

  // Multiple passes so labels can slide away from each other and other edges.
  placePass();
  placePass();
  placePass();
}

function updateIncidentEdges(nodeId) {
  graph.edges
    .filter((edge) => edge.u === nodeId || edge.v === nodeId)
    .forEach((edge) => updateEdgeGeometry(edge.id, { skipLabel: true }));
  relayoutAllEdgeLabels();
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

function rebuildCandidateEdges() {
  run.candidateEdgeIds.clear();
  if (!run.active && !run.finished) return;

  run.inHeap.forEach((nodeId) => {
    const cost = run.cost.get(nodeId);
    const prevId = run.prev.get(nodeId);
    if (prevId == null || cost === undefined || cost === Infinity) return;
    const edge = findEdgeBetween(prevId, nodeId);
    if (edge) run.candidateEdgeIds.add(edge.id);
  });
}

function syncEdgeClasses() {
  rebuildCandidateEdges();
  graph.edges.forEach((edge) => {
    const element = edgeElements.get(edge.id);
    if (!element) return;
    element.group.classList.toggle("is-mst-edge", run.mstEdgeIds.has(edge.id));
    element.group.classList.toggle(
      "is-considering",
      run.consideringEdgeId === edge.id || run.candidateEdgeIds.has(edge.id)
    );
  });
}

/* =========================================================
   Binary min-heap keyed by cost(u), with decrease-key
   ========================================================= */

function heapCost(nodeId) {
  const value = run.cost.get(nodeId);
  return value === undefined ? Infinity : value;
}

function heapSwap(i, j) {
  const a = run.heap[i];
  const b = run.heap[j];
  run.heap[i] = b;
  run.heap[j] = a;
  run.heapPos.set(a, j);
  run.heapPos.set(b, i);
}

function heapBubbleUp(index) {
  let i = index;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (heapCost(run.heap[i]) >= heapCost(run.heap[parent])) break;
    heapSwap(i, parent);
    i = parent;
  }
}

function heapBubbleDown(index) {
  let i = index;
  const n = run.heap.length;
  while (true) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let smallest = i;
    if (left < n && heapCost(run.heap[left]) < heapCost(run.heap[smallest])) {
      smallest = left;
    }
    if (right < n && heapCost(run.heap[right]) < heapCost(run.heap[smallest])) {
      smallest = right;
    }
    if (smallest === i) break;
    heapSwap(i, smallest);
    i = smallest;
  }
}

function heapInsert(nodeId) {
  run.heap.push(nodeId);
  run.heapPos.set(nodeId, run.heap.length - 1);
  run.inHeap.add(nodeId);
  heapBubbleUp(run.heap.length - 1);
}

function heapDeleteMin() {
  if (run.heap.length === 0) return null;
  const minId = run.heap[0];
  const last = run.heap.pop();
  run.heapPos.delete(minId);
  run.inHeap.delete(minId);
  if (run.heap.length > 0 && last !== minId) {
    run.heap[0] = last;
    run.heapPos.set(last, 0);
    heapBubbleDown(0);
  }
  return minId;
}

function heapDecreaseKey(nodeId) {
  const index = run.heapPos.get(nodeId);
  if (index === undefined) return;
  heapBubbleUp(index);
}

function getNeighbors(nodeId) {
  const result = [];
  graph.edges.forEach((edge) => {
    if (edge.u === nodeId) result.push({ neighborId: edge.v, edge });
    else if (edge.v === nodeId) result.push({ neighborId: edge.u, edge });
  });
  return result;
}

function renderPriorityQueue() {
  if (!priorityQueueElement) return;

  if (!run.active && !run.finished) {
    priorityQueueElement.innerHTML =
      '<div class="pq-placeholder">Run Prim to initialize the queue.</div>';
    return;
  }

  const queue = run.heap.map((id) => getNode(id)).filter(Boolean);
  priorityQueueElement.replaceChildren();

  if (queue.length === 0) {
    priorityQueueElement.innerHTML =
      '<div class="pq-placeholder">queue empty</div>';
    return;
  }

  const n = queue.length;
  const depth = Math.floor(Math.log2(n)) + 1;
  const nodeWidth = 84;
  const nodeHeight = 52;
  const levelGap = 78;
  const horizontalGap = 18;
  const leafCount = Math.pow(2, depth - 1);
  const treeWidth = Math.max(220, leafCount * (nodeWidth + horizontalGap));
  const treeHeight = depth * levelGap + 24;
  const positions = new Array(n);

  function place(index, left, right, level) {
    if (index >= n) return;
    const x = (left + right) / 2;
    const y = 18 + level * levelGap + nodeHeight / 2;
    positions[index] = { x, y };
    const mid = (left + right) / 2;
    place(2 * index + 1, left, mid, level + 1);
    place(2 * index + 2, mid, right, level + 1);
  }

  place(0, 0, treeWidth, 0);

  const heapSvg = document.createElementNS(SVG_NS, "svg");
  heapSvg.setAttribute("class", "pq-heap-svg");
  heapSvg.setAttribute("viewBox", `0 0 ${treeWidth} ${treeHeight}`);
  heapSvg.setAttribute("width", String(treeWidth));
  heapSvg.setAttribute("height", String(treeHeight));
  heapSvg.setAttribute("role", "img");
  heapSvg.setAttribute("aria-label", "Priority queue as a binary min-heap");

  const heapEdgeLayer = document.createElementNS(SVG_NS, "g");
  const heapNodeLayer = document.createElementNS(SVG_NS, "g");
  heapSvg.append(heapEdgeLayer, heapNodeLayer);

  for (let i = 1; i < n; i += 1) {
    const parent = Math.floor((i - 1) / 2);
    const from = positions[parent];
    const to = positions[i];
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "pq-heap-edge");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y + nodeHeight / 2 - 4));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y - nodeHeight / 2 + 4));
    heapEdgeLayer.appendChild(line);
  }

  queue.forEach((node, index) => {
    const { x, y } = positions[index];
    const isMin = index === 0;
    const cost = run.cost.get(node.id);
    const prevId = run.prev.get(node.id);
    const prevNode = prevId != null ? getNode(prevId) : null;
    const costText = formatCost(cost);
    const showEdge = Boolean(prevNode && cost !== Infinity);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute(
      "class",
      isMin ? "pq-heap-node is-min" : "pq-heap-node"
    );
    group.setAttribute("transform", `translate(${x} ${y})`);

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("class", "pq-heap-rect");
    rect.setAttribute("x", String(-nodeWidth / 2));
    rect.setAttribute("y", String(-nodeHeight / 2));
    rect.setAttribute("width", String(nodeWidth));
    rect.setAttribute("height", String(nodeHeight));
    rect.setAttribute("rx", "7");

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "pq-heap-label");
    label.setAttribute("y", "-8");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");

    if (showEdge) {
      const from = document.createElementNS(SVG_NS, "tspan");
      from.textContent = node.label;
      const arrow = document.createElementNS(SVG_NS, "tspan");
      arrow.setAttribute("class", "pq-heap-arrow");
      arrow.textContent = " → ";
      const to = document.createElementNS(SVG_NS, "tspan");
      to.textContent = prevNode.label;
      label.append(from, arrow, to);
    } else {
      label.textContent = node.label;
    }

    const distance = document.createElementNS(SVG_NS, "text");
    distance.setAttribute("class", "pq-heap-distance");
    distance.setAttribute("y", "12");
    distance.setAttribute("text-anchor", "middle");
    distance.setAttribute("dominant-baseline", "middle");
    distance.textContent = costText;

    group.append(rect, label, distance);
    heapNodeLayer.appendChild(group);
  });

  const scroll = document.createElement("div");
  scroll.className = "pq-heap-scroll";
  scroll.appendChild(heapSvg);
  priorityQueueElement.appendChild(scroll);
}

function refreshPrimVisuals() {
  syncNodeClasses();
  syncEdgeClasses();
  renderPriorityQueue();
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
  if (pauseButton) pauseButton.disabled = !primPlaying || primPaused;
  if (resumeButton) resumeButton.disabled = !primPlaying || !primPaused;
  if (runButton) runButton.disabled = primPlaying;
}

function pausePrim() {
  if (!primPlaying || primPaused) return;
  primPaused = true;
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "PAUSED";
}

function resumePrim() {
  if (!primPlaying || !primPaused) return;
  primPaused = false;
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "RUNNING";
}

function scrollRunViewport() {
  const anchor = runButton || document.querySelector(".graph-run-controls");
  if (!anchor) return;
  const top = anchor.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

async function relaxNeighbors(vId, token) {
  const vNode = getNode(vId);
  if (!vNode) return;

  for (const { neighborId, edge } of getNeighbors(vId)) {
    if (token !== runToken) return;
    if (run.inTree.has(neighborId)) continue;

    const zNode = getNode(neighborId);
    const oldCost = run.cost.get(neighborId);
    const weight = edge.weight;

    if (weight < oldCost) {
      run.cost.set(neighborId, weight);
      run.prev.set(neighborId, vId);
      const alreadyInHeap = run.inHeap.has(neighborId);
      if (alreadyInHeap) heapDecreaseKey(neighborId);
      else heapInsert(neighborId);

      run.consideringEdgeId = edge.id;
      refreshPrimVisuals();
      setPrimOperation(
        alreadyInHeap ? "DECREASEKEY" : "INSERT",
        `w(${vNode.label}, ${zNode.label}) = ${formatEdgeWeight(weight)}\n` +
          `cost(${zNode.label}): ${formatCost(oldCost)} → ${formatCost(weight)}\n` +
          `prev(${zNode.label}) = ${vNode.label}; ` +
          (alreadyInHeap
            ? `decreasekey(H, ${zNode.label})`
            : `insert ${zNode.label} into H`)
      );
      await wait(PRIM_TIMING.decrease);
      if (token !== runToken) return;
      run.consideringEdgeId = null;
      refreshPrimVisuals();
    }
  }
}

function resetExecution() {
  primPaused = false;
  primPlaying = false;
  runToken += 1;
  run = createEmptyRunState();
  setEditingEnabled(true);
  if (modeLabel) modeLabel.textContent = "READY";
  updatePlaybackControls();
  refreshPrimVisuals();
  setPrimOperation(
    "READY",
    "Build a connected weighted graph, then press RUN."
  );
}

async function runPrim() {
  if (!validateGraph()) {
    setPrimOperation(
      "NEED GRAPH",
      builderMessage
        ? builderMessage.textContent
        : "Build a connected graph before running Prim."
    );
    return;
  }

  runToken += 1;
  const token = runToken;
  run = createEmptyRunState();
  run.active = true;
  primPlaying = true;
  primPaused = false;
  setEditingEnabled(false);
  if (runButton) runButton.disabled = true;
  if (modeLabel) modeLabel.textContent = "RUNNING";
  updatePlaybackControls();

  scrollRunViewport();

  const startNode = graph.nodes[0];
  run.startId = startNode.id;

  for (const node of graph.nodes) {
    run.cost.set(node.id, Infinity);
    run.prev.set(node.id, null);
  }
  run.cost.set(startNode.id, 0);
  run.inTree.add(startNode.id);

  setPrimOperation(
    "INITIALIZE",
    `cost(u) = ∞, prev(u) = nil for all u\n` +
      `u₀ = ${startNode.label}, cost(${startNode.label}) = 0\n` +
      `${startNode.label} starts in the tree; H fills with cut-edge candidates`
  );
  refreshPrimVisuals();
  await wait(PRIM_TIMING.init);
  if (token !== runToken) return;

  setPrimOperation(
    "SCAN NEIGHBORS",
    `for each edge (${startNode.label}, z) with z not yet in the tree`
  );
  refreshPrimVisuals();
  await wait(PRIM_TIMING.scan);
  if (token !== runToken) return;

  await relaxNeighbors(startNode.id, token);
  if (token !== runToken) return;

  while (run.heap.length > 0) {
    if (token !== runToken) return;

    const minNode = getNode(run.heap[0]);
    setPrimOperation(
      "HEAP MIN",
      `Highlight min of H → ${minNode.label}\n` +
        `cost(${minNode.label}) = ${formatCost(run.cost.get(minNode.id))}`
    );
    refreshPrimVisuals();
    await wait(PRIM_TIMING.deletemin);
    if (token !== runToken) return;

    const vId = heapDeleteMin();
    const vNode = getNode(vId);
    const prevId = run.prev.get(vId);
    run.inTree.add(vId);

    if (prevId != null) {
      const mstEdge = findEdgeBetween(prevId, vId);
      if (mstEdge) {
        run.consideringEdgeId = mstEdge.id;
        refreshPrimVisuals();
        setPrimOperation(
          "ACCEPT EDGE",
          `deletemin() → ${vNode.label}\n` +
            `Add {${getNode(prevId).label}, ${vNode.label}} to MST` +
            ` (w = ${formatEdgeWeight(mstEdge.weight)})`
        );
        await wait(PRIM_TIMING.accept);
        if (token !== runToken) return;

        run.mstEdgeIds.add(mstEdge.id);
        run.consideringEdgeId = null;
      }
    }

    refreshPrimVisuals();
    await wait(PRIM_TIMING.between);
    if (token !== runToken) return;

    const vLabel = vNode.label;
    setPrimOperation(
      "SCAN NEIGHBORS",
      `for each edge (${vLabel}, z) with z not yet in the tree`
    );
    refreshPrimVisuals();
    await wait(PRIM_TIMING.scan);
    if (token !== runToken) return;

    await relaxNeighbors(vId, token);
    if (token !== runToken) return;

    await wait(PRIM_TIMING.between);
  }

  if (token !== runToken) return;

  run.consideringEdgeId = null;
  run.active = false;
  run.finished = true;
  primPlaying = false;
  primPaused = false;
  refreshPrimVisuals();
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "DONE";
  if (runButton) runButton.disabled = false;

  const totalWeight = [...run.mstEdgeIds].reduce((sum, id) => {
    const edge = getEdge(id);
    return sum + (edge ? edge.weight : 0);
  }, 0);

  setPrimOperation(
    "COMPLETE",
    `MST has ${run.mstEdgeIds.size} edges.\n` +
      `Total weight = ${formatEdgeWeight(totalWeight)}`
  );
  await wait(PRIM_TIMING.finish);
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

function placeRandomGraphNodes(n, bounds) {
  const { minX, maxX, minY, maxY } = bounds;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const minDist = Math.max(100, Math.min(155, (width + height) / (n * 1.15)));
  const placed = [];

  for (let i = 0; i < n; i += 1) {
    let best = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 70; attempt += 1) {
      const candidate = {
        x: minX + Math.random() * width,
        y: minY + Math.random() * height
      };
      let nearest = Infinity;
      for (const point of placed) {
        nearest = Math.min(
          nearest,
          Math.hypot(candidate.x - point.x, candidate.y - point.y)
        );
      }
      const distCenter = Math.hypot(candidate.x - cx, candidate.y - cy);
      const score =
        (placed.length === 0 ? distCenter : nearest) + distCenter * 0.2;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    placed.push(best);
  }

  for (let iter = 0; iter < 60; iter += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = placed[j].x - placed[i].x;
        const dy = placed[j].y - placed[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= minDist) continue;
        const push = ((minDist - dist) / dist) * 0.6;
        const ox = dx * push * 0.5;
        const oy = dy * push * 0.5;
        placed[i].x = Math.max(minX, Math.min(maxX, placed[i].x - ox));
        placed[i].y = Math.max(minY, Math.min(maxY, placed[i].y - oy));
        placed[j].x = Math.max(minX, Math.min(maxX, placed[j].x + ox));
        placed[j].y = Math.max(minY, Math.min(maxY, placed[j].y + oy));
      }
    }
  }

  return placed;
}

function nodePairDistance(idA, idB) {
  const nodeA = getNode(idA);
  const nodeB = getNode(idB);
  if (!nodeA || !nodeB) return 0;
  return Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
}

function edgesShareVertex(edgeA, edgeB) {
  return (
    edgeA.u === edgeB.u ||
    edgeA.u === edgeB.v ||
    edgeA.v === edgeB.u ||
    edgeA.v === edgeB.v
  );
}

function sharedVertexId(edgeA, edgeB) {
  if (edgeA.u === edgeB.u || edgeA.u === edgeB.v) return edgeA.u;
  if (edgeA.v === edgeB.u || edgeA.v === edgeB.v) return edgeA.v;
  return null;
}

function edgesVisuallyTooClose(edgeA, edgeB) {
  const a1 = getNode(edgeA.u);
  const a2 = getNode(edgeA.v);
  const b1 = getNode(edgeB.u);
  const b2 = getNode(edgeB.v);
  if (!a1 || !a2 || !b1 || !b2) return false;

  const shared = sharedVertexId(edgeA, edgeB);
  if (shared != null) {
    const otherA = edgeA.u === shared ? edgeA.v : edgeA.u;
    const otherB = edgeB.u === shared ? edgeB.v : edgeB.u;
    const s = getNode(shared);
    const p = getNode(otherA);
    const q = getNode(otherB);
    if (!s || !p || !q) return false;
    const v1x = p.x - s.x;
    const v1y = p.y - s.y;
    const v2x = q.x - s.x;
    const v2y = q.y - s.y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const cos = (v1x * v2x + v1y * v2y) / (l1 * l2);
    // Same hub, nearly the same direction → looks like overlapping parallel edges.
    if (cos >= 0.88) return true;
    const spokeSep = Math.min(
      distPointToSegment(p.x, p.y, s.x, s.y, q.x, q.y),
      distPointToSegment(q.x, q.y, s.x, s.y, p.x, p.y)
    );
    if (cos >= 0.72 && spokeSep < 20) return true;
    return false;
  }

  // Disjoint endpoints: parallel is fine; only reject near-coincident overlap.
  const sep = Math.min(
    distPointToSegment(a1.x, a1.y, b1.x, b1.y, b2.x, b2.y),
    distPointToSegment(a2.x, a2.y, b1.x, b1.y, b2.x, b2.y),
    distPointToSegment(b1.x, b1.y, a1.x, a1.y, a2.x, a2.y),
    distPointToSegment(b2.x, b2.y, a1.x, a1.y, a2.x, a2.y)
  );
  return sep < 14;
}

function pairClearance(nodeAId, nodeBId) {
  const probe = { id: "__probe__", u: nodeAId, v: nodeBId };
  let clearance = Infinity;
  graph.edges.forEach((edge) => {
    if (edgesShareVertex(probe, edge)) return;
    const a1 = getNode(probe.u);
    const a2 = getNode(probe.v);
    const b1 = getNode(edge.u);
    const b2 = getNode(edge.v);
    if (!a1 || !a2 || !b1 || !b2) return;
    const sep = Math.min(
      distPointToSegment(a1.x, a1.y, b1.x, b1.y, b2.x, b2.y),
      distPointToSegment(a2.x, a2.y, b1.x, b1.y, b2.x, b2.y),
      distPointToSegment(b1.x, b1.y, a1.x, a1.y, a2.x, a2.y),
      distPointToSegment(b2.x, b2.y, a1.x, a1.y, a2.x, a2.y)
    );
    clearance = Math.min(clearance, sep);
  });
  return clearance === Infinity ? 1000 : clearance;
}

function pairWouldBeTooClose(nodeAId, nodeBId) {
  const probe = { id: "__probe__", u: nodeAId, v: nodeBId };
  return graph.edges.some((edge) => edgesVisuallyTooClose(probe, edge));
}

function edgeExistsBetween(nodeAId, nodeBId) {
  return graph.edges.some(
    (edge) =>
      (edge.u === nodeAId && edge.v === nodeBId) ||
      (edge.u === nodeBId && edge.v === nodeAId)
  );
}

function isBridgeEdge(edgeId) {
  const edge = getEdge(edgeId);
  if (!edge) return true;
  const kept = graph.edges.filter((item) => item.id !== edgeId);
  const saved = graph.edges;
  graph.edges = kept;
  const connected = isUndirectedGraphConnected();
  graph.edges = saved;
  return !connected;
}

function countCloseConflicts(edge) {
  let count = 0;
  graph.edges.forEach((other) => {
    if (other.id === edge.id) return;
    if (edgesVisuallyTooClose(edge, other)) count += 1;
  });
  return count;
}

function repairCrowdedEdges() {
  let guard = 0;
  while (guard < 80) {
    guard += 1;
    let conflict = null;
    for (let i = 0; i < graph.edges.length && !conflict; i += 1) {
      for (let j = i + 1; j < graph.edges.length; j += 1) {
        if (edgesVisuallyTooClose(graph.edges[i], graph.edges[j])) {
          conflict = [graph.edges[i], graph.edges[j]];
          break;
        }
      }
    }
    if (!conflict) break;

    const [edgeA, edgeB] = conflict;
    const scoreA =
      countCloseConflicts(edgeA) * 10 - nodePairDistance(edgeA.u, edgeA.v) * 0.01;
    const scoreB =
      countCloseConflicts(edgeB) * 10 - nodePairDistance(edgeB.u, edgeB.v) * 0.01;
    const ordered = scoreA >= scoreB ? [edgeA, edgeB] : [edgeB, edgeA];

    let removed = null;
    for (const edge of ordered) {
      if (!isBridgeEdge(edge.id)) {
        removed = edge;
        break;
      }
    }
    if (!removed) {
      // Both are bridges: drop one and reconnect with a clear detour if possible.
      removed = ordered[0];
      deleteEdge(removed.id);
      const options = [];
      for (let i = 0; i < graph.nodes.length; i += 1) {
        for (let j = i + 1; j < graph.nodes.length; j += 1) {
          const a = graph.nodes[i].id;
          const b = graph.nodes[j].id;
          if (edgeExistsBetween(a, b)) continue;
          if (nodePairDistance(a, b) < 140) continue;
          if (pairWouldBeTooClose(a, b)) continue;
          options.push([a, b, pairClearance(a, b)]);
        }
      }
      options.sort((p, q) => q[2] - p[2]);
      let reconnected = false;
      for (const [a, b] of options) {
        addEdge(a, b);
        if (isUndirectedGraphConnected()) {
          reconnected = true;
          break;
        }
        // undo last add
        const last = graph.edges[graph.edges.length - 1];
        if (last) deleteEdge(last.id);
      }
      if (!reconnected) {
        // restore removed bridge if we failed
        addEdge(removed.u, removed.v);
        break;
      }
      continue;
    }

    deleteEdge(removed.id);

    const options = [];
    for (let i = 0; i < graph.nodes.length; i += 1) {
      for (let j = i + 1; j < graph.nodes.length; j += 1) {
        const a = graph.nodes[i].id;
        const b = graph.nodes[j].id;
        if (edgeExistsBetween(a, b)) continue;
        if (nodePairDistance(a, b) < 140) continue;
        if (pairWouldBeTooClose(a, b)) continue;
        options.push([a, b, pairClearance(a, b)]);
      }
    }
    options.sort((p, q) => q[2] - p[2] || nodePairDistance(q[0], q[1]) - nodePairDistance(p[0], p[1]));
    if (options.length > 0) {
      const top = options.slice(0, Math.min(8, options.length));
      const pick = top[Math.floor(Math.random() * top.length)];
      addEdge(pick[0], pick[1]);
    }
  }
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

  const bounds = { minX: 50, maxX: 950, minY: 40, maxY: 380 };
  placeRandomGraphNodes(n, bounds).forEach((point) => {
    addNode(point.x, point.y);
  });

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
  const maxExtra = Math.max(1, Math.floor(n * 0.7));
  const edgeTarget =
    minEdges + Math.floor(Math.random() * (maxExtra + 1));

  let edgeCount = 0;

  while (edgeCount < minEdges) {
    let best = null;
    let bestScore = -Infinity;
    for (const [a, b] of possible) {
      if (find(a) === find(b)) continue;
      const closePenalty = pairWouldBeTooClose(a, b) ? 5000 : 0;
      const clearance = pairClearance(a, b);
      const score = clearance * 4 + nodePairDistance(a, b) * 0.02 - closePenalty;
      if (score > bestScore) {
        bestScore = score;
        best = [a, b];
      }
    }
    if (!best) break;
    unite(best[0], best[1]);
    addEdge(best[0], best[1]);
    edgeCount += 1;
  }

  const leftover = [];
  for (const [a, b] of possible) {
    if (edgeExistsBetween(a, b)) continue;
    leftover.push([a, b]);
  }
  leftover.sort((pairA, pairB) => {
    const clearA = pairClearance(pairA[0], pairA[1]);
    const clearB = pairClearance(pairB[0], pairB[1]);
    if (clearA !== clearB) return clearB - clearA;
    return (
      nodePairDistance(pairB[0], pairB[1]) -
      nodePairDistance(pairA[0], pairA[1])
    );
  });
  const minExtraLength = 110;
  for (const [a, b] of leftover) {
    if (edgeCount >= edgeTarget) break;
    if (nodePairDistance(a, b) < minExtraLength) continue;
    if (pairWouldBeTooClose(a, b)) continue;
    if (pairClearance(a, b) < 48) continue;
    addEdge(a, b);
    edgeCount += 1;
  }

  repairCrowdedEdges();

  setTool("node");
  setEditingEnabled(true);
  setBuilderMessage(
    "Click anywhere on the canvas to create a vertex, or generate a random graph."
  );
  syncNodeClasses();
  syncEdgeClasses();
  relayoutAllEdgeLabels();
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
    if (primPlaying) return;
    await runPrim();
  });
}

if (pauseButton) pauseButton.addEventListener("click", pausePrim);
if (resumeButton) resumeButton.addEventListener("click", resumePrim);

updatePlaybackControls();
renderPriorityQueue();
setTool("node");
