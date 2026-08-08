const SVG_NS = "http://www.w3.org/2000/svg";

let fib1AnimationTimers = [];
let fib2AnimationTimers = [];

let fib1RunId = 0;
let fib2RunId = 0;


/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {
  const clock = document.getElementById("system-clock");

  if (!clock) return;

  const now = new Date();

  clock.textContent = now.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

/* =========================================================
   FIB1 ANIMATION TIMER
   ========================================================= */

   function scheduleFIB1Animation(
    callback,
    delay,
    runId
  ) {
  
    const timer =
      window.setTimeout(
        () => {
  
          if (runId === fib1RunId) {
            callback();
          }
  
        },
        delay
      );
  
    fib1AnimationTimers.push(timer);
  }
  
  
  function clearFIB1Animations() {
  
    fib1RunId += 1;
  
    for (
      const timer
      of fib1AnimationTimers
    ) {
  
      window.clearTimeout(timer);
  
    }
  
    fib1AnimationTimers = [];
  }
  
  
  /* =========================================================
     FIB2 ANIMATION TIMER
     ========================================================= */
  
  function scheduleFIB2Animation(
    callback,
    delay,
    runId
  ) {
  
    const timer =
      window.setTimeout(
        () => {
  
          if (runId === fib2RunId) {
            callback();
          }
  
        },
        delay
      );
  
    fib2AnimationTimers.push(timer);
  }
  
  
  function clearFIB2Animations() {
  
    fib2RunId += 1;
  
    for (
      const timer
      of fib2AnimationTimers
    ) {
  
      window.clearTimeout(timer);
  
    }
  
    fib2AnimationTimers = [];
  }

/* =========================================================
   FIBONACCI
   ========================================================= */

function computeFIB2Values(n) {
  const values = [0];

  if (n >= 1) {
    values.push(1);
  }

  for (let i = 2; i <= n; i += 1) {
    values.push(
      values[i - 1] + values[i - 2]
    );
  }

  return values;
}


/*
  실제 recursive Fibonacci를 실행해서 호출 횟수를 세면
  n이 커질수록 너무 느려지므로 호출 횟수만 DP 방식으로 계산한다.

  C(0) = 1
  C(1) = 1

  C(n)
    = 현재 fibo(n) 호출 1번
      + fibo(n-1)의 호출 수
      + fibo(n-2)의 호출 수
*/
function recursiveCallCount(n) {
  if (n <= 1) {
    return 1;
  }

  let previousTwo = 1;
  let previousOne = 1;

  for (let i = 2; i <= n; i += 1) {
    const current =
      1 + previousOne + previousTwo;

    previousTwo = previousOne;
    previousOne = current;
  }

  return previousOne;
}

function fib1AdditionCount(n) {

  /*
    A(0) = 0
    A(1) = 0

    FIB1(n)에서 n > 1이면

    return FIB1(n-1) + FIB1(n-2)

    의 + 연산이 한 번 발생하므로

    A(n)
      = A(n-1)
      + A(n-2)
      + 1
  */

  if (n <= 1) {
    return 0;
  }

  let a0 = 0;
  let a1 = 0;

  for (let i = 2; i <= n; i += 1) {

    const current =
      a1 + a0 + 1;

    a0 = a1;
    a1 = current;

  }

  return a1;
}

function fib2AdditionCount(n) {

  /*
    FIB2에서는

    i = 2, ..., n

    에 대해 addition이 한 번씩 발생
  */

  return Math.max(0, n - 1);
}

function getInputN() {

  const fibInput =
    document.getElementById(
      "fib-input"
    );


  if (!fibInput) {
    return 7;
  }


  let n =
    Number.parseInt(
      fibInput.value,
      10
    );


  if (Number.isNaN(n)) {
    n = 7;
  }


  n =
    Math.max(
      0,
      Math.min(
        20,
        n
      )
    );


  fibInput.value =
    String(n);


  return n;
}

function updateSummary(n) {

  const values =
    computeFIB2Values(n);


  const result =
    values[n];


  const fib1Calls =
    recursiveCallCount(n);


  const fib1Additions =
    fib1AdditionCount(n);


  const fib2Additions =
    fib2AdditionCount(n);


  const resultElement =
    document.getElementById(
      "result-value"
    );


  if (resultElement) {

    resultElement.textContent =
      result.toLocaleString();

  }


  const fib1AdditionElement =
    document.getElementById(
      "fib1-additions"
    );


  if (fib1AdditionElement) {

    fib1AdditionElement.textContent =
      fib1Additions.toLocaleString();

  }


  const fib2AdditionElement =
    document.getElementById(
      "fib2-additions"
    );


  if (fib2AdditionElement) {

    fib2AdditionElement.textContent =
      fib2Additions.toLocaleString();

  }


  const fib1CallElement =
    document.getElementById(
      "fib1-call-count"
    );


  if (fib1CallElement) {

    fib1CallElement.textContent =
      fib1Calls.toLocaleString();

  }


  const observationFib1 =
    document.getElementById(
      "observation-fib1-additions"
    );


  if (observationFib1) {

    observationFib1.textContent =
      fib1Additions.toLocaleString();

  }


  const observationFib2 =
    document.getElementById(
      "observation-fib2-additions"
    );


  if (observationFib2) {

    observationFib2.textContent =
      fib2Additions.toLocaleString();

  }


  return values;
}

/* =========================================================
   SVG HELPER
   ========================================================= */

function createSvgElement(tagName, attributes = {}) {
  const element =
    document.createElementNS(SVG_NS, tagName);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }

  return element;
}


