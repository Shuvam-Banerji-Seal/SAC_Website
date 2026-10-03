/**
 * components/search.js — "Search the Chronicle": one palette for every club and page.
 *
 * Opened by search-launcher.js (the sidebar's Search button, "/" and Ctrl/⌘ + K). This
 * module is loaded on demand and brings its own stylesheet (css/search.css), so a
 * visitor who never searches never pays for either.
 *
 * Accessibility: the ARIA combobox pattern — focus stays in the input, ↑/↓ move
 * `aria-activedescendant` through a listbox, Enter opens the highlighted result, Esc closes
 * and gives focus back to whatever opened it. Tab is trapped inside while it is open.
 *
 * With nothing typed it offers what a new student actually arrives with ("what are you
 * into?") as interest chips, and a "Surprise me" that opens a club at random.
 */
import { el, clear, loadStylesheet, pageUrl } from "../utils/dom.js";
import { INTERESTS, CLUBS } from "../data/clubs.js";
import {
  buildIndex,
  search,
  tokenize,
  highlight,
  clubsForInterest,
} from "../utils/search-index.js";

const KIND_LABEL = { club: "Club", page: "Page", section: "Body" };
const TRY = ["chess", "drama", "coding", "football", "music", "canteen"];

let palette = null; // the one instance, built on first open
let index = null;

/** Wrap the matched part of `text` in <mark>s. */
function marked(text, tokens) {
  return highlight(text, tokens).map((part) =>
    part.hit ? el("mark", { class: "search__mark" }, part.text) : part.text
  );
}

function build() {
  const input = el("input", {
    id: "search-input",
    class: "search__input",
    type: "search",
    role: "combobox",
    "aria-autocomplete": "list",
    "aria-expanded": "false",
    "aria-controls": "search-results",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    enterkeyhint: "go",
    placeholder: "Find a club or page…", // short enough for a phone
  });
  const closeButton = el(
    "button",
    { class: "search__close", type: "button", "aria-label": "Close search" },
    el("span", { "aria-hidden": "true" }, "Esc")
  );
  const results = el("ul", {
    id: "search-results",
    class: "search__results",
    role: "listbox",
    "aria-label": "Results",
  });
  const suggest = el("div", { class: "search__suggest" });
  const status = el("p", {
    class: "visually-hidden",
    role: "status",
    "aria-live": "polite",
  });
  const sheet = el(
    "div",
    { class: "search__sheet" },
    el(
      "form",
      { class: "search__form", role: "search", action: "#", onsubmit: (e) => e.preventDefault() },
      el("label", { class: "visually-hidden", for: "search-input" }, "Search clubs and pages"),
      el("span", { class: "search__glyph", "aria-hidden": "true" }, "⌕"),
      input,
      closeButton
    ),
    el("div", { class: "search__body" }, results, suggest),
    el(
      "p",
      { class: "search__hint", "aria-hidden": "true" },
      el("kbd", {}, "↑"),
      el("kbd", {}, "↓"),
      " move · ",
      el("kbd", {}, "Enter"),
      " open · ",
      el("kbd", {}, "Esc"),
      " close"
    ),
    status
  );
  const root = el(
    "div",
    {
      class: "search",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Search the Chronicle",
      hidden: "",
    },
    el("div", { class: "search__scrim", "data-close": "" }),
    sheet
  );
  return { root, sheet, input, closeButton, results, suggest, status };
}

/** Open the palette. `interest` pre-selects an interest chip; `query` pre-fills the box. */
export async function openSearch({ query = "", interest = null } = {}) {
  await loadStylesheet("css/search.css");
  index ??= buildIndex();
  if (!palette) {
    palette = { ...build(), open: false, active: -1, items: [], opener: null, interest: null };
    document.body.append(palette.root);
    wire(palette);
  }
  const p = palette;
  if (!p.open) {
    p.opener = document.activeElement;
    p.open = true;
    p.root.hidden = false;
    document.body.classList.add("search-open");
    // next frame, so the opening transition has a starting state to animate from
    requestAnimationFrame(() => p.root.classList.add("is-open"));
  }
  p.input.value = query;
  p.interest = interest;
  render(p);
  p.input.focus();
  if (query) p.input.select();
}

export function closeSearch({ restoreFocus = true } = {}) {
  const p = palette;
  if (!p?.open) return;
  p.open = false;
  p.root.classList.remove("is-open");
  p.root.hidden = true;
  document.body.classList.remove("search-open");
  if (restoreFocus && p.opener?.focus) p.opener.focus();
  p.opener = null;
}

