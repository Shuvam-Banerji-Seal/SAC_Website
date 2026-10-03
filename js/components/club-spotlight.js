/**
 * components/club-spotlight.js — "Club of the day" on the front page.
 *
 * One club is featured per calendar day (India time, so a student in Kolkata and one
 * abroad see the same club on the same date), stepping through the registry with a stride
 * that visits every club before repeating and does not walk the directory in order.
 * "Another club" shows a random one instead.
 *
 * Built from the registry alone, so it is on screen before the archive has loaded; the
 * archive's logo replaces the monogram when it arrives, inside a box that is the same size
 * either way — nothing moves. The mount (#club-spotlight, in the generated finder block)
 * reserves the card's height in CSS.
 */
import { el, assetUrl, pageUrl } from "../utils/dom.js";
import { CLUBS, INTERESTS, bodyById } from "../data/clubs.js";

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;
const STRIDES = [11, 13, 17, 19, 23, 29, 31, 37];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** A stride that is coprime with `n`, so day * stride visits all n clubs before repeating. */
export function strideFor(n) {
  return STRIDES.find((s) => gcd(s, n) === 1) ?? 1;
}

/** Whole days since the epoch, in India time. */
export const istDay = (date) => Math.floor((date.getTime() + IST_OFFSET_MS) / DAY_MS);

/** The club featured on `date`. Same date, same club, for everyone. */
export function clubOfTheDay(date = new Date(), clubs = CLUBS) {
  return clubs[(istDay(date) * strideFor(clubs.length)) % clubs.length];
}

/** Up to `n` words people might ask the club about, skipping ones its own name already says. */
export function knownFor(club, n = 4) {
  const named = new Set(`${club.name} ${club.short}`.toLowerCase().split(/[^a-z0-9]+/));
  return [...new Set(club.keywords.split(/\s+/).filter(Boolean))]
    .filter((w) => !named.has(w.toLowerCase()))
    .slice(0, n);
}

/** "4 October" */
export const dayLabel = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(date);

const interestLabel = (id) => INTERESTS.find((i) => i.id === id)?.label ?? id;

/**
 * Fill `mount` with the card and wire its button.
 * @returns {{ show: (club) => void, useArchive: (records: object[]) => void } | null}
 */
export function initClubSpotlight(mount, { date = new Date(), clubs = CLUBS } = {}) {
  if (!mount || !clubs.length) return null;
  let current = null;
  let logos = null; // Map of slug → archive record (with .logo), once the archive has loaded

  const crestBox = el("div", { class: "spotlight__crest", "aria-hidden": "true" });
  const kicker = el("p", { class: "spotlight__kicker" });
  const name = el("h3", { class: "spotlight__name" });
  const meta = el("p", { class: "spotlight__meta" });
  const known = el("p", { class: "spotlight__known" });
  const open = el("a", { class: "spotlight__open" }, "Visit →");
  const shuffle = el(
    "button",
    { class: "spotlight__shuffle", type: "button", "aria-label": "Show another club" },
    el("span", { "aria-hidden": "true" }, "↻"),
    "Another"
  );
  const body = el(
    "div",
    { class: "spotlight__body" },
    kicker,
    name,
    meta,
    known,
    el("div", { class: "spotlight__actions" }, open, shuffle)
  );
  mount.replaceChildren(crestBox, body);

  const paintCrest = () => {
    const source = logos?.get(current.slug)?.logo?.public_url ?? current.crest;
    if (source) {
      crestBox.replaceChildren(
        el("img", { src: assetUrl(source), alt: "", width: 64, height: 64, decoding: "async" })
      );
    } else {
      // no logo anywhere: the club's initial, set like a drop cap
      crestBox.replaceChildren(el("span", { class: "spotlight__initial" }, current.short[0]));
    }
  };

  const show = (club, { daily = false } = {}) => {
    current = club;
    kicker.textContent = daily ? `Club of the day · ${dayLabel(date)}` : "A club at random";
    name.replaceChildren(el("a", { href: pageUrl(club.page), title: club.name }, club.name));
    meta.textContent = [bodyById(club.body).label, ...club.interests.map(interestLabel)].join(
      " · "
    );
    const words = knownFor(club);
    known.textContent = words.length ? `Ask them about: ${words.join(" · ")}` : "";
    known.hidden = !words.length;
    open.setAttribute("href", pageUrl(club.page));
    open.setAttribute("aria-label", `Visit ${club.name}`);
    paintCrest();
  };

  shuffle.addEventListener("click", () => {
    const others = clubs.filter((c) => c.slug !== current.slug);
    // announce the change for screen readers only once someone has asked for it
    mount.setAttribute("aria-live", "polite");
    show(others[Math.floor(Math.random() * others.length)]);
    // retrigger the "new proof" animation on the body
    body.classList.remove("is-new");
    void body.offsetWidth;
    body.classList.add("is-new");
  });

  show(clubOfTheDay(date, clubs), { daily: true });
  return {
    show,
    /** @param {Array<{slug: string, logo?: {public_url: string}}>} records  from indexByClub() */
    useArchive(records) {
      logos = new Map(records.map((r) => [r.slug, r]));
      if (current) paintCrest();
    },
  };
}
