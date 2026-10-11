/* =========================================================
   EDIT DISTANCE LAB — DP table fill visualization
   ========================================================= */

const TIMING = {
  base: 280,
  inspect: 700,
  fill: 520,
  path: 420,
  finish: 600
};

const stringXInput = document.getElementById("string-x-input");
const stringYInput = document.getElementById("string-y-input");
const runButton = document.getElementById("run-edit-button");
const pauseButton = document.getElementById("pause-edit-button");
const resumeButton = document.getElementById("resume-edit-button");
const stopButton = document.getElementById("stop-edit-button");
const exampleSnowyButton = document.getElementById("example-snowy-button");
const exampleExpButton = document.getElementById("example-exp-button");
const exampleHeekapButton = document.getElementById("example-heekap-button");
const editVisualization = document.getElementById("edit-visualization");
const inputMessage = document.getElementById("edit-input-message");
const modeLabel = document.getElementById("edit-mode-label");
const tableContainer = document.getElementById("edit-table-container");
const opTitle = document.getElementById("edit-operation-title");
const opDetail = document.getElementById("edit-operation-detail");
const transformEl = document.getElementById("edit-transform");
const alignmentEl = document.getElementById("edit-alignment");
const operationBox = document.querySelector(".edit-operation-box");

let runToken = 0;
let playing = false;
let paused = false;
let finished = false;
let table = [];
let choice = [];
let stringX = "";
let stringY = "";
let cellElements = new Map();

function setMessage(text) {
  if (inputMessage) inputMessage.textContent = text || "";
}

function setOperation(title, detail) {
  if (opTitle) {
    opTitle.hidden = false;
    opTitle.textContent = title;
  }
  if (opDetail) {
    opDetail.hidden = false;
    opDetail.textContent = detail;
  }
  if (transformEl) {
    transformEl.hidden = true;
    transformEl.innerHTML = "";
  }
  if (operationBox) operationBox.classList.remove("is-showing-transform");
}

function setMode(text) {
  if (modeLabel) modeLabel.textContent = text;
}

function updatePlaybackControls() {
  if (pauseButton) pauseButton.disabled = !playing || paused;
  if (resumeButton) resumeButton.disabled = !playing || !paused;
  if (stopButton) stopButton.disabled = !playing && !finished;
  if (runButton) runButton.disabled = playing;
  [
    stringXInput,
    stringYInput,
    exampleSnowyButton,
    exampleExpButton,
    exampleHeekapButton
  ].forEach((el) => {
    if (el) el.disabled = playing;
  });
}

