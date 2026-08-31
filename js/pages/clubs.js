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

function getClubPageUrl(slug) {
  const urlMap = {
    "AARSHI_-_Drama_Club": "pages/aarshi.html",
    Arts_Club_of_IISER_Kolkata: "pages/arts.html",
    Campus_Radio_IISER_KOLKATA: "pages/radio.html",
    "IKQC_-_Quiz_Club_of_IISER_Kolkata": "pages/ikqc.html",
    Literary_Club_of_IISER_Kolkata: "pages/literary.html",
    Movie_Club_of_IISER_K: "pages/movie.html",
    Music_Club_of_IISER_K: "pages/music.html",
    Nature_Club_Of_IISER_Kolkata: "pages/nature.html",
    "Nrutya_-_The_Dance_Club_of_IISER_Kolkata": "pages/nrutya.html",
    "PIXEL-Photography_Club": "pages/pixel.html",
    Placement_Cell: "pages/placement.html",
    SAC_Academics: "pages/academics.html",
    SAC_Food_and_Hygiene: "pages/food-hygiene.html",
    SAC_Hostel: "pages/hostel.html",
    SAC_Sports_Athletics: "pages/athletics.html",
    SAC_Sports_Badminton: "pages/badminton.html",
    SAC_Sports_Basketball: "pages/basketball.html",
    SAC_Sports_Carrom: "pages/carrom.html",
    SAC_Sports_Chess: "pages/chess.html",
    SAC_Sports_Cricket: "pages/cricket.html",
    SAC_Sports_Football: "pages/football.html",
    SAC_Sports_Gaming: "pages/gaming.html",
    SAC_Sports_GYM: "pages/gym.html",
    SAC_Sports_Kabaddi: "pages/kabaddi.html",
    SAC_Sports_Kho_Kho: "pages/kho-kho.html",
    SAC_Sports_Lawn_Tennis: "pages/lawn-tennis.html",
    SAC_Sports_Rubik: "pages/rubik.html",
    SAC_Sports_SYDC: "pages/sydc.html",
    SAC_Sports_Table_Tennis: "pages/table-tennis.html",
    SAC_Sports_Volleyball: "pages/volleyball.html",
    Singularity_Astro_Club: "pages/singularity.html",
    Slashdot_Programming_Club: "pages/slashdot.html",
  };
  return urlMap[slug] || null;
}

/* Body segments — mirror the canonical "SAC Website details" source tree:
 *   SAC Academics / SAC Cultural / SAC Food and Hygine / SAC Hostel / SAC Sports
 * Order here defines render order on the page. */
const BODIES = [
  {
    id: "academics",
    label: "SAC Academics",
    blurb: "General secretaries, placement, astronomy, and programming — the scholarly societies.",
  },
  {
    id: "cultural",
    label: "SAC Cultural",
    blurb: "Drama, art, radio, quizzing, film, music, nature, dance, photography — plus IICM.",
  },
  {
    id: "food",
    label: "SAC Food & Hygiene",
    blurb: "The Students' Monitored Canteen (SMC) — menus, quality checks, and grievances.",
  },
  {
    id: "hostel",
    label: "SAC Hostel",
    blurb: "General secretaries, sub-committees, and wardens' representatives across the blocks.",
  },
  {
    id: "sports",
    label: "SAC Sports",
    blurb: "Sixteen clubs across the fields, courts, and mats — plus the IISM contingent.",
  },
];

/* Slug → body, mirroring the source folders one-to-one. Anything not listed
 * falls through to the pattern-based fallback so newly indexed clubs still
 * land somewhere sensible. */
const SLUG_BODIES = {
  // SAC Academics/
  SAC_Academics: "academics",
  Placement_Cell: "academics",
  Singularity_Astro_Club: "academics",
  Slashdot_Programming_Club: "academics",
  // SAC Cultural/
  "AARSHI_-_Drama_Club": "cultural",
  Arts_Club_of_IISER_Kolkata: "cultural",
  Campus_Radio_IISER_KOLKATA: "cultural",
  "IKQC_-_Quiz_Club_of_IISER_Kolkata": "cultural",
  Literary_Club_of_IISER_Kolkata: "cultural",
  Movie_Club_of_IISER_K: "cultural",
  Music_Club_of_IISER_K: "cultural",
  Nature_Club_Of_IISER_Kolkata: "cultural",
  "Nrutya_-_The_Dance_Club_of_IISER_Kolkata": "cultural",
  "PIXEL-Photography_Club": "cultural",
  // SAC Food and Hygine/
  SAC_Food_and_Hygiene: "food",
  // SAC Hostel/
  SAC_Hostel: "hostel",
  // SAC Sports/
  SAC_Sports_Athletics: "sports",
  SAC_Sports_Badminton: "sports",
  SAC_Sports_Basketball: "sports",
  SAC_Sports_Carrom: "sports",
  SAC_Sports_Chess: "sports",
  SAC_Sports_Cricket: "sports",
  SAC_Sports_Football: "sports",
  SAC_Sports_Gaming: "sports",
  SAC_Sports_GYM: "sports",
  SAC_Sports_Kabaddi: "sports",
  SAC_Sports_Kho_Kho: "sports",
  SAC_Sports_Lawn_Tennis: "sports",
  SAC_Sports_Rubik: "sports",
  SAC_Sports_SYDC: "sports",
  SAC_Sports_Table_Tennis: "sports",
  SAC_Sports_Volleyball: "sports",
};

