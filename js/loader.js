/**
 * js/loader.js — newspaper-style ink loader for the landing page.
 *
 * The loader is the first child of <body> in index.html and is positioned
 * fixed at z-index 1000 so it covers everything while the JSONL is
 * fetched and the animation plays. When the sequence finishes (or the
 * user hits Skip), we add the .hidden class — the CSS transition fades
 * the loader out — and remove the body.loader-active class so the page
 * can scroll again.
 *
 * Data flow
 * ---------
 *  1. On load, fetch the canonical assets_map.jsonl (js/data.js) and
 *     index it by club.
 *  2. For each club, build a "newspaper" card with the real logo from
 *     the JSONL (entry where is_logo: true), the club's name, a tagline
 *     from a hardcoded map, and an article template rotated per club.
 *  3. Run the same animation as the original HTML: papers appear
 *     staggered, gather toward center, an ink drop falls, a SAC seal
 *     stamps itself, then we hide the loader.
 */
import { loadAssetsMap, indexByClub } from "./data.js";

/* -------------------------------------------------------------------------
 * Static content (the JSONL doesn't carry taglines or article copy)
 * ------------------------------------------------------------------------- */

const TAGLINES = {
  "AARSHI - Drama Club": "Where art meets expression and culture finds its voice",
  "Arts Club of IISER Kolkata": "Colours, lines, and the courage to make something new",
  "Campus Radio IISER KOLKATA (IKCR)": "The voice of the campus, on air and online",
  "IKQC - Quiz Club of IISER Kolkata": "Questions, curiosity, and the thrill of the right answer",
  "Literary Club of IISER Kolkata": "Words weave worlds — read, write, recite",
  "Movie Club of IISER K": "Frame by frame, story by story",
  "Music Club of IISER K": "Every rhythm finds a soul",
  "Nature Club of IISER Kolkata": "Trails, trees, and a planet worth protecting",
  "Nrutya - Dance Club of IISER Kolkata": "Motion becomes memory",
  "PIXEL - Photography Club": "Capturing moments time forgets",
  "SAC Academics": "Where scholarship meets the wider campus",
  "SAC Hostel Committee": "Community, comfort, and the everyday essentials",
};

/* Article templates rotated per newspaper (i % ARTICLES.length) */
const ARTICLES = [
  {
    h1: "{club} Sets The Stage For An Unforgettable Season",
    h2: "Workshops And Open Calls Begin This Week",
    b1: "Members and newcomers are invited to contribute, perform, and learn across a packed calendar of showcases, screenings, and rehearsals.",
    b2: "Drop in to a session, sign up for the open mic, or propose a collaboration — the doors are open to anyone curious.",
  },
  {
    h1: "Inside {club}: The People Behind The Work",
    h2: "New Members, Same Energy",
    b1: "Our clubs thrive because of the people who show up — the late-night rehearsals, the early-morning setups, the quiet hours spent getting it right.",
    b2: "If you've been meaning to walk in, this is the season. Bring a friend, bring a question, bring yourself.",
  },
  {
    h1: "{club} Looks Back On A Defining Year",
    h2: "What's Next: Bigger Stages, Bolder Work",
    b1: "Last season brought milestones, recognition, and a few surprises — proof that consistent, careful work is noticed.",
    b2: "The next chapter is already in motion. Expect sharper productions, deeper collaborations, and more chances to be on stage.",
  },
];

/* How long the SAC seal stays on screen before we dismiss the loader.
   Mobile gets more time than before — the logo stamp animation is 0.72s,
   printReveal is 1.05s, captionUp is 0.75s. We need the user to actually
   SEE the logo, not just flash it. */
const HOLD_AFTER_LOGO = isMobile() ? 1200 : 1800;

/* Device tier from preloader (falls back to runtime detection).
   "low" = few cores/RAM, "medium" = typical mobile, "high" = desktop.
   Used to scale splash droplets, SVG filter complexity, and rAF batching. */
const DEVICE_TIER = window.__sacDeviceTier || (isMobile() ? "low" : "high");

/* -------------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------------- */

const els = {};
let papers = [];
let skipped = false;

