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
 *   theme     the club page's character — see THEMES below
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
  theme: THEMES[slug],
});

/**
 * What makes each club's page its own. A page is a section of the Chronicle, so each runs under
 * a newspaper desk, and carries the drawing, ink and furniture of what the club does.
 *
 *   motif  the key into css/pages/club-themes.css (the club's ink) and the drawing
 *          assets/motifs/<motif>.svg
 *   band   the pattern under the masthead and every section heading   (BANDS)
 *   bullet the shape of its list markers                               (BULLETS)
 *   frame  how its photographs are mounted                             (FRAMES)
 *   type   the cut of its title                                        (TITLES)
 *          tools/sync-pages.mjs writes all five onto the page's <body data-…>, so the page is
 *          dressed from the first paint. css/pages/club-themes.css defines each name once.
 *   desk   the section it runs under, shown above the title ("The Chess Column")
 *   tag    one line under the title. Spirit, not claims: nothing here states a fact about the club
 *   stamp  the word in the postmark on the masthead, seven letters at most
 *
 * theme.test.js holds every row to this and to the stylesheet.
 */
export const THEMES = {
  SAC_Academics: {
    motif: "ledger",

    band: "grid",

    bullet: "square",

    frame: "mat",

    type: "serif",
    desk: "The Academic Ledger",
    tag: "Study, schedules and the business of learning.",
    stamp: "LEDGER",
  },
  Placement_Cell: {
    motif: "career",

    band: "ticks",

    bullet: "chevron",

    frame: "mat",

    type: "serif",
    desk: "The Careers Page",
    tag: "From campus to the first day at work.",
    stamp: "CAREER",
  },
  Singularity_Astro_Club: {
    motif: "astro",

    band: "stars",

    bullet: "star",

    frame: "viewfinder",

    type: "serif",
    desk: "The Sky Desk",
    tag: "Eyes up. The universe is on tonight.",
    stamp: "ORBIT",
  },
  Slashdot_Programming_Club: {
    motif: "code",

    band: "grid",

    bullet: "chevron",

    frame: "window",

    type: "mono",
    desk: "The Wire · Tech Desk",
    tag: "Write it. Break it. Ship it.",
    stamp: "COMMIT",
  },
  "AARSHI_-_Drama_Club": {
    motif: "theatre",

    band: "scallop",

    bullet: "diamond",

    frame: "mat",

    type: "caps",
    desk: "The Playbill",
    tag: "All the campus is a stage.",
    stamp: "ACT I",
  },
  Arts_Club_of_IISER_Kolkata: {
    motif: "palette",

    band: "dots",

    bullet: "circle",

    frame: "polaroid",

    type: "italic",
    desk: "The Gallery Page",
    tag: "Colour well outside the margins.",
    stamp: "STUDIO",
  },
  Campus_Radio_IISER_KOLKATA: {
    motif: "radio",

    band: "waves",

    bullet: "ring",

    frame: "mat",

    type: "caps",
    desk: "The Airwaves",
    tag: "Tuned in to campus.",
    stamp: "ON AIR",
  },
  "IKQC_-_Quiz_Club_of_IISER_Kolkata": {
    motif: "quiz",

    band: "dots",

    bullet: "diamond",

    frame: "mat",

    type: "italic",
    desk: "The Puzzle Page",
    tag: "Ask better questions.",
    stamp: "QUIZ",
  },
  Literary_Club_of_IISER_Kolkata: {
    motif: "quill",

    band: "scallop",

    bullet: "star",

    frame: "polaroid",

    type: "italic",
    desk: "Letters & Verse",
    tag: "Words, ink and arguments worth having.",
    stamp: "INKED",
  },
  Movie_Club_of_IISER_K: {
    motif: "film",

    band: "film",

    bullet: "play",

    frame: "film",

    type: "caps",
    desk: "The Picture House",
    tag: "Lights down. Story up.",
    stamp: "ROLLING",
  },
  Music_Club_of_IISER_K: {
    motif: "music",

    band: "staff",

    bullet: "circle",

    frame: "mat",

    type: "italic",
    desk: "The Music Hall",
    tag: "Every campus has a soundtrack.",
    stamp: "ENCORE",
  },
  Nature_Club_Of_IISER_Kolkata: {
    motif: "leaf",

    band: "scallop",

    bullet: "leaf",

    frame: "polaroid",

    type: "italic",
    desk: "The Field Notes",
    tag: "Look closer. It is all alive out there.",
    stamp: "FIELD",
  },
  "Nrutya_-_The_Dance_Club_of_IISER_Kolkata": {
    motif: "mandala",

    band: "dots",

    bullet: "diamond",

    frame: "polaroid",

    type: "italic",
    desk: "The Dance Column",
    tag: "Rhythm, grace and a little thunder.",
    stamp: "TAAL",
  },
  "PIXEL-Photography_Club": {
    motif: "camera",

    band: "ticks",

    bullet: "ring",

    frame: "viewfinder",

    type: "caps",
    desk: "The Picture Desk",
    tag: "Frame it before it is gone.",
    stamp: "SHUTTER",
  },
  SAC_Food_and_Hygiene: {
    motif: "dining",

    band: "zigzag",

    bullet: "circle",

    frame: "mat",

    type: "italic",
    desk: "The Menu Page",
    tag: "Good food, kept clean.",
    stamp: "MENU",
  },
  SAC_Hostel: {
    motif: "building",

    band: "grid",

    bullet: "square",

    frame: "mat",

    type: "serif",
    desk: "The Residents’ Column",
    tag: "Life behind the corridor doors.",
    stamp: "HOSTEL",
  },
  SAC_Sports_Athletics: {
    motif: "track",

    band: "stripes",

    bullet: "chevron",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Athletics",
    tag: "Faster, higher, one more lap.",
    stamp: "LANE 1",
  },
  SAC_Sports_Badminton: {
    motif: "shuttle",

    band: "court",

    bullet: "diamond",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Badminton",
    tag: "Light feather, fast hands.",
    stamp: "SMASH",
  },
  SAC_Sports_Basketball: {
    motif: "hoop",

    band: "court",

    bullet: "circle",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Basketball",
    tag: "Up, over and in.",
    stamp: "SWISH",
  },
  SAC_Sports_Carrom: {
    motif: "carrom",

    band: "checker",

    bullet: "ring",

    frame: "mat",

    type: "serif",
    desk: "The Games Page",
    tag: "Strike clean, pocket the queen.",
    stamp: "STRIKE",
  },
  SAC_Sports_Chess: {
    motif: "chess",

    band: "checker",

    bullet: "square",

    frame: "mat",

    type: "serif",
    desk: "The Chess Column",
    tag: "Sixty-four squares, endless stories.",
    stamp: "CHECK",
  },
  SAC_Sports_Cricket: {
    motif: "cricket",

    band: "court",

    bullet: "circle",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Cricket",
    tag: "Willow, leather and long afternoons.",
    stamp: "HOWZAT",
  },
  SAC_Sports_Football: {
    motif: "football",

    band: "court",

    bullet: "hex",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Football",
    tag: "Ninety minutes of everything.",
    stamp: "KICKOFF",
  },
  SAC_Sports_Gaming: {
    motif: "gamepad",

    band: "grid",

    bullet: "square",

    frame: "window",

    type: "display",
    desk: "The Arcade Page",
    tag: "Press start.",
    stamp: "READY",
  },
  SAC_Sports_GYM: {
    motif: "dumbbell",

    band: "stripes",

    bullet: "cross",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Fitness",
    tag: "Show up. Lift. Repeat.",
    stamp: "REPS",
  },
  SAC_Sports_Kabaddi: {
    motif: "kabaddi",

    band: "court",

    bullet: "chevron",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Kabaddi",
    tag: "Hold your breath. Hold your ground.",
    stamp: "RAID",
  },
  SAC_Sports_Kho_Kho: {
    motif: "khokho",

    band: "court",

    bullet: "diamond",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Kho-Kho",
    tag: "Quick turns, quicker feet.",
    stamp: "KHO!",
  },
  SAC_Sports_Lawn_Tennis: {
    motif: "tennis",

    band: "court",

    bullet: "circle",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Tennis",
    tag: "Love, deuce and advantage.",
    stamp: "DEUCE",
  },
  SAC_Sports_Rubik: {
    motif: "cube",

    band: "checker",

    bullet: "square",

    frame: "mat",

    type: "display",
    desk: "The Puzzle Page",
    tag: "Six faces, one solution.",
    stamp: "SOLVED",
  },
  SAC_Sports_SYDC: {
    motif: "dojo",

    band: "stripes",

    bullet: "star",

    frame: "court",

    type: "caps",
    desk: "The Sports Desk · Self-defence",
    tag: "Calm mind, steady stance.",
    stamp: "DOJO",
  },
  SAC_Sports_Table_Tennis: {
    motif: "pingpong",

    band: "court",

    bullet: "circle",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Table Tennis",
    tag: "Small ball, big rallies.",
    stamp: "RALLY",
  },
  SAC_Sports_Volleyball: {
    motif: "volleyball",

    band: "court",

    bullet: "ring",

    frame: "court",

    type: "display",
    desk: "The Sports Desk · Volleyball",
    tag: "Set it, spike it, celebrate it.",
    stamp: "SPIKE",
  },
};

/** The vocabulary a theme draws from. club-themes.css defines every name; the tests check it. */
export const BANDS = [
  "checker",
  "staff",
  "film",
  "stars",
  "dots",
  "court",
  "grid",
  "stripes",
  "scallop",
  "ticks",
  "zigzag",
  "waves",
];
export const BULLETS = [
  "square",
  "diamond",
  "circle",
  "ring",
  "star",
  "play",
  "leaf",
  "cross",
  "hex",
  "chevron",
];
export const FRAMES = ["mat", "polaroid", "film", "viewfinder", "court", "window"];
export const TITLES = ["serif", "display", "italic", "mono", "caps"];

/** Every motif in use, in registry order — the names club-themes.css and assets/motifs/ must cover. */
export const MOTIFS = [...new Set(Object.values(THEMES).map((t) => t.motif))];

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