/** Move the highlight to option `n` (wrapping), keeping it in view and announced. */
function setActive(p, n) {
  const options = [...p.results.querySelectorAll('[role="option"]')];
  if (!options.length) {
    p.active = -1;
    p.input.removeAttribute("aria-activedescendant");
    return;
  }
  p.active = (n + options.length) % options.length;
  options.forEach((o, i) => {
    o.setAttribute("aria-selected", String(i === p.active));
    o.classList.toggle("is-active", i === p.active);
  });
  const current = options[p.active];
  p.input.setAttribute("aria-activedescendant", current.id);
  current.scrollIntoView?.({ block: "nearest" });
}

function resultRow(entry, i, tokens) {
  const link = el(
    "a",
    { class: "search__link", href: pageUrl(entry.href), tabindex: "-1" },
    el("span", { class: "search__kind" }, KIND_LABEL[entry.kind]),
    el(
      "span",
      { class: "search__text" },
      el("span", { class: "search__title" }, ...marked(entry.title, tokens)),
      el("span", { class: "search__meta" }, entry.meta)
    )
  );
  return el("li", { id: `search-opt-${i}`, role: "option", "aria-selected": "false" }, link);
}

function surprise() {
  const club = CLUBS[Math.floor(Math.random() * CLUBS.length)];
  location.href = pageUrl(club.page);
}

/** Draw the list for the current query / interest, and the suggestions under an empty one. */
function render(p) {
  const query = p.input.value;
  const tokens = tokenize(query);
  let entries = [];
  let heading = "";

  if (tokens.length) {
    entries = search(query, { index, limit: 10 });
  } else if (p.interest) {
    const interest = INTERESTS.find((i) => i.id === p.interest);
    entries = index.filter(
      (e) => e.kind === "club" && clubsForInterest(p.interest).some((c) => c.page === e.href)
    );
    heading = `${interest?.label ?? p.interest} — ${entries.length} ${entries.length === 1 ? "club" : "clubs"}`;
  }

  clear(p.results);
  p.results.append(...entries.map((entry, i) => resultRow(entry, i, tokens)));
  p.input.setAttribute("aria-expanded", String(entries.length > 0));

  clear(p.suggest);
  if (!tokens.length) {
    // a conditional child must not go through append(null): the DOM prints it as the word "null"
    if (heading) p.suggest.append(el("p", { class: "search__heading" }, heading));
    p.suggest.append(
      el("p", { class: "search__heading" }, "What are you into?"),
      el(
        "div",
        { class: "search__chips", role: "group", "aria-label": "Interests" },
        ...INTERESTS.map((interest) =>
          el(
            "button",
            {
              class: "search__chip" + (interest.id === p.interest ? " is-on" : ""),
              type: "button",
              "aria-pressed": String(interest.id === p.interest),
              onclick: () => {
                p.interest = p.interest === interest.id ? null : interest.id;
                render(p);
                p.input.focus();
              },
            },
            interest.label
          )
        ),
        el(
          "button",
          { class: "search__chip search__chip--wild", type: "button", onclick: surprise },
          "Surprise me ↗"
        )
      ),
      el(
        "p",
        { class: "search__try" },
        "Try ",
        ...TRY.flatMap((word, i) => [
          i ? ", " : "",
          el(
            "button",
            {
              class: "search__try-word",
              type: "button",
              onclick: () => {
                p.input.value = word;
                p.interest = null;
                render(p);
                p.input.focus();
              },
            },
            word
          ),
        ])
      )
    );
  } else if (!entries.length) {
    p.suggest.append(
      el(
        "p",
        { class: "search__empty" },
        `Nothing in the Chronicle matches “${query.trim()}”. Try a club's usual name, or what it does: “drama”, “astronomy”, “cricket”.`
      ),
      el("a", { class: "search__chip", href: pageUrl("pages/clubs.html") }, "Browse all clubs →")
    );
  }

  p.status.textContent = tokens.length
    ? entries.length
      ? `${entries.length} ${entries.length === 1 ? "result" : "results"}`
      : "No results"
    : heading;
  setActive(p, entries.length ? 0 : -1);
}

function wire(p) {
  p.input.addEventListener("input", () => {
    p.interest = null;
    render(p);
  });
  p.closeButton.addEventListener("click", () => closeSearch());
  p.root.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeSearch();
    // a result opens its page; make sure the palette is out of the way if the browser keeps the page
    if (e.target.closest(".search__link")) closeSearch({ restoreFocus: false });
  });

  p.root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive(p, p.active + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" && e.target === p.input) {
      // activate the link itself: the click handler above closes the palette, and a
      // browser that wants to open it elsewhere (middle-click, ⌘-click) still can
      const link = p.results.querySelectorAll('[role="option"] a')[p.active];
      if (link) {
        e.preventDefault();
        link.click();
      }
    } else if (e.key === "Tab") {
      // keep the keyboard inside the dialog
      const stops = [...p.sheet.querySelectorAll("input, button, a[href]")].filter(
        (n) => !n.hasAttribute("tabindex") || n.tabIndex >= 0
      );
      const first = stops[0];
      const last = stops.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