/* -------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function isMobile() {
  return window.innerWidth < 520 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function $(id) {
  return document.getElementById(id);
}

function fillTemplate(tpl, clubName) {
  return tpl.replace(/\{club\}/g, clubName);
}

function buildClubData(clubs) {
  return clubs.map((club, i) => {
    const article = ARTICLES[i % ARTICLES.length];
    return {
      name: club.name,
      img: club.logo ? club.logo.public_url : null,
      tagline: TAGLINES[club.name] || "Official SAC club",
      h1: fillTemplate(article.h1, club.name),
      h2: article.h2,
      b1: article.b1,
      b2: article.b2,
      redHeadline: i % 2 === 0,
    };
  });
}

function createNewspaper(club, index) {
  const paper = document.createElement("section");
  paper.className = "newspaper";

  const logoHTML = club.img
    ? `<img src="${club.img}" alt="${escapeHtml(club.name)} logo" loading="eager" decoding="async">`
    : `<span class="club-logo__initial">${escapeHtml(club.name.charAt(0))}</span>`;

  paper.innerHTML = `
    <div class="news-inner">
      <div class="fold"></div>
      <header class="paper-head">
        <span class="paper-kicker">Special Edition • Vol. ${String(index + 1).padStart(2, "0")}</span>
        <div class="paper-title">The SAC Chronicle</div>
        <span class="paper-subtitle">Student Affairs Council Official Publication</span>
        <div class="date-row">
          <span>Kolkata</span>
          <span>${escapeHtml(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))}</span>
          <span>Free</span>
        </div>
      </header>
      <div class="club-area">
        <div>
          <div class="club-logo">${logoHTML}</div>
          <div class="club-name">${escapeHtml(club.name)}</div>
          <div class="club-tagline">${escapeHtml(club.tagline)}</div>
        </div>
      </div>
      <div class="ornament">— ✦ ✦ ✦ —</div>
      <div class="article-grid">
        <article class="article">
          <h4 class="${club.redHeadline ? "red" : ""}">${escapeHtml(club.h1)}</h4>
          ${escapeHtml(club.b1)}
        </article>
        <article class="article">
          <h4>${escapeHtml(club.h2)}</h4>
          ${escapeHtml(club.b2)}
        </article>
      </div>
      <footer class="news-footer">Student Affairs Council • IISER Kolkata • Printed With Pride</footer>
    </div>
  `;
  return paper;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]
  );
}

function transformsFor(index, total) {
  const mid = (total - 1) / 2;
  const finalX = (index - mid) * 15;
  const finalY = Math.sin(index * 1.35) * 15;
  const finalZ = index * 30;
  const rotX = -5 + Math.sin(index) * 5;
  const rotY = (index - mid) * 6;
  const rotZ = -7 + index * 1.55;

  /* Mobile: same 3D entrance as desktop (translate3d + rotateX/Y/Z)
     but with smaller random ranges so the GPU has less work per frame.
     The visual effect is the same — papers fly in from different angles
     and stack with depth — but the smaller ranges mean fewer pixels to
     composite per transform. */
  const scale = isMobile() ? 0.75 : 1;
  const range = isMobile() ? 0.6 : 1; // fraction of desktop random range

  const entranceX = (Math.random() - 0.5) * 760 * range;
  const entranceY = (-390 - Math.random() * 250) * range;
  const entranceZ = (260 + Math.random() * 430) * range;
  const entranceRotX = (45 + Math.random() * 45) * range;
  const entranceRotY = (Math.random() - 0.5) * 130 * range;
  const entranceRotZ = (Math.random() - 0.5) * 90 * range;
  return {
    entrance: `
      translate(-50%, -50%)
      translate3d(${entranceX}px, ${entranceY}px, ${entranceZ}px)
      rotateX(${entranceRotX}deg)
      rotateY(${entranceRotY}deg)
      rotateZ(${entranceRotZ}deg)
      scale(${scale})
    `,
    final: `
      translate(-50%, -50%)
      translate3d(${finalX}px, ${finalY}px, ${finalZ}px)
      rotateX(${rotX}deg)
      rotateY(${rotY}deg)
      rotateZ(${rotZ}deg)
    `,
  };
}