function scrollToExecution() {
  if (!editVisualization) return;
  const top =
    editVisualization.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function wait(ms) {
  return new Promise((resolve) => {
    let remaining = ms;
    let sliceStart = performance.now();

    function tick() {
      if (!playing) {
        resolve();
        return;
      }
      if (paused) {
        sliceStart = performance.now();
        requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      remaining -= now - sliceStart;
      sliceStart = now;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function normalizeString(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 20);
}

function readInputs() {
  const x = normalizeString(stringXInput ? stringXInput.value : "");
  const y = normalizeString(stringYInput ? stringYInput.value : "");
  if (stringXInput) stringXInput.value = x;
  if (stringYInput) stringYInput.value = y;
  return { x, y };
}

function validateInputs(x, y) {
  if (!x || !y) {
    setMessage("Enter two non-empty strings of letters A–Z.");
    return false;
  }
  if (x.length > 20 || y.length > 20) {
    setMessage("Keep each string at most 20 letters for a readable table.");
    return false;
  }
  setMessage("");
  return true;
}

function cellKey(i, j) {
  return `${i},${j}`;
}

function clearHighlights() {
  cellElements.forEach((cell) => {
    cell.classList.remove(
      "is-current",
      "is-dep",
      "is-chosen",
      "is-path",
      "is-just-filled"
    );
  });
}

function highlightCell(i, j, className) {
  const el = cellElements.get(cellKey(i, j));
  if (el) el.classList.add(className);
}

function setCellValue(i, j, value, animate = false) {
  const el = cellElements.get(cellKey(i, j));
  if (!el) return;
  el.textContent = String(value);
  el.classList.add("is-filled");
  if (animate) {
    el.classList.add("is-just-filled");
  }
}

function buildEmptyTable(x, y) {
  const m = x.length;
  const n = y.length;
  table = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  choice = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
  cellElements = new Map();

  const tableEl = document.createElement("table");
  tableEl.className = "edit-dp-table";
  tableEl.setAttribute("aria-label", "Edit distance DP table");

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const corner = document.createElement("th");
  corner.className = "edit-corner";
  corner.innerHTML = "<span>i\\j</span>";
  headRow.appendChild(corner);

  const emptyY = document.createElement("th");
  emptyY.className = "edit-col-label";
  emptyY.textContent = "";
  headRow.appendChild(emptyY);

  for (let j = 1; j <= n; j += 1) {
    const th = document.createElement("th");
    th.className = "edit-col-label";
    th.textContent = y[j - 1];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (let i = 0; i <= m; i += 1) {
    const row = document.createElement("tr");
    const rowLabel = document.createElement("th");
    rowLabel.className = "edit-row-label";
    rowLabel.textContent = i === 0 ? "" : x[i - 1];
    row.appendChild(rowLabel);

    for (let j = 0; j <= n; j += 1) {
      const td = document.createElement("td");
      td.className = "edit-cell";
      td.dataset.i = String(i);
      td.dataset.j = String(j);
      td.textContent = "";
      cellElements.set(cellKey(i, j), td);
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }

  tableEl.appendChild(tbody);
  tableContainer.replaceChildren(tableEl);
}

function diffCost(i, j) {
  return stringX[i - 1] === stringY[j - 1] ? 0 : 1;
}

function optionLabel(kind, i, j) {
  if (kind === "delete") {
    return `delete X[${i}]='${stringX[i - 1]}' → E[${i - 1},${j}] + 1`;
  }
  if (kind === "insert") {
    return `insert Y[${j}]='${stringY[j - 1]}' → E[${i},${j - 1}] + 1`;
  }
  const d = diffCost(i, j);
  if (d === 0) {
    return `match '${stringX[i - 1]}' → E[${i - 1},${j - 1}] + 0`;
  }
  return `substitute '${stringX[i - 1]}'→'${stringY[j - 1]}' → E[${i - 1},${j - 1}] + 1`;
}

function chosenKindName(kind, i, j) {
  if (kind === "delete") return "delete";
  if (kind === "insert") return "insert";
  return diffCost(i, j) === 0 ? "match" : "substitute";
}

function reconstructAlignment() {
  const m = stringX.length;
  const n = stringY.length;
  let i = m;
  let j = n;
  const top = [];
  const bottom = [];
  const marks = [];
  const path = [];

  while (i > 0 || j > 0) {
    path.push([i, j]);
    const kind = choice[i][j];
    if (kind === "delete") {
      top.push(stringX[i - 1]);
      bottom.push("-");
      marks.push("D");
      i -= 1;
    } else if (kind === "insert") {
      top.push("-");
      bottom.push(stringY[j - 1]);
      marks.push("I");
      j -= 1;
    } else {
      top.push(stringX[i - 1]);
      bottom.push(stringY[j - 1]);
      marks.push(diffCost(i, j) === 0 ? "M" : "S");
      i -= 1;
      j -= 1;
    }
  }
  path.push([0, 0]);

  top.reverse();
  bottom.reverse();
  marks.reverse();

  const lineX = top.join(" ");
  const lineY = bottom.join(" ");
  const lineM = marks
    .map((mark) => {
      if (mark === "M") return "·";
      if (mark === "S") return "×";
      if (mark === "I") return "+";
      return "−";
    })
    .join(" ");

  const current = stringX.split("");
  let cursor = 0;
  const frames = [{ chars: stringX.split(""), blue: new Set(), red: new Set() }];
  const ops = [];

  for (let k = 0; k < marks.length; k += 1) {
    const mark = marks[k];
    if (mark === "M") {
      cursor += 1;
      continue;
    }
    if (mark === "S") {
      const from = current[cursor];
      const to = bottom[k];
      ops.push({ type: "substitute", at: cursor, from, to });
      current[cursor] = to;
      frames.push({
        chars: current.slice(),
        blue: new Set([cursor]),
        red: new Set()
      });
      cursor += 1;
      continue;
    }
    if (mark === "D") {
      const removed = current[cursor];
      ops.push({ type: "delete", at: cursor, char: removed });
      current.splice(cursor, 1);
      frames.push({
        chars: current.slice(),
        blue: new Set(),
        red: new Set()
      });
      continue;
    }
    if (mark === "I") {
      const inserted = bottom[k];
      ops.push({ type: "insert", at: cursor, char: inserted });
      current.splice(cursor, 0, inserted);
      frames.push({
        chars: current.slice(),
        blue: new Set([cursor]),
        red: new Set()
      });
      cursor += 1;
    }
  }

  // Red = character about to be deleted/substituted on the leaving frame.
  ops.forEach((op, index) => {
    if (op.type === "delete" || op.type === "substitute") {
      frames[index].red.add(op.at);
    }
  });

  return {
    path,
    frames,
    ops,
    distance: table[m][n],
    text: `X: ${lineX}\n   ${lineM}\nY: ${lineY}\n\n· match   × sub   + insert   − delete`
  };
}

function renderStringChars(chars, blueSet, redSet) {
  if (chars.length === 0) {
    return '<span class="edit-gap">ε</span>';
  }
  return chars
    .map((ch, index) => {
      const classes = ["edit-tf-char"];
      if (blueSet.has(index)) classes.push("is-blue");
      if (redSet.has(index)) classes.push("is-red");
      return `<span class="${classes.join(" ")}">${ch}</span>`;
    })
    .join("");
}

function renderTransformation(frames, ops, distance) {
  if (!transformEl) return;

  if (!frames || frames.length === 0) {
    transformEl.hidden = true;
    transformEl.innerHTML = "";
    if (operationBox) operationBox.classList.remove("is-showing-transform");
    return;
  }

  const parts = [];
  parts.push('<div class="edit-transform-strip is-vertical">');
  parts.push('<div class="edit-transform-flow is-vertical">');

  frames.forEach((frame, index) => {
    parts.push('<div class="edit-transform-node">');
    parts.push(
      `<div class="edit-transform-string">${renderStringChars(
        frame.chars,
        frame.blue,
        frame.red
      )}</div>`
    );
    parts.push("</div>");

    if (index < ops.length) {
      const op = ops[index];
      parts.push('<div class="edit-transform-bridge is-vertical">');
      parts.push(`<span class="edit-transform-op">${op.type}</span>`);
      parts.push('<span class="edit-transform-arrow" aria-hidden="true">↓</span>');
      parts.push("</div>");
    }
  });

  parts.push("</div>");
  parts.push(
    `<div class="edit-transform-distance">Distance ${distance}</div>`
  );
  parts.push("</div>");

  if (opTitle) {
    opTitle.hidden = false;
    opTitle.textContent = "TRANSFORMATION";
  }
  if (opDetail) {
    opDetail.hidden = true;
    opDetail.textContent = "";
  }
  transformEl.hidden = false;
  transformEl.innerHTML = parts.join("");
  if (operationBox) operationBox.classList.add("is-showing-transform");
}

async function fillBaseCases(token) {
  const m = stringX.length;
  const n = stringY.length;

  setOperation(
    "BASE CASE",
    "E[i, 0] = i  (delete all of X[1···i])\nE[0, j] = j  (insert all of Y[1···j])"
  );

  clearHighlights();
  for (let i = 0; i <= m; i += 1) {
    table[i][0] = i;
    choice[i][0] = i === 0 ? null : "delete";
    setCellValue(i, 0, i, true);
    highlightCell(i, 0, "is-current");
  }
  for (let j = 1; j <= n; j += 1) {
    table[0][j] = j;
    choice[0][j] = "insert";
    setCellValue(0, j, j, true);
    highlightCell(0, j, "is-current");
  }

  await wait(TIMING.base * 2);
  if (token !== runToken) return;
  clearHighlights();
}

async function fillInterior(token) {
  const m = stringX.length;
  const n = stringY.length;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (token !== runToken) return;

      clearHighlights();
      highlightCell(i, j, "is-current");
      highlightCell(i - 1, j, "is-dep");
      highlightCell(i, j - 1, "is-dep");
      highlightCell(i - 1, j - 1, "is-dep");

      const del = table[i - 1][j] + 1;
      const ins = table[i][j - 1] + 1;
      const sub = table[i - 1][j - 1] + diffCost(i, j);
      const d = diffCost(i, j);

      setOperation(
        `COMPUTE E[${i}, ${j}]`,
        `X[1···${i}] = "${stringX.slice(0, i)}"\n` +
          `Y[1···${j}] = "${stringY.slice(0, j)}"\n\n` +
          `delete:     E[${i - 1},${j}] + 1 = ${table[i - 1][j]} + 1 = ${del}\n` +
          `insert:     E[${i},${j - 1}] + 1 = ${table[i][j - 1]} + 1 = ${ins}\n` +
          `${d === 0 ? "match" : "substitute"}: E[${i - 1},${j - 1}] + ${d} = ${table[i - 1][j - 1]} + ${d} = ${sub}`
      );
      await wait(TIMING.inspect);
      if (token !== runToken) return;

      let best = del;
      let kind = "delete";
      if (ins < best) {
        best = ins;
        kind = "insert";
      }
      if (sub < best) {
        best = sub;
        kind = "diag";
      }

      table[i][j] = best;
      choice[i][j] = kind;

      clearHighlights();
      highlightCell(i, j, "is-current");
      if (kind === "delete") highlightCell(i - 1, j, "is-chosen");
      else if (kind === "insert") highlightCell(i, j - 1, "is-chosen");
      else highlightCell(i - 1, j - 1, "is-chosen");

      setCellValue(i, j, best, true);
      const name = chosenKindName(kind, i, j);
      setOperation(
        `E[${i}, ${j}] ← ${best}`,
        `min = ${best} via ${name}\n${optionLabel(name, i, j)}`
      );

      await wait(TIMING.fill);
    }
  }
}

async function showPath(token) {
  const m = stringX.length;
  const n = stringY.length;
  const { path, text, frames, ops, distance } = reconstructAlignment();

  clearHighlights();
  for (const [i, j] of path) {
    if (token !== runToken) return;
    highlightCell(i, j, "is-path");
    await wait(TIMING.path);
  }

  renderTransformation(frames, ops, distance);
  if (alignmentEl) alignmentEl.textContent = text;
  await wait(TIMING.finish);
}

function resetUI(keepInputs = true) {
  runToken += 1;
  playing = false;
  paused = false;
  finished = false;
  table = [];
  choice = [];
  cellElements = new Map();
  updatePlaybackControls();
  setMode("READY");
  setOperation(
    "READY",
    "Build the edit-distance table by filling base cases, then each interior cell from its three neighbors."
  );
  if (transformEl) {
    transformEl.hidden = true;
    transformEl.innerHTML = "";
  }
  if (operationBox) operationBox.classList.remove("is-showing-transform");
  if (alignmentEl) alignmentEl.textContent = "—";
  tableContainer.innerHTML =
    '<div class="visualization-placeholder">Enter two strings and press RUN.</div>';
  if (!keepInputs) {
    if (stringXInput) stringXInput.value = "SNOWY";
    if (stringYInput) stringYInput.value = "SUNNY";
  }
  setMessage("");
}

async function runEditDistance() {
  if (playing) return;

  const { x, y } = readInputs();
  if (!validateInputs(x, y)) return;

  runToken += 1;
  const token = runToken;
  stringX = x;
  stringY = y;
  playing = true;
  paused = false;
  finished = false;
  updatePlaybackControls();
  setMode("RUNNING");
  if (transformEl) {
    transformEl.hidden = true;
    transformEl.innerHTML = "";
  }
  if (operationBox) operationBox.classList.remove("is-showing-transform");
  if (alignmentEl) alignmentEl.textContent = "—";

  buildEmptyTable(x, y);
  scrollToExecution();
  await fillBaseCases(token);
  if (token !== runToken) return;
  await fillInterior(token);
  if (token !== runToken) return;
  await showPath(token);
  if (token !== runToken) return;

  playing = false;
  paused = false;
  finished = true;
  updatePlaybackControls();
  setMode("DONE");
}

function stopRun() {
  if (!playing && !finished) return;
  resetUI(true);
}

function pauseRun() {
  if (!playing || paused) return;
  paused = true;
  updatePlaybackControls();
  setMode("PAUSED");
}

function resumeRun() {
  if (!playing || !paused) return;
  paused = false;
  updatePlaybackControls();
  setMode("RUNNING");
}

function loadExample(x, y) {
  if (playing) return;
  if (stringXInput) stringXInput.value = x;
  if (stringYInput) stringYInput.value = y;
  resetUI(true);
  setMessage("");
}

if (runButton) runButton.addEventListener("click", runEditDistance);
if (pauseButton) pauseButton.addEventListener("click", pauseRun);
if (resumeButton) resumeButton.addEventListener("click", resumeRun);
if (stopButton) stopButton.addEventListener("click", stopRun);
if (exampleSnowyButton) {
  exampleSnowyButton.addEventListener("click", () =>
    loadExample("SNOWY", "SUNNY")
  );
}
if (exampleExpButton) {
  exampleExpButton.addEventListener("click", () =>
    loadExample("EXPONENTIAL", "POLYNOMIAL")
  );
}
if (exampleHeekapButton) {
  exampleHeekapButton.addEventListener("click", () =>
    loadExample("HEEKAP", "HEAP")
  );
}

[stringXInput, stringYInput].forEach((input) => {
  if (!input) return;
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runEditDistance();
  });
});

resetUI(true);
updatePlaybackControls();
