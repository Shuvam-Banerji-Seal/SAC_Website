/**
 * components/sac-diagram.js — "The Organizational Structure" plate.
 *
 * Replaces the 360-line hand-written inline SVG that used to live in
 * index.html. The chart is generated from the BODIES table below, so the
 * structure is stated once and the geometry is derived — and it can lay
 * itself out two ways:
 *
 *   wide  (>=760px): seal centred above five cards in a row
 *   narrow(< 760px): seal on top, cards stacked in a single column
 *
 * The narrow layout is why this is JS and not a static asset. The previous
 * version squeezed an 800-unit viewBox into 358px, which rendered the body
 * labels at about 4px; the stacked layout keeps every label at full size.
 *
 * Motion: the plate assembles itself once, when scrolled into view —
 * rules ink across, the seal presses down, connectors draw out from it,
 * then the cards drop onto their pins. All of it is CSS (see
 * css/pages/home.css); this module only adds `.is-live`. Under
 * prefers-reduced-motion the same CSS lands everything in its final
 * position with no transition.
 */

/** The five bodies of the SAC, in the order pages/clubs.html renders them.
 *  `members` is the constitutional shape of the body and `note` is what it
 *  actually does — deliberately not a count of files. Membership mirrors
 *  the SLUG_BODIES table in js/pages/clubs.js, which in turn mirrors the
 *  "SAC Website details" source tree. */
const BODIES = [
  {
    id: "academics",
    name: "Academics",
    members: "4 committees",
    note: "Placements, curriculum liaison, and the scholarly societies.",
  },
  {
    id: "cultural",
    name: "Cultural",
    members: "11 clubs",
    note: "Drama, music, dance, film, art, radio — and the IICM contingent.",
  },
  {
    id: "food",
    name: "Food & Hygiene",
    members: "SMC · 10 sub-committees",
    note: "The student-run canteen, mess standards, and the medical committee.",
  },
  {
    id: "hostel",
    name: "Hostel",
    members: "SHC · 5 sub-committees",
    note: "Wing representatives across five halls, welfare, and transport.",
  },
  {
    id: "sports",
    name: "Sports",
    members: "16 clubs",
    note: "Inter-batch leagues, the grounds, and the IISM contingent.",
  },
];

const NARROW_MQ = "(max-width: 759px)";

/* -------------------------------------------------------------------------
 * Geometry
 * ------------------------------------------------------------------------- */

/* Card interior metrics, in viewBox units. Cards are sized from the tallest
 * note in BODIES so the row stays a row of equal plates — a printed chart
 * with one card taller than its neighbours reads as a mistake. */
const NOTE_STEP = 11;

/** Wide: one row of cards under a centred seal. */
function wideLayout() {
  const cardW = 148;
  const gap = 12;
  const pad = 26;
  const noteTop = 68;
  const cards = BODIES.map((b) => ({ ...b, lines: wrapText(b.note, 21) }));
  const maxLines = Math.max(...cards.map((c) => c.lines.length));
  const cardH = noteTop + maxLines * NOTE_STEP + 10;

  const width = pad * 2 + BODIES.length * cardW + (BODIES.length - 1) * gap;
  const sealY = 116;
  const cardY = 236;
  return {
    width,
    height: cardY + cardH + 34,
    sealX: width / 2,
    sealY,
    sealR: 42,
    metrics: { nameY: 30, membersY: 50, noteTop },
    cards: cards.map((c, i) => ({
      ...c,
      x: pad + i * (cardW + gap),
      y: cardY,
      w: cardW,
      h: cardH,
    })),
  };
}

/** Narrow: seal on top, cards in a single full-width column. */
function narrowLayout() {
  const width = 360;
  const cardW = 306;
  const gap = 12;
  const pad = 30;
  const noteTop = 56;
  const cards = BODIES.map((b) => ({ ...b, lines: wrapText(b.note, 46) }));
  const maxLines = Math.max(...cards.map((c) => c.lines.length));
  const cardH = noteTop + maxLines * NOTE_STEP + 10;

  // The kicker's baseline is at y 70; a seal centred at 98 (top of the ring at 60) printed its
  // ring through "STUDENT ACTIVITY COUNCIL · IISER KOLKATA" on phones. 122 clears it by 14.
  const sealY = 122;
  const firstY = 206;
  return {
    width,
    height: firstY + BODIES.length * (cardH + gap) + 20,
    sealX: width / 2,
    sealY,
    sealR: 38,
    metrics: { nameY: 26, membersY: 42, noteTop },
    cards: cards.map((c, i) => ({
      ...c,
      x: pad,
      y: firstY + i * (cardH + gap),
      w: cardW,
      h: cardH,
    })),
  };
}