function fitStage() {
  if (!els.stageShell) return;
  const scale = Math.min(window.innerWidth / 440, window.innerHeight / 650, 1.18);
  els.stageShell.style.setProperty("--stage-scale", Math.max(scale, 0.58).toFixed(3));
}

function spawnSplashDroplets() {
  els.splashLayer.innerHTML = "";
  /* Scale droplet count by device tier. The preloader already warmed up
     the compositor, but fewer DOM nodes = less jank on low-end devices. */
  let count;
  if (DEVICE_TIER === "low") count = 10;
  else if (DEVICE_TIER === "medium") count = isMobile() ? 18 : 28;
  else count = isMobile() ? 12 : window.innerWidth < 768 ? 24 : 38;

  const maxDist = isMobile() ? 120 : 245;
  const minDist = isMobile() ? 30 : 55;
  const maxDur = isMobile() ? 0.6 : 1.34;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("div");
    dot.className = "splash-dot";
    const angle = Math.random() * Math.PI * 2;
    const distance = minDist + Math.random() * maxDist;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.64;
    const size = isMobile() ? 3 + Math.random() * 10 : 4 + Math.random() * 18;
    const duration = 0.4 + Math.random() * (maxDur - 0.4);
    const delay = Math.random() * 0.11;
    const arc = isMobile() ? 10 + Math.random() * 40 : 20 + Math.random() * 80;
    const squash = 0.82 + Math.random() * 0.55;
    dot.style.setProperty("--x", `${x}px`);
    dot.style.setProperty("--y", `${y}px`);
    dot.style.setProperty("--size", `${size}px`);
    dot.style.setProperty("--dur", `${duration}s`);
    dot.style.setProperty("--delay", `${delay}s`);
    dot.style.setProperty("--arc", `${arc}px`);
    dot.style.setProperty("--s", `${squash}`);
    els.splashLayer.appendChild(dot);
  }
}

/* -------------------------------------------------------------------------
 * Animation sequence
 * ------------------------------------------------------------------------- */

