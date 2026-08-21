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

/* Body buckets — order defines render order. assignBody is pattern-based so
 * newly indexed clubs land in a sensible section without code changes. */
const BODIES = [
  {
    id: "council",
    label: "SAC Council",
    blurb: "The elected student core that coordinates the year's calendar.",
  },
  {
    id: "academics",
    label: "Academics",
    blurb: "Placement, astronomy, programming, and the academic committee.",
  },
  {
    id: "hostel",
    label: "Hostel Committee",
    blurb: "Residence life, welfare, and the hostel sub-committees.",
  },
  {
    id: "sports",
    label: "Sports",
    blurb: "Sixteen clubs across the fields, courts, and mats — plus IISM.",
  },
  {
    id: "cultural",
    label: "Cultural",
    blurb: "Drama to photography — the creative pulse of campus, plus IICM.",
  },
];

function assignBody(club) {
  const name = `${club.name} ${club.slug}`.toLowerCase();
  if (name.includes("food") || name.includes("hygiene")) return "hostel";
  if (
    name.includes("sport") ||
    /(athletics|badminton|basketball|carrom|chess|cricket|football|gaming|gym|kabaddi|kho[-_ ]?kho|lawn[-_ ]?tennis|rubik|sydc|table[-_ ]?tennis|volleyball)/.test(
      name
    )
  ) {
    return "sports";
  }
  if (
    name.includes("council") ||
    name.includes("general secretary") ||
    name.includes("secretaries")
  ) {
    return "council";
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
    name.includes("hostel") ||
    name.includes("shc") ||
    name.includes("smc") ||
    name.includes("medical")
  ) {
    return "hostel";
  }
  return "cultural";
}

function clubCountsLine(c) {
  const parts = [`${c.counts.images} image${c.counts.images === 1 ? "" : "s"}`];
  if (c.counts.markdowns) {
    parts.push(`${c.counts.markdowns} doc${c.counts.markdowns === 1 ? "" : "s"}`);
  }
  const media = c.counts.media || 0;
  if (media) parts.push(`${media} clip${media === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function clubCard(c) {
  const url = getClubPageUrl(c.slug);
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
        : el("div", { class: "club-card__logo-fallback" }, c.name.charAt(0))
    ),
    el("h3", { class: "club-card__name" }, c.name),
    el("p", { class: "club-card__count" }, clubCountsLine(c)),
  ];
  const card = el(
    "li",
    {
      class: "club-card",
      "data-club-name": c.name.toLowerCase(),
      "data-club-slug": c.slug.toLowerCase(),
      "data-club-body": c.body,
    },
    url
      ? el("a", { href: pageLink(url), "aria-label": `${c.name} — open club page` }, ...inner)
      : el("div", { class: "club-card__nolink" }, ...inner)
  );
  return card;
}

export async function initClubs() {
  const mount = $("#clubs-grid");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);

    // Media counts per club (video + audio) for the card meta line
    const mediaByClub = new Map();
    for (const a of assets) {
      if (a.file_type !== "video" && a.file_type !== "audio") continue;
      mediaByClub.set(a.club, (mediaByClub.get(a.club) || 0) + 1);
    }
    for (const c of clubs) c.counts.media = mediaByClub.get(c.slug) || 0;

    // Bucket clubs into bodies
    for (const c of clubs) c.body = assignBody(c);

    const sections = BODIES.map((body) => {
      const members = clubs.filter((c) => c.body === body.id);
      if (!members.length) return null;
      return el(
        "section",
        { class: "clubs-body", "data-clubs-body": body.id },
        el("h2", { class: "clubs-body__title" }, body.label),
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
