/**
 * components/back-to-top.js — newspaper-styled back-to-top button.
 * Appears after scrolling down, respects reduce-motion, keyboard accessible.
 */
import { $ } from "../utils/dom.js";

export function initBackToTop() {
  if (document.querySelector(".back-to-top")) return;

  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.type = "button";
  btn.setAttribute("aria-label", "Back to top");
  btn.innerHTML = "↑";
  btn.hidden = true;
  document.body.appendChild(btn);

  const reduced = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.getAttribute("data-reduce-motion") === "on";

  const onScroll = () => {
    const show = window.scrollY > 300;
    btn.hidden = !show;
    btn.style.opacity = show ? "1" : "0";
  };

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reduced() ? "instant" : "smooth",
    });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  // Initial check
  onScroll();
}