/* =========================================================
   RECURSION TREE LAYOUT
   ========================================================= */

/*
  Tree의 leaf를 왼쪽부터 차례대로 배치한다.

  내부 node의 x 좌표는
  두 child의 x 좌표 중간값으로 결정한다.

                fibo(4)
               /       \
          fibo(3)     fibo(2)

  이런 식으로 자연스럽게 tree가 만들어진다.
*/
/* =========================================================
   FIB1 TREE LAYOUT
   ========================================================= */
   function countFIB1Leaves(n) {

    /*
      FIB1 recursion tree에서
      FIB1(0), FIB1(1)의 개수
  
      L(0) = 1
      L(1) = 1
      L(n) = L(n-1) + L(n-2)
    */
  
    if (n <= 1) {
      return 1;
    }
  
    let a = 1;
    let b = 1;
  
    for (let i = 2; i <= n; i += 1) {
  
      const current =
        a + b;
  
      a = b;
      b = current;
    }
  
    return b;
  }


   function buildTreeLayout(n) {
    const leafCount = countFIB1Leaves(n);
    const desiredWidth = 2200;
    const sidePadding = 50;
    const horizontalGap =
      Math.max(
        28,
        Math.min(
          82,

          (desiredWidth - 2 * sidePadding) /
          Math.max(1, leafCount - 1)
        )
      );

    const verticalGap = 72;
  
    const topPadding = 42;
  
    let leafIndex = 0;
    let deepestDepth = 0;
    let nextNodeId = 0;

    function visit(value, depth, parentId = null) {
  
      deepestDepth =
        Math.max(deepestDepth, depth);
  
  
      const node = {
  
        id: nextNodeId++,
  
        value: value,
  
        depth: depth,
  
        parentId: parentId,
  
        x: 0,
        y: topPadding + depth * verticalGap,
  
        children: []
  
      };
  
  
      /*
        실제 FIB1과 동일하게
  
        FIB1(n-1)
        FIB1(n-2)
  
        두 child를 만든다.
      */
      if (value > 1) {
  
        const leftChild =
          visit(
            value - 1,
            depth + 1,
            node.id
          );
  
  
        const rightChild =
          visit(
            value - 2,
            depth + 1,
            node.id
          );
  
  
        node.children.push(
          leftChild,
          rightChild
        );
  
  
        /*
          부모는 두 child의 중앙에 배치
        */
        node.x =
          (
            leftChild.x +
            rightChild.x
          ) / 2;
  
      }
  
      else {
  
        /*
          FIB1(0), FIB1(1)은 leaf
        */
        node.x =
          sidePadding +
          leafIndex * horizontalGap;
  
        leafIndex += 1;
  
      }
  
  
      return node;
    }
  
  
    const root =
      visit(n, 0);
  
  
    const width =
      Math.max(
        700,
  
        sidePadding * 2 +
  
        Math.max(
          1,
          leafIndex - 1
        ) * horizontalGap
      );
  
  
    const height =
      topPadding * 2 +
      deepestDepth * verticalGap +
      50;
  
  
    return {
      root,
      width,
      height,
      horizontalGap
    };
  }

  /* =========================================================
   FIB1 EXECUTION TRACE
   ========================================================= */

