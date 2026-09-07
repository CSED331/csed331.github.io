/* =========================================================
   TOWER OF HANOI LAB
   ========================================================= */

const PEG_NAMES = ["A", "B", "C"];

const diskCountInput = document.getElementById("hanoi-disk-count");
const runButton = document.getElementById("run-hanoi-button");
const pauseButton = document.getElementById("pause-hanoi-button");
const resumeButton = document.getElementById("resume-hanoi-button");
const modeLabel = document.getElementById("hanoi-mode-label");
const operationTitle = document.getElementById("hanoi-operation-title");
const operationDetail = document.getElementById("hanoi-operation-detail");
const callStackElement = document.getElementById("hanoi-call-stack");
const moveCountElement = document.getElementById("hanoi-move-count");
const moveOptimalElement = document.getElementById("hanoi-move-optimal");
const boardElement = document.getElementById("hanoi-board");

const stacks = [
  document.getElementById("hanoi-stack-0"),
  document.getElementById("hanoi-stack-1"),
  document.getElementById("hanoi-stack-2")
];

let pegs = [[], [], []];
let diskElements = new Map();
let totalDisks = 5;
let moveCount = 0;
let runToken = 0;
let hanoiPaused = false;
let hanoiPlaying = false;
let callStack = [];

function clampDiskCount(value) {
  let n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) n = 5;
  return Math.max(2, Math.min(20, n));
}

function optimalMoves(n) {
  return 2 ** n - 1;
}

function timingFor() {
  return { announce: 530, lift: 230, travel: 350, drop: 230, between: 170 };
}

function shouldAnnounce(n, depthSize) {
  if (n <= 8) return true;
  if (n <= 12) return depthSize >= n - 4;
  return depthSize >= n - 2;
}

