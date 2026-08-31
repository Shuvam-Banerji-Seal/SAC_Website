/**
 * components/reading-progress.js — newspaper ink progress rule.
 * A thin accent bar at the very top that fills as you read. Reduced-motion
 * users get instant (non-animated) width updates.
 */
export function initReadingProgress() {
  if (document.querySelector(".reading-progress")) return;
  const bar = document.createElement("div");
  bar.className = "reading-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.transform = `scaleX(${pct})`;
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}
