const terminalInput = document.getElementById("terminal-input");
const terminalOutput = document.getElementById("terminal-output");

const commands = {
  help: () => `
Available commands:

help            Show available commands
cat             Summon a cat
dog             Summon a dog
rabbit          Summon a rabbit
ls              List available modules
cd <module>     Enter a module
fib             Fibonacci easter egg
hanoi           Hanoi easter egg
sort            Sorting easter egg
dijkstra        Dijkstra easter egg
hello           Say hello
about           About this course
clear           Clear terminal

Try exploring.
`,

  cat: () => `
/\\_/\\\\
( o.o )
> ^ <
`,

  dog: () => `
/ \\__
(    @\\___
/         O
/   (_____/
/_____/   U
`,

  rabbit: () => `
(\\_/)
( •_•)
/ >🥕
`,

  ls: () => `
modules/

Fibonacci_Lab/             READY
Hanoi_Lab/                 READY
Sorting_Lab/               READY
Dijkstra_Lab/              READY
`,

  hello: () => `
Hello, algorithm explorer.
Welcome to CSED331.
`,

  about: () => `
CSED331 Algorithms
2026 Fall Semester
`,

  fib: () => `
Fibonacci sequence detected...

0 1 1 2 3 5 8 13 21 34 55 89 ...

Hint:
Recursion is elegant.
Dynamic Programming is faster.
`,

  hanoi: () => `
Tower of Hanoi detected...

T(n) = 2T(n - 1) + O(1)
T(n) = 2^n - 1 moves

Hint:
Move n-1 aside, move n, then recurse again.
Try: cd hanoi_lab
`,

  sort: () => `
Merge Sort: O(n log n) ...
How about trying Quick Sort?
`,

  dijkstra: () => `
How can we find the shortest path in a graph?
What if we have negative edge weights?
`,

  clear: () => {
    terminalOutput.innerHTML = "";
    return null;
  }
};

const modules = {
  fibonacci_lab: "fibonacci.html",
  hanoi_lab: "hanoi.html",
  hanoi: "hanoi.html",
  sorting_lab: "sorting.html",
  dijkstra_lab: "graph.html"
};

function printLine(text, className = "") {
  const line = document.createElement("div");
  line.className = `terminal-line ${className}`;
  line.textContent = text;
  terminalOutput.appendChild(line);
}

terminalInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const rawCommand = terminalInput.value.trim();
  terminalInput.value = "";
  if (rawCommand === "") return;

  printLine(`guest@csed331:~$ ${rawCommand}`, "command-line");

  const parts = rawCommand.split(/\s+/);
  const command = parts[0].toLowerCase();
  const argument = parts.slice(1).join(" ").toLowerCase().replace(/\/$/, "");

  if (command === "cd") {
    if (!argument) {
      printLine("cd: missing module name\nTry 'ls' to see available modules.", "error-line");
    } else if (modules[argument]) {
      printLine(`Opening ${argument}...`);
      window.setTimeout(() => {
        window.location.href = modules[argument];
      }, 1000);
    } else {
      printLine(
        `cd: ${parts.slice(1).join(" ")}: No such module\nType 'ls' to see available modules.`,
        "error-line"
      );
    }
  } else if (commands[command]) {
    const result = commands[command]();
    if (result) printLine(result);
  } else {
    printLine(
      `bash: ${rawCommand}: command not found\nType 'help' to see available commands.`,
      "error-line"
    );
  }

  terminalOutput.scrollTop = terminalOutput.scrollHeight;
});