function wait(ms) {
  return new Promise((resolve) => {
    let remaining = ms;
    let sliceStart = performance.now();

    function tick() {
      if (hanoiPaused) {
        if (sliceStart !== null) {
          remaining -= Math.max(0, performance.now() - sliceStart);
          sliceStart = null;
        }

        const poll = () => {
          if (hanoiPaused) {
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

function updatePlaybackControls() {
  if (pauseButton) {
    pauseButton.disabled = !hanoiPlaying || hanoiPaused;
  }
  if (resumeButton) {
    resumeButton.disabled = !hanoiPlaying || !hanoiPaused;
  }
  if (runButton) {
    runButton.disabled = hanoiPlaying;
  }
  if (diskCountInput) {
    diskCountInput.disabled = hanoiPlaying;
  }
}

function setOperation(title, detail) {
  if (operationTitle) operationTitle.textContent = title;
  if (operationDetail) operationDetail.textContent = detail;
}

function updateMoveCount() {
  if (moveCountElement) {
    moveCountElement.textContent = String(moveCount);
  }
}

function updateOptimal(n) {
  if (moveOptimalElement) {
    moveOptimalElement.textContent = String(optimalMoves(n));
  }
}

const CALL_STACK_FRAME_HEIGHT = 30;
const CALL_STACK_GAP = 4;
const CALL_STACK_PADDING = 20;

function callStackHeightFor(n) {
  const slots = Math.max(2, n);
  return (
    CALL_STACK_PADDING +
    slots * CALL_STACK_FRAME_HEIGHT +
    Math.max(0, slots - 1) * CALL_STACK_GAP
  );
}

function setCallStackSize(n) {
  if (!callStackElement) return;
  const height = callStackHeightFor(n);
  callStackElement.style.height = `${height}px`;
  callStackElement.style.minHeight = `${height}px`;
  callStackElement.style.maxHeight = `${height}px`;
}

function showCallStackEmpty() {
  if (!callStackElement) return;
  callStackElement.innerHTML =
    '<div class="hanoi-call-empty">No recursive calls yet.</div>';
}

function clearCallStack() {
  callStack = [];
  showCallStackEmpty();
}

function getCallStackFrames() {
  if (!callStackElement) return null;

  let frames = callStackElement.querySelector(".hanoi-call-frames");
  if (frames) return frames;

  callStackElement.replaceChildren();
  frames = document.createElement("div");
  frames.className = "hanoi-call-frames";
  callStackElement.appendChild(frames);
  return frames;
}

function pinCallStackToBottom() {
  if (!callStackElement) return;
  callStackElement.scrollTop = callStackElement.scrollHeight;
}

function pushCallFrame(frame) {
  callStack.push(frame);
  const frames = getCallStackFrames();
  if (!frames) return;

  frames
    .querySelectorAll(".hanoi-call-frame.is-current")
    .forEach((el) => el.classList.remove("is-current"));

  const row = document.createElement("div");
  row.className = "hanoi-call-frame is-current";
  row.textContent = frame;

  // Newest on top; older frames stay anchored at the bottom of the fixed box.
  frames.prepend(row);
  pinCallStackToBottom();
}

function popCallFrame() {
  if (callStack.length === 0) return;
  callStack.pop();

  const frames = callStackElement
    ? callStackElement.querySelector(".hanoi-call-frames")
    : null;
  if (!frames) {
    showCallStackEmpty();
    return;
  }

  const top = frames.querySelector(".hanoi-call-frame");
  if (!top) {
    showCallStackEmpty();
    return;
  }

  top.remove();

  const next = frames.querySelector(".hanoi-call-frame");
  if (!next) {
    showCallStackEmpty();
    return;
  }

  next.classList.add("is-current");
  pinCallStackToBottom();
}

const DISK_PALETTE = [
  "#d32f2f", // red
  "#f57c00", // orange
  "#f9a825", // amber
  "#2e7d32", // green
  "#1565c0", // blue
  "#6a1b9a", // purple
  "#00838f", // teal
  "#ad1457", // magenta
  "#5d4037", // brown
  "#455a64", // blue-gray
  "#e64a19", // deep orange
  "#558b2f", // olive green
  "#0277bd", // sky blue
  "#4527a0", // indigo
  "#00695c", // dark teal
  "#c2185b", // pink
  "#ef6c00", // vivid orange
  "#283593", // navy
  "#9e9d24", // chartreuse
  "#37474f"  // slate
];

function diskColor(size) {
  return DISK_PALETTE[(size - 1) % DISK_PALETTE.length];
}

function diskWidthPercent(size, n) {
  const min = 34;
  const max = 92;
  if (n <= 1) return max;
  return min + ((size - 1) / (n - 1)) * (max - min);
}

function createDiskElement(size, n) {
  const disk = document.createElement("div");
  disk.className = "hanoi-disk";
  disk.dataset.size = String(size);
  disk.style.width = `${diskWidthPercent(size, n)}%`;
  disk.style.background = diskColor(size);
  disk.textContent = String(size);
  return disk;
}

function resetBoard(n) {
  totalDisks = n;
  pegs = [[], [], []];
  diskElements = new Map();
  moveCount = 0;
  callStack = [];
  updateMoveCount();
  updateOptimal(n);
  setCallStackSize(n);
  clearCallStack();

  stacks.forEach((stack) => {
    if (stack) stack.replaceChildren();
  });

  for (let size = n; size >= 1; size -= 1) {
    pegs[0].push(size);
    const disk = createDiskElement(size, n);
    diskElements.set(size, disk);
    stacks[0].appendChild(disk);
  }

  setOperation(
    "READY",
    `Tower starts on peg A with ${n} disks.\nGoal: move the whole tower to peg C.`
  );

  if (modeLabel) modeLabel.textContent = "READY";
}

function pauseHanoi() {
  if (!hanoiPlaying || hanoiPaused) return;
  hanoiPaused = true;
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "PAUSED";
}

function resumeHanoi() {
  if (!hanoiPlaying || !hanoiPaused) return;
  hanoiPaused = false;
  updatePlaybackControls();
  if (modeLabel) modeLabel.textContent = "RUNNING";
}

async function animateDiskMove(size, fromPeg, toPeg, timing) {
  const disk = diskElements.get(size);
  const toStack = stacks[toPeg];
  const toColumn = toStack ? toStack.closest(".hanoi-peg-column") : null;

  if (!disk || !toStack || !boardElement || !toColumn) {
    if (disk && toStack) toStack.appendChild(disk);
    return;
  }

  const startRect = disk.getBoundingClientRect();
  const boardRect = boardElement.getBoundingClientRect();
  const diskHeight = startRect.height;
  const targetCount = pegs[toPeg].length;
  const stackHeight = (targetCount - 1) * (diskHeight + 4);
  const columnRect = toColumn.getBoundingClientRect();
  const targetLeft =
    columnRect.left - boardRect.left + (columnRect.width - startRect.width) / 2;
  const baseTop = columnRect.bottom - boardRect.top - 32;
  const targetTop = baseTop - stackHeight - diskHeight;
  const liftTop = Math.min(targetTop, startRect.top - boardRect.top) - 48;
  const ease = "cubic-bezier(0.2, 0.75, 0.25, 1)";

  disk.classList.add("is-flying");
  disk.style.width = `${startRect.width}px`;
  disk.style.left = `${startRect.left - boardRect.left}px`;
  disk.style.top = `${startRect.top - boardRect.top}px`;
  disk.style.transition = "none";
  boardElement.appendChild(disk);

  await wait(16);

  disk.style.transition = `top ${timing.lift}ms ${ease}`;
  disk.style.top = `${Math.max(12, liftTop)}px`;
  await wait(timing.lift);

  disk.style.transition = `left ${timing.travel}ms ${ease}`;
  disk.style.left = `${targetLeft}px`;
  await wait(timing.travel);

  disk.style.transition = `top ${timing.drop}ms ${ease}`;
  disk.style.top = `${targetTop}px`;
  await wait(timing.drop);

  disk.classList.remove("is-flying");
  disk.style.left = "";
  disk.style.top = "";
  disk.style.width = `${diskWidthPercent(size, totalDisks)}%`;
  disk.style.transition = "";
  toStack.appendChild(disk);
}

async function moveDisk(size, fromPeg, toPeg, timing, token) {
  if (token !== runToken) return;

  const fromStack = pegs[fromPeg];
  const top = fromStack[fromStack.length - 1];
  if (top !== size) {
    throw new Error(`Illegal move: expected disk ${size} on peg ${PEG_NAMES[fromPeg]}`);
  }

  fromStack.pop();
  pegs[toPeg].push(size);

  setOperation(
    `MOVE DISK ${size}`,
    `move disk ${size} from ${PEG_NAMES[fromPeg]} to ${PEG_NAMES[toPeg]}\nThis is the one non-recursive step inside Hanoi(${size}, …).`
  );

  await animateDiskMove(size, fromPeg, toPeg, timing);
  if (token !== runToken) return;

  moveCount += 1;
  updateMoveCount();
  await wait(timing.between);
}

async function hanoi(n, src, dst, aux, timing, token) {
  if (token !== runToken) return;
  if (n === 0) return;

  const frame =
    `Hanoi(${n}, ${PEG_NAMES[src]}, ${PEG_NAMES[dst]}, ${PEG_NAMES[aux]})`;
  pushCallFrame(frame);

  try {
    const announce = shouldAnnounce(totalDisks, n);

    if (announce) {
      setOperation(
        "RECURSIVE CALL",
        `${frame}\n` +
          `1) Recurse: Hanoi(${n - 1}, ${PEG_NAMES[src]}, ${PEG_NAMES[aux]}, ${PEG_NAMES[dst]})\n` +
          `2) move disk ${n} from ${PEG_NAMES[src]} to ${PEG_NAMES[dst]}\n` +
          `3) Recurse: Hanoi(${n - 1}, ${PEG_NAMES[aux]}, ${PEG_NAMES[dst]}, ${PEG_NAMES[src]})`
      );
      await wait(timing.announce);
      if (token !== runToken) return;
    }

    await hanoi(n - 1, src, aux, dst, timing, token);
    if (token !== runToken) return;

    await moveDisk(n, src, dst, timing, token);
    if (token !== runToken) return;

    if (announce) {
      setOperation(
        "RECURSIVE CALL",
        `After moving disk ${n}, recurse again:\nHanoi(${n - 1}, ${PEG_NAMES[aux]}, ${PEG_NAMES[dst]}, ${PEG_NAMES[src]})`
      );
      await wait(timing.announce * 0.75);
      if (token !== runToken) return;
    }

    await hanoi(n - 1, aux, dst, src, timing, token);
  } finally {
    if (callStack.length > 0 && callStack[callStack.length - 1] === frame) {
      popCallFrame();
    }
  }
}

async function runHanoi() {
  if (hanoiPlaying) return;

  const n = clampDiskCount(diskCountInput ? diskCountInput.value : 5);
  if (diskCountInput) diskCountInput.value = String(n);

  runToken += 1;
  const token = runToken;
  hanoiPaused = false;
  hanoiPlaying = true;
  updatePlaybackControls();

  resetBoard(n);
  if (modeLabel) modeLabel.textContent = "RUNNING";

  const visualization = document.getElementById("hanoi-visualization");
  if (visualization) {
    visualization.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  const timing = timingFor(n);

  setOperation(
    "START",
    `Solve Hanoi(${n}, A, C, B)\nEach call of size k makes two recursive calls of size k − 1.`
  );
  await wait(timing.announce);

  try {
    await hanoi(n, 0, 2, 1, timing, token);
  } catch (error) {
    console.error(error);
  }

  if (token !== runToken) return;

  hanoiPlaying = false;
  hanoiPaused = false;
  updatePlaybackControls();
  callStack = [];
  clearCallStack();

  if (modeLabel) modeLabel.textContent = "DONE";
  setOperation(
    "COMPLETE",
    `Finished in ${moveCount} moves.\nOptimal is ${optimalMoves(n)} = 2^${n} − 1.`
  );
}

function stopAndReset() {
  runToken += 1;
  hanoiPaused = false;
  hanoiPlaying = false;
  updatePlaybackControls();

  document.querySelectorAll(".hanoi-disk.is-flying").forEach((disk) => {
    disk.classList.remove("is-flying");
    disk.style.left = "";
    disk.style.top = "";
  });

  const n = clampDiskCount(diskCountInput ? diskCountInput.value : 5);
  if (diskCountInput) diskCountInput.value = String(n);
  resetBoard(n);
}

if (runButton) {
  runButton.addEventListener("click", runHanoi);
}

if (pauseButton) {
  pauseButton.addEventListener("click", pauseHanoi);
}

if (resumeButton) {
  resumeButton.addEventListener("click", resumeHanoi);
}

if (diskCountInput) {
  diskCountInput.addEventListener("change", () => {
    if (hanoiPlaying) return;
    const n = clampDiskCount(diskCountInput.value);
    diskCountInput.value = String(n);
    resetBoard(n);
  });

  diskCountInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runHanoi();
    }
  });
}

resetBoard(clampDiskCount(diskCountInput ? diskCountInput.value : 5));
updatePlaybackControls();