/*
  실제 FIB1이 실행되는 순서를 event 배열로 만든다.

  예를 들어 FIB1(2)는:

  CALL FIB1(2)
      CALL FIB1(1)
      RETURN 1

      CALL FIB1(0)
      RETURN 0

      ADD 1 + 0
  RETURN 1

  순서로 진행된다.
*/

function buildFIB1Execution(root) {

  const events = [];


  function execute(node) {

    /* -----------------------------------------------
       함수 호출
       ----------------------------------------------- */

    events.push({
      type: "call",

      nodeId: node.id,
      parentId: node.parentId,

      value: node.value,
      depth: node.depth
    });


    /* -----------------------------------------------
       Base case
       ----------------------------------------------- */

    if (node.value <= 1) {

      events.push({
        type: "return",

        nodeId: node.id,
        parentId: node.parentId,

        value: node.value,
        result: node.value,

        depth: node.depth
      });


      return node.value;
    }


    /* -----------------------------------------------
       FIB1(n - 1)
       ----------------------------------------------- */

    const leftResult =
      execute(
        node.children[0]
      );


    /* -----------------------------------------------
       FIB1(n - 2)
       ----------------------------------------------- */

    const rightResult =
      execute(
        node.children[1]
      );


    /* -----------------------------------------------
       addition
       ----------------------------------------------- */

    const result =
      leftResult +
      rightResult;


    events.push({
      type: "add",

      nodeId: node.id,
      parentId: node.parentId,

      value: node.value,

      leftResult: leftResult,
      rightResult: rightResult,

      result: result,

      depth: node.depth
    });


    /* -----------------------------------------------
       return
       ----------------------------------------------- */

    events.push({
      type: "return",

      nodeId: node.id,
      parentId: node.parentId,

      value: node.value,
      result: result,

      depth: node.depth
    });


    return result;
  }


  execute(root);


  return events;
}

