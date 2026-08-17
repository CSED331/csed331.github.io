/* =========================================================
   DIJKSTRA GRAPH LAB
   ========================================================= */

   const SVG_NS =
   "http://www.w3.org/2000/svg";
 
 
 const PIXELS_PER_UNIT = 70;
 
 const EPS = 1e-9;
 
 
 /* =========================================================
    ANIMATION SPEED
    ========================================================= */
 
 const DIJKSTRA_TIMING = {
 
   select: 950,
 
   inspectEdge: 1150,
 
   update: 900,
 
   keep: 650,
 
   betweenEdges: 350,
 
   finish: 700
 
 };
 
 
 
 /* =========================================================
    DOM
    ========================================================= */
 
 const svg =
   document.getElementById(
     "graph-canvas"
   );
 
 
 const edgeLayer =
   document.getElementById(
     "graph-edge-layer"
   );
 
 
 const nodeLayer =
   document.getElementById(
     "graph-node-layer"
   );
 
 
 const builderMessage =
   document.getElementById(
     "graph-builder-message"
   );
 
 
 const lockLabel =
   document.getElementById(
     "graph-lock-label"
   );
 
 
 const priorityQueueElement =
   document.getElementById(
     "priority-queue"
   );
 
 
 const operationTitle =
   document.getElementById(
     "current-operation-title"
   );
 
 
 const operationDetail =
   document.getElementById(
     "current-operation-detail"
   );
 
 
 const feedbackElement =
   document.getElementById(
     "dijkstra-feedback"
   );
 
 
 const decisionControls =
   document.getElementById(
     "relax-decision-controls"
   );
 
 
 const updateButton =
   document.getElementById(
     "relax-update-button"
   );
 
 
 const keepButton =
   document.getElementById(
     "relax-keep-button"
   );
 
 
 const logElement =
   document.getElementById(
     "dijkstra-log"
   );
 
 
 const autoButton =
   document.getElementById(
     "auto-dijkstra-button"
   );
 
 
 const interactiveButton =
   document.getElementById(
     "interactive-dijkstra-button"
   );
 
 
 const resetRunButton =
   document.getElementById(
     "reset-dijkstra-button"
   );
 
 
 const clearGraphButton =
   document.getElementById(
     "clear-graph-button"
   );
 
 
 const modeLabel =
   document.getElementById(
     "dijkstra-mode-label"
   );
 
 
 
 /* =========================================================
    GRAPH STATE
    ========================================================= */
 
 const graph = {
 
   nodes: [],
 
   edges: [],
 
   sourceId: null,
 
   nextNodeId: 0,
 
   nextEdgeId: 0
 
 };
 
 
 
 /* =========================================================
    SVG ELEMENT MAP
    ========================================================= */
 
 const nodeElements =
   new Map();
 
 
 const edgeElements =
   new Map();
 
 
 
 /* =========================================================
    EDIT STATE
    ========================================================= */
 
 let currentTool =
   "node";
 
 
 let edgeStartNodeId =
   null;
 
 
 let draggingNodeId =
   null;
 
 
 
 /* =========================================================
    DIJKSTRA STATE
    ========================================================= */
 
 function createEmptyRunState() {
 
   return {
 
     mode: null,
 
     active: false,
 
     finished: false,
 
     stage: "idle",
 
     dist: new Map(),
 
     prev: new Map(),
 
     finalized: new Set(),
 
     currentNodeId: null,
 
     currentEdgeId: null,
 
     relaxTargetId: null,
 
     currentRelaxation: null,
 
     neighborQueue: [],
 
     neighborIndex: 0,
 
     treeEdgeIds: new Set(),
 
     pathEdgeIds: new Set(),
 
     targetId: null
 
   };
 
 }
 
 
 let run =
   createEmptyRunState();
 
 
 let runToken = 0;
 
 
 
 /* =========================================================
    CLOCK
    ========================================================= */
 
 function updateClock() {
 
   const clock =
     document.getElementById(
       "system-clock"
     );
 
 
   if (!clock) return;
 
 
   const now =
     new Date();
 
 
   clock.textContent =
     now.toLocaleString(
       "ko-KR",
       {
         month: "2-digit",
         day: "2-digit",
 
         hour: "2-digit",
         minute: "2-digit",
         second: "2-digit",
 
         hour12: false
       }
     );
 
 }
 
 
 updateClock();
 
 
 window.setInterval(
   updateClock,
   1000
 );
 
 
 
 /* =========================================================
    UTILITIES
    ========================================================= */
 
 function wait(ms) {
 
   return new Promise(
     resolve => {
 
       window.setTimeout(
         resolve,
         ms
       );
 
     }
   );
 
 }
 
 
 function round1(value) {
 
   return (
     Math.round(
       value * 10
     ) / 10
   );
 
 }
 
 
 function formatDistance(value) {
 
   if (
     value === undefined ||
     value === Infinity
   ) {
 
     return "∞";
 
   }
 
 
   return value.toFixed(1);
 
 }
 
 
 function getNode(nodeId) {
 
   return graph.nodes.find(
     node =>
       node.id === nodeId
   );
 
 }
 
 
 function getEdge(edgeId) {
 
   return graph.edges.find(
     edge =>
       edge.id === edgeId
   );
 
 }
 
 
 function nodeLabel(index) {
 
   let value =
     index + 1;
 
 
   let label = "";
 
 
   while (
     value > 0
   ) {
 
     value -= 1;
 
 
     label =
       String.fromCharCode(
         65 + (value % 26)
       ) + label;
 
 
     value =
       Math.floor(
         value / 26
       );
 
   }
 
 
   return label;
 }
 
 
 function svgPoint(event) {
 
   const point =
     svg.createSVGPoint();
 
 
   point.x =
     event.clientX;
 
 
   point.y =
     event.clientY;
 
 
   const matrix =
     svg
       .getScreenCTM()
       .inverse();
 
 
   return point.matrixTransform(
     matrix
   );
 
 }
 
 
 function isGraphLocked() {
 
   return (
     run.active ||
     run.finished
   );
 
 }
 
 
 
 /* =========================================================
    GRAPH MESSAGE
    ========================================================= */
 
 function setBuilderMessage(text) {
 
   if (
     builderMessage
   ) {
 
     builderMessage.textContent =
       text;
 
   }
 
 }
 
 
 
 /* =========================================================
    TOOL SELECTION
    ========================================================= */
 
 function setTool(tool) {
 
   if (
     isGraphLocked()
   ) {
     return;
   }
 
 
   currentTool =
     tool;
 
 
   edgeStartNodeId =
     null;
 
 
   document
     .querySelectorAll(
       ".graph-edit-tool"
     )
     .forEach(
       button => {
 
         button.classList.toggle(
           "is-active",
           button.dataset.tool === tool
         );
 
       }
     );
 
 
   if (
     tool === "node"
   ) {
 
     setBuilderMessage(
       "Click anywhere on the canvas to create a vertex."
     );
 
   }
 
 
   else if (
     tool === "edge"
   ) {
 
     setBuilderMessage(
       "Select two vertices to create an edge."
     );
 
   }
 
 
   else if (
     tool === "source"
   ) {
 
     setBuilderMessage(
       "Select the source vertex."
     );
 
   }
 
 
   else if (
     tool === "move"
   ) {
 
     setBuilderMessage(
       "Drag a vertex to move it. Edge weights update automatically."
     );
 
   }
 
 
   else if (
     tool === "delete"
   ) {
 
     setBuilderMessage(
       "Click a vertex or edge to delete it."
     );
 
   }
 
 
   syncNodeClasses();
 
 }
 
 
 
 /* =========================================================
    GRAPH EDITING ENABLE / DISABLE
    ========================================================= */
 
 function setEditingEnabled(enabled) {
 
   document
     .querySelectorAll(
       ".graph-edit-tool"
     )
     .forEach(
       button => {
 
         button.disabled =
           !enabled;
 
       }
     );
 
 
   if (
     clearGraphButton
   ) {
 
     clearGraphButton.disabled =
       !enabled;
 
   }
 
 
   if (
     lockLabel
   ) {
 
     lockLabel.textContent =
       enabled
         ? "EDIT MODE"
         : "GRAPH LOCKED";
 
   }
 
 }
 
 
 
 /* =========================================================
    ADD NODE
    ========================================================= */
 
 function addNode(x, y) {
 
   if (
     graph.nodes.length >= 20
   ) {
 
     setBuilderMessage(
       "Maximum 20 vertices are supported."
     );
 
     return;
 
   }
 
 
   const node = {
 
     id:
       `v${graph.nextNodeId}`,
 
     label:
       nodeLabel(
         graph.nextNodeId
       ),
 
     x:
       Math.max(
         40,
         Math.min(
           960,
           x
         )
       ),
 
     y:
       Math.max(
         50,
         Math.min(
           550,
           y
         )
       )
 
   };
 
 
   graph.nextNodeId += 1;
 
 
   graph.nodes.push(
     node
   );
 
 
   createNodeElement(
     node
   );
 
 
   syncNodeClasses();
 
 }
 
 
 
 /* =========================================================
    CREATE NODE SVG
    ========================================================= */
 
 function createNodeElement(node) {
 
   const group =
     document.createElementNS(
       SVG_NS,
       "g"
     );
 
 
   group.classList.add(
     "graph-node"
   );
 
 
   group.dataset.nodeId =
     node.id;
 
 
   /* circle */
 
   const circle =
     document.createElementNS(
       SVG_NS,
       "circle"
     );
 
 
   circle.setAttribute(
     "r",
     "27"
   );
 
 
   circle.classList.add(
     "graph-node-circle"
   );
 
 
   /* label */
 
   const label =
     document.createElementNS(
       SVG_NS,
       "text"
     );
 
 
   label.classList.add(
     "graph-node-label"
   );
 
 
   label.textContent =
     node.label;
 
 
   label.setAttribute(
     "text-anchor",
     "middle"
   );
 
 
   label.setAttribute(
     "dy",
     "5"
   );
 
 
   /* dist */
 
   const dist =
     document.createElementNS(
       SVG_NS,
       "text"
     );
 
 
   dist.classList.add(
     "graph-node-distance"
   );
 
 
   dist.setAttribute(
     "text-anchor",
     "middle"
   );
 
 
   dist.setAttribute(
     "y",
     "43"
   );
 
 
   group.append(
     circle,
     label,
     dist
   );
 
 
   nodeLayer.appendChild(
     group
   );
 
 
   nodeElements.set(
     node.id,
     {
       group,
       circle,
       label,
       dist
     }
   );
 
 
   updateNodePosition(
     node.id
   );
 
 
   /* =====================================================
      POINTER DOWN — MOVE
      ===================================================== */
 
   group.addEventListener(
     "pointerdown",
     event => {
 
       if (
         run.active ||
         run.finished
       ) {
         return;
       }
 
 
       if (
         currentTool !== "move"
       ) {
         return;
       }
 
 
       event.preventDefault();
       event.stopPropagation();
 
 
       draggingNodeId =
         node.id;
 
 
       svg.setPointerCapture(
         event.pointerId
       );
 
     }
   );
 
 
   /* =====================================================
      CLICK
      ===================================================== */
 
   group.addEventListener(
     "click",
     event => {
 
       event.stopPropagation();
 
 
       handleNodeClick(
         node.id
       );
 
     }
   );
 
 }
 
 
 
 /* =========================================================
    UPDATE NODE POSITION
    ========================================================= */
 
 function updateNodePosition(nodeId) {
 
   const node =
     getNode(
       nodeId
     );
 
 
   const element =
     nodeElements.get(
       nodeId
     );
 
 
   if (
     !node ||
     !element
   ) {
     return;
   }
 
 
   element.group.setAttribute(
     "transform",
     `translate(${node.x} ${node.y})`
   );
 
 }
 
 
 
 /* =========================================================
    EDGE WEIGHT
    ========================================================= */
 
 function calculateEdgeWeight(
   nodeA,
   nodeB
 ) {
 
   const pixelDistance =
     Math.hypot(
       nodeB.x - nodeA.x,
       nodeB.y - nodeA.y
     );
 
 
   return Math.max(
     0.1,
     round1(
       pixelDistance /
       PIXELS_PER_UNIT
     )
   );
 
 }
 
 
 
 /* =========================================================
    ADD EDGE
    ========================================================= */
 
 function addEdge(
   nodeAId,
   nodeBId
 ) {
 
   if (
     nodeAId === nodeBId
   ) {
 
     setBuilderMessage(
       "A self-loop is not used in this lab."
     );
 
     return;
 
   }
 
 
   const duplicate =
     graph.edges.some(
       edge => {
 
         return (
           (
             edge.u === nodeAId &&
             edge.v === nodeBId
           )
           ||
           (
             edge.u === nodeBId &&
             edge.v === nodeAId
           )
         );
 
       }
     );
 
 
   if (
     duplicate
   ) {
 
     setBuilderMessage(
       "That edge already exists."
     );
 
     return;
 
   }
 
 
   const nodeA =
     getNode(
       nodeAId
     );
 
 
   const nodeB =
     getNode(
       nodeBId
     );
 
 
   if (
     !nodeA ||
     !nodeB
   ) {
     return;
   }
 
 
   const edge = {
 
     id:
       `e${graph.nextEdgeId}`,
 
     u:
       nodeAId,
 
     v:
       nodeBId,
 
     weight:
       calculateEdgeWeight(
         nodeA,
         nodeB
       )
 
   };
 
 
   graph.nextEdgeId += 1;
 
 
   graph.edges.push(
     edge
   );
 
 
   createEdgeElement(
     edge
   );
 
 
   syncEdgeClasses();
 
 }
 
 
 
 /* =========================================================
    CREATE EDGE SVG
    ========================================================= */
 
 function createEdgeElement(edge) {
 
   const group =
     document.createElementNS(
       SVG_NS,
       "g"
     );
 
 
   group.classList.add(
     "graph-edge"
   );
 
 
   group.dataset.edgeId =
     edge.id;
 
 
   /* invisible hit line */
 
   const hitLine =
     document.createElementNS(
       SVG_NS,
       "line"
     );
 
 
   hitLine.classList.add(
     "graph-edge-hit"
   );
 
 
   /* visible edge */
 
   const line =
     document.createElementNS(
       SVG_NS,
       "line"
     );
 
 
   line.classList.add(
     "graph-edge-line"
   );
 
 
   /* weight background */
 
   const weightBox =
     document.createElementNS(
       SVG_NS,
       "rect"
     );
 
 
   weightBox.classList.add(
     "graph-edge-weight-box"
   );
 
 
   weightBox.setAttribute(
     "width",
     "42"
   );
 
 
   weightBox.setAttribute(
     "height",
     "24"
   );
 
 
   weightBox.setAttribute(
     "rx",
     "5"
   );
 
 
   /* weight */
 
   const weight =
     document.createElementNS(
       SVG_NS,
       "text"
     );
 
 
   weight.classList.add(
     "graph-edge-weight"
   );
 
 
   weight.setAttribute(
     "text-anchor",
     "middle"
   );
 
 
   weight.setAttribute(
     "dy",
     "5"
   );
 
 
   group.append(
     hitLine,
     line,
     weightBox,
     weight
   );
 
 
   edgeLayer.appendChild(
     group
   );
 
 
   edgeElements.set(
     edge.id,
     {
       group,
       hitLine,
       line,
       weightBox,
       weight
     }
   );
 
 
   updateEdgeElement(
     edge.id
   );
 
 
   group.addEventListener(
     "click",
     event => {
 
       event.stopPropagation();
 
 
       if (
         isGraphLocked()
       ) {
         return;
       }
 
 
       if (
         currentTool === "delete"
       ) {
 
         deleteEdge(
           edge.id
         );
 
       }
 
     }
   );
 
 }
 
 
 
 /* =========================================================
    UPDATE EDGE SVG
    ========================================================= */
 
 function updateEdgeElement(edgeId) {
 
   const edge =
     getEdge(
       edgeId
     );
 
 
   const element =
     edgeElements.get(
       edgeId
     );
 
 
   if (
     !edge ||
     !element
   ) {
     return;
   }
 
 
   const nodeA =
     getNode(
       edge.u
     );
 
 
   const nodeB =
     getNode(
       edge.v
     );
 
 
   if (
     !nodeA ||
     !nodeB
   ) {
     return;
   }
 
 
   edge.weight =
     calculateEdgeWeight(
       nodeA,
       nodeB
     );
 
 
   [
     element.hitLine,
     element.line
   ].forEach(
     line => {
 
       line.setAttribute(
         "x1",
         nodeA.x
       );
 
       line.setAttribute(
         "y1",
         nodeA.y
       );
 
       line.setAttribute(
         "x2",
         nodeB.x
       );
 
       line.setAttribute(
         "y2",
         nodeB.y
       );
 
     }
   );
 
 
   const midX =
     (
       nodeA.x +
       nodeB.x
     ) / 2;
 
 
   const midY =
     (
       nodeA.y +
       nodeB.y
     ) / 2;
 
 
   element.weightBox.setAttribute(
     "x",
     midX - 21
   );
 
 
   element.weightBox.setAttribute(
     "y",
     midY - 12
   );
 
 
   element.weight.setAttribute(
     "x",
     midX
   );
 
 
   element.weight.setAttribute(
     "y",
     midY
   );
 
 
   element.weight.textContent =
     edge.weight.toFixed(1);
 
 }
 
 
 
 /* =========================================================
    UPDATE INCIDENT EDGES
    ========================================================= */
 
 function updateIncidentEdges(
   nodeId
 ) {
 
   graph.edges
     .filter(
       edge =>
         edge.u === nodeId ||
         edge.v === nodeId
     )
     .forEach(
       edge =>
         updateEdgeElement(
           edge.id
         )
     );
 
 }
 
 
 
 /* =========================================================
    NODE CLICK
    ========================================================= */
 
 function handleNodeClick(nodeId) {
 
   /* -------------------------------------------------------
      Interactive Dijkstra
      ------------------------------------------------------- */
 
   if (
     run.active &&
     run.mode === "interactive" &&
     run.stage === "select"
   ) {
 
     handleInteractiveVertexChoice(
       nodeId
     );
 
     return;
 
   }
 
 
   /* -------------------------------------------------------
      Finished -> inspect shortest path
      ------------------------------------------------------- */
 
   if (
     run.finished
   ) {
 
     showShortestPathTo(
       nodeId
     );
 
     return;
 
   }
 
 
   if (
     run.active
   ) {
     return;
   }
 
 
   /* -------------------------------------------------------
      Add edge
      ------------------------------------------------------- */
 
   if (
     currentTool === "edge"
   ) {
 
     if (
       edgeStartNodeId === null
     ) {
 
       edgeStartNodeId =
         nodeId;
 
 
       setBuilderMessage(
         `First vertex selected: ${getNode(nodeId).label}. Select the second vertex.`
       );
 
 
       syncNodeClasses();
 
     }
 
     else {
 
       const first =
         edgeStartNodeId;
 
 
       edgeStartNodeId =
         null;
 
 
       addEdge(
         first,
         nodeId
       );
 
 
       setBuilderMessage(
         "Select two vertices to create another edge."
       );
 
 
       syncNodeClasses();
 
     }
 
 
     return;
 
   }
 
 
   /* -------------------------------------------------------
      Source
      ------------------------------------------------------- */
 
   if (
     currentTool === "source"
   ) {
 
     graph.sourceId =
       nodeId;
 
 
     setBuilderMessage(
       `Source vertex: ${getNode(nodeId).label}`
     );
 
 
     syncNodeClasses();
 
 
     return;
 
   }
 
 
   /* -------------------------------------------------------
      Delete
      ------------------------------------------------------- */
 
   if (
     currentTool === "delete"
   ) {
 
     deleteNode(
       nodeId
     );
 
   }
 
 }
 
 
 
 /* =========================================================
    DELETE EDGE
    ========================================================= */
 
 function deleteEdge(edgeId) {
 
   const element =
     edgeElements.get(
       edgeId
     );
 
 
   if (
     element
   ) {
 
     element.group.remove();
 
   }
 
 
   edgeElements.delete(
     edgeId
   );
 
 
   graph.edges =
     graph.edges.filter(
       edge =>
         edge.id !== edgeId
     );
 
 }
 
 
 
 /* =========================================================
    DELETE NODE
    ========================================================= */
 
 function deleteNode(nodeId) {
 
   const incident =
     graph.edges
       .filter(
         edge =>
           edge.u === nodeId ||
           edge.v === nodeId
       )
       .map(
         edge =>
           edge.id
       );
 
 
   incident.forEach(
     deleteEdge
   );
 
 
   const element =
     nodeElements.get(
       nodeId
     );
 
 
   if (
     element
   ) {
 
     element.group.remove();
 
   }
 
 
   nodeElements.delete(
     nodeId
   );
 
 
   graph.nodes =
     graph.nodes.filter(
       node =>
         node.id !== nodeId
     );
 
 
   if (
     graph.sourceId === nodeId
   ) {
 
     graph.sourceId =
       null;
 
   }
 
 
   syncNodeClasses();
 
 }
 
 
 
 /* =========================================================
    CLEAR GRAPH
    ========================================================= */
 
 function clearGraph() {
 
   if (
     isGraphLocked()
   ) {
     return;
   }
 
 
   graph.nodes = [];
   graph.edges = [];
 
   graph.sourceId = null;
 
   graph.nextNodeId = 0;
   graph.nextEdgeId = 0;
 
 
   nodeElements.clear();
   edgeElements.clear();
 
 
   nodeLayer.replaceChildren();
   edgeLayer.replaceChildren();
 
 
   edgeStartNodeId =
     null;
 
 
   setBuilderMessage(
     "Click anywhere on the canvas to create a vertex."
   );
 
 }
 
 
 
 /* =========================================================
    SVG CANVAS CLICK -> ADD NODE
    ========================================================= */
 
 svg.addEventListener(
   "click",
   event => {
 
     if (
       isGraphLocked()
     ) {
       return;
     }
 
 
     if (
       currentTool !== "node"
     ) {
       return;
     }
 
 
     const point =
       svgPoint(
         event
       );
 
 
     addNode(
       point.x,
       point.y
     );
 
   }
 );
 
 
 
 /* =========================================================
    NODE DRAGGING
    ========================================================= */
 
 svg.addEventListener(
   "pointermove",
   event => {
 
     if (
       draggingNodeId === null
     ) {
       return;
     }
 
 
     const node =
       getNode(
         draggingNodeId
       );
 
 
     if (!node) return;
 
 
     const point =
       svgPoint(
         event
       );
 
 
     node.x =
       Math.max(
         40,
         Math.min(
           960,
           point.x
         )
       );
 
 
     node.y =
       Math.max(
         50,
         Math.min(
           550,
           point.y
         )
       );
 
 
     updateNodePosition(
       node.id
     );
 
 
     updateIncidentEdges(
       node.id
     );
 
   }
 );
 
 
 svg.addEventListener(
   "pointerup",
   event => {
 
     draggingNodeId =
       null;
 
 
     if (
       svg.hasPointerCapture(
         event.pointerId
       )
     ) {
 
       svg.releasePointerCapture(
         event.pointerId
       );
 
     }
 
   }
 );
 
 
 
 /* =========================================================
    NODE VISUAL STATE
    ========================================================= */
 
 function syncNodeClasses() {
 
   graph.nodes.forEach(
     node => {
 
       const element =
         nodeElements.get(
           node.id
         );
 
 
       if (!element) return;
 
 
       const group =
         element.group;
 
 
       group.classList.toggle(
         "is-source",
         graph.sourceId === node.id
       );
 
 
       group.classList.toggle(
         "is-edge-start",
         edgeStartNodeId === node.id
       );
 
 
       group.classList.toggle(
         "is-finalized",
         run.finalized.has(
           node.id
         )
       );
 
 
       group.classList.toggle(
         "is-current",
         run.currentNodeId === node.id
       );
 
 
       group.classList.toggle(
         "is-relax-target",
         run.relaxTargetId === node.id
       );
 
 
       group.classList.toggle(
         "is-target",
         run.targetId === node.id
       );
 
 
       const distance =
         run.dist.get(
           node.id
         );
 
 
       const isExecutionVisible =
         (
           run.active ||
           run.finished
         );
 
 
       if (
         isExecutionVisible
       ) {
 
         element.dist.textContent =
           `d=${formatDistance(distance)}`;
 
       }
 
       else if (
         graph.sourceId === node.id
       ) {
 
         element.dist.textContent =
           "SOURCE";
 
       }
 
       else {
 
         element.dist.textContent =
           "";
 
       }
 
 
       const frontier =
         isExecutionVisible &&
         !run.finalized.has(
           node.id
         ) &&
         distance !== Infinity;
 
 
       group.classList.toggle(
         "is-frontier",
         frontier
       );
 
     }
   );
 
 }
 
 
 
 /* =========================================================
    EDGE VISUAL STATE
    ========================================================= */
 
 function syncEdgeClasses() {
 
   graph.edges.forEach(
     edge => {
 
       const element =
         edgeElements.get(
           edge.id
         );
 
 
       if (!element) return;
 
 
       element.group.classList.toggle(
         "is-relaxing",
         run.currentEdgeId === edge.id
       );
 
 
       element.group.classList.toggle(
         "is-tree-edge",
         run.treeEdgeIds.has(
           edge.id
         )
       );
 
 
       element.group.classList.toggle(
         "is-path-edge",
         run.pathEdgeIds.has(
           edge.id
         )
       );
 
     }
   );
 
 }
 
 
 
 /* =========================================================
    PRIORITY QUEUE
    ========================================================= */
 
 function getQueueNodes() {
 
   return graph.nodes
     .filter(
       node =>
         !run.finalized.has(
           node.id
         )
     )
     .sort(
       (a, b) => {
 
         const da =
           run.dist.get(
             a.id
           );
 
 
         const db =
           run.dist.get(
             b.id
           );
 
 
         if (
           da === db
         ) {
 
           return a.label.localeCompare(
             b.label
           );
 
         }
 
 
         if (
           da === Infinity
         ) {
           return 1;
         }
 
 
         if (
           db === Infinity
         ) {
           return -1;
         }
 
 
         return da - db;
 
       }
     );
 
 }
 
 
 function getMinimumCandidates() {
 
   const queue =
     getQueueNodes();
 
 
   if (
     queue.length === 0
   ) {
     return [];
   }
 
 
   const minimum =
     run.dist.get(
       queue[0].id
     );
 
 
   if (
     minimum === Infinity
   ) {
     return [];
   }
 
 
   return queue.filter(
     node => {
 
       return (
         Math.abs(
           run.dist.get(node.id) -
           minimum
         ) < EPS
       );
 
     }
   );
 
 }
 
 
 function renderPriorityQueue() {
 
   if (
     !run.active &&
     !run.finished
   ) {
 
     priorityQueueElement.innerHTML =
       `
       <div class="pq-placeholder">
         Run Dijkstra to initialize the queue.
       </div>
       `;
 
     return;
 
   }
 
 
   const queue =
     getQueueNodes();
 
 
   priorityQueueElement.replaceChildren();
 
 
   if (
     queue.length === 0
   ) {
 
     priorityQueueElement.innerHTML =
       `
       <div class="pq-placeholder">
         queue empty
       </div>
       `;
 
     return;
 
   }
 
 
   const minCandidates =
     new Set(
       getMinimumCandidates()
         .map(
           node =>
             node.id
         )
     );
 
 
   queue.forEach(
     node => {
 
       const entry =
         document.createElement(
           "button"
         );
 
 
       entry.type =
         "button";
 
 
       entry.className =
         "pq-entry";
 
 
       entry.dataset.nodeId =
         node.id;
 
 
       const name =
         document.createElement(
           "span"
         );
 
 
       name.className =
         "pq-node-name";
 
 
       name.textContent =
         node.label;
 
 
       const distance =
         document.createElement(
           "span"
         );
 
 
       distance.className =
         "pq-node-distance";
 
 
       distance.textContent =
         formatDistance(
           run.dist.get(
             node.id
           )
         );
 
 
       entry.append(
         name,
         distance
       );
 
 
       if (
         minCandidates.has(
           node.id
         )
       ) {
 
         entry.classList.add(
           "is-min"
         );
 
 
         const badge =
           document.createElement(
             "span"
           );
 
 
         badge.className =
           "pq-min-badge";
 
 
         badge.textContent =
           "MIN";
 
 
         entry.appendChild(
           badge
         );
 
       }
 
 
       entry.disabled =
         !(
           run.active &&
           run.mode === "interactive" &&
           run.stage === "select"
         );
 
 
       entry.addEventListener(
         "click",
         () => {
 
           handleInteractiveVertexChoice(
             node.id
           );
 
         }
       );
 
 
       priorityQueueElement.appendChild(
         entry
       );
 
     }
   );
 
 }
 
 
 
 /* =========================================================
    OPERATION
    ========================================================= */
 
 function setOperation(
   title,
   detail
 ) {
 
   operationTitle.textContent =
     title;
 
 
   operationDetail.textContent =
     detail;
 
 }
 
 
 function setFeedback(
   text = "",
   type = ""
 ) {
 
   feedbackElement.textContent =
     text;
 
 
   feedbackElement.className =
     "dijkstra-feedback";
 
 
   if (
     type
   ) {
 
     feedbackElement.classList.add(
       `is-${type}`
     );
 
   }
 
 }
 
 
 
 /* =========================================================
    RUN LOG
    ========================================================= */
 
 function clearLog() {
 
   logElement.replaceChildren();
 
 }
 
 
 function addLog(text) {
 
   const empty =
     logElement.querySelector(
       ".dijkstra-log-empty"
     );
 
 
   if (
     empty
   ) {
 
     empty.remove();
 
   }
 
 
   const line =
     document.createElement(
       "div"
     );
 
 
   line.className =
     "dijkstra-log-line";
 
 
   line.textContent =
     text;
 
 
   logElement.appendChild(
     line
   );
 
 
   logElement.scrollTop =
     logElement.scrollHeight;
 
 }
 
 
 
 /* =========================================================
    DECISION BUTTONS
    ========================================================= */
 
 function showDecisionControls(show) {
 
   decisionControls.classList.toggle(
     "is-hidden",
     !show
   );
 
 }
 
 
 
 /* =========================================================
    GRAPH VALIDATION
    ========================================================= */
 
 function validateGraph() {
 
   if (
     graph.nodes.length < 2
   ) {
 
     setBuilderMessage(
       "Create at least two vertices."
     );
 
     return false;
 
   }
 
 
   if (
     graph.edges.length === 0
   ) {
 
     setBuilderMessage(
       "Create at least one edge."
     );
 
     return false;
 
   }
 
 
   if (
     graph.sourceId === null
   ) {
 
     setBuilderMessage(
       "Choose a source vertex first."
     );
 
     return false;
 
   }
 
 
   return true;
 
 }
 
 
 
 /* =========================================================
    RESET EXECUTION STATE
    ========================================================= */
 
 function resetExecution() {
 
   runToken += 1;
 
 
   run =
     createEmptyRunState();
 
 
   setEditingEnabled(
     true
   );
 
 
   setOperation(
     "READY",
     "Build a graph and choose a source vertex."
   );
 
 
   setFeedback();
 
 
   showDecisionControls(
     false
   );
 
 
   modeLabel.textContent =
     "READY";
 
 
   clearLog();
 
 
   logElement.innerHTML =
     `
     <div class="dijkstra-log-empty">
       No operations yet.
     </div>
     `;
 
 
   resetRunButton.disabled =
     true;
 
 
   autoButton.disabled =
     false;
 
 
   interactiveButton.disabled =
     false;
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
   renderPriorityQueue();
 
 }
 
 
 
 /* =========================================================
    INITIALIZE DIJKSTRA
    ========================================================= */
 
 function initializeDijkstra(
   mode
 ) {
 
   runToken += 1;
 
 
   run =
     createEmptyRunState();
 
 
   run.mode =
     mode;
 
 
   run.active =
     true;
 
 
   run.stage =
     "select";
 
 
   graph.nodes.forEach(
     node => {
 
       run.dist.set(
         node.id,
         Infinity
       );
 
 
       run.prev.set(
         node.id,
         null
       );
 
     }
   );
 
 
   run.dist.set(
     graph.sourceId,
     0
   );
 
 
   setEditingEnabled(
     false
   );
 
 
   setBuilderMessage(
     "Graph locked during Dijkstra execution."
   );
 
 
   clearLog();
 
 
   addLog(
     `dist(${getNode(graph.sourceId).label}) = 0`
   );
 
 
   autoButton.disabled =
     true;
 
 
   interactiveButton.disabled =
     true;
 
 
   resetRunButton.disabled =
     false;
 
 
   modeLabel.textContent =
     mode === "auto"
       ? "AUTO RUN"
       : "INTERACTIVE";
 
 
   setFeedback();
 
 
   showDecisionControls(
     false
   );
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
   renderPriorityQueue();
 
 }
 
 
 
 /* =========================================================
    GET NEIGHBORS
    ========================================================= */
 
 function getNeighborEdges(
   nodeId
 ) {
 
   return graph.edges
     .filter(
       edge =>
         edge.u === nodeId ||
         edge.v === nodeId
     )
     .map(
       edge => {
 
         const neighborId =
           edge.u === nodeId
             ? edge.v
             : edge.u;
 
 
         return {
           edge,
           neighborId
         };
 
       }
     )
     .sort(
       (a, b) => {
 
         return getNode(
           a.neighborId
         ).label.localeCompare(
           getNode(
             b.neighborId
           ).label
         );
 
       }
     );
 
 }
 
 
 
 /* =========================================================
    FINALIZE VERTEX
    ========================================================= */
 
 function finalizeVertex(
   nodeId
 ) {
 
   const node =
     getNode(
       nodeId
     );
 
 
   run.finalized.add(
     nodeId
   );
 
 
   run.currentNodeId =
     nodeId;
 
 
   run.currentEdgeId =
     null;
 
 
   run.relaxTargetId =
     null;
 
 
   addLog(
     `deletemin() → ${node.label}    d=${formatDistance(run.dist.get(nodeId))}`
   );
 
 
   setOperation(
     `deletemin() → ${node.label}`,
     `dist(${node.label}) = ${formatDistance(run.dist.get(nodeId))}\n${node.label} is now finalized.`
   );
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
   renderPriorityQueue();
 
 }
 
 
 
 /* =========================================================
    APPLY RELAXATION
    ========================================================= */
 
 async function applyRelaxation(
   info,
   token
 ) {
 
   const {
     u,
     v,
     edge,
     candidate,
     oldDistance,
     shouldUpdate
   } =
     info;
 
 
   const uNode =
     getNode(
       u
     );
 
 
   const vNode =
     getNode(
       v
     );
 
 
   run.currentEdgeId =
     edge.id;
 
 
   run.relaxTargetId =
     v;
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
 
   const comparison =
     `${formatDistance(run.dist.get(u))} + ${edge.weight.toFixed(1)} = ${formatDistance(candidate)}`;
 
 
   setOperation(
     `relax(${uNode.label}, ${vNode.label})`,
     `current dist(${vNode.label}) = ${formatDistance(oldDistance)}\ncandidate = ${comparison}`
   );
 
 
   await wait(
     DIJKSTRA_TIMING.inspectEdge
   );
 
 
   if (
     token !== runToken
   ) {
     return;
   }
 
 
   if (
     shouldUpdate
   ) {
 
     run.dist.set(
       v,
       candidate
     );
 
 
     run.prev.set(
       v,
       u
     );
 
 
     addLog(
       `decreasekey(${vNode.label})    ${formatDistance(oldDistance)} → ${formatDistance(candidate)}`
     );
 
 
     setOperation(
       `decreasekey(${vNode.label})`,
       `dist(${vNode.label}): ${formatDistance(oldDistance)} → ${formatDistance(candidate)}\nprev(${vNode.label}) = ${uNode.label}`
     );
 
 
     syncNodeClasses();
 
     renderPriorityQueue();
 
 
     const nodeElement =
       nodeElements.get(
         v
       );
 
 
     if (
       nodeElement
     ) {
 
       nodeElement.dist.classList.add(
         "is-updated"
       );
 
 
       await wait(
         DIJKSTRA_TIMING.update
       );
 
 
       nodeElement.dist.classList.remove(
         "is-updated"
       );
 
     }
 
   }
 
   else {
 
     addLog(
       `keep dist(${vNode.label}) = ${formatDistance(oldDistance)}`
     );
 
 
     setOperation(
       `keep dist(${vNode.label})`,
       `${formatDistance(oldDistance)} ≤ ${formatDistance(candidate)}\nNo decreasekey is needed.`
     );
 
 
     await wait(
       DIJKSTRA_TIMING.keep
     );
 
   }
 
 
   run.currentEdgeId =
     null;
 
 
   run.relaxTargetId =
     null;
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
 }
 
 
 
 /* =========================================================
    AUTO DIJKSTRA
    ========================================================= */
 
 async function startAutoDijkstra() {
 
   if (
     !validateGraph()
   ) {
     return;
   }
 
 
   initializeDijkstra(
     "auto"
   );
 
 
   const token =
     runToken;
 
 
   while (
     token === runToken
   ) {
 
     const minimums =
       getMinimumCandidates();
 
 
     if (
       minimums.length === 0
     ) {
 
       await finishDijkstra(
         token
       );
 
       return;
 
     }
 
 
     /*
       Tie가 있으면 label 순으로 선택.
       둘 다 올바른 Dijkstra 선택이다.
     */
 
     const current =
       minimums[0];
 
 
     finalizeVertex(
       current.id
     );
 
 
     await wait(
       DIJKSTRA_TIMING.select
     );
 
 
     if (
       token !== runToken
     ) {
       return;
     }
 
 
     const neighbors =
       getNeighborEdges(
         current.id
       );
 
 
     for (
       const item
       of neighbors
     ) {
 
       if (
         token !== runToken
       ) {
         return;
       }
 
 
       const oldDistance =
         run.dist.get(
           item.neighborId
         );
 
 
       const candidate =
         round1(
           run.dist.get(
             current.id
           ) +
           item.edge.weight
         );
 
 
       const info = {
 
         u:
           current.id,
 
         v:
           item.neighborId,
 
         edge:
           item.edge,
 
         candidate,
 
         oldDistance,
 
         shouldUpdate:
           candidate <
           oldDistance - EPS
 
       };
 
 
       await applyRelaxation(
         info,
         token
       );
 
 
       await wait(
         DIJKSTRA_TIMING.betweenEdges
       );
 
     }
 
 
     run.currentNodeId =
       null;
 
 
     syncNodeClasses();
 
   }
 
 }
 
 
 
 /* =========================================================
    INTERACTIVE DIJKSTRA
    ========================================================= */
 
 function startInteractiveDijkstra() {
 
   if (
     !validateGraph()
   ) {
     return;
   }
 
 
   initializeDijkstra(
     "interactive"
   );
 
 
   beginInteractiveSelection();
 
 }
 
 
 
 /* =========================================================
    ASK FOR NEXT VERTEX
    ========================================================= */
 
 function beginInteractiveSelection() {
 
   const minimums =
     getMinimumCandidates();
 
 
   if (
     minimums.length === 0
   ) {
 
     finishDijkstra(
       runToken
     );
 
     return;
 
   }
 
 
   run.stage =
     "select";
 
 
   run.currentNodeId =
     null;
 
 
   run.currentEdgeId =
     null;
 
 
   run.relaxTargetId =
     null;
 
 
   run.currentRelaxation =
     null;
 
 
   showDecisionControls(
     false
   );
 
 
   setFeedback();
 
 
   setOperation(
     "YOUR TURN",
     "Which vertex should be returned by deletemin()?\nClick a vertex or a priority queue entry."
   );
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
   renderPriorityQueue();
 
 }
 
 
 
 /* =========================================================
    STUDENT SELECTS NEXT VERTEX
    ========================================================= */
 
 async function handleInteractiveVertexChoice(
   nodeId
 ) {
 
   if (
     !run.active ||
     run.mode !== "interactive" ||
     run.stage !== "select"
   ) {
     return;
   }
 
 
   if (
     run.finalized.has(
       nodeId
     )
   ) {
 
     setFeedback(
       "That vertex is already finalized.",
       "wrong"
     );
 
     return;
 
   }
 
 
   const minimums =
     getMinimumCandidates();
 
 
   const correct =
     minimums.some(
       node =>
         node.id === nodeId
     );
 
 
   if (
     !correct
   ) {
 
     setFeedback(
       "Not yet. There is a smaller tentative distance.",
       "wrong"
     );
 
     return;
 
   }
 
 
   setFeedback(
     "Correct.",
     "correct"
   );
 
 
   finalizeVertex(
     nodeId
   );
 
 
   await wait(
     650
   );
 
 
   if (
     !run.active
   ) {
     return;
   }
 
 
   run.neighborQueue =
     getNeighborEdges(
       nodeId
     );
 
 
   run.neighborIndex =
     0;
 
 
   presentNextInteractiveRelaxation();
 
 }
 
 
 
 /* =========================================================
    PRESENT NEXT EDGE
    ========================================================= */
 
 function presentNextInteractiveRelaxation() {
 
   if (
     run.neighborIndex >=
     run.neighborQueue.length
   ) {
 
     run.currentNodeId =
       null;
 
 
     beginInteractiveSelection();
 
     return;
 
   }
 
 
   const item =
     run.neighborQueue[
       run.neighborIndex
     ];
 
 
   const u =
     run.currentNodeId;
 
 
   const v =
     item.neighborId;
 
 
   const oldDistance =
     run.dist.get(
       v
     );
 
 
   const candidate =
     round1(
       run.dist.get(
         u
       ) +
       item.edge.weight
     );
 
 
   const shouldUpdate =
     candidate <
     oldDistance - EPS;
 
 
   run.currentRelaxation = {
 
     u,
     v,
 
     edge:
       item.edge,
 
     candidate,
 
     oldDistance,
 
     shouldUpdate
 
   };
 
 
   run.currentEdgeId =
     item.edge.id;
 
 
   run.relaxTargetId =
     v;
 
 
   run.stage =
     "relax";
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
 
   const uNode =
     getNode(
       u
     );
 
 
   const vNode =
     getNode(
       v
     );
 
 
   setOperation(
     `relax(${uNode.label}, ${vNode.label})`,
     `current dist(${vNode.label}) = ${formatDistance(oldDistance)}\n` +
     `candidate = ${formatDistance(run.dist.get(u))} + ${item.edge.weight.toFixed(1)} = ${formatDistance(candidate)}\n\n` +
     `Should dist(${vNode.label}) be updated?`
   );
 
 
   setFeedback();
 
 
   showDecisionControls(
     true
   );
 
 }
 
 
 
 /* =========================================================
    STUDENT UPDATE / KEEP
    ========================================================= */
 
 async function handleInteractiveDecision(
   chooseUpdate
 ) {
 
   if (
     !run.active ||
     run.mode !== "interactive" ||
     run.stage !== "relax"
   ) {
     return;
   }
 
 
   const info =
     run.currentRelaxation;
 
 
   if (!info) return;
 
 
   const correct =
     chooseUpdate ===
     info.shouldUpdate;
 
 
   if (
     !correct
   ) {
 
     setFeedback(
       chooseUpdate
         ? "No. The candidate is not smaller."
         : "The candidate is smaller. dist should be updated.",
       "wrong"
     );
 
     return;
 
   }
 
 
   showDecisionControls(
     false
   );
 
 
   setFeedback(
     "Correct.",
     "correct"
   );
 
 
   const uNode =
     getNode(
       info.u
     );
 
 
   const vNode =
     getNode(
       info.v
     );
 
 
   if (
     info.shouldUpdate
   ) {
 
     run.dist.set(
       info.v,
       info.candidate
     );
 
 
     run.prev.set(
       info.v,
       info.u
     );
 
 
     addLog(
       `decreasekey(${vNode.label})    ${formatDistance(info.oldDistance)} → ${formatDistance(info.candidate)}`
     );
 
 
     setOperation(
       `decreasekey(${vNode.label})`,
       `dist(${vNode.label}): ${formatDistance(info.oldDistance)} → ${formatDistance(info.candidate)}\nprev(${vNode.label}) = ${uNode.label}`
     );
 
 
     renderPriorityQueue();
 
     syncNodeClasses();
 
 
     const element =
       nodeElements.get(
         info.v
       );
 
 
     if (
       element
     ) {
 
       element.dist.classList.add(
         "is-updated"
       );
 
 
       await wait(
         700
       );
 
 
       element.dist.classList.remove(
         "is-updated"
       );
 
     }
 
   }
 
   else {
 
     addLog(
       `keep dist(${vNode.label}) = ${formatDistance(info.oldDistance)}`
     );
 
 
     setOperation(
       `keep dist(${vNode.label})`,
       "No decreasekey is needed."
     );
 
 
     await wait(
       500
     );
 
   }
 
 
   run.currentEdgeId =
     null;
 
 
   run.relaxTargetId =
     null;
 
 
   run.currentRelaxation =
     null;
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
 
   run.neighborIndex += 1;
 
 
   await wait(
     250
   );
 
 
   presentNextInteractiveRelaxation();
 
 }
 
 
 
 /* =========================================================
    FIND EDGE BETWEEN TWO VERTICES
    ========================================================= */
 
 function findEdgeBetween(
   nodeA,
   nodeB
 ) {
 
   return graph.edges.find(
     edge => {
 
       return (
         (
           edge.u === nodeA &&
           edge.v === nodeB
         )
         ||
         (
           edge.u === nodeB &&
           edge.v === nodeA
         )
       );
 
     }
   );
 
 }
 
 
 
 /* =========================================================
    FINISH DIJKSTRA
    ========================================================= */
 
 async function finishDijkstra(
   token
 ) {
 
   if (
     token !== runToken
   ) {
     return;
   }
 
 
   run.active =
     false;
 
 
   run.finished =
     true;
 
 
   run.stage =
     "done";
 
 
   run.currentNodeId =
     null;
 
 
   run.currentEdgeId =
     null;
 
 
   run.relaxTargetId =
     null;
 
 
   showDecisionControls(
     false
   );
 
 
   /*
     Build shortest-path tree from prev
   */
 
   run.treeEdgeIds.clear();
 
 
   graph.nodes.forEach(
     node => {
 
       const previous =
         run.prev.get(
           node.id
         );
 
 
       if (
         previous === null
       ) {
         return;
       }
 
 
       const edge =
         findEdgeBetween(
           node.id,
           previous
         );
 
 
       if (
         edge
       ) {
 
         run.treeEdgeIds.add(
           edge.id
         );
 
       }
 
     }
   );
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
   renderPriorityQueue();
 
 
   modeLabel.textContent =
     "DONE";
 
 
   setOperation(
     "DIJKSTRA COMPLETE",
     "The highlighted edges form the shortest-path tree.\nClick any reachable vertex to inspect its shortest path."
   );
 
 
   addLog(
     "Dijkstra complete."
   );
 
 
   autoButton.disabled =
     false;
 
 
   interactiveButton.disabled =
     false;
 
 
   resetRunButton.disabled =
     false;
 
 
   await wait(
     DIJKSTRA_TIMING.finish
   );
 
 }
 
 
 
 /* =========================================================
    SHOW SHORTEST PATH TO TARGET
    ========================================================= */
 
 function showShortestPathTo(
   targetId
 ) {
 
   if (
     !run.finished
   ) {
     return;
   }
 
 
   run.pathEdgeIds.clear();
 
 
   run.targetId =
     targetId;
 
 
   const target =
     getNode(
       targetId
     );
 
 
   const distance =
     run.dist.get(
       targetId
     );
 
 
   if (
     distance === Infinity
   ) {
 
     syncNodeClasses();
     syncEdgeClasses();
 
 
     setOperation(
       `TARGET: ${target.label}`,
       "This vertex is unreachable from the source."
     );
 
 
     return;
 
   }
 
 
   const path = [
     targetId
   ];
 
 
   let current =
     targetId;
 
 
   while (
     current !== graph.sourceId
   ) {
 
     const previous =
       run.prev.get(
         current
       );
 
 
     if (
       previous === null
     ) {
       break;
     }
 
 
     const edge =
       findEdgeBetween(
         current,
         previous
       );
 
 
     if (
       edge
     ) {
 
       run.pathEdgeIds.add(
         edge.id
       );
 
     }
 
 
     path.push(
       previous
     );
 
 
     current =
       previous;
 
   }
 
 
   path.reverse();
 
 
   const labels =
     path.map(
       id =>
         getNode(id).label
     );
 
 
   setOperation(
     `SHORTEST PATH TO ${target.label}`,
     `${labels.join(" → ")}\nDistance = ${formatDistance(distance)}`
   );
 
 
   syncNodeClasses();
   syncEdgeClasses();
 
 }
 
 
 
 /* =========================================================
    TOOL BUTTONS
    ========================================================= */
 
 document
   .querySelectorAll(
     ".graph-edit-tool"
   )
   .forEach(
     button => {
 
       button.addEventListener(
         "click",
         () => {
 
           setTool(
             button.dataset.tool
           );
 
         }
       );
 
     }
   );
 
 
 
 /* =========================================================
    CLEAR BUTTON
    ========================================================= */
 
 clearGraphButton.addEventListener(
   "click",
   clearGraph
 );
 
 
 
 /* =========================================================
    RUN BUTTONS
    ========================================================= */
 
 autoButton.addEventListener(
   "click",
   async () => {
 
     if (
       run.finished
     ) {
 
       resetExecution();
 
     }
 
 
     await startAutoDijkstra();
 
   }
 );
 
 
 interactiveButton.addEventListener(
   "click",
   () => {
 
     if (
       run.finished
     ) {
 
       resetExecution();
 
     }
 
 
     startInteractiveDijkstra();
 
   }
 );
 
 
 resetRunButton.addEventListener(
   "click",
   resetExecution
 );
 
 
 
 /* =========================================================
    INTERACTIVE DECISIONS
    ========================================================= */
 
 updateButton.addEventListener(
   "click",
   () =>
     handleInteractiveDecision(
       true
     )
 );
 
 
 keepButton.addEventListener(
   "click",
   () =>
     handleInteractiveDecision(
       false
     )
 );
 
 
 
 /* =========================================================
    INITIAL STATE
    ========================================================= */
 
 setTool(
   "node"
 );