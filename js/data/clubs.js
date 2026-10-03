/**
 * data/clubs.js — the registry of SAC clubs and committees.
 *
 * One row per club, in one place. It used to live as private tables inside
 * pages/clubs.js, with a second copy in the footer, so adding a club meant
 * remembering both — and nothing noticed when someone forgot. Now the directory,
 * the footer, the site search, "related clubs" and the interest filter all read
 * from here. test/unit/club-registry.test.js checks every row against its page
 * and against the archive.
 *
 *   slug      the archive folder (`club` in assets_map.jsonl) — also data-club-slug on the page
 *   page      the club's page, repo-relative
 *   body      which of the five SAC bodies it answers to (BODIES)
 *   name      the full name, as it should read in a list or a search result
 *   short     what people actually call it
 *   keywords  extra words a person might type that the name doesn't contain
 *   interests what it is for (INTERESTS) — drives the "what are you into?" filter
 *   featured  shown in the footer's short Sports column
 *   crest     a bundled SVG for a club with no logo in the archive (assets/logos/)
 */

/** The five bodies of the Council, in the order the directory shows them. */
export const BODIES = [
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

/** What a club is *for* — the questions a new student actually arrives with. */
export const INTERESTS = [
  { id: "performing", label: "Performing arts" },
  { id: "visual", label: "Art, film & photography" },
  { id: "words", label: "Words & ideas" },
  { id: "science", label: "Science & tech" },
  { id: "games", label: "Mind games" },
  { id: "sport", label: "Sport & fitness" },
  { id: "campus", label: "Campus life" },
];

const club = (slug, page, body, name, short, interests, keywords = "", featured = false) => ({
  slug,
  page: `pages/${page}.html`,
  body,
  name,
  short,
  interests,
  keywords,
  featured,
  crest: CRESTS[slug] ?? null,
});

/** Clubs whose archive folder has no logo image get a bundled crest instead. */
const CRESTS = {
  SAC_Academics: "assets/logos/sac.svg",
  Placement_Cell: "assets/logos/placement.svg",
  Literary_Club_of_IISER_Kolkata: "assets/logos/literary.svg",
  Music_Club_of_IISER_K: "assets/logos/music.svg",
  "Nrutya_-_The_Dance_Club_of_IISER_Kolkata": "assets/logos/nrutya.svg",
};

export const CLUBS = [
  // SAC Academics
  club(
    "SAC_Academics",
    "academics",
    "academics",
    "SAC Academics",
    "Academics",
    ["campus"],
    "general secretary curriculum study"
  ),
  club(
    "Placement_Cell",
    "placement",
    "academics",
    "SAC Placement Cell",
    "Placement Cell",
    ["campus"],
    "jobs careers internships recruitment"
  ),
  club(
    "Singularity_Astro_Club",
    "singularity",
    "academics",
    "Singularity — The Astronomy Club",
    "Singularity",
    ["science"],
    "astronomy astrophysics stars telescope space observatory"
  ),
  club(
    "Slashdot_Programming_Club",
    "slashdot",
    "academics",
    "Slashdot — Coding & Design Club",
    "Slashdot",
    ["science", "visual"],
    "programming coding code software web design developers hackathon"
  ),

  // SAC Cultural
  club(
    "AARSHI_-_Drama_Club",
    "aarshi",
    "cultural",
    "AARSHI — Drama Club",
    "AARSHI",
    ["performing"],
    "drama theatre acting plays stage monodrama"
  ),
  club(
    "Arts_Club_of_IISER_Kolkata",
    "arts",
    "cultural",
    "Arts Club of IISER Kolkata",
    "Arts Club",
    ["visual"],
    "art painting drawing sketch design craft"
  ),
  club(
    "Campus_Radio_IISER_KOLKATA",
    "radio",
    "cultural",
    "Campus Radio IISER Kolkata (IKCR)",
    "Campus Radio",
    ["performing", "words"],
    "radio ikcr podcast rj broadcast audio"
  ),
  club(
    "IKQC_-_Quiz_Club_of_IISER_Kolkata",
    "ikqc",
    "cultural",
    "IKQC — Quiz Club of IISER Kolkata",
    "IKQC",
    ["words", "games"],
    "quiz quizzing trivia"
  ),
  club(
    "Literary_Club_of_IISER_Kolkata",
    "literary",
    "cultural",
    "Literary Club of IISER Kolkata",
    "Literary Club",
    ["words"],
    "literature writing poetry poems stories debate"
  ),
  club(
    "Movie_Club_of_IISER_K",
    "movie",
    "cultural",
    "Movie Club of IISER K",
    "Movie Club",
    ["visual"],
    "film films cinema screening movies"
  ),
  club(
    "Music_Club_of_IISER_K",
    "music",
    "cultural",
    "Music Club of IISER K",
    "Music Club",
    ["performing"],
    "music band singing songs instruments"
  ),
  club(
    "Nature_Club_Of_IISER_Kolkata",
    "nature",
    "cultural",
    "Nature Club of IISER Kolkata",
    "Nature Club",
    ["science"],
    "nature birds wildlife plants environment trek"
  ),
  club(
    "Nrutya_-_The_Dance_Club_of_IISER_Kolkata",
    "nrutya",
    "cultural",
    "Nrutya — Dance Club of IISER Kolkata",
    "Nrutya",
    ["performing"],
    "dance dancing choreography"
  ),
  club(
    "PIXEL-Photography_Club",
    "pixel",
    "cultural",
    "PIXEL — Photography Club",
    "PIXEL",
    ["visual"],
    "photography photos camera pictures photowalk"
  ),

  // SAC Food & Hygiene
  club(
    "SAC_Food_and_Hygiene",
    "food-hygiene",
    "food",
    "SAC Food & Hygiene",
    "Food & Hygiene",
    ["campus"],
    "canteen mess smc food menu hygiene"
  ),

  // SAC Hostel
  club(
    "SAC_Hostel",
    "hostel",
    "hostel",
    "SAC Hostel Committee",
    "Hostel Committee",
    ["campus"],
    "hostel residence rooms wardens wings complaints"
  ),

  // SAC Sports
  club(
    "SAC_Sports_Athletics",
    "athletics",
    "sports",
    "Athletics Club",
    "Athletics",
    ["sport"],
    "running track field sprint marathon",
    true
  ),
  club(
    "SAC_Sports_Badminton",
    "badminton",
    "sports",
    "Badminton",
    "Badminton",
    ["sport"],
    "shuttle racket"
  ),
  club(
    "SAC_Sports_Basketball",
    "basketball",
    "sports",
    "Basketball",
    "Basketball",
    ["sport"],
    "hoops court",
    true
  ),
  club("SAC_Sports_Carrom", "carrom", "sports", "Carrom Club", "Carrom", ["games"], "board"),
  club(
    "SAC_Sports_Chess",
    "chess",
    "sports",
    "Chess Club",
    "Chess",
    ["games"],
    "board fide tournament",
    true
  ),
  club(
    "SAC_Sports_Cricket",
    "cricket",
    "sports",
    "Cricket Club",
    "Cricket",
    ["sport"],
    "bat ball",
    true
  ),
  club(
    "SAC_Sports_Football",
    "football",
    "sports",
    "Football Club",
    "Football",
    ["sport"],
    "soccer",
    true
  ),
  club(
    "SAC_Sports_Gaming",
    "gaming",
    "sports",
    "Gaming Club",
    "Gaming",
    ["games"],
    "esports video games"
  ),
  club(
    "SAC_Sports_GYM",
    "gym",
    "sports",
    "GYM Club",
    "Gym",
    ["sport"],
    "fitness workout weights training"
  ),
  club("SAC_Sports_Kabaddi", "kabaddi", "sports", "Kabaddi Club", "Kabaddi", ["sport"], "", true),
  club("SAC_Sports_Kho_Kho", "kho-kho", "sports", "Kho-Kho Club", "Kho-Kho", ["sport"], "khokho"),
  club(
    "SAC_Sports_Lawn_Tennis",
    "lawn-tennis",
    "sports",
    "Lawn Tennis Club",
    "Lawn Tennis",
    ["sport"],
    "tennis racket"
  ),
  club(
    "SAC_Sports_Rubik",
    "rubik",
    "sports",
    "Rubik's Cube Club",
    "Rubik's Cube",
    ["games"],
    "cube speedcubing puzzle"
  ),
  club(
    "SAC_Sports_SYDC",
    "sydc",
    "sports",
    "SYDC — Self-Defence Club",
    "SYDC",
    ["sport"],
    "self defence martial arts karate taekwondo"
  ),
  club(
    "SAC_Sports_Table_Tennis",
    "table-tennis",
    "sports",
    "Table Tennis Club",
    "Table Tennis",
    ["sport"],
    "ping pong tt"
  ),
  club(
    "SAC_Sports_Volleyball",
    "volleyball",
    "sports",
    "Volleyball Club",
    "Volleyball",
    ["sport"],
    "net"
  ),
];

/** In the SAC structure but with no records submitted yet: shown, but with no page. */
export const PENDING_CLUBS = [
  {
    slug: "SPICMACAY",
    name: "SPICMACAY",
    short: "SPICMACAY",
    body: "cultural",
    interests: ["performing"],
    keywords: "classical music dance heritage",
    crest: "assets/logos/spicmacay.svg",
    note: "Records coming soon",
  },
];

const bySlug = new Map(CLUBS.map((c) => [c.slug, c]));
const byPage = new Map(CLUBS.map((c) => [c.page, c]));

/** The registry row for an archive slug, or undefined. */
export const clubBySlug = (slug) => bySlug.get(slug);
/** The row for a page path like "pages/chess.html". */
export const clubByPage = (page) => byPage.get(page);
/** "pages/chess.html" for a slug, or null. */
export const clubPageUrl = (slug) => bySlug.get(slug)?.page ?? null;
/** The body record ({id, label, blurb}) for an id. */
/** Every club the directory lists: those with a page, and those whose records are still to come. */
export const LISTED_CLUBS = [...CLUBS, ...PENDING_CLUBS];
/** How many listed clubs answer to an interest — the number on its chip, here and on the home page. */
export const countForInterest = (id) => LISTED_CLUBS.filter((c) => c.interests.includes(id)).length;
export const bodyById = (id) => BODIES.find((b) => b.id === id);
/** Clubs of a body, in registry order. */
export const clubsInBody = (id) => CLUBS.filter((c) => c.body === id);
