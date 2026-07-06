/**
 * components/footer.js — renders the footer.
 */
import { $, el } from "../utils/dom.js";
import { SITE_TITLE } from "../config.js";

export function renderFooter() {
  const mount = $("#footer");
  if (!mount) return;
  const year = new Date().getFullYear();
  mount.replaceWith(
    el(
      "footer",
      { class: "site-footer" },
      el(
        "div",
        { class: "site-footer__inner" },
        el("p", { class: "site-footer__credit" }, `© ${year} ${SITE_TITLE}. All rights reserved.`),
        el("p", { class: "site-footer__meta" }, "Built with pure HTML, CSS, and JavaScript.")
      )
    )
  );
}
