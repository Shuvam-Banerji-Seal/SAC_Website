/**
 * pages/clubs.js — all-clubs directory, grouped by SAC body.
 *
 * The home page is the magazine cover; this page is the full index.
 * Clubs are bucketed into Council / Academics / Hostel / Sports / Cultural
 * sections (h2 headers, h3 cards — valid heading outline), each card links
 * to its individual page, and client-side search matches name + slug + body.
 */
import { $, el, pageLink, assetUrl, showError } from "../utils/dom.js";
import { loadAssetsMap, indexByClub } from "../data.js";
import { showGridSkeleton, clearSkeleton } from "../utils/skeleton.js";
import { buildSectionNav, trackSections } from "../components/section-nav.js";
import { BODIES, PENDING_CLUBS, clubBySlug, clubPageUrl } from "../data/clubs.js";
import {
  cardMatches,
  interestFromSearch,
  setInterestParam,
  tokenize,
} from "../utils/club-filter.js";

function assignBody(club) {
  const registered = clubBySlug(club.slug);
  if (registered) return registered.body;
  // Pattern fallback for a club that is in the archive but not yet in data/clubs.js.
  const name = `${club.name} ${club.slug}`.toLowerCase();
  if (
    name.includes("sport") ||
    /(athletics|badminton|basketball|carrom|chess|cricket|football|gaming|gym|kabaddi|kho[-_ ]?kho|lawn[-_ ]?tennis|rubik|sydc|table[-_ ]?tennis|volleyball)/.test(
      name
    )
  ) {
    return "sports";
  }
  if (
    name.includes("academic") ||
    name.includes("placement") ||
    name.includes("singularity") ||
    name.includes("astronomy") ||
    name.includes("slashdot") ||
    name.includes("programming")
  ) {
    return "academics";
  }
  if (
    name.includes("food") ||
    name.includes("hygiene") ||
    name.includes("smc") ||
    name.includes("medical")
  ) {
    return "food";
  }
  if (name.includes("hostel")) return "hostel";
  return "cultural";
}

/* A directory card should say what the club IS, not how many files the
 * pipeline happened to ingest for it. The body it answers to is the useful
 * fact — it is also what the search box matches on. */
function clubBodyLine(c) {
  const label = BODIES.find((b) => b.id === c.body)?.label;
  if (!label) return "";
  // "SAC Academics" filed under "SAC Academics" tells the reader nothing —
  // the four body-level committees are their own body.
  const norm = (x) => x.toLowerCase().replace(/[^a-z]/g, "");
  if (norm(label) === norm(c.name)) return "";
  return label;
}

function clubCard(c) {
  const url = clubPageUrl(c.slug);
  const pending = !!c.pending;
  const fallbackLogo = !c.logo && (clubBySlug(c.slug)?.crest ?? c.crest);
  const inner = [
    el(
      "div",
      { class: "club-card__logo" },
      c.logo
        ? el("img", {
            src: assetUrl(c.logo.public_url),
            alt: `${c.name} logo`,
            loading: "lazy",
            decoding: "async",
            width: c.logo.width || 96,
            height: c.logo.height || 96,
          })
        : fallbackLogo
          ? el("img", {
              src: assetUrl(fallbackLogo),
              alt: `${c.name} logo`,
              loading: "lazy",
              decoding: "async",
              width: 96,
              height: 96,
            })
          : el("div", { class: "club-card__logo-fallback" }, c.name.charAt(0))
    ),
    el("h3", { class: "club-card__name" }, c.name),
  ];
  const meta = pending ? c.note : clubBodyLine(c);
  if (meta) inner.push(el("p", { class: "club-card__count" }, meta));
  const card = el(
    "li",
    {
      class: "club-card" + (pending ? " club-card--pending" : ""),
      "data-club-name": c.name.toLowerCase(),
      "data-club-slug": c.slug.toLowerCase(),
      "data-club-body": c.body,
      "data-club-interests": (c.interests ?? clubBySlug(c.slug)?.interests ?? []).join(" "),
      "data-club-keywords": c.keywords ?? clubBySlug(c.slug)?.keywords ?? "",
      // the card is drawn in the club's own ink (css/pages/club-inks.css); a club with no page
      // yet has no theme, and keeps the plain card
      "data-motif": clubBySlug(c.slug)?.theme?.motif,
    },
    url && !pending
      ? // No aria-label: the link's own text (name + body line) is its name. An
        // override that left out the visible body line failed WCAG "Label in Name".
        el("a", { href: pageLink(url) }, ...inner)
      : el("div", { class: "club-card__nolink", title: "Club page coming soon" }, ...inner)
  );
  return card;
}

