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
 
   init: 900,

   select: 950,
 
   inspectEdge: 1150,
 
   update: 900,

   prevChange: 3000,

   prevSet: 1700,
 
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


 const edgeLabelLayer =
   document.getElementById(
     "graph-edge-label-layer"
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
 
 
 const logElement =
   document.getElementById(
     "dijkstra-log"
   );
 
 
 const runButton =
   document.getElementById(
     "run-dijkstra-button"
   );


 const pauseButton =
   document.getElementById(
     "pause-dijkstra-button"
   );


 const resumeButton =
   document.getElementById(
     "resume-dijkstra-button"
   );
 
 
 const clearGraphButton =
   document.getElementById(
     "clear-graph-button"
   );


 const randomGraphButton =
   document.getElementById(
     "random-graph-button"
   );


 const randomNodeCountInput =
   document.getElementById(
     "random-node-count"
   );


 const weightModeNote =
   document.getElementById(
     "weight-mode-note"
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


 /* "euclidean" | "random" */
 let weightMode = "euclidean";

 let editingEdgeId = null;
 let weightInlineInput = null;
 let closingWeightEditor = false;
 
 
 
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
 let dijkstraPaused = false;
 let dijkstraPlaying = false;
 
 
 
 /* =========================================================
    UTILITIES
    ========================================================= */
 
 function wait(ms) {
   return new Promise((resolve) => {
     let remaining = ms;
     let sliceStart = performance.now();

     function tick() {
       if (dijkstraPaused) {
         if (sliceStart !== null) {
           remaining -= Math.max(0, performance.now() - sliceStart);
           sliceStart = null;
         }

         const poll = () => {
           if (dijkstraPaused) {
             window.setTimeout(poll, 40);
             return;
           }

           sliceStart = performance.now();
           tick();
         };

         window.setTimeout(poll, 40);
         return;
       }

       if (sliceStart === null) {
         sliceStart = performance.now();
       }

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


 function updateDijkstraPlaybackControls() {
   if (pauseButton) {
     pauseButton.disabled = !dijkstraPlaying || dijkstraPaused;
   }

   if (resumeButton) {
     resumeButton.disabled = !dijkstraPlaying || !dijkstraPaused;
   }
 }


 function pauseDijkstra() {
   if (!dijkstraPlaying || dijkstraPaused) {
     return;
   }

   dijkstraPaused = true;
   updateDijkstraPlaybackControls();
 }


 function resumeDijkstra() {
   if (!dijkstraPlaying || !dijkstraPaused) {
     return;
   }

   dijkstraPaused = false;
   updateDijkstraPlaybackControls();
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
       weightMode === "euclidean"
         ? "Drag a vertex to move it. Edge weights update with Euclidean distance."
         : "Drag a vertex to move it. Random edge weights stay fixed."
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


   document
     .querySelectorAll(".weight-mode-button")
     .forEach(button => {

       button.disabled = !enabled;

     });


   /* Random graph stays available; it resets the run itself. */
 
 
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
           500,
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
     "46"
   );


   /* predecessor */

   const prev =
     document.createElementNS(
       SVG_NS,
       "text"
     );


   prev.classList.add(
     "graph-node-prev"
   );


   prev.setAttribute(
     "text-anchor",
     "middle"
   );


   prev.setAttribute(
     "y",
     "66"
   );
 
 
   group.append(
     circle,
     label,
     dist,
     prev
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
       dist,
       prev
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

 function calculateEuclideanWeight(
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


 function randomEdgeWeight() {

   /*
     Keep weights readable on the canvas: 1.0 .. 10.0
   */
   return round1(
     1 + Math.random() * 9
   );

 }


 function assignEdgeWeight(
   nodeA,
   nodeB
 ) {

   if (weightMode === "random") {
     return randomEdgeWeight();
   }

   return calculateEuclideanWeight(
     nodeA,
     nodeB
   );

 }


 function updateWeightModeNote() {

   if (!weightModeNote) {
     return;
   }

   weightModeNote.textContent =
     weightMode === "euclidean"
       ? "click label to edit · moves update distance"
       : "click label to edit · random 1.0–10.0";

 }


 function setWeightMode(mode) {

   if (
     mode !== "euclidean" &&
     mode !== "random"
   ) {
     return;
   }


   if (isGraphLocked()) {
     return;
   }


   weightMode = mode;


   document
     .querySelectorAll(".weight-mode-button")
     .forEach(button => {

       button.classList.toggle(
         "is-active",
         button.dataset.weightMode === mode
       );

     });


   updateWeightModeNote();


   /*
     Reassign every existing edge so the graph matches the
     selected weight mode immediately.
   */
   graph.edges.forEach(edge => {

     const nodeA = getNode(edge.u);
     const nodeB = getNode(edge.v);

     if (!nodeA || !nodeB) {
       return;
     }

     edge.weight = assignEdgeWeight(nodeA, nodeB);
     edge.userSet = false;
     updateEdgeElement(edge.id, false, { skipLabel: true });

   });

   relayoutAllEdgeLabels();

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
       assignEdgeWeight(
         nodeA,
         nodeB
       ),

     userSet: false
 
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
     "62"
   );
 
 
   weightBox.setAttribute(
     "height",
     "34"
   );
 
 
   weightBox.setAttribute(
     "rx",
     "6"
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
     "7"
   );
 
 
   group.append(
     hitLine,
     line
   );
 
 
   edgeLayer.appendChild(
     group
   );


   if (edgeLabelLayer) {
     edgeLabelLayer.append(
       weightBox,
       weight
     );
   } else {
     group.append(
       weightBox,
       weight
     );
   }
 
 
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


   weightBox.classList.add("is-editable");


   weightBox.addEventListener("click", event => {

     event.stopPropagation();
     editEdgeWeight(edge.id);

   });
 
 
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
    EDIT EDGE WEIGHT (in-place on the label)
    ========================================================= */

 function restoreWeightLabelVisibility(edgeId) {

   const element = edgeElements.get(edgeId);

   if (!element) {
     return;
   }

   element.weightBox.style.opacity = "";
   element.weight.style.opacity = "";

 }


 function closeWeightEditor(options = {}) {

   const apply = options.apply === true;
   const edgeId = editingEdgeId;
   const input = weightInlineInput;

   if (!input && edgeId === null) {
     return;
   }

   closingWeightEditor = true;
   weightInlineInput = null;
   editingEdgeId = null;

   if (apply && input && edgeId !== null && !isGraphLocked()) {

     const edge = getEdge(edgeId);
     const value = Number(input.value);

     if (edge && Number.isFinite(value) && value > 0) {

       edge.weight = round1(value);
       edge.userSet = true;
       updateEdgeElement(edge.id, false, { skipLabel: true });
       relayoutAllEdgeLabels();

     } else if (input.value.trim() !== "") {

       setBuilderMessage(
         "Weight must be a positive number."
       );

     }

   }

   if (edgeId !== null) {
     restoreWeightLabelVisibility(edgeId);
   }

   if (input) {
     input.remove();
   }

   closingWeightEditor = false;

 }


 function openWeightEditor(edgeId) {

   if (isGraphLocked()) {
     return;
   }

   if (editingEdgeId === edgeId && weightInlineInput) {
     weightInlineInput.focus();
     weightInlineInput.select();
     return;
   }

   closeWeightEditor({ apply: false });

   const edge = getEdge(edgeId);
   const element = edgeElements.get(edgeId);
   const wrapper = document.querySelector(".graph-canvas-wrapper");

   if (!edge || !element || !wrapper) {
     return;
   }

   const nodeA = getNode(edge.u);
   const nodeB = getNode(edge.v);

   if (!nodeA || !nodeB) {
     return;
   }

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

   input.addEventListener("keydown", event => {

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

     if (closingWeightEditor) {
       return;
     }

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


 function formatPrevName(previousId) {

   if (
     previousId === null ||
     previousId === undefined
   ) {
     return "nil";
   }

   const previous = getNode(previousId);

   return previous ? previous.label : "nil";

 }


 function formatPrevTransition(fromId, toId) {

   return `prev ${formatPrevName(fromId)} → ${formatPrevName(toId)}`;

 }
 
 
 
 /* =========================================================
    UPDATE EDGE SVG
    ========================================================= */
 
 function updateEdgeElement(
   edgeId,
   refreshWeight = false,
   options = {}
 ) {

   if (
     refreshWeight &&
     typeof refreshWeight === "object"
   ) {
     options = refreshWeight;
     refreshWeight = options.refreshWeight === true;
   }

 
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
 
 
   if (refreshWeight) {

     edge.weight =
       assignEdgeWeight(nodeA, nodeB);

     edge.userSet = false;

   } else if (
     weightMode === "euclidean" &&
     !edge.userSet
   ) {

     edge.weight =
       calculateEuclideanWeight(nodeA, nodeB);

   }
 
 
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
 
 

   if (options.skipLabel) {
     element.weight.textContent = edge.weight.toFixed(1);
     return;
   }

   const avoidCenters =
     options.avoidCenters || collectEdgeLabelCenters(edgeId);
   const pos = chooseEdgeLabelPosition(edge, avoidCenters);
   applyEdgeLabelPosition(edgeId, pos.x, pos.y);

 }


 function collectEdgeLabelCenters(exceptEdgeId = null) {

   const centers = [];

   graph.edges.forEach(edge => {

     if (exceptEdgeId && edge.id === exceptEdgeId) {
       return;
     }

     const element = edgeElements.get(edge.id);

     if (!element) {
       return;
     }

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
   element.weightBox.setAttribute("x", labelX - 31);
   element.weightBox.setAttribute("y", labelY - 17);
   element.weight.setAttribute("x", labelX);
   element.weight.setAttribute("y", labelY);
   element.weight.textContent = edge.weight.toFixed(1);
 }

 function relayoutAllEdgeLabels() {
   graph.edges.forEach((edge) => {
     updateEdgeElement(edge.id, false, { skipLabel: true });
   });

   const ordered = [...graph.edges].sort((a, b) => {
     const a1 = getNode(a.u);
     const a2 = getNode(a.v);
     const b1 = getNode(b.u);
     const b2 = getNode(b.v);
     const da = Math.hypot(a1.x - a2.x, a1.y - a2.y);
     const db = Math.hypot(b1.x - b2.x, b1.y - b2.y);
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
           edge.id,
           false,
           { skipLabel: true }
         )
     );

   relayoutAllEdgeLabels();
 
 }
 
 
 
 /* =========================================================
    NODE CLICK
    ========================================================= */
 
 function handleNodeClick(nodeId) {
 
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

   if (editingEdgeId === edgeId) {
     closeWeightEditor();
   }
 
   const element =
     edgeElements.get(
       edgeId
     );
 
 
   if (
     element
   ) {
 
     element.group.remove();

     if (element.weightBox) {
       element.weightBox.remove();
     }

     if (element.weight) {
       element.weight.remove();
     }
 
   }
 
 
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
 
 function clearGraph(force = false) {
 
   if (
     !force &&
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

   if (edgeLabelLayer) {
     edgeLabelLayer.replaceChildren();
   }
 
 
   edgeStartNodeId =
     null;


   closeWeightEditor();
 
 
   setBuilderMessage(
     "Click anywhere on the canvas to create a vertex, or generate a random graph."
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
           500,
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


       const previousId =
         run.prev.get(
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


         if (previousId === null || previousId === undefined) {

           element.prev.textContent =
             graph.sourceId === node.id
               ? "prev=nil"
               : "";

         } else {

           element.prev.textContent =
             `prev=${formatPrevName(previousId)}`;

         }
 
       }
 
       else if (
         graph.sourceId === node.id
       ) {
 
         element.dist.textContent =
           "SOURCE";

         element.prev.textContent =
           "";
 
       }
 
       else {
 
         element.dist.textContent =
           "";

         element.prev.textContent =
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
 
 
   /*
     queue is already sorted by tentative distance, so index 0
     is the heap root (deletemin). Children of i are 2i+1, 2i+2.
   */
   const n = queue.length;
   const depth = Math.floor(Math.log2(n)) + 1;
 
   const nodeWidth = 56;
   const nodeHeight = 44;
   const levelGap = 72;
   const horizontalGap = 18;
 
   /*
     Leaf spacing determines the whole tree width.
   */
   const leafCount = Math.pow(2, depth - 1);
   const treeWidth = Math.max(
     220,
     leafCount * (nodeWidth + horizontalGap)
   );
   const treeHeight = depth * levelGap + 24;
 
   const positions = new Array(n);
 
   function place(index, left, right, level) {
 
     if (index >= n) {
       return;
     }
 
     const x = (left + right) / 2;
     const y = 18 + level * levelGap + nodeHeight / 2;
 
     positions[index] = { x, y };
 
     const mid = (left + right) / 2;
 
     place(2 * index + 1, left, mid, level + 1);
     place(2 * index + 2, mid, right, level + 1);
 
   }
 
   place(0, 0, treeWidth, 0);
 
 
   const svg = document.createElementNS(SVG_NS, "svg");
 
   svg.setAttribute("class", "pq-heap-svg");
   svg.setAttribute("viewBox", `0 0 ${treeWidth} ${treeHeight}`);
   svg.setAttribute("width", String(treeWidth));
   svg.setAttribute("height", String(treeHeight));
   svg.setAttribute("role", "img");
   svg.setAttribute("aria-label", "Priority queue as a binary min-heap");
 
 
   const edgeLayer = document.createElementNS(SVG_NS, "g");
   const nodeLayer = document.createElementNS(SVG_NS, "g");
 
   svg.append(edgeLayer, nodeLayer);
 
 
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
 
     edgeLayer.appendChild(line);
 
   }
 
 
   queue.forEach((node, index) => {
 
     const { x, y } = positions[index];
     const isMin = index === 0;
 
     const group = document.createElementNS(SVG_NS, "g");
 
     group.setAttribute(
       "class",
       isMin ? "pq-heap-node is-min" : "pq-heap-node"
     );
     group.setAttribute(
       "transform",
       `translate(${x} ${y})`
     );
 
 
     const rect = document.createElementNS(SVG_NS, "rect");
 
     rect.setAttribute("class", "pq-heap-rect");
     rect.setAttribute("x", String(-nodeWidth / 2));
     rect.setAttribute("y", String(-nodeHeight / 2));
     rect.setAttribute("width", String(nodeWidth));
     rect.setAttribute("height", String(nodeHeight));
     rect.setAttribute("rx", "7");
 
 
     const label = document.createElementNS(SVG_NS, "text");
 
     label.setAttribute("class", "pq-heap-label");
     label.setAttribute("y", "-5");
     label.setAttribute("text-anchor", "middle");
     label.setAttribute("dominant-baseline", "middle");
     label.textContent = node.label;
 
 
     const distance = document.createElementNS(SVG_NS, "text");
 
     distance.setAttribute("class", "pq-heap-distance");
     distance.setAttribute("y", "12");
     distance.setAttribute("text-anchor", "middle");
     distance.setAttribute("dominant-baseline", "middle");
     distance.textContent = formatDistance(
       run.dist.get(node.id)
     );
 
 
     group.append(rect, label, distance);
 
     if (isMin) {
 
       const badge = document.createElementNS(SVG_NS, "text");
 
       badge.setAttribute("class", "pq-heap-min-badge");
       badge.setAttribute("x", String(nodeWidth / 2 - 2));
       badge.setAttribute("y", String(-nodeHeight / 2 - 6));
       badge.setAttribute("text-anchor", "end");
       badge.textContent = "MIN";
 
       group.appendChild(badge);
 
     }
 
     nodeLayer.appendChild(group);
 
   });
 
 
   const scroll = document.createElement("div");
 
   scroll.className = "pq-heap-scroll";
   scroll.appendChild(svg);
 
   priorityQueueElement.appendChild(scroll);
 
 }
 
 
 
 
 
 
 
 /* =========================================================
    OPERATION
    ========================================================= */
 
 function setOperation(
   title,
   detail
 ) {
 
   if (operationTitle) {
     operationTitle.textContent = title;
   }
 
   if (operationDetail) {
     operationDetail.textContent = detail;
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
    GRAPH VALIDATION
    ========================================================= */

 function isUndirectedGraphConnected() {

   if (graph.nodes.length <= 1) {
     return true;
   }


   const adjacency = new Map();

   graph.nodes.forEach(node => {
     adjacency.set(node.id, []);
   });


   graph.edges.forEach(edge => {

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


   if (!isUndirectedGraphConnected()) {

     setBuilderMessage(
       "The graph must be connected. Add edges so every vertex is reachable."
     );

     return false;

   }
 
 
   return true;
 
 }
 
 
 
 /* =========================================================
    RESET EXECUTION STATE
    ========================================================= */
 
 function resetExecution() {
 
   dijkstraPaused = false;
   dijkstraPlaying = false;
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
 
 
   modeLabel.textContent =
     "READY";
 
 
   clearLog();
 
 
   logElement.innerHTML =
     `
     <div class="dijkstra-log-empty">
       No operations yet.
     </div>
     `;
 
 
   runButton.disabled =
     false;

   updateDijkstraPlaybackControls();
 
 
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
 
 
   closeWeightEditor();
 
 
   setBuilderMessage(
     "Graph locked during Dijkstra execution."
   );
 
 
   clearLog();
 
 
   addLog(
     `dist(${getNode(graph.sourceId).label}) = 0`
   );

   addLog(
     `makequeue(V) → ${graph.nodes.length} vertices in H`
   );

   setOperation(
     "makequeue(V)",
     `H contains all ${graph.nodes.length} vertices.\n` +
       `dist(${getNode(graph.sourceId).label}) = 0; others ∞`
   );
 
 
   runButton.disabled =
     true;

   dijkstraPaused = false;
   dijkstraPlaying = true;
   updateDijkstraPlaybackControls();
 
 
   modeLabel.textContent =
     "RUNNING";
 
 
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

     const oldPrevId =
       run.prev.get(v);

     const oldPrevLabel =
       formatPrevName(oldPrevId);

     const prevIsReassigned =
       oldPrevId !== null &&
       oldPrevId !== undefined &&
       oldPrevId !== u;
 
 
     run.dist.set(
       v,
       candidate
     );
 
 
     run.prev.set(
       v,
       u
     );
 
 
     addLog(
       `decreasekey(${vNode.label})    ${formatDistance(oldDistance)} → ${formatDistance(candidate)}    ${formatPrevTransition(oldPrevId, u)}`
     );
 
 
     setOperation(
       `decreasekey(${vNode.label})`,
       `dist(${vNode.label}): ${formatDistance(oldDistance)} → ${formatDistance(candidate)}\n` +
       `${formatPrevTransition(oldPrevId, u)}` +
       (prevIsReassigned
         ? "\nPredecessor changed — a better path was found."
         : "")
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

       nodeElement.prev.textContent =
         formatPrevTransition(oldPrevId, u);

       nodeElement.prev.classList.add(
         "is-updated",
         prevIsReassigned ? "is-prev-changed" : "is-prev-set"
       );

       if (prevIsReassigned) {
         nodeElement.group.classList.add("is-prev-flash");
       }
 
 
       await wait(
         prevIsReassigned
           ? DIJKSTRA_TIMING.prevChange
           : DIJKSTRA_TIMING.prevSet
       );
 
 
       nodeElement.dist.classList.remove(
         "is-updated"
       );

       nodeElement.prev.classList.remove(
         "is-updated",
         "is-prev-changed",
         "is-prev-set"
       );

       nodeElement.group.classList.remove("is-prev-flash");

       /*
         Restore the steady prev=X label after the flash.
       */
       nodeElement.prev.textContent =
         `prev=${uNode.label}`;
 
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

   await wait(DIJKSTRA_TIMING.init);

   if (token !== runToken) {
     return;
   }
 
 
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
 
 
   runButton.disabled =
     false;

   dijkstraPlaying = false;
   dijkstraPaused = false;
   updateDijkstraPlaybackControls();
 
 
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


 document
   .querySelectorAll(".weight-mode-button")
   .forEach(button => {

     button.addEventListener("click", () => {

       setWeightMode(button.dataset.weightMode);

     });

   });


 updateWeightModeNote();
 
 
 
 /* =========================================================
    CLEAR BUTTON
    ========================================================= */
 
 if (clearGraphButton) {

   clearGraphButton.addEventListener(
     "click",
     clearGraph
   );

 }
 
 
 
 /* =========================================================
    RANDOM CONNECTED GRAPH
    ========================================================= */

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

   /*
     Cancel any running / finished execution, then force-clear
     so the canvas is always rebuilt.
   */
   if (run.active || run.finished) {
     resetExecution();
   }


   let n = Number.parseInt(
     randomNodeCountInput
       ? randomNodeCountInput.value
       : "6",
     10
   );


   if (Number.isNaN(n)) {
     n = 6;
   }


   n = Math.max(2, Math.min(12, n));


   if (randomNodeCountInput) {
     randomNodeCountInput.value = String(n);
   }


   clearGraph(true);


   /*
     Scatter vertices across the full canvas with best-candidate
     sampling, preferring spread away from the center.
   */
   const bounds = {
     minX: 50,
     maxX: 950,
     minY: 50,
     maxY: 500
   };
   const cx = (bounds.minX + bounds.maxX) / 2;
   const cy = (bounds.minY + bounds.maxY) / 2;
   const width = bounds.maxX - bounds.minX;
   const height = bounds.maxY - bounds.minY;
   const minDist = Math.max(
     105,
     Math.min(160, (width + height) / (n * 1.15))
   );
   const placed = [];

   for (let i = 0; i < n; i += 1) {
     let best = null;
     let bestScore = -Infinity;
     for (let attempt = 0; attempt < 70; attempt += 1) {
       const candidate = {
         x: bounds.minX + Math.random() * width,
         y: bounds.minY + Math.random() * height
       };
       let nearest = Infinity;
       for (const point of placed) {
         nearest = Math.min(
           nearest,
           Math.hypot(candidate.x - point.x, candidate.y - point.y)
         );
       }
       const distCenter = Math.hypot(
         candidate.x - cx,
         candidate.y - cy
       );
       const score =
         (placed.length === 0 ? distCenter : nearest) +
         distCenter * 0.2;
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
         if (dist >= minDist) {
           continue;
         }
         const push = ((minDist - dist) / dist) * 0.6;
         const ox = dx * push * 0.5;
         const oy = dy * push * 0.5;
         placed[i].x = Math.max(
           bounds.minX,
           Math.min(bounds.maxX, placed[i].x - ox)
         );
         placed[i].y = Math.max(
           bounds.minY,
           Math.min(bounds.maxY, placed[i].y - oy)
         );
         placed[j].x = Math.max(
           bounds.minX,
           Math.min(bounds.maxX, placed[j].x + ox)
         );
         placed[j].y = Math.max(
           bounds.minY,
           Math.min(bounds.maxY, placed[j].y + oy)
         );
       }
     }
   }

   placed.forEach((point) => {
     addNode(point.x, point.y);
   });


   const nodeIds = graph.nodes.map(node => node.id);
   const possible = [];


   for (let i = 0; i < n; i += 1) {
     for (let j = i + 1; j < n; j += 1) {
       possible.push([nodeIds[i], nodeIds[j]]);
     }
   }


   shuffleInPlace(possible);


   /*
     Union-Find: first build a spanning tree (n - 1 edges),
     then add a modest number of longer extra edges.
   */
   const parent = {};

   for (const id of nodeIds) {
     parent[id] = id;
   }


   function find(id) {
     if (parent[id] !== id) {
       parent[id] = find(parent[id]);
     }
     return parent[id];
   }


   function unite(a, b) {
     const ra = find(a);
     const rb = find(b);
     if (ra === rb) return false;
     parent[rb] = ra;
     return true;
   }


   function pairDistance(idA, idB) {
     const nodeA = getNode(idA);
     const nodeB = getNode(idB);
     if (!nodeA || !nodeB) {
       return 0;
     }
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
         countCloseConflicts(edgeA) * 10 - pairDistance(edgeA.u, edgeA.v) * 0.01;
       const scoreB =
         countCloseConflicts(edgeB) * 10 - pairDistance(edgeB.u, edgeB.v) * 0.01;
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
             if (pairDistance(a, b) < 140) continue;
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
           if (pairDistance(a, b) < 140) continue;
           if (pairWouldBeTooClose(a, b)) continue;
           options.push([a, b, pairClearance(a, b)]);
         }
       }
       options.sort((p, q) => q[2] - p[2] || pairDistance(q[0], q[1]) - pairDistance(p[0], p[1]));
       if (options.length > 0) {
         const top = options.slice(0, Math.min(8, options.length));
         const pick = top[Math.floor(Math.random() * top.length)];
         addEdge(pick[0], pick[1]);
       }
     }
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
       const score = clearance * 4 + pairDistance(a, b) * 0.02 - closePenalty;
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
       pairDistance(pairB[0], pairB[1]) -
       pairDistance(pairA[0], pairA[1])
     );
   });
   const minExtraLength = 110;
   for (const [a, b] of leftover) {
     if (edgeCount >= edgeTarget) break;
     if (pairDistance(a, b) < minExtraLength) continue;
     if (pairWouldBeTooClose(a, b)) continue;
     if (pairClearance(a, b) < 48) continue;
     addEdge(a, b);
     edgeCount += 1;
   }

   repairCrowdedEdges();

   const sourceIndex =
     Math.floor(Math.random() * graph.nodes.length);

   graph.sourceId = graph.nodes[sourceIndex].id;


   setTool("node");
   setEditingEnabled(true);


   setBuilderMessage(
     "Click anywhere on the canvas to create a vertex, or generate a random graph."
   );


   syncNodeClasses();
   syncEdgeClasses();
   relayoutAllEdgeLabels();

 }


 /* =========================================================
    RUN BUTTONS
    ========================================================= */

 if (randomGraphButton) {

   randomGraphButton.addEventListener(
     "click",
     generateRandomGraph
   );

 }


 if (randomNodeCountInput) {

   randomNodeCountInput.addEventListener(
     "keydown",
     event => {

       if (event.key === "Enter") {
         generateRandomGraph();
       }

     }
   );

 }

 
 if (runButton) {

   runButton.addEventListener(
     "click",
     async () => {
 
       if (
         run.finished
       ) {
 
         resetExecution();
 
       }

       if (dijkstraPlaying) {
         return;
       }
 
 
       await startAutoDijkstra();
 
     }
   );

 }


 if (pauseButton) {
   pauseButton.addEventListener("click", pauseDijkstra);
 }


 if (resumeButton) {
   resumeButton.addEventListener("click", resumeDijkstra);
 }


 updateDijkstraPlaybackControls();
 
 
 
 /* =========================================================
    INITIAL STATE
    ========================================================= */
 
 setTool(
   "node"
 );