function startLoader(data) {
  /* Mobile optimization: only show 5 clubs (down from 12) to reduce DOM
     nodes, animation duration, and memory pressure on low-end phones. */
  const clubLimit = isMobile() ? 5 : data.length;
  const clubs = data.slice(0, clubLimit);
  const total = clubs.length;

  els.clubLabel.textContent = total ? "Club Editions" : "Student Affairs Council";

  /* PRE-BUILD PHASE: Create all newspaper DOM nodes in a DocumentFragment
     before appending to the stage. This lets the browser parse the HTML
     and build the DOM tree in one batch, rather than triggering a
     reflow per append. The preloader already warmed up the compositor,
     so the layer creation for these nodes will be fast. */
  const fragment = document.createDocumentFragment();

  clubs.forEach((club, index) => {
    const paper = createNewspaper(club, index);
    const t = transformsFor(index, total);
    paper.style.transform = t.entrance;
    paper.dataset.finalTransform = t.final;
    papers.push(paper);
    fragment.appendChild(paper);
  });

  // Append all papers in one DOM operation
  els.paperStage.appendChild(fragment);

  /* Mobile: generous stagger (400ms vs 270ms desktop) so each paper's
     3D entrance (0.95s CSS transition) has time to mostly complete before
     the next one starts. At 300ms, papers overlapped heavily — the GPU
     was compositing 3-4 in-flight transforms simultaneously. At 400ms,
     at most 2 overlap. */
  const stagger = isMobile() ? 400 : 270;

  /* Use requestAnimationFrame for the stagger timing instead of setTimeout.
     rAF ensures the browser has finished processing the previous frame
     before we start the next paper's animation, preventing dropped frames
     on low-powered devices. */
  let startTime = null;
  const initialDelay = 320; // ms before first paper starts

  function animateFrame(timestamp) {
    if (skipped) return;
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // Check which papers should start based on elapsed time
    for (let i = 0; i < papers.length; i++) {
      const paperStartTime = initialDelay + i * stagger;
      if (elapsed >= paperStartTime && !papers[i].dataset.started) {
        papers[i].dataset.started = "true";
        // Set will-change ONLY on this paper (not all at once) to stay
        // within the browser's will-change memory budget.
        papers[i].style.willChange = "transform, opacity";
        papers[i].style.opacity = "1";
        papers[i].style.transform = papers[i].dataset.finalTransform;
        els.clubLabel.textContent = clubs[i].name;
        els.progressFill.style.width = `${((i + 1) / papers.length) * 100}%`;

        /* Mobile: skip the paperBreath animation entirely. The brightness
           pulse (filter: brightness) is GPU-intensive — running it on 5
           papers simultaneously causes jank on low-end mobile GPUs. The
           CSS transition on transform/opacity is enough for a smooth
           entrance. */
        if (!isMobile()) {
          const arriveDelay = 900;
          setTimeout(() => {
            if (!skipped) papers[i].classList.add("arrived");
          }, arriveDelay);
        }

        // Remove will-change after the transition completes to free GPU memory
        const transitionDuration = isMobile() ? 950 : 1000;
        setTimeout(() => {
          if (papers[i] && !skipped) {
            papers[i].style.willChange = "auto";
          }
        }, transitionDuration);

        // If this is the last paper, schedule the gather
        if (i === papers.length - 1) {
          /* Mobile: generous gather delay (1500ms vs 1050ms desktop).
             All 5 papers need to be visible stacked with depth for a
             beat before they fade. At 1200ms the last paper had barely
             settled. At 1500ms the user sees the full stack. */
          const gatherDelay = isMobile() ? 1500 : 1050;
          setTimeout(() => {
            if (!skipped) gatherNewspapers();
          }, gatherDelay);
        }
      }
    }

    // Continue the rAF loop if not all papers have started
    const allStarted = papers.every((p) => p.dataset.started);
    if (!allStarted && !skipped) {
      requestAnimationFrame(animateFrame);
    }
  }

  // Start the rAF loop on the next frame
  requestAnimationFrame(animateFrame);
}

function gatherNewspapers() {
  /* Mobile: slower gather with more time before ink finale.
     Previously: 30ms per paper, 350ms to ink finale — papers were still
     fading when the ink drop started, causing GPU overlap jank.
     Now: 60ms per paper, 600ms to ink finale — papers fully faded
     before the ink drop begins. */
  if (isMobile()) {
    els.paperStage.style.animation = "none";
    papers.forEach((paper, index) => {
      setTimeout(() => {
        paper.classList.remove("arrived");
        const x = (Math.random() - 0.5) * 6;
        const y = (Math.random() - 0.5) * 6;
        const z = index * 1.8;
        const rz = (Math.random() - 0.5) * 3;
        paper.style.transform = `
          translate(-50%, -50%)
          translate3d(${x}px, ${y}px, ${z}px)
          rotateX(0deg)
          rotateY(0deg)
          rotateZ(${rz}deg)
          scale(0.94)
        `;
        paper.style.opacity = index === papers.length - 1 ? "1" : "0";
        paper.style.transition = "opacity 0.3s ease";
      }, index * 60);
    });
    els.status.classList.add("hide");
    // Wait for all papers to finish fading (60ms × 5 + 300ms transition = 600ms)
    setTimeout(() => {
      if (!skipped) playInkFinale();
    }, 600);
    return;
  }
  els.paperStage.style.animation = "none";
  papers.forEach((paper, index) => {
    setTimeout(() => {
      paper.classList.remove("arrived");
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 8;
      const z = index * 2.2;
      const rz = (Math.random() - 0.5) * 4;
      paper.style.transform = `
        translate(-50%, -50%)
        translate3d(${x}px, ${y}px, ${z}px)
        rotateX(0deg)
        rotateY(0deg)
        rotateZ(${rz}deg)
        scale(0.92)
      `;
      paper.style.opacity = index === papers.length - 1 ? "1" : "0.62";
    }, index * 42);
  });
  els.status.classList.add("hide");
  setTimeout(() => {
    if (!skipped) playInkFinale();
  }, 900);
}