/* =========================================================
   DRAW RECURSION TREE
   ========================================================= */
   function renderTree(n, runId) {

    const container =
      document.getElementById(
        "tree-container"
      );
  
  
    if (!container) return;
  
  
    /*
      이전 tree 제거
    */
    container.replaceChildren();
  
  
    /* =====================================================
       1. 전체 tree의 위치를 먼저 계산
       ===================================================== */
  
    const layout =
      buildTreeLayout(n);
    
    const nodeWidth =
      Math.max(
        44,
        Math.min(
          86,
          layout.horizontalGap * 0.9
        )
      );

    const fontSize =
      Math.max(
        7,
        Math.min(
          11,
          nodeWidth / 7
        )
      );
  
  
    /* =====================================================
       2. SVG 생성
       ===================================================== */
  
    const svg =
      createSvgElement(
        "svg",
        {
          class: "tree-svg",
  
          width: layout.width,
          height: layout.height,
  
          viewBox:
            `0 0 ${layout.width} ${layout.height}`,
  
          role: "img",
  
          "aria-label":
            `FIB1(${n}) execution tree`
        }
      );
  
  
    /*
      edge와 node를 별도의 layer에 둔다.
    */
    const edgeLayer =
      createSvgElement(
        "g",
        {
          class: "tree-edge-layer"
        }
      );
  
  
    const nodeLayer =
      createSvgElement(
        "g",
        {
          class: "tree-node-layer"
        }
      );
  
  
    svg.append(
      edgeLayer,
      nodeLayer
    );
  
  
    container.appendChild(svg);
  
  
    /* =====================================================
       3. animation에서 사용할 map
       ===================================================== */
  
    /*
      node ID
          ->
      실제 SVG node
    */
    const nodeMap =
      new Map();
  
  
    /*
      child node ID
          ->
      parent에서 child로 들어오는 edge
    */
    const edgeMap =
      new Map();
  
  
    /* =====================================================
       4. 전체 SVG를 미리 생성
       ===================================================== */
  
    function drawTree(
      node,
      parent = null
    ) {
  
      /* -----------------------------------------------
         Parent → Child edge
         ----------------------------------------------- */
  
      if (parent !== null) {
  
        const line =
          createSvgElement(
            "line",
            {
              class: "tree-edge",
  
              x1: parent.x,
              y1: parent.y + 17,
  
              x2: node.x,
              y2: node.y - 17
            }
          );
  
  
        edgeLayer.appendChild(line);
  
  
        /*
          이 node가 호출될 때
          이 edge도 같이 나타나게 하기 위해 저장
        */
        edgeMap.set(
          node.id,
          line
        );
  
      }
  
  
      /* -----------------------------------------------
         Node
         ----------------------------------------------- */
  
      const classes =
        ["tree-node-group"];
  
  
      if (node.value <= 1) {
        classes.push(
          "is-base"
        );
      }
  
  
      const group =
        createSvgElement(
          "g",
          {
            class:
              classes.join(" ")
          }
        );
  
  
      const rect =
        createSvgElement(
          "rect",
          {
            class:
              "tree-node-rect",
  
            x:
              node.x - nodeWidth / 2,
  
            y:
              node.y - 16,
  
            width: nodeWidth,
            height: 32,
  
            rx: 5
          }
        );
  
  
      const text =
        createSvgElement(
          "text",
          {
            class:
              "tree-node-text",
  
            x: node.x,
  
            y:
              node.y + 1,
            
            "font-size": fontSize
          }
        );
  
  
      text.textContent =
        `FIB1(${node.value})`;
  
  
      group.append(
        rect,
        text
      );
  
  
      nodeLayer.appendChild(
        group
      );
  
  
      /*
        execution animation에서
        찾아올 수 있도록 저장
      */
      nodeMap.set(
        node.id,
        {
          node: node,
          group: group,
          text: text
        }
      );
  
  
      /* -----------------------------------------------
         Children
         ----------------------------------------------- */
  
      for (
        const child
        of node.children
      ) {
  
        drawTree(
          child,
          node
        );
  
      }
  
    }
  
  
    drawTree(
      layout.root
    );
  
  
    /* =====================================================
       5. 실제 실행 event 생성
       ===================================================== */
  
    const events =
      buildFIB1Execution(
        layout.root
      );
  
  
    /* =====================================================
       6. 실행 animation
       ===================================================== */
  
    playFIB1Execution(
      events,
      nodeMap,
      edgeMap,
      container,
      runId
    );
  
  
    /*
      처음에는 root가 화면 중앙에 오게 한다.
    */
    requestAnimationFrame(
      () => {
  
        const root =
          layout.root;
  
  
        container.scrollLeft =
          Math.max(
            0,
            root.x -
            container.clientWidth / 2
          );
  
      }
    );
  }