/** Connector from the seal to a card's top (wide) or left (narrow).
 *  Starts clear of the seal's caption, which sits just under the ring. */
function connectorPath(layout, card, narrow) {
  const sx = layout.sealX;
  const sy = layout.sealY + layout.sealR + 22;
  if (narrow) {
    // Down a spine to the left of centre, then an elbow into each card
    const spineX = 16;
    const ty = card.y + card.h / 2;
    return `M ${sx} ${sy} V ${sy + 12} H ${spineX} V ${ty} H ${card.x}`;
  }
  const tx = card.x + card.w / 2;
  const midY = (sy + card.y) / 2;
  return `M ${sx} ${sy} V ${midY} H ${tx} V ${card.y}`;
}

/* -------------------------------------------------------------------------
 * Rendering — plain string templating; this SVG is written once per layout
 * change, never mutated per frame.
 * ------------------------------------------------------------------------- */

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );

function cardMarkup(card, i, narrow, m) {
  const cx = narrow ? card.x + 16 : card.x + card.w / 2;
  const anchor = narrow ? "start" : "middle";
  const nameY = card.y + m.nameY;
  const membersY = card.y + m.membersY;
  const noteY = card.y + m.noteTop;
  const noteLines = card.lines;
  return `
    <g class="sacmap__card" style="--i:${i}" data-body="${card.id}">
      <a href="pages/clubs.html#body-${card.id}" tabindex="0">
        <title>${esc(card.name)} — ${esc(card.note)}</title>
        <rect class="sacmap__card-paper" x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="1.5"/>
        <circle class="sacmap__pin" cx="${card.x + 12}" cy="${card.y + 10}" r="4.2"/>
        <text class="sacmap__card-name" x="${cx}" y="${nameY}" text-anchor="${anchor}">${esc(card.name)}</text>
        <text class="sacmap__card-members" x="${cx}" y="${membersY}" text-anchor="${anchor}">${esc(card.members)}</text>
        ${noteLines
          .map(
            (line, li) =>
              `<text class="sacmap__card-note" x="${cx}" y="${noteY + li * NOTE_STEP}" text-anchor="${anchor}">${esc(line)}</text>`
          )
          .join("")}
      </a>
    </g>`;
}

/** Greedy word wrap to a character budget — the note lines are short and
 *  the font is fixed, so a measured wrap would be overkill here. */
