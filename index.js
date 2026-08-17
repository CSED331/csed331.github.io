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
Sorting_Lab/               READY
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

terminalInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
  
    const rawCommand = terminalInput.value.trim();
  
    terminalInput.value = "";
  
    if (rawCommand === "") {
      return;
    }
  
    // 입력한 명령어 출력
    printLine(
      `guest@csed331:~$ ${rawCommand}`,
      "command-line"
    );
  
  
    /* =====================================================
       명령어 parsing
       ===================================================== */
  
    const parts = rawCommand.split(/\s+/);
  
    const command = parts[0].toLowerCase();
  
    const argument = parts
      .slice(1)
      .join(" ")
      .toLowerCase();
  
  
    /* =====================================================
       cd COMMAND
       ===================================================== */
  
    if (command === "cd") {
  
      if (argument === "") {
  
        printLine(
          "cd: missing module name\nTry 'ls' to see available modules.",
          "error-line"
        );
  
      }
  
      else if (
        argument === "fibonacci_lab" ||
        argument === "fibonacci_lab/"
      ) {
  
        printLine(
          "Opening Fibonacci Lab..."
        );
  
        window.setTimeout(() => {
          window.location.href = "fibonacci.html";
        }, 1000);
  
      }
  
      else if (
        argument === "sorting_lab" ||
        argument === "sorting_lab/"
      ) {
  
        printLine(
          "Opening Sorting Lab..."
        );
  
        window.setTimeout(() => {
          window.location.href = "sorting.html";
        }, 1000);
  
      }

      else if (
        argument === "dijkstra_lab" ||
        argument === "dijkstra_lab/"
      ) {
  
        printLine(
          "Opening Dijkstra Lab..."
        );
  
        window.setTimeout(() => {
          window.location.href = "graph.html";
        }, 1000);
  
      }
  
      else {
  
        printLine(
          `cd: ${parts.slice(1).join(" ")}: No such module\nType 'ls' to see available modules.`,
          "error-line"
        );
  
      }
  
    }
  
  
    /* =====================================================
       등록된 일반 명령어
       ===================================================== */
  
    else if (commands[command]) {
  
      const result =
        commands[command]();
  
      if (result) {
        printLine(result);
      }
  
    }
  
  
    /* =====================================================
       존재하지 않는 명령어
       ===================================================== */
  
    else {
  
      printLine(
        `bash: ${rawCommand}: command not found\nType 'help' to see available commands.`,
        "error-line"
      );
  
    }
  
  
    terminalOutput.scrollTop =
      terminalOutput.scrollHeight;
  });

function printLine(text, className = "") {
const line = document.createElement("div");

line.className = `terminal-line ${className}`;
line.textContent = text;

terminalOutput.appendChild(line);
}