/* =========================================================
   PLAY FIB1 EXECUTION
   ========================================================= */

   function playFIB1Execution(
    events,
    nodeMap,
    edgeMap,
    container,
    runId
  ) {
  
    let callCount = 0;
    let additionCount = 0;
  
  
    /*
      하나의 execution event가 진행되는 시간.
  
      값을 크게 하면 FIB1이 더 느리게 보인다.
    */
    const stepDelay = 100;
    const initialDelay = 650;
  
  
    /* =====================================================
       Helper
       ===================================================== */
  
    function clearActiveNode() {
  
      nodeMap.forEach(
        ({ group }) => {
  
          group.classList.remove(
            "is-active"
          );
  
        }
      );
  
    }
  
    /*
      HTML에 해당 상태창을 추가했다면 갱신하고,
      없어도 에러가 나지 않도록 처리.
    */
    function updateStatus(
      id,
      value
    ) {
  
      const element =
        document.getElementById(id);
  
  
      if (element) {
        element.textContent =
          value;
      }
  
    }
  
  
    /* =====================================================
       Events
       ===================================================== */
  
    events.forEach(
      (event, index) => {
  
        scheduleFIB1Animation(
  
          () => {
  
            const info =
              nodeMap.get(
                event.nodeId
              );
  
  
            if (!info) return;
  
  
            const {
              node,
              group
            } = info;
  
  
            /* =============================================
               CALL
               ============================================= */
  
            if (
              event.type === "call"
            ) {
  
              callCount += 1;
  
  
              /*
                이전 active node highlight 해제
              */
              clearActiveNode();
  
  
              /*
                이 node로 들어오는 edge 표시
              */
              const edge =
                edgeMap.get(
                  event.nodeId
                );
  
  
              if (edge) {
  
                edge.classList.add(
                  "is-visible"
                );
  
              }
  
  
              /*
                현재 함수 호출 node 표시
              */
              group.classList.add(
                "is-visible",
                "is-active"
              );
  
              /*
                선택적으로 live status 갱신
              */
              updateStatus(
                "fib1-live-calls",
                callCount.toLocaleString()
              );
  
  
              updateStatus(
                "fib1-live-current",
                `CALL FIB1(${event.value})`
              );
  
            }
  
  
            /* =============================================
               ADD
               ============================================= */
  
            else if (
              event.type === "add"
            ) {
  
              additionCount += 1;
  
  
              clearActiveNode();
  
  
              group.classList.add(
                "is-active"
              );
  
  
              updateStatus(
                "fib1-live-additions",
  
                additionCount
                  .toLocaleString()
              );
  
  
              updateStatus(
                "fib1-live-current",
  
                `FIB1(${event.value}): ` +
                `${event.leftResult} + ` +
                `${event.rightResult} = ` +
                `${event.result}`
              );
  
            }
  
  
            /* =============================================
               RETURN
               ============================================= */
  
            else if (
              event.type === "return"
            ) {
  
              clearActiveNode();
  
  
              /*
                계산 완료 node
              */
              group.classList.remove(
                "is-active"
              );
  
  
              group.classList.add(
                "is-done"
              );
  
  
              updateStatus(
                "fib1-live-current",
  
                `RETURN ${event.result} ` +
                `from FIB1(${event.value})`
              );
  
  
              /*
                return 후에는 caller가 다시 실행 중
              */
              if (
                event.parentId !== null
              ) {
  
                const parentInfo =
                  nodeMap.get(
                    event.parentId
                  );
  
  
                if (parentInfo) {
  
                  parentInfo
                    .group
                    .classList
                    .add(
                      "is-active"
                    );
  
                }
  
              }
  
            }
  
          },
  
          initialDelay + index * stepDelay,
  
          runId
        );
  
      }
    );
  
  
    /*
      모든 실행이 끝난 뒤
    */
    scheduleFIB1Animation(
  
      () => {
  
        clearActiveNode();
  
  
        updateStatus(
          "fib1-live-current",
          "DONE"
        );
  
      },
  
      initialDelay + events.length * stepDelay + 100,
  
      runId
    );
  }