function assignBody(club) {
  if (SLUG_BODIES[club.slug]) return SLUG_BODIES[club.slug];
  // Pattern fallback for clubs indexed after this table was written.
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

/* Clubs that exist in the SAC structure but have not submitted records yet.
 * Rendered as placeholder cards so the directory stays complete. */
const PENDING_CLUBS = [
  { slug: "SPICMACAY", name: "SPICMACAY", body: "cultural", note: "Records coming soon" },
];

function clubCountsLine(c) {
  const parts = [`${c.counts.images} image${c.counts.images === 1 ? "" : "s"}`];
  if (c.counts.markdowns) {
    parts.push(`${c.counts.markdowns} doc${c.counts.markdowns === 1 ? "" : "s"}`);
  }
  const media = c.counts.media || 0;
  if (media) parts.push(`${media} clip${media === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

const FALLBACK_LOGOS = {
  Literary_Club_of_IISER_Kolkata: "assets/logos/literary.svg",
  Music_Club_of_IISER_K: "assets/logos/music.svg",
  "Nrutya_-_The_Dance_Club_of_IISER_Kolkata": "assets/logos/nrutya.svg",
  SPICMACAY: "assets/logos/spicmacay.svg",
  Placement_Cell: "assets/logos/placement.svg",
  SAC_Academics: "assets/logos/sac.svg",
};

function clubCard(c) {
  const url = getClubPageUrl(c.slug);
  const pending = !!c.pending;
  const fallbackLogo = !c.logo && FALLBACK_LOGOS[c.slug];
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
    el("p", { class: "club-card__count" }, pending ? c.note : clubCountsLine(c)),
  ];
  const card = el(
    "li",
    {
      class: "club-card" + (pending ? " club-card--pending" : ""),
      "data-club-name": c.name.toLowerCase(),
      "data-club-slug": c.slug.toLowerCase(),
      "data-club-body": c.body,
    },
    url && !pending
      ? el("a", { href: pageLink(url), "aria-label": `${c.name} — open club page` }, ...inner)
      : el("div", { class: "club-card__nolink", title: "Club page coming soon" }, ...inner)
  );
  return card;
}

export async function initClubs() {
  const mount = $("#clubs-grid");
  if (!mount) return;
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

    mount.replaceWith(
      el(
        "section",
        { class: "clubs-grid-wrap", id: "clubs-grid", "aria-label": "All clubs" },
        sections.length ? sections : el("p", { class: "muted" }, "No clubs indexed yet.")
      )
    );

    // Client-side search across name + slug + body label
    const searchInput = $("#clubs-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        document.querySelectorAll(".clubs-body").forEach((section) => {
          const bodyLabel = (
            section.querySelector(".clubs-body__title")?.textContent || ""
          ).toLowerCase();
          let sectionVisible = 0;
          section.querySelectorAll(".club-card").forEach((card) => {
            const haystack = [
              card.dataset.clubName || "",
              card.dataset.clubSlug || "",
              bodyLabel,
            ].join(" ");
            const match = !q || haystack.includes(q);
            card.classList.toggle("is-hidden", !match);
            if (match) {
              sectionVisible++;
              visibleCount++;
            }
          });
          section.classList.toggle("is-hidden", sectionVisible === 0);
        });
        // Live result-count chip next to the search box
        let counter = searchInput.parentElement.querySelector(".clubs-search-count");
        if (!counter) {
          counter = el(
            "span",
            { class: "clubs-search-count", role: "status", "aria-live": "polite" }
          );
          searchInput.parentElement.append(counter);
        }
        counter.textContent = q
          ? `${visibleCount} of ${document.querySelectorAll(".club-card").length} clubs`
          : "";

        const noResults = $(".clubs-no-results");
        if (!q || visibleCount > 0) {
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
      });
    }
  } catch {
    showError(
      mount,
      "Could not load clubs",
      "The clubs directory failed to load. Check your connection and try again."
    );
  }
}