function wrapText(text, max) {
  const out = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    if (!line) line = word;
    else if ((line + " " + word).length <= max) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

function render(mount, narrow) {
  const L = narrow ? narrowLayout() : wideLayout();
  const { width: W, height: H } = L;

  const rules = `
    <line class="sacmap__rule" x1="24" y1="48" x2="${W - 24}" y2="48" stroke-width="1.2"/>
    <line class="sacmap__rule" x1="24" y1="52" x2="${W - 24}" y2="52" stroke-width="0.5" style="--i:1"/>`;

  const connectors = L.cards
    .map(
      (c, i) =>
        `<path class="sacmap__link" style="--i:${i}" data-body="${c.id}" d="${connectorPath(L, c, narrow)}"/>`
    )
    .join("");

  mount.innerHTML = `
    <svg class="sacmap__plate${narrow ? " sacmap__plate--narrow" : ""}" viewBox="0 0 ${W} ${H}" role="img"
         aria-labelledby="sacmap-title sacmap-desc" preserveAspectRatio="xMidYMid meet">
      <title id="sacmap-title">The organisational structure of the Student Activity Council</title>
      <desc id="sacmap-desc">The SAC seal at the centre, connected to its five bodies: ${BODIES.map(
        (b) => `${b.name} (${b.members})`
      ).join("; ")}.</desc>

      <rect class="sacmap__sheet" x="8" y="8" width="${W - 16}" height="${H - 16}" rx="2"/>

      ${rules}
      <text class="sacmap__masthead" x="${W / 2}" y="38" text-anchor="middle">THE ORGANISATIONAL STRUCTURE</text>
      <text class="sacmap__kicker" x="${W / 2}" y="70" text-anchor="middle">STUDENT ACTIVITY COUNCIL · IISER KOLKATA</text>

      <g class="sacmap__links">${connectors}</g>

      <g class="sacmap__seal" style="--seal-x:${L.sealX}px; --seal-y:${L.sealY}px">
        <circle class="sacmap__seal-halo" cx="${L.sealX}" cy="${L.sealY}" r="${L.sealR}"/>
        <circle class="sacmap__seal-ring" cx="${L.sealX}" cy="${L.sealY}" r="${L.sealR}"/>
        <circle class="sacmap__seal-ring sacmap__seal-ring--inner" cx="${L.sealX}" cy="${L.sealY}" r="${L.sealR - 8}"/>
        <text class="sacmap__seal-mark" x="${L.sealX}" y="${L.sealY + 8}" text-anchor="middle">SAC</text>
        <text class="sacmap__seal-sub" x="${L.sealX}" y="${L.sealY + L.sealR + 15}" text-anchor="middle">THE ELECTED STUDENT BODY</text>
      </g>

      <g class="sacmap__cards">${L.cards.map((c, i) => cardMarkup(c, i, narrow, L.metrics)).join("")}</g>
    </svg>`;

  // Both the connectors and the masthead rules are drawn by animating their
  // own length away and back, so each needs to know how long it is.
  for (const path of mount.querySelectorAll(".sacmap__link")) {
    path.style.setProperty("--len", String(Math.ceil(path.getTotalLength())));
  }
  for (const rule of mount.querySelectorAll(".sacmap__rule")) {
    rule.style.setProperty("--rule-len", String(Math.ceil(rule.getTotalLength())));
  }
}

/* -------------------------------------------------------------------------
 * Wiring
 * ------------------------------------------------------------------------- */

export function initSacDiagram(mountId = "sac-diagram") {
  const mount = document.getElementById(mountId);
  if (!mount || mount.dataset.bound === "true") return;
  mount.dataset.bound = "true";
  mount.classList.add("sacmap");

  const mq = window.matchMedia ? window.matchMedia(NARROW_MQ) : null;
  let narrow = mq ? mq.matches : window.innerWidth < 760;

  const paint = () => {
    render(mount, narrow);
    // Re-arm the entrance only if the plate has not played yet; a layout
    // swap mid-scroll should not replay the animation under the reader.
    if (mount.dataset.played === "true") mount.classList.add("is-live");
  };
  paint();

  const onChange = () => {
    const next = mq ? mq.matches : window.innerWidth < 760;
    if (next === narrow) return;
    narrow = next;
    paint();
  };
  mq?.addEventListener?.("change", onChange);

  // Hovering or focusing a card lights its connector too — the link is the
  // point being made, and it is 400px away from the card on a wide screen.
  mount.addEventListener("pointerover", (e) => {
    const card = e.target.closest?.(".sacmap__card");
    setActive(mount, card?.dataset.body || null);
  });
  mount.addEventListener("pointerleave", () => setActive(mount, null));
  mount.addEventListener("focusin", (e) => {
    const card = e.target.closest?.(".sacmap__card");
    setActive(mount, card?.dataset.body || null);
  });
  mount.addEventListener("focusout", () => setActive(mount, null));

  const play = () => {
    mount.dataset.played = "true";
    mount.classList.add("is-live");
  };

  if (!("IntersectionObserver" in window)) {
    play();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        play();
        io.disconnect();
      }
    },
    { threshold: 0.25 }
  );
  io.observe(mount);
}

function setActive(mount, id) {
  mount.dataset.active = id || "";
  for (const el of mount.querySelectorAll("[data-body]")) {
    el.classList.toggle("is-active", Boolean(id) && el.dataset.body === id);
  }
}
