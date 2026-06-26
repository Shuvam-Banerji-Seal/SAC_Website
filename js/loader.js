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
   Shorter on mobile to reduce total loader time. */
const HOLD_AFTER_LOGO = isMobile() ? 800 : 1800;

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
  const entranceX = (Math.random() - 0.5) * 760;
  const entranceY = -390 - Math.random() * 250;
  const entranceZ = 260 + Math.random() * 430;
  const entranceRotX = 45 + Math.random() * 45;
  const entranceRotY = (Math.random() - 0.5) * 130;
  const entranceRotZ = (Math.random() - 0.5) * 90;
  return {
    entrance: `
      translate(-50%, -50%)
      translate3d(${entranceX}px, ${entranceY}px, ${entranceZ}px)
      rotateX(${entranceRotX}deg)
      rotateY(${entranceRotY}deg)
      rotateZ(${entranceRotZ}deg)
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
  const scale = Math.min(window.innerWidth / 440, window.innerHeight / 650, 1.18);
  els.stageShell.style.setProperty("--stage-scale", Math.max(scale, 0.58).toFixed(3));
}

function spawnSplashDroplets() {
  els.splashLayer.innerHTML = "";
  /* Mobile: 12 droplets (down from 24/38) to reduce DOM work. */
  const count = isMobile() ? 12 : window.innerWidth < 768 ? 24 : 38;
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

  clubs.forEach((club, index) => {
    const paper = createNewspaper(club, index);
    const t = transformsFor(index, total);
    paper.style.transform = t.entrance;
    paper.dataset.finalTransform = t.final;
    els.paperStage.appendChild(paper);
    papers.push(paper);
  });

  /* Mobile: reduce stagger delay from 270ms to 150ms per paper. */
  const stagger = isMobile() ? 150 : 270;

  papers.forEach((paper, index) => {
    setTimeout(
      () => {
        if (skipped) return;
        paper.style.opacity = "1";
        paper.style.transform = paper.dataset.finalTransform;
        els.clubLabel.textContent = clubs[index].name;
        els.progressFill.style.width = `${((index + 1) / papers.length) * 100}%`;
        setTimeout(() => paper.classList.add("arrived"), isMobile() ? 500 : 900);
        if (index === papers.length - 1) {
          setTimeout(
            () => {
              if (!skipped) gatherNewspapers();
            },
            isMobile() ? 550 : 1050
          );
        }
      },
      320 + index * stagger
    );
  });
}

function gatherNewspapers() {
  /* Mobile: fast gather (300ms instead of the desktop's ~900ms).
     Papers fade out over 300ms, then ink finale starts. This avoids
     the "flash of empty viewport" that the old instant-hide caused. */
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
      }, index * 30);
    });
    els.status.classList.add("hide");
    setTimeout(() => {
      if (!skipped) playInkFinale();
    }, 350);
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
  setTimeout(() => {
    if (skipped) return;
    spawnSplashDroplets();
    els.inkFinale.classList.add("impact");
  }, 1080);
  setTimeout(() => {
    if (skipped) return;
    els.inkFinale.classList.add("logo");
  }, 2200);
  setTimeout(
    () => {
      if (skipped) return;
      hideLoader();
    },
    2200 + HOLD_AFTER_LOGO + 1200
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
  if (els.loader.classList.contains("hidden")) return;
  if (els.inkFinale.classList.contains("active")) return;
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
  // Lock body scroll while the loader is up
  document.body.classList.add("loader-active");

  // Cache DOM references
  els.loader = $("loader");
  els.stageShell = $("stageShell");
  els.paperStage = $("paperStage");
  els.progressFill = $("progressFill");
  els.clubLabel = $("clubLabel");
  els.status = $("status");
  els.inkFinale = $("inkFinale");
  els.splashLayer = $("splashLayer");

  // Wire events + responsive scaling
  wireEvents();
  fitStage();

  // Wait for the pre-loader to finish (it pre-caches assets so the
  // loader animation plays smoothly). If there's no pre-loader
  // (e.g., on sub-pages), proceed immediately.
  var preloader = $("preloader");
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