export async function initClubs() {
  const mount = $("#clubs-grid");
  if (!mount) return;
  showGridSkeleton(mount, 10);
  try {
    const assets = await loadAssetsMap();
    // Campus_Archive is a media collection, not a club — keep the directory clean
    const clubs = indexByClub(assets.filter((a) => a.club !== "Campus_Archive"));

    // Media counts per club (video + audio) for the card meta line
    const mediaByClub = new Map();
    for (const a of assets) {
      if (a.file_type !== "video" && a.file_type !== "audio") continue;
      mediaByClub.set(a.club, (mediaByClub.get(a.club) || 0) + 1);
    }
    for (const c of clubs) c.counts.media = mediaByClub.get(c.slug) || 0;

    // Bucket clubs into bodies, then merge in pending (no-data-yet) clubs
    for (const c of clubs) c.body = assignBody(c);
    const pending = PENDING_CLUBS.filter((p) => !clubs.some((c) => c.slug === p.slug)).map((p) => ({
      slug: p.slug,
      name: p.name,
      body: p.body,
      note: p.note,
      crest: p.crest,
      interests: p.interests,
      keywords: p.keywords,
      pending: true,
      counts: { images: 0, markdowns: 0, media: 0 },
    }));
    const allClubs = [...clubs, ...pending];

    const sections = BODIES.map((body) => {
      const members = allClubs.filter((c) => c.body === body.id);
      if (!members.length) return null;
      return el(
        "section",
        { class: "clubs-body", id: "body-" + body.id, "data-clubs-body": body.id },
        el(
          "h2",
          { class: "clubs-body__title" },
          body.label,
          el("span", { class: "clubs-body__count" }, String(members.length))
        ),
        el("p", { class: "clubs-body__blurb muted" }, body.blurb),
        el("ul", { class: "club-grid club-grid--full" }, ...members.map(clubCard))
      );
    }).filter(Boolean);

    clearSkeleton(mount);
    mount.replaceWith(
      el(
        "section",
        { class: "clubs-grid-wrap", id: "clubs-grid", "aria-label": "All clubs" },
        sections.length ? sections : el("p", { class: "muted" }, "No clubs indexed yet.")
      )
    );

    // Jump bar: one chip per body, so Sports is one tap away instead of 3,600px.
    const jump = buildSectionNav(
      sections.map((section) => {
        const body = BODIES.find((b) => b.id === section.dataset.clubsBody);
        return {
          id: section.id,
          label: body.label.replace(/^SAC /, ""),
          count: section.querySelectorAll(".club-card").length,
        };
      }),
      { label: "Jump to a body of the Council" }
    );
    document.getElementById("clubs-grid")?.before(jump);
    trackSections(jump);

    // One filter for the text box and the interest chips, so they combine (and agree on the counts).
    const searchInput = $("#clubs-search");
    const filterRow = $(".interest-filter");
    const clearButton = filterRow?.querySelector(".interest-filter__clear");
    const total = document.querySelectorAll(".club-card").length;
    let interest = interestFromSearch(location.search);

    const applyFilters = () => {
      const query = searchInput?.value ?? "";
      const tokens = tokenize(query);
      let visibleCount = 0;
      document.querySelectorAll(".clubs-body").forEach((section) => {
        let sectionVisible = 0;
        section.querySelectorAll(".club-card").forEach((card) => {
          const d = card.dataset;
          const match = cardMatches(
            {
              name: d.clubName || "",
              slug: d.clubSlug || "",
              body: section.dataset.clubsBody || "",
              keywords: d.clubKeywords || "",
              interests: (d.clubInterests || "").split(" ").filter(Boolean),
            },
            tokens,
            interest
          );
          card.classList.toggle("is-hidden", !match);
          if (match) {
            sectionVisible++;
            visibleCount++;
          }
        });
        section.classList.toggle("is-hidden", sectionVisible === 0);
        // the counts follow what is showing; a body with nothing showing loses its chip too
        const heading = section.querySelector(".clubs-body__count");
        if (heading) heading.textContent = String(sectionVisible);
        const chip = jump.querySelector(`[data-target="${section.id}"]`);
        chip?.parentElement.toggleAttribute("hidden", sectionVisible === 0);
        const chipCount = chip?.querySelector(".section-nav__count");
        if (chipCount) chipCount.textContent = String(sectionVisible);
      });

      filterRow?.querySelectorAll("[data-interest]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.interest === interest));
      });
      if (clearButton) clearButton.hidden = !interest;

      // Live result-count chip next to the search box
      const filtering = tokens.length > 0 || interest;
      if (searchInput) {
        let counter = searchInput.parentElement.querySelector(".clubs-search-count");
        if (!counter) {
          counter = el("span", {
            class: "clubs-search-count",
            role: "status",
            "aria-live": "polite",
          });
          searchInput.parentElement.append(counter);
        }
        counter.textContent = filtering ? `${visibleCount} of ${total} clubs` : "";
      }

      const noResults = $(".clubs-no-results");
      if (!filtering || visibleCount > 0) {
        noResults?.remove();
      } else if (!noResults) {
        document
          .getElementById("clubs-grid")
          ?.appendChild(
            el(
              "p",
              { class: "clubs-no-results muted", role: "status" },
              "No clubs match that search."
            )
          );
      }
    };

    searchInput?.addEventListener("input", applyFilters);
    filterRow?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-interest]");
      if (button) interest = interest === button.dataset.interest ? null : button.dataset.interest;
      else if (event.target.closest(".interest-filter__clear")) interest = null;
      else return;
      setInterestParam(interest);
      applyFilters();
    });
    if (interest) applyFilters(); // arrived from a home-page chip (?interest=…)
  } catch {
    showError(
      mount,
      "Could not load clubs",
      "The clubs directory failed to load. Check your connection and try again."
    );
  }
}
