/**
 * components/footer.js — renders the footer with IISER location,
 * quick links, and SAC branding.
 */
import { $, el, pageLink } from "../utils/dom.js";
import { SITE_TITLE } from "../config.js";

const QUICK_LINKS = [
  { label: "Cultural Clubs", href: "clubs.html" },
  { label: "Events", href: "events.html" },
  { label: "Gallery", href: "gallery.html" },
  { label: "Academics", href: "academics.html" },
  { label: "Hostel", href: "hostel.html" },
  { label: "About", href: "about.html" },
];

const SPORTS_LINKS = [
  { label: "Athletics", href: "athletics.html" },
  { label: "Cricket", href: "cricket.html" },
  { label: "Football", href: "football.html" },
  { label: "Basketball", href: "basketball.html" },
  { label: "Chess", href: "chess.html" },
  { label: "Kabaddi", href: "kabaddi.html" },
  { label: "View All", href: "clubs.html" },
];

export function renderFooter() {
  const mount = $("#footer");
  if (!mount) return;
  const year = new Date().getFullYear();

  mount.replaceWith(
    el(
      "footer",
      { class: "site-footer" },
      el(
        "div",
        { class: "site-footer__inner" },

        // ── Column 1: Branding ──
        el(
          "div",
          { class: "site-footer__col" },
          el("div", { class: "site-footer__brand" },
            el("span", { class: "site-footer__brand-icon" }, "SAC"),
            el("span", { class: "site-footer__brand-name" }, "Student Activity Council")
          ),
          el("p", { class: "site-footer__desc" },
            "The Student Activity Council of IISER Kolkata brings together cultural, academic, and residential societies under a single administrative body — fostering creativity, inquiry, and community."
          ),
          el("p", { class: "site-footer__credit" }, `© ${year} ${SITE_TITLE}. All rights reserved.`),
        ),

        // ── Column 2: Quick Links ──
        el(
          "div",
          { class: "site-footer__col" },
          el("h4", { class: "site-footer__heading" }, "Explore"),
          el("ul", { class: "site-footer__links" },
            ...QUICK_LINKS.map((link) =>
              el("li", {}, el("a", { href: pageLink(link.href) }, link.label))
            )
          )
        ),

        // ── Column 3: Sports Clubs ──
        el(
          "div",
          { class: "site-footer__col" },
          el("h4", { class: "site-footer__heading" }, "Sports"),
          el("ul", { class: "site-footer__links" },
            ...SPORTS_LINKS.map((link) =>
              el("li", {}, el("a", { href: pageLink(link.href) }, link.label))
            )
          )
        ),

        // ── Column 4: Location ──
        el(
          "div",
          { class: "site-footer__col" },
          el("h4", { class: "site-footer__heading" }, "Location"),
          el("div", { class: "site-footer__map" },
            el("iframe", {
              src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d58828.718524617045!2d88.31544337726389!3d22.637462449361284!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f89f2c7c5a0b2f%3A0x9f68e2a2d5e0ec0c!2sIndian%20Institute%20of%20Science%20Education%20and%20Research%2C%20Kolkata!5e0!3m2!1sen!2sin!4v1",
              width: "100%",
              height: "160",
              style: "border:0;border-radius:6px;",
              allowfullscreen: "",
              loading: "lazy",
              referrerpolicy: "no-referrer-when-downgrade",
              title: "IISER Kolkata campus location"
            })
          ),
          el("p", { class: "site-footer__address" },
            "IISER Kolkata, Mohanpur Campus, Nadia — 741246, West Bengal"
          ),
        ),

      ),
      el("p", { class: "site-footer__meta" }, "Built with pure HTML, CSS, and JavaScript. · SAC Web Team")
    )
  );
}