function playInkFinale() {
  els.inkFinale.classList.add("active");
  /* Mobile: the dropFall3D CSS animation is 1.12s (1120ms). Impact must
     fire AFTER the drop finishes, not before. Desktop uses 1080ms which
     is already 40ms early — we fix that too. */
  const impactDelay = 1200;
  /* Mobile: logo stamp needs to be fully visible before the loader fades.
     Logo stamp CSS is 0.72s, printReveal is 1.05s + 0.18s delay.
     Logo is fully revealed at ~1230ms after logo class. Add buffer. */
  const logoDelay = 2500;

  setTimeout(() => {
    if (skipped) return;
    spawnSplashDroplets();
    els.inkFinale.classList.add("impact");
  }, impactDelay);
  setTimeout(() => {
    if (skipped) return;
    els.inkFinale.classList.add("logo");
  }, logoDelay);
  setTimeout(
    () => {
      if (skipped) return;
      hideLoader();
    },
    logoDelay + HOLD_AFTER_LOGO + 1200
  );
}

function hideLoader() {
  els.loader.classList.add("hidden");
  document.body.classList.remove("loader-active");
  unwireEvents();
  // Drop the papers after the fade so the DOM stays tidy
  setTimeout(() => {
    papers.forEach((p) => p.remove());
    papers = [];
  }, 1000);
}

function skipLoader() {
  if (skipped) return;
  skipped = true;
  els.progressFill.style.width = "100%";
  hideLoader();
}

/* -------------------------------------------------------------------------
 * Event wiring
 * ------------------------------------------------------------------------- */

function mousemoveHandler(event) {
  if (skipped) return;
  if (!els.loader || els.loader.classList.contains("hidden")) return;
  if (!els.stageShell || els.inkFinale.classList.contains("active")) return;
  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;
  els.stageShell.style.setProperty("--ry", `${x * 10}deg`);
  els.stageShell.style.setProperty("--rx", `${-y * 7}deg`);
}

function wireEvents() {
  document.addEventListener("mousemove", mousemoveHandler);
  window.addEventListener("resize", fitStage);

  // Skip button (in HTML, has class="skip-btn" and id="skipBtn")
  const skipBtn = $("skipBtn");
  if (skipBtn) skipBtn.addEventListener("click", skipLoader);
}

function unwireEvents() {
  document.removeEventListener("mousemove", mousemoveHandler);
  window.removeEventListener("resize", fitStage);
}

/* -------------------------------------------------------------------------
 * Init
 * ------------------------------------------------------------------------- */

async function init() {
  // Cache DOM references
  els.loader = $("loader");
  els.stageShell = $("stageShell");

  // If the loader HTML doesn't exist on this page (e.g. individual
  // club pages), skip the loader entirely — just remove loader-active
  // so the page is scrollable and interactive.
  if (!els.loader) {
    document.body.classList.remove("loader-active");
    return;
  }

  // Lock body scroll while the loader is up
  document.body.classList.add("loader-active");

  els.paperStage = $("paperStage");
  els.progressFill = $("progressFill");
  els.clubLabel = $("clubLabel");
  els.status = $("status");
  els.inkFinale = $("inkFinale");
  els.splashLayer = $("splashLayer");

  // Wire events + responsive scaling
  wireEvents();
  fitStage();

  // Wait for the pre-loader to finish (it pre-caches assets AND warms
  // up the compositor so the loader animation plays smoothly). The
  // preloader dispatches "preloader-done" with a device tier detail.
  // If there's no pre-loader (e.g., on sub-pages), proceed immediately.
  const preloader = $("preloader");
  if (preloader && !preloader.classList.contains("is-done")) {
    await new Promise(function (resolve) {
      window.addEventListener("preloader-done", resolve, { once: true });
      // Safety timeout: if pre-loader takes too long, proceed anyway
      setTimeout(resolve, 5000);
    });
  }

  // Fetch data, build newspaper data
  let data = [];
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);
    data = buildClubData(clubs);
  } catch (err) {
    console.warn("[loader] failed to load assets_map.jsonl — running with empty data", err);
  }

  // Kick off the animation
  startLoader(data);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
