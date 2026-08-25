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
 
 
 const logElement =
   document.getElementById(
     "dijkstra-log"
   );
 
 
 const runButton =
   document.getElementById(
     "run-dijkstra-button"
   );
 
 
 const resetRunButton =
   document.getElementById(
     "reset-dijkstra-button"
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
     "42"
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
     "58"
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
 
 
   edgeStartNodeId =
     null;
 
 
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
               ? "prev=—"
               : "";

         } else {

           const previous =
             getNode(previousId);

           element.prev.textContent =
             previous
               ? `prev=${previous.label}`
               : "";

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
 
 
   runButton.disabled =
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
 
 
   runButton.disabled =
     true;
 
 
   resetRunButton.disabled =
     false;
 
 
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

       nodeElement.prev.classList.add(
         "is-updated"
       );
 
 
       await wait(
         DIJKSTRA_TIMING.update
       );
 
 
       nodeElement.dist.classList.remove(
         "is-updated"
       );

       nodeElement.prev.classList.remove(
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
     Mitchell's best-candidate sampling: for each vertex try a
     handful of random points and keep the one that sits
     farthest from everything placed so far. This scatters the
     vertices over the whole canvas while still keeping the
     circles and weight labels from overlapping.
   */
   const minX = 80;
   const maxX = 920;
   const minY = 90;
   const maxY = 510;

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
     then add extra edges up to a random connected count.
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


   const minEdges = n - 1;
   const maxEdges = (n * (n - 1)) / 2;
   const edgeTarget =
     minEdges +
     Math.floor(Math.random() * (maxEdges - minEdges + 1));


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

     if (edgeCount >= edgeTarget) {
       break;
     }

     addEdge(a, b);
     edgeCount += 1;

   }


   const sourceIndex =
     Math.floor(Math.random() * graph.nodes.length);

   graph.sourceId = graph.nodes[sourceIndex].id;


   setTool("node");
   setEditingEnabled(true);


   setBuilderMessage(
     `Random connected graph: ${n} nodes, ${edgeCount} edges. Source: ${getNode(graph.sourceId).label}.`
   );


   syncNodeClasses();
   syncEdgeClasses();

 }


 /* =========================================================
    RUN BUTTONS
    ========================================================= */
 
 runButton.addEventListener(
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
 
 
 resetRunButton.addEventListener(
   "click",
   resetExecution
 );


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
 
 
 
 /* =========================================================
    INITIAL STATE
    ========================================================= */
 
 setTool(
   "node"
 );