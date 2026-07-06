/**
 * pages/clubs.js — all-clubs overview page.
 *
 * Renders a full grid of all 10 clubs with logos, names, and quick stats.
 * Each card links to the single template at club.html?id=<slug>.
 * Includes a client-side search input that filters cards by name.
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
    SAC_Academics: "pages/academics.html",
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
  };
  return urlMap[slug] || "pages/clubs.html";
}

export async function initClubs() {
  const mount = $("#clubs-grid");
  if (!mount) return;
  try {
    const assets = await loadAssetsMap();
    const clubs = indexByClub(assets);
    mount.replaceWith(
      el(
        "section",
        { class: "clubs-grid-wrap", id: "clubs-grid" },
        el(
          "ul",
          { class: "club-grid club-grid--full" },
          ...clubs.map((c) =>
            el(
              "li",
              { class: "club-card", "data-club-name": c.name.toLowerCase() },
              el(
                "a",
                { href: pageLink(getClubPageUrl(c.slug)) },
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
                el(
                  "p",
                  { class: "club-card__count" },
                  `${c.counts.images} images · ${c.counts.markdowns} doc${c.counts.markdowns === 1 ? "" : "s"}`
                )
              )
            )
          )
        )
      )
    );

    // Wire up client-side search
    const searchInput = $("#clubs-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        const cards = document.querySelectorAll(".club-card");
        let visibleCount = 0;
        cards.forEach((card) => {
          const name = card.dataset.clubName || "";
          const match = !q || name.includes(q);
          card.style.display = match ? "" : "none";
          if (match) visibleCount++;
        });
        // Show "no results" message if nothing matches
        const noResults = $(".clubs-no-results");
        if (!q || visibleCount > 0) {
          if (noResults) noResults.remove();
        } else if (!noResults) {
          mount.appendChild(
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