/* =========================================================
   DP TABLE BUILD
   ========================================================= */

   function renderFIB2(values, runId) {

    const container =
      document.getElementById("dp-container");
  
    if (!container) return;
  
  
    container.replaceChildren();
  
  
    /* =====================================================
       현재 계산식을 보여주는 영역
       ===================================================== */
  
    const formulaBox =
      document.createElement("div");
  
    formulaBox.className =
      "fib2-formula-box";
  
    formulaBox.innerHTML =
      `<span class="formula-placeholder">
         Waiting for FIB2...
       </span>`;
  
  
    /* =====================================================
       배열을 가로로 배치
       ===================================================== */
  
    const scrollArea =
      document.createElement("div");
  
    scrollArea.className =
      "fib2-array-scroll";
  
  
    const array =
      document.createElement("div");
  
    array.className =
      "fib2-array";
  
  
    const cells = [];
  
  
    values.forEach((value, index) => {
  
      const item =
        document.createElement("div");
  
      item.className =
        "fib2-array-item";
  
  
      const indexLabel =
        document.createElement("span");
  
      indexLabel.className =
        "fib2-array-index";
  
      indexLabel.textContent =
        `f[${index}]`;
  
  
      const cell =
        document.createElement("div");
  
      cell.className =
        "fib2-array-cell";
  
  
      /*
        처음에는 값이 없는 것처럼 보이게 한다.
      */
      cell.textContent = "";
  
  
      item.append(
        indexLabel,
        cell
      );
  
  
      array.appendChild(item);
  
  
      cells.push({
        item,
        cell,
        value
      });
  
    });
  
  
    scrollArea.appendChild(array);
  
    container.append(
      scrollArea,
      formulaBox
    );
  
  
    /* =====================================================
       Highlight 제거 함수
       ===================================================== */
  
    function clearHighlights() {
  
      cells.forEach(({ cell }) => {
  
        cell.classList.remove(
          "is-source",
          "is-result"
        );
  
      });
  
    }
  
  
    /* =====================================================
       Animation
       ===================================================== */
  
    const stepDelay =
      values.length <= 10
        ? 700
        : 450;
    const initialDelay = 550;
  
  
    values.forEach((value, index) => {
  
      const startTime = initialDelay + index * stepDelay;
  
  
      scheduleFIB2Animation(
  
        () => {
  
          clearHighlights();
  
  
          /* -----------------------------------------------
             f[0]
             ----------------------------------------------- */
  
          if (index === 0) {
  
            formulaBox.innerHTML =
              `
              <span class="formula-target">
                f[0]
              </span>
              =
              <strong>0</strong>
  
              <span class="base-label">
                base case
              </span>
              `;
  
          }
  
  
          /* -----------------------------------------------
             f[1]
             ----------------------------------------------- */
  
          else if (index === 1) {
  
            formulaBox.innerHTML =
              `
              <span class="formula-target">
                f[1]
              </span>
              =
              <strong>1</strong>
  
              <span class="base-label">
                base case
              </span>
              `;
  
          }
  
  
          /* -----------------------------------------------
             f[i] = f[i-1] + f[i-2]
             ----------------------------------------------- */
  
          else {
  
            /*
              이전 두 값을 highlight
            */
  
            cells[index - 1]
              .cell
              .classList
              .add("is-source");
  
  
            cells[index - 2]
              .cell
              .classList
              .add("is-source");
  
  
            formulaBox.innerHTML =
              `
              <span class="formula-target">
                f[${index}]
              </span>
  
              =
  
              f[${index - 1}]
              +
              f[${index - 2}]
  
              <span class="formula-arrow">
                =
              </span>
  
              ${values[index - 1]}
              +
              ${values[index - 2]}
  
              <span class="formula-arrow">
                =
              </span>
  
              <strong>
                ${value}
              </strong>
              `;
  
          }
  
        },
  
        startTime,
  
        runId
      );
  
  
      /*
        계산식이 먼저 보인 다음
        약간 뒤에 실제 배열 값이 생성되게 한다.
      */
  
      scheduleFIB2Animation(
  
        () => {
  
          const currentCell =
            cells[index].cell;
  
  
          currentCell.textContent =
            value.toLocaleString();
  
  
          currentCell.classList.add(
            "is-visible",
            "is-result"
          );
        },
  
        startTime + 220,
  
        runId
      );
  
    });
  
  }
  
