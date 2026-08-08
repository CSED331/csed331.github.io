/* =========================================================
   MERGESORT VISUALIZATION
   ========================================================= */

   let sortRunId = 0;
   let sortNodeCounter = 0;
   
   
   /* =========================================================
      ANIMATION TIMING
   
      강의 중 과정을 충분히 볼 수 있도록
      일부러 조금 느리게 설정했다.
      ========================================================= */
   
   const SORT_TIMING = {
     scroll: 700,
   
     enter: 600,
   
     splitFocus: 1000,
     splitReveal: 750,
   
     baseCase: 750,
   
     mergeStart: 950,
     compare: 1300,
   
     move: 800,
     afterMove: 350,
   
     mergeDone: 950,
   
     done: 700
   };
   
   
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
   
   
   /* =========================================================
      WAIT
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
   
   
   /* =========================================================
      INPUT ARRAY
      ========================================================= */
   
   function createArrayInputs() {
   
     const sizeInput =
       document.getElementById(
         "sort-size"
       );
   
   
     const container =
       document.getElementById(
         "sort-array-inputs"
       );
   
   
     if (
       !sizeInput ||
       !container
     ) {
       return;
     }
   
   
     let n =
       Number.parseInt(
         sizeInput.value,
         10
       );
   
   
     if (
       Number.isNaN(n)
     ) {
       n = 8;
     }
   
   
     /*
       너무 많은 원소를 넣으면
       visualization이 지나치게 복잡해진다.
     */
     n =
       Math.max(
         2,
         Math.min(
           16,
           n
         )
       );
   
   
     sizeInput.value =
       String(n);
   
   
     container.replaceChildren();
   
   
     for (
       let i = 0;
       i < n;
       i += 1
     ) {
   
       const wrapper =
         document.createElement(
           "label"
         );
   
   
       wrapper.className =
         "sort-input-cell-wrapper";
   
   
       /* -----------------------------------------------------
          index label
          ----------------------------------------------------- */
   
       const indexLabel =
         document.createElement(
           "span"
         );
   
   
       indexLabel.className =
         "sort-input-index";
   
   
       indexLabel.textContent =
         `[${i}]`;
   
   
       /* -----------------------------------------------------
          input
          ----------------------------------------------------- */
   
       const input =
         document.createElement(
           "input"
         );
   
   
       input.type =
         "number";
   
   
       input.className =
         "sort-array-value";
   
   
       input.dataset.index =
         String(i);
   
   
       input.setAttribute(
         "aria-label",
         `Array value ${i}`
       );
   
   
       /* =====================================================
          ← / → KEY NAVIGATION
          ===================================================== */
   
       input.addEventListener(
         "keydown",
         event => {
   
           if (
             event.key !== "ArrowLeft" &&
             event.key !== "ArrowRight"
           ) {
             return;
           }
   
   
           /*
             input 내부 cursor 이동보다
             배열 cell 이동을 우선한다.
           */
           event.preventDefault();
   
   
           const inputs =
             Array.from(
               container.querySelectorAll(
                 ".sort-array-value"
               )
             );
   
   
           const currentIndex =
             inputs.indexOf(
               input
             );
   
   
           const nextIndex =
             event.key === "ArrowLeft"
               ? currentIndex - 1
               : currentIndex + 1;
   
   
           if (
             nextIndex >= 0 &&
             nextIndex < inputs.length
           ) {
   
             inputs[nextIndex].focus();
   
             /*
               기존 값이 있으면 바로 새 숫자로
               덮어쓸 수 있도록 전체 선택
             */
             inputs[nextIndex].select();
   
           }
   
         }
       );
   
   
       wrapper.append(
         indexLabel,
         input
       );
   
   
       container.appendChild(
         wrapper
       );
   
     }
   
   
     const message =
       document.getElementById(
         "sort-input-message"
       );
   
   
     if (message) {
       message.textContent = "";
     }
   
   
     /*
       생성 직후 첫 번째 칸에 focus
     */
   
     const firstInput =
       container.querySelector(
         ".sort-array-value"
       );
   
   
     if (firstInput) {
       firstInput.focus();
     }
   
   }
   
   
   /* =========================================================
      READ INPUT
      ========================================================= */
   
   function readInputArray() {
   
     const inputs =
       Array.from(
         document.querySelectorAll(
           ".sort-array-value"
         )
       );
   
   
     if (
       inputs.length === 0
     ) {
   
       throw new Error(
         "Create the input array first."
       );
   
     }
   
   
     const values = [];
   
   
     for (
       const input
       of inputs
     ) {
   
       if (
         input.value.trim() === ""
       ) {
   
         throw new Error(
           "Please fill every array cell."
         );
   
       }
   
   
       const value =
         Number(
           input.value
         );
   
   
       if (
         !Number.isFinite(value)
       ) {
   
         throw new Error(
           "Every array cell must contain a number."
         );
   
       }
   
   
       values.push(
         value
       );
   
     }
   
   
     return values;
   }
   
   
   /* =========================================================
      BUILD RECURSION TREE MODEL
      ========================================================= */
   
   function buildMergeSortModel(
     values,
     depth = 0
   ) {
   
     const node = {
   
       id:
         `merge-node-${sortNodeCounter++}`,
   
       values:
         [...values],
   
       depth,
   
       children: [],
   
       result: null
   
     };
   
   
     if (
       values.length > 1
     ) {
   
       const middle =
         Math.floor(
           values.length / 2
         );
   
   
       const left =
         values.slice(
           0,
           middle
         );
   
   
       const right =
         values.slice(
           middle
         );
   
   
       node.children = [
   
         buildMergeSortModel(
           left,
           depth + 1
         ),
   
         buildMergeSortModel(
           right,
           depth + 1
         )
   
       ];
   
     }
   
   
     return node;
   }
   
   
   /* =========================================================
      BUILD EXECUTION EVENTS
   
      여기서는 실제 mergesort 실행 순서와 동일하게
   
      enter
      split
      left recursion
      right recursion
      merge
      return
   
      순서로 event를 만든다.
      ========================================================= */
   
   function buildMergeSortTrace(
     inputValues
   ) {
   
     sortNodeCounter = 0;
   
   
     const root =
       buildMergeSortModel(
         inputValues
       );
   
   
     const events = [];
   
   
     function execute(node) {
   
       /* -----------------------------------------------------
          ENTER RECURSIVE CALL
          ----------------------------------------------------- */
   
       events.push({
   
         type: "enter",
   
         nodeId: node.id,
   
         values:
           [...node.values],
   
         depth:
           node.depth
   
       });
   
   
       /* -----------------------------------------------------
          BASE CASE
          ----------------------------------------------------- */
   
       if (
         node.values.length <= 1
       ) {
   
         node.result =
           [...node.values];
   
   
         events.push({
   
           type: "base",
   
           nodeId:
             node.id,
   
           values:
             [...node.values],
   
           depth:
             node.depth
   
         });
   
   
         return [
           ...node.values
         ];
   
       }
   
   
       const [
         leftNode,
         rightNode
       ] =
         node.children;
   
   
       /* -----------------------------------------------------
          SPLIT
          ----------------------------------------------------- */
   
       events.push({
   
         type: "split",
   
         nodeId:
           node.id,
   
         leftNodeId:
           leftNode.id,
   
         rightNodeId:
           rightNode.id,
   
         left:
           [...leftNode.values],
   
         right:
           [...rightNode.values],
   
         splitIndex:
           leftNode.values.length,
   
         depth:
           node.depth
   
       });
   
   
       /* -----------------------------------------------------
          LEFT RECURSION
          ----------------------------------------------------- */
   
       const left =
         execute(
           leftNode
         );
   
   
       /* -----------------------------------------------------
          RIGHT RECURSION
          ----------------------------------------------------- */
   
       const right =
         execute(
           rightNode
         );
   
   
       /* -----------------------------------------------------
          MERGE START
          ----------------------------------------------------- */
   
       events.push({
   
         type: "merge-start",
   
         nodeId:
           node.id,
   
         leftNodeId:
           leftNode.id,
   
         rightNodeId:
           rightNode.id,
   
         left:
           [...left],
   
         right:
           [...right],
   
         depth:
           node.depth
   
       });
   
   
       let i = 0;
       let j = 0;
   
       const merged = [];
   
   
       /* =====================================================
          COMPARE BOTH LISTS
          ===================================================== */
   
       while (
         i < left.length &&
         j < right.length
       ) {
   
         events.push({
   
           type: "compare",
   
           nodeId:
             node.id,
   
           leftNodeId:
             leftNode.id,
   
           rightNodeId:
             rightNode.id,
   
           leftIndex: i,
           rightIndex: j,
   
           leftValue:
             left[i],
   
           rightValue:
             right[j],
   
           outputIndex:
             merged.length,
   
           depth:
             node.depth
   
         });
   
   
         /* ---------------------------------------------------
            LEFT WINS
            --------------------------------------------------- */
   
         if (
           left[i] <= right[j]
         ) {
   
           events.push({
   
             type: "move",
   
             nodeId:
               node.id,
   
             sourceNodeId:
               leftNode.id,
   
             side:
               "left",
   
             sourceIndex:
               i,
   
             outputIndex:
               merged.length,
   
             value:
               left[i],
   
             reason:
               "smaller",
   
             depth:
               node.depth
   
           });
   
   
           merged.push(
             left[i]
           );
   
   
           i += 1;
   
         }
   
   
         /* ---------------------------------------------------
            RIGHT WINS
            --------------------------------------------------- */
   
         else {
   
           events.push({
   
             type: "move",
   
             nodeId:
               node.id,
   
             sourceNodeId:
               rightNode.id,
   
             side:
               "right",
   
             sourceIndex:
               j,
   
             outputIndex:
               merged.length,
   
             value:
               right[j],
   
             reason:
               "smaller",
   
             depth:
               node.depth
   
           });
   
   
           merged.push(
             right[j]
           );
   
   
           j += 1;
   
         }
   
       }
   
   
       /* =====================================================
          REMAINING LEFT ELEMENTS
          ===================================================== */
   
       while (
         i < left.length
       ) {
   
         events.push({
   
           type: "move",
   
           nodeId:
             node.id,
   
           sourceNodeId:
             leftNode.id,
   
           side:
             "left",
   
           sourceIndex:
             i,
   
           outputIndex:
             merged.length,
   
           value:
             left[i],
   
           reason:
             "remaining",
   
           depth:
             node.depth
   
         });
   
   
         merged.push(
           left[i]
         );
   
   
         i += 1;
   
       }
   
   
       /* =====================================================
          REMAINING RIGHT ELEMENTS
          ===================================================== */
   
       while (
         j < right.length
       ) {
   
         events.push({
   
           type: "move",
   
           nodeId:
             node.id,
   
           sourceNodeId:
             rightNode.id,
   
           side:
             "right",
   
           sourceIndex:
             j,
   
           outputIndex:
             merged.length,
   
           value:
             right[j],
   
           reason:
             "remaining",
   
           depth:
             node.depth
   
         });
   
   
         merged.push(
           right[j]
         );
   
   
         j += 1;
   
       }
   
   
       node.result =
         [...merged];
   
   
       /* -----------------------------------------------------
          MERGE DONE
          ----------------------------------------------------- */
   
       events.push({
   
         type: "merge-done",
   
         nodeId:
           node.id,
   
         result:
           [...merged],
   
         depth:
           node.depth
   
       });
   
   
       return [
         ...merged
       ];
   
     }
   
   
     execute(
       root
     );
   
   
     return {
       root,
       events
     };
   }
   
   
   /* =========================================================
      CREATE VALUE ROW
      ========================================================= */
   
   function createValueRow(
     values,
     options = {}
   ) {
   
     const {
       splitIndex = null,
       blank = false,
       extraClass = ""
     } =
       options;
   
   
     const row =
       document.createElement(
         "div"
       );
   
   
     row.className =
       `merge-value-row ${extraClass}`
         .trim();
   
   
     values.forEach(
       (value, index) => {
   
         /*
           실제 split 지점을 명확하게 보여준다.
   
           [10][2][5][3] ║ [7][13][1][6]
         */
   
         if (
           splitIndex !== null &&
           index === splitIndex
         ) {
   
           const divider =
             document.createElement(
               "span"
             );
   
   
           divider.className =
             "merge-split-divider";
   
   
           row.appendChild(
             divider
           );
   
         }
   
   
         const cell =
           document.createElement(
             "span"
           );
   
   
         cell.className =
           "merge-value-cell";
   
   
         cell.dataset.index =
           String(index);
   
   
         cell.textContent =
           blank
             ? ""
             : String(value);
   
   
         row.appendChild(
           cell
         );
   
       }
     );
   
   
     return row;
   }
   
   
   /* =========================================================
      CREATE FLOW ARROW
      ========================================================= */
   
    function createFlow(type) {

        const flow =
          document.createElement(
            "div"
          );
      
      
        flow.className =
          `sort-flow ${type}-flow`;
      
      
        const leftArrow =
          document.createElement(
            "span"
          );
      
      
        const rightArrow =
          document.createElement(
            "span"
          );
      
      
        leftArrow.className =
          "sort-flow-arrow";
      
      
        rightArrow.className =
          "sort-flow-arrow";
      
      
        if (
          type === "split"
        ) {
      
          leftArrow.textContent =
            "↙";
      
          rightArrow.textContent =
            "↘";
      
        }
      
        else {
      
          leftArrow.textContent =
            "↘";
      
          rightArrow.textContent =
            "↙";
      
        }
      
      
        flow.append(
          leftArrow,
          rightArrow
        );
      
      
        return flow;
    }
   
   /* =========================================================
      CREATE NODE CARD
      ========================================================= */
   
   function createCallCard(
     node
   ) {
   
     const card =
       document.createElement(
         "div"
       );
   
   
     card.className =
       "merge-node-card merge-call-card";
   
   
     card.dataset.nodeId =
       node.id;
   
   
     /* -------------------------------------------------------
        header
        ------------------------------------------------------- */
   
     const header =
       document.createElement(
         "div"
       );
   
   
     header.className =
       "merge-node-header";
   
   
     header.textContent =
       `size = ${node.values.length}`;
   
   
     /* -------------------------------------------------------
        array body
        ------------------------------------------------------- */
   
     const body =
       document.createElement(
         "div"
       );
   
   
     body.className =
       "merge-node-body";
   
   
     const splitIndex =
       node.values.length > 1
         ? Math.floor(
             node.values.length / 2
           )
         : null;
   
   
     const row =
       createValueRow(
         node.values,
         {
           splitIndex
         }
       );
   
   
     body.appendChild(
       row
     );
   
   
     /* -------------------------------------------------------
        note
        ------------------------------------------------------- */
   
     const note =
       document.createElement(
         "div"
       );
   
   
     note.className =
       "merge-node-note";
   
   
     note.textContent =
       node.values.length <= 1
         ? "BASE CASE"
         : `split: m = ${splitIndex}`;
   
   
     card.append(
       header,
       body,
       note
     );
   
   
     return {
       card,
       body,
       row,
       note,
       splitIndex
     };
   }
   
   
   /* =========================================================
      RENDER FULL PPT-STYLE DIAGRAM
   
      Structure:
   
                input
                  ↓
                split
               /     \
           subtree   subtree
               \     /
                merge
                  ↓
             merge result
   
      즉 merge 결과도 계속 아래쪽으로 생긴다.
      ========================================================= */
   
   function renderMergeSortDiagram(
     root
   ) {
   
     const container =
       document.getElementById(
         "merge-tree-container"
       );
   
   
     if (!container) {
       return new Map();
     }
   
   
     container.replaceChildren();
   
   
     const nodeMap =
       new Map();
   
   
     function buildSubtree(
       node,
       isRoot = false
     ) {
   
       const subtree =
         document.createElement(
           "div"
         );
   
   
       subtree.className =
         "merge-subtree";
   
   
       /* =====================================================
          CALL NODE
          ===================================================== */
   
       const call =
         createCallCard(
           node
         );
   
   
       if (
         isRoot
       ) {
   
         call.card.classList.add(
           "is-visible"
         );
   
       }
   
   
       subtree.appendChild(
         call.card
       );
   
   
       const info = {
   
         node,
   
         subtree,
   
         callCard:
           call.card,
   
         callRow:
           call.row,
   
         callNote:
           call.note,
   
         splitIndex:
           call.splitIndex,
   
         splitFlow: null,
         childRow: null,
   
         mergeFlow: null,
   
         resultCard: null,
         resultRow: null,
         resultNote: null
   
       };
   
   
       nodeMap.set(
         node.id,
         info
       );
   
   
       /* =====================================================
          BASE CASE
          ===================================================== */
   
       if (
         node.children.length === 0
       ) {
   
         return subtree;
   
       }
   
   
       /* =====================================================
          SPLIT FLOW
          ===================================================== */
   
       const splitFlow =
         createFlow(
           "split"
         );
   
   
       info.splitFlow =
         splitFlow;
   
   
       subtree.appendChild(
         splitFlow
       );
   
   
       /* =====================================================
          CHILDREN
          ===================================================== */
   
       const childRow =
         document.createElement(
           "div"
         );
   
   
       childRow.className =
         "merge-child-row";
   
   
       info.childRow =
         childRow;
   
   
       for (
         const child
         of node.children
       ) {
   
         childRow.appendChild(
           buildSubtree(
             child,
             false
           )
         );
   
       }
   
   
       subtree.appendChild(
         childRow
       );
   
   
       /* =====================================================
          MERGE FLOW
   
          PPT처럼 아래 방향으로 계속 진행된다.
          ===================================================== */
   
       const mergeFlow =
         createFlow(
           "merge"
         );
   
   
       info.mergeFlow =
         mergeFlow;
   
   
       subtree.appendChild(
         mergeFlow
       );
   
   
       /* =====================================================
          MERGE RESULT NODE
   
          부모 call node를 수정하는 것이 아니라
          완전히 새로운 결과 node를 아래에 둔다.
          ===================================================== */
   
       const resultCard =
         document.createElement(
           "div"
         );
   
   
       resultCard.className =
         "merge-node-card merge-result-card";
   
       const resultBody =
         document.createElement(
           "div"
         );
   
   
       resultBody.className =
         "merge-node-body";
   
   
       const resultRow =
         createValueRow(
           new Array(
             node.values.length
           ).fill(null),
           {
             blank: true,
             extraClass:
               "merge-output-row"
           }
         );
   
   
       resultBody.appendChild(
         resultRow
       );
   
   
       const resultNote =
         document.createElement(
           "div"
         );
   
   
       resultNote.className =
         "merge-node-note";
   
   
       resultNote.textContent =
         "";
   
   
       resultCard.append(
         resultBody,
         resultNote
       );
   
   
       info.resultCard =
         resultCard;
   
   
       info.resultRow =
         resultRow;
   
   
       info.resultNote =
         resultNote;
   
   
       subtree.appendChild(
         resultCard
       );
   
   
       return subtree;
     }
   
   
     container.appendChild(
       buildSubtree(
         root,
         true
       )
     );
   
   
     return nodeMap;
   }
   
   
   /* =========================================================
      GET SORTED RESULT ROW
   
      base case:
          call node 자체가 결과
   
      non-base:
          subtree 아래쪽의 merge-result node가 결과
      ========================================================= */
   
   function getResultRow(
     nodeInfo
   ) {
   
     if (
       nodeInfo.node.children.length === 0
     ) {
   
       return nodeInfo.callRow;
   
     }
   
   
     return nodeInfo.resultRow;
   }
   
   
   /* =========================================================
      GET RESULT CARD
      ========================================================= */
   
   function getResultCard(
     nodeInfo
   ) {
   
     if (
       nodeInfo.node.children.length === 0
     ) {
   
       return nodeInfo.callCard;
   
     }
   
   
     return nodeInfo.resultCard;
   }
   
   
   /* =========================================================
      STATUS
      ========================================================= */
   
   function setSortStatus(
     phase,
     depth,
     current
   ) {
   
     const phaseElement =
       document.getElementById(
         "sort-live-phase"
       );
   
   
     const phaseLabel =
       document.getElementById(
         "sort-phase-label"
       );
   
   
     const depthElement =
       document.getElementById(
         "sort-live-depth"
       );
   
   
     const currentElement =
       document.getElementById(
         "sort-live-current"
       );
   
   
     if (phaseElement) {
   
       phaseElement.textContent =
         phase;
   
     }
   
   
     if (phaseLabel) {
   
       phaseLabel.textContent =
         phase;
   
     }
   
   
     if (depthElement) {
   
       depthElement.textContent =
         String(depth);
   
     }
   
   
     if (currentElement) {
   
       currentElement.textContent =
         current;
   
     }
   
   }
   
   
   /* =========================================================
      CLEAR TEMPORARY HIGHLIGHTS
      ========================================================= */
   
   function clearStepHighlights() {
   
     const container =
       document.getElementById(
         "merge-tree-container"
       );
   
   
     if (!container) return;
   
   
     container
       .querySelectorAll(
         [
           ".is-comparing",
           ".is-moving-source",
           ".is-next-output"
         ].join(", ")
       )
       .forEach(
         element => {
   
           element.classList.remove(
             "is-comparing",
             "is-moving-source",
             "is-next-output"
           );
   
         }
       );
   
   }
   
   
   /* =========================================================
      CLEAR USED SOURCE CELLS AFTER ONE MERGE
      ========================================================= */
   
   function restoreMergeSources(
     parentInfo,
     nodeMap
   ) {
   
     if (
       !parentInfo ||
       parentInfo.node.children.length === 0
     ) {
       return;
     }
   
   
     for (
       const child
       of parentInfo.node.children
     ) {
   
       const info =
         nodeMap.get(
           child.id
         );
   
   
       if (!info) continue;
   
   
       const row =
         getResultRow(
           info
         );
   
   
       row
         .querySelectorAll(
           ".is-used"
         )
         .forEach(
           cell => {
   
             cell.classList.remove(
               "is-used"
             );
   
           }
         );
   
   
       const card =
         getResultCard(
           info
         );
   
   
       card.classList.remove(
         "is-merge-source"
       );
   
     }
   
   }
   
   
   /* =========================================================
      ANIMATE VALUE MOVEMENT
   
      source child
           ↓
      merge result node
   
      값이 아래 방향으로 실제 이동하는 것처럼 보인다.
      ========================================================= */
   
   async function animateValueMove(
     sourceCell,
     targetCell,
     value,
     runId
   ) {
   
     if (
       !sourceCell ||
       !targetCell
     ) {
       return;
     }
   
   
     const sourceRect =
       sourceCell.getBoundingClientRect();
   
   
     const targetRect =
       targetCell.getBoundingClientRect();
   
   
     const ghost =
       sourceCell.cloneNode(
         true
       );
   
   
     ghost.classList.add(
       "merge-moving-cell"
     );
   
   
     ghost.classList.remove(
       "is-comparing",
       "is-used"
     );
   
   
     ghost.textContent =
       String(value);
   
   
     ghost.style.left =
       `${sourceRect.left}px`;
   
   
     ghost.style.top =
       `${sourceRect.top}px`;
   
   
     ghost.style.width =
       `${sourceRect.width}px`;
   
   
     ghost.style.height =
       `${sourceRect.height}px`;
   
   
     document.body.appendChild(
       ghost
     );
   
   
     /*
       initial position을 browser가 먼저 그리도록 함.
     */
   
     await wait(30);
   
   
     if (
       runId !== sortRunId
     ) {
   
       ghost.remove();
   
       return;
   
     }
   
   
     const deltaX =
       targetRect.left -
       sourceRect.left;
   
   
     const deltaY =
       targetRect.top -
       sourceRect.top;
   
   
     ghost.style.transform =
       `translate(${deltaX}px, ${deltaY}px)`;
   
   
     await wait(
       SORT_TIMING.move
     );
   
   
     if (
       runId !== sortRunId
     ) {
   
       ghost.remove();
   
       return;
   
     }
   
   
     targetCell.textContent =
       String(value);
   
   
     targetCell.classList.add(
       "is-filled"
     );
   
   
     sourceCell.classList.add(
       "is-used"
     );
   
   
     ghost.remove();
   
   }
   
   
   /* =========================================================
      PLAY MERGESORT
      ========================================================= */
   
   async function playMergeSortEvents(
     events,
     nodeMap,
     runId
   ) {
   
     let comparisonCount = 0;
   
   
     const comparisonElement =
       document.getElementById(
         "sort-live-comparisons"
       );
   
   
     if (
       comparisonElement
     ) {
   
       comparisonElement.textContent =
         "0";
   
     }
   
   
     for (
       const event
       of events
     ) {
   
       if (
         runId !== sortRunId
       ) {
         return;
       }
   
   
       clearStepHighlights();
   
   
       /* =====================================================
          ENTER
          ===================================================== */
   
       if (
         event.type === "enter"
       ) {
   
         const info =
           nodeMap.get(
             event.nodeId
           );
   
   
         if (!info) continue;
   
   
         info.callCard.classList.add(
           "is-visible",
           "is-active"
         );
   
   
         setSortStatus(
           "RECURSE",
           event.depth,
           `mergesort([${event.values.join(", ")}])`
         );
   
   
         await wait(
           SORT_TIMING.enter
         );
   
   
         info.callCard.classList.remove(
           "is-active"
         );
   
       }
   
   
       /* =====================================================
          SPLIT
          ===================================================== */
   
       else if (
         event.type === "split"
       ) {
   
         const parentInfo =
           nodeMap.get(
             event.nodeId
           );
   
   
         const leftInfo =
           nodeMap.get(
             event.leftNodeId
           );
   
   
         const rightInfo =
           nodeMap.get(
             event.rightNodeId
           );
   
   
         if (!parentInfo) continue;
   
   
         /*
           현재 split 지점을 강하게 표시
         */
   
         const divider =
           parentInfo.callRow
             .querySelector(
               ".merge-split-divider"
             );
   
   
         if (divider) {
   
           divider.classList.add(
             "is-active"
           );
   
         }
   
   
         parentInfo.callCard.classList.add(
           "is-active",
           "is-splitting"
         );
   
   
         parentInfo.callNote.textContent =
           `split: m = ${event.splitIndex}`;
   
   
         parentInfo.splitFlow.classList.add(
           "is-visible",
           "is-active"
         );
   
   
         setSortStatus(
           "SPLIT",
           event.depth,
           `[${event.left.join(", ")}]  |  [${event.right.join(", ")}]`
         );
   
   
         /*
           split 위치를 충분히 볼 시간
         */
   
         await wait(
           SORT_TIMING.splitFocus
         );
   
   
         /*
           두 child가 아래에 나타남
         */
   
         if (parentInfo.childRow) {
   
           parentInfo.childRow.classList.add(
             "is-visible"
           );
   
         }
   
   
         if (leftInfo) {
   
           leftInfo.callCard.classList.add(
             "is-visible"
           );
   
         }
   
   
         await wait(
           180
         );
   
   
         if (rightInfo) {
   
           rightInfo.callCard.classList.add(
             "is-visible"
           );
   
         }
   
   
         await wait(
           SORT_TIMING.splitReveal
         );
   
   
         parentInfo.callCard.classList.remove(
           "is-active",
           "is-splitting"
         );
   
   
         parentInfo.splitFlow.classList.remove(
           "is-active"
         );
   
   
         if (divider) {
   
           divider.classList.remove(
             "is-active"
           );
   
         }
   
       }
   
   
       /* =====================================================
          BASE CASE
          ===================================================== */
   
       else if (
         event.type === "base"
       ) {
   
         const info =
           nodeMap.get(
             event.nodeId
           );
   
   
         if (!info) continue;
   
   
         info.callCard.classList.add(
           "is-visible",
           "is-active",
           "is-base"
         );
   
   
         info.callNote.textContent =
           "BASE CASE";
   
   
         setSortStatus(
           "BASE CASE",
           event.depth,
           `[${event.values.join(", ")}]`
         );
   
   
         await wait(
           SORT_TIMING.baseCase
         );
   
   
         info.callCard.classList.remove(
           "is-active"
         );
   
       }
   
   
       /* =====================================================
          MERGE START
          ===================================================== */
   
       else if (
         event.type === "merge-start"
       ) {
   
         const parentInfo =
           nodeMap.get(
             event.nodeId
           );
   
   
         const leftInfo =
           nodeMap.get(
             event.leftNodeId
           );
   
   
         const rightInfo =
           nodeMap.get(
             event.rightNodeId
           );
   
   
         if (
           !parentInfo ||
           !leftInfo ||
           !rightInfo
         ) {
           continue;
         }
   
   
         /*
           merge에 사용되는 두 child 결과 강조
         */
   
         getResultCard(
           leftInfo
         )
           .classList
           .add(
             "is-merge-source"
           );
   
   
         getResultCard(
           rightInfo
         )
           .classList
           .add(
             "is-merge-source"
           );
   
   
         /*
           PPT처럼 merge arrow와
           그 아래 merge result node 등장
         */
   
         parentInfo.mergeFlow.classList.add(
           "is-visible",
           "is-active"
         );
   
   
         parentInfo.resultCard.classList.add(
           "is-visible",
           "is-active",
           "is-merging"
         );
   
   
         parentInfo.resultNote.textContent =
           "";
   
   
         setSortStatus(
           "MERGE",
           event.depth,
           `[${event.left.join(", ")}] + [${event.right.join(", ")}]`
         );
   
   
         await wait(
           SORT_TIMING.mergeStart
         );
   
   
         parentInfo.resultCard.classList.remove(
           "is-active"
         );
   
   
         parentInfo.mergeFlow.classList.remove(
           "is-active"
         );
   
       }
   
   
       /* =====================================================
          COMPARE
          ===================================================== */
   
       else if (
         event.type === "compare"
       ) {
   
         const parentInfo =
           nodeMap.get(
             event.nodeId
           );
   
   
         const leftInfo =
           nodeMap.get(
             event.leftNodeId
           );
   
   
         const rightInfo =
           nodeMap.get(
             event.rightNodeId
           );
   
   
         if (
           !parentInfo ||
           !leftInfo ||
           !rightInfo
         ) {
           continue;
         }
   
   
         comparisonCount += 1;
   
   
         if (
           comparisonElement
         ) {
   
           comparisonElement.textContent =
             comparisonCount.toLocaleString();
   
         }
   
   
         const leftRow =
           getResultRow(
             leftInfo
           );
   
   
         const rightRow =
           getResultRow(
             rightInfo
           );
   
   
         const leftCell =
           leftRow.querySelector(
             `.merge-value-cell[data-index="${event.leftIndex}"]`
           );
   
   
         const rightCell =
           rightRow.querySelector(
             `.merge-value-cell[data-index="${event.rightIndex}"]`
           );
   
   
         const targetCell =
           parentInfo.resultRow
             .querySelector(
               `.merge-value-cell[data-index="${event.outputIndex}"]`
             );
   
   
         if (leftCell) {
   
           leftCell.classList.add(
             "is-comparing"
           );
   
         }
   
   
         if (rightCell) {
   
           rightCell.classList.add(
             "is-comparing"
           );
   
         }
   
   
         if (targetCell) {
   
           targetCell.classList.add(
             "is-next-output"
           );
   
         }
   
   
         parentInfo.resultCard.classList.add(
           "is-active"
         );
   
   
         parentInfo.resultNote.textContent =
           `compare ${event.leftValue} vs ${event.rightValue}`;
   
   
         setSortStatus(
           "COMPARE",
           event.depth,
           `${event.leftValue} vs ${event.rightValue} → output[${event.outputIndex}]`
         );
   
   
         await wait(
           SORT_TIMING.compare
         );
   
   
         parentInfo.resultCard.classList.remove(
           "is-active"
         );
   
       }
   
   
       /* =====================================================
          MOVE
          ===================================================== */
   
       else if (
         event.type === "move"
       ) {
   
         const parentInfo =
           nodeMap.get(
             event.nodeId
           );
   
   
         const sourceInfo =
           nodeMap.get(
             event.sourceNodeId
           );
   
   
         if (
           !parentInfo ||
           !sourceInfo
         ) {
           continue;
         }
   
   
         const sourceRow =
           getResultRow(
             sourceInfo
           );
   
   
         const sourceCell =
           sourceRow.querySelector(
             `.merge-value-cell[data-index="${event.sourceIndex}"]`
           );
   
   
         const targetCell =
           parentInfo.resultRow
             .querySelector(
               `.merge-value-cell[data-index="${event.outputIndex}"]`
             );
   
   
         if (sourceCell) {
   
           sourceCell.classList.add(
             "is-moving-source"
           );
   
         }
   
   
         if (targetCell) {
   
           targetCell.classList.add(
             "is-next-output"
           );
   
         }
   
   
         parentInfo.resultNote.textContent =
           "";
   
   
         setSortStatus(
           "MOVE",
           event.depth,
           `${event.value} ↓ result[${event.outputIndex}]`
         );
   
   
         await animateValueMove(
           sourceCell,
           targetCell,
           event.value,
           runId
         );
   
   
         if (
           runId !== sortRunId
         ) {
           return;
         }
   
   
         await wait(
           SORT_TIMING.afterMove
         );
   
       }
   
   
       /* =====================================================
          MERGE DONE
          ===================================================== */
   
       else if (
         event.type === "merge-done"
       ) {
   
         const parentInfo =
           nodeMap.get(
             event.nodeId
           );
   
   
         if (!parentInfo) continue;
   
   
         restoreMergeSources(
           parentInfo,
           nodeMap
         );
   
   
         parentInfo.resultCard.classList.remove(
           "is-active",
           "is-merging"
         );
   
   
         parentInfo.resultCard.classList.add(
           "is-merged"
         );
   
   
         parentInfo.resultNote.textContent =
           "";
   
   
         setSortStatus(
           "MERGED",
           event.depth,
           `[${event.result.join(", ")}]`
         );
   
   
         await wait(
           SORT_TIMING.mergeDone
         );
   
       }
   
     }
   
   
     /* =====================================================
        DONE
        ===================================================== */
   
     clearStepHighlights();
   
   
     setSortStatus(
       "DONE",
       0,
       "Array sorted"
     );
   
   
     await wait(
       SORT_TIMING.done
     );
   
   }
   
   
   /* =========================================================
      RUN MERGESORT
      ========================================================= */
   
   async function runMergeSort() {
   
     const message =
       document.getElementById(
         "sort-input-message"
       );
   
   
     let values;
   
   
     try {
   
       values =
         readInputArray();
   
     }
   
     catch (error) {
   
       if (message) {
   
         message.textContent =
           error.message;
   
       }
   
       return;
   
     }
   
   
     if (message) {
   
       message.textContent = "";
   
     }
   
   
     /*
       이전 animation 무효화
     */
   
     sortRunId += 1;
   
   
     const runId =
       sortRunId;
   
   
     /* =====================================================
        CREATE TRACE
        ===================================================== */
   
     const {
       root,
       events
     } =
       buildMergeSortTrace(
         values
       );
   
   
     /* =====================================================
        PREPARE DIAGRAM
        ===================================================== */
   
     const nodeMap =
       renderMergeSortDiagram(
         root
       );
   
   
     const comparisonElement =
       document.getElementById(
         "sort-live-comparisons"
       );
   
   
     if (
       comparisonElement
     ) {
   
       comparisonElement.textContent =
         "0";
   
     }
   
   
     setSortStatus(
       "READY",
       0,
       "Starting mergesort..."
     );
   
   
     /* =====================================================
        SCROLL TO VISUALIZATION
        ===================================================== */
   
     const visualization =
       document.getElementById(
         "sort-visualization"
       );
   
   
     if (
       visualization
     ) {
   
       visualization.scrollIntoView({
         behavior: "smooth",
         block: "start"
       });
   
     }
   
   
     /*
       이동한 다음 animation 시작
     */
   
     await wait(
       SORT_TIMING.scroll
     );
   
   
     if (
       runId !== sortRunId
     ) {
       return;
     }
   
   
     /* =====================================================
        PLAY
        ===================================================== */
   
     await playMergeSortEvents(
       events,
       nodeMap,
       runId
     );
   
   }
   
   
   /* =========================================================
      RESET
      ========================================================= */
   
   function resetMergeSort() {
   
     /*
       현재 animation 취소
     */
   
     sortRunId += 1;
   
   
     createArrayInputs();
   
   
     const tree =
       document.getElementById(
         "merge-tree-container"
       );
   
   
     if (tree) {
   
       tree.innerHTML =
         `
         <div class="visualization-placeholder">
           Create an array and press RUN MERGESORT.
         </div>
         `;
   
     }
   
   
     const comparisonElement =
       document.getElementById(
         "sort-live-comparisons"
       );
   
   
     if (
       comparisonElement
     ) {
   
       comparisonElement.textContent =
         "0";
   
     }
   
   
     setSortStatus(
       "READY",
       "-",
       "-"
     );
   
   }
   
   
   /* =========================================================
      INITIALIZATION
      ========================================================= */
   
   updateClock();
   
   
   window.setInterval(
     updateClock,
     1000
   );
   
   
   /* ---------------------------------------------------------
      ELEMENTS
      --------------------------------------------------------- */
   
   const sizeInput =
     document.getElementById(
       "sort-size"
     );
   
   
   const createButton =
     document.getElementById(
       "create-array-button"
     );
   
   
   const runButton =
     document.getElementById(
       "run-mergesort-button"
     );
   
   
   const resetButton =
     document.getElementById(
       "reset-sort-button"
     );
   
   
   /* ---------------------------------------------------------
      CREATE ARRAY
      --------------------------------------------------------- */
   
   if (
     createButton
   ) {
   
     createButton.addEventListener(
       "click",
       createArrayInputs
     );
   
   }
   
   
   /* ---------------------------------------------------------
      RUN
      --------------------------------------------------------- */
   
   if (
     runButton
   ) {
   
     runButton.addEventListener(
       "click",
       runMergeSort
     );
   
   }
   
   
   /* ---------------------------------------------------------
      RESET
      --------------------------------------------------------- */
   
   if (
     resetButton
   ) {
   
     resetButton.addEventListener(
       "click",
       resetMergeSort
     );
   
   }
   
   
   /* ---------------------------------------------------------
      INPUT SIZE ENTER
      --------------------------------------------------------- */
   
   if (
     sizeInput
   ) {
   
     sizeInput.addEventListener(
       "keydown",
       event => {
   
         if (
           event.key === "Enter"
         ) {
   
           createArrayInputs();
   
         }
   
       }
     );
   
   }
   
   
   /* ---------------------------------------------------------
      INITIAL ARRAY
      --------------------------------------------------------- */
   
   createArrayInputs();