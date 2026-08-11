/* First-paint guard. It intentionally does not download the whole site: the
   browser's normal cache and lazy images do that more efficiently. */
(function () {
  "use strict";

  const ASSETS = ["css/variables.css", "css/main.css", "js/main.js"];
  const SAFETY_BY_TIER = { low: 8000, medium: 6000, high: 4000 };
  const pre = document.getElementById("preloader");
  if (!pre) return;

  function detectDeviceTier() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 8;
    const connection = navigator.connection && navigator.connection.effectiveType;
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    if (
      cores <= 2 ||
      memory <= 2 ||
      connection === "2g" ||
      connection === "slow-2g" ||
      navigator.connection?.saveData
    )
      return "low";
    if (isMobileUA || cores <= 4 || memory <= 4 || connection === "3g") {
      return "medium";
    }
    return "high";
  }

  // Kept as a tiny optional hook for deployments that want to warm one file.
  function warm(path) {
    return fetch(path, { cache: "force-cache" }).catch(function () {});
  }
  void ASSETS;
  void SAFETY_BY_TIER;
  void warm;
  window.__sacDeviceTier = detectDeviceTier();

  const fill = pre.querySelector(".preloader__fill");
  const num = pre.querySelector(".preloader__percent-num");
  let pct = 0;
  const tick = window.setInterval(function () {
    pct = Math.min(100, pct + 20);
    if (fill) fill.style.width = pct + "%";
    if (num) num.textContent = String(pct);
    if (pct >= 100) done();
  }, 45);

  function done() {
    if (pre.classList.contains("is-done")) return;
    window.clearInterval(tick);
    pre.classList.add("is-done");
    window.dispatchEvent(
      new CustomEvent("preloader-done", { detail: { tier: window.__sacDeviceTier } })
    );
    window.setTimeout(function () {
      if (pre.parentNode) pre.parentNode.removeChild(pre);
    }, 240);
  }

  // Safety budget: never block a page waiting for a decorative animation.
  window.setTimeout(done, 1500);
})();
