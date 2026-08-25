function updateClock() {
  const clock = document.getElementById("system-clock");
  if (!clock) return;

  clock.textContent = new Date().toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

updateClock();
window.setInterval(updateClock, 1000);