/* =========================================================
   RUN
   ========================================================= */

   function runFIB1() {

    const n =
      getInputN();
  
  
    /*
      Summary 값 갱신
    */
    updateSummary(n);
  
  
    /*
      현재 실행 중인 FIB1 animation만 취소
    */
    clearFIB1Animations();
  
  
    const runId =
      fib1RunId;
  
  
    /*
      live counter 초기화
    */
    const liveCalls =
      document.getElementById(
        "fib1-live-calls"
      );
  
  
    const liveAdditions =
      document.getElementById(
        "fib1-live-additions"
      );
  
  
    const liveCurrent =
      document.getElementById(
        "fib1-live-current"
      );
  
  
    if (liveCalls) {
      liveCalls.textContent = "0";
    }
  
  
    if (liveAdditions) {
      liveAdditions.textContent = "0";
    }
  
  
    if (liveCurrent) {
      liveCurrent.textContent = "READY";
    }
  
  
    /*
      FIB1 tree를 먼저 생성한다.
    */
    renderTree(
      n,
      runId
    );
  
  
    /*
      FIB1 CALL TREE로 자동 이동
    */
    const treeContainer =
      document.getElementById(
        "tree-container"
      );
  
  
    if (treeContainer) {
  
      treeContainer.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
  
    }
  
  }

  function runFIB2() {

    const n =
      getInputN();
  
  
    /*
      Summary 값 갱신 + FIB2 values 획득
    */
    const values =
      updateSummary(n);
  
  
    /*
      현재 실행 중인 FIB2 animation만 취소
    */
    clearFIB2Animations();
  
  
    const runId =
      fib2RunId;
  
  
    /*
      FIB2 visualization 생성
    */
    renderFIB2(
      values,
      runId
    );
  
  
    /*
      FIB2 ARRAY BUILD로 자동 이동
    */
    const dpContainer =
      document.getElementById(
        "dp-container"
      );
  
  
    if (dpContainer) {
  
      dpContainer.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
  
    }
  
  }

/* =========================================================
   INITIALIZATION
   ========================================================= */

   updateClock();


   window.setInterval(
     updateClock,
     1000
   );
   
   
   const fibInput =
     document.getElementById(
       "fib-input"
     );
   
   
   const runFIB1Button =
     document.getElementById(
       "run-fib1-button"
     );
   
   
   const runFIB2Button =
     document.getElementById(
       "run-fib2-button"
     );
   
   
   /* =========================================================
      RUN FIB1 BUTTON
      ========================================================= */
   
   if (runFIB1Button) {
   
     runFIB1Button.addEventListener(
       "click",
       runFIB1
     );
   
   }
   
   
   /* =========================================================
      RUN FIB2 BUTTON
      ========================================================= */
   
   if (runFIB2Button) {
   
     runFIB2Button.addEventListener(
       "click",
       runFIB2
     );
   
   }
   
   
   /* =========================================================
      ENTER KEY
      ========================================================= */
   
   if (fibInput) {
   
     fibInput.addEventListener(
       "keydown",
       (event) => {
   
         /*
           Enter는 FIB1을 실행하도록 설정.
   
           원한다면 이 동작은 제거해도 된다.
         */
         if (event.key === "Enter") {
   
           runFIB1();
   
         }
   
       }
     );
   
   }
   
   
   /* =========================================================
      INITIAL PAGE STATE
      ========================================================= */
   
   /*
     페이지를 처음 열었을 때는
     animation을 자동 실행하지 않는다.
   
     summary 숫자만 기본 n=7에 맞춰 놓는다.
   */
   
   if (fibInput) {
   
     const initialN =
       getInputN();
   
   
     updateSummary(
       initialN
     );
   
   }

  