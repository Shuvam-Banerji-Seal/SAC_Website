/**
 * test/unit/club-pages.test.js — what a club page offers beyond its own text.
 *
 *   static, generated from the registry   breadcrumb · "more from this body" · previous/next
 *   JS, from the browser and the page     copy link · print · email · people cards · mailto guard
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  isEmail,
  normName,
  phoneHref,
  fixBrokenMailtos,
  readContacts,
  copyText,
  copyButton,
  buildActions,
  hydratePagerLogos,
} from "../../js/components/club-extras.js";
import { CLUBS, BODIES, bodyById } from "../../js/data/clubs.js";
import { buildCrumbs, buildPager, relatedClubs, directoryOrder } from "../../tools/sync-pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(resolve(root, rel), "utf-8");

describe("pure helpers", () => {
  it("isEmail refuses a name posing as an address — the AARSHI table's bug", () => {
    expect(isEmail("aarshi@iiserkol.ac.in")).toBe(true);
    expect(isEmail("  sac.sports@iiserkol.ac.in ")).toBe(true);
    expect(isEmail("Chhandak Dutta")).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(isEmail("a@b")).toBe(false);
  });

  it("normName ignores case, spacing and punctuation", () => {
    expect(normName("Ruta  Amol Saptarshi")).toBe(normName("ruta amol saptarshi"));
    expect(normName("Dr. A. Bose")).toBe("drabose");
  });

  it("phoneHref builds tel: links for Indian mobiles in any common spelling", () => {
    expect(phoneHref("6295076503")).toBe("tel:+916295076503");
    expect(phoneHref("86534 03034")).toBe("tel:+918653403034");
    expect(phoneHref("+91 98765 43210")).toBe("tel:+919876543210");
    expect(phoneHref("91-98765-43210")).toBe("tel:+919876543210");
    expect(phoneHref("12345")).toBeNull();
    expect(phoneHref("")).toBeNull();
  });
});

describe("mailto guard", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table class="ob-table"><tbody><tr>
        <td><a href="mailto:Chhandak Dutta">Chhandak Dutta</a></td>
        <td><a href="mailto:real@iiserkol.ac.in">real@iiserkol.ac.in</a></td>
        <td><a href="mailto:Name%20With%20Spaces">Name With Spaces</a></td>
      </tr></tbody></table>`;
  });

  it("turns an address-less mailto: into plain text and leaves real ones alone", () => {
    expect(fixBrokenMailtos(document)).toBe(2);
    const links = [...document.querySelectorAll('a[href^="mailto:"]')];
    expect(links.map((a) => a.textContent)).toEqual(["real@iiserkol.ac.in"]);
    const plain = [...document.querySelectorAll("td span.muted")].map((s) => s.textContent);
    expect(plain).toEqual(["Chhandak Dutta", "Name With Spaces"]);
  });

  it("is idempotent", () => {
    fixBrokenMailtos(document);
    expect(fixBrokenMailtos(document)).toBe(0);
  });

  it("no page in the site ships a mailto: without an address", () => {
    const files = ["index.html", ...readdirSync(resolve(root, "pages")).map((f) => `pages/${f}`)];
    for (const f of files.filter((x) => x.endsWith(".html"))) {
      for (const [, href] of read(f).matchAll(/href="mailto:([^"]*)"/g)) {
        expect(isEmail(decodeURIComponent(href.split("?")[0])), `${f}: mailto:${href}`).toBe(true);
      }
    }
  });
});

describe("readContacts — the office-bearer table, read not retyped", () => {
  it("maps each person by name to the phone, role and a valid email", () => {
    document.body.innerHTML = `
      <table class="ob-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Position</th></tr></thead>
        <tbody>
          <tr><td>Ayushman Samanta</td><td>6291392362</td><td><a href="mailto:Ayushman Samanta">x</a></td><td><span>Event Organiser</span></td></tr>
          <tr><td>Rohan Das</td><td>98765 43210</td><td><a href="mailto:rd24ms001@iiserkol.ac.in">rd</a></td><td>Secretary</td></tr>
        </tbody>
      </table>`;
    const contacts = readContacts();
    expect(contacts.get(normName("ayushman samanta"))).toEqual({
      name: "Ayushman Samanta",
      role: "Event Organiser",
      phone: "6291392362",
      email: "", // the table's "email" was a name — never offered as an address
    });
    expect(contacts.get(normName("Rohan Das"))?.email).toBe("rd24ms001@iiserkol.ac.in");
  });

  it("copes with columns in another order and with a page that has no table", () => {
    document.body.innerHTML = `<table class="ob-table"><thead><tr><th>Position</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
      <tbody><tr><td>Convenor</td><td>Asha Rao</td><td><a href="mailto:ar@iiserkol.ac.in">e</a></td><td>7887526060</td></tr></tbody></table>`;
    expect(readContacts().get(normName("Asha Rao"))).toMatchObject({
      role: "Convenor",
      phone: "7887526060",
    });
    document.body.innerHTML = "<p>nothing here</p>";
    expect(readContacts().size).toBe(0);
  });
});

describe("copying", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copyText uses the async clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when the clipboard is unavailable or refuses", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    document.execCommand = vi.fn(() => true);
    expect(await copyText("hello")).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull(); // tidied up
  });

  it("the button says it copied, tells screen readers, then resets", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue() },
      configurable: true,
    });
    const button = copyButton(() => "x@y.in", { label: "Copy email" });
    document.body.append(button);
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(button.firstChild.textContent).toBe("Copied ✓");
    expect(button.querySelector('[role="status"]').textContent).toContain("Copied");
    await vi.advanceTimersByTimeAsync(2000);
    expect(button.firstChild.textContent).toBe("Copy email");
    vi.useRealTimers();
  });
});

describe("buildActions", () => {
  beforeEach(() => {
    document.body.innerHTML = `<ul class="contact-list">
      <li><a href="mailto:aarshi@iiserkol.ac.in">aarshi@iiserkol.ac.in</a></li></ul>`;
  });

  it("offers copy, print and email for the club — and share only where the browser can", () => {
    delete navigator.share;
    let labels = [...buildActions({ name: "AARSHI" }).querySelectorAll(".club-action")].map((a) =>
      a.textContent.trim()
    );
    expect(labels).toEqual(["Copy link", "Print", "Email the club"]);
    navigator.share = vi.fn();
    labels = [...buildActions({ name: "AARSHI" }).querySelectorAll(".club-action")].map((a) =>
      a.textContent.trim()
    );
    expect(labels).toContain("Share");
    delete navigator.share;
  });

  it("is a labelled group, and the email button points at the page's own contact address", () => {
    const actions = buildActions({ name: "AARSHI" });
    expect(actions.getAttribute("role")).toBe("group");
    expect(actions.getAttribute("aria-label")).toContain("AARSHI");
    expect(actions.querySelector(".club-action--primary").getAttribute("href")).toBe(
      "mailto:aarshi@iiserkol.ac.in"
    );
  });

  it("omits the email button when the page lists no usable address", () => {
    document.body.innerHTML =
      '<ul class="contact-list"><li><a href="mailto:Some Name">Some Name</a></li></ul>';
    expect(buildActions({ name: "X" }).querySelector(".club-action--primary")).toBeNull();
  });
});

describe("pager logos", () => {
  it("fills the fixed boxes with the archive's logo, else the registry's crest, else leaves them empty", () => {
    document.body.innerHTML = `<nav class="club-pager">
      <a data-logo-for="Arts_Club_of_IISER_Kolkata"><span class="club-pager__logo"></span></a>
      <a data-logo-for="Literary_Club_of_IISER_Kolkata"><span class="club-pager__logo"></span></a>
      <a data-logo-for="SAC_Sports_Chess"><span class="club-pager__logo"></span></a></nav>`;
    hydratePagerLogos([
      {
        slug: "Arts_Club_of_IISER_Kolkata",
        logo: { public_url: "public/assets/processed/arts/logo.webp" },
      },
    ]);
    const srcs = [...document.querySelectorAll(".club-pager__logo")].map(
      (s) => s.querySelector("img")?.getAttribute("src") ?? null
    );
    expect(srcs[0]).toContain("arts/logo.webp");
    expect(srcs[1]).toContain("assets/logos/literary.svg"); // no archive logo → bundled crest
    expect(srcs[2]).toBeNull(); // neither → the empty box stays, nothing moves
  });
});

describe("generated breadcrumb", () => {
  it("runs Home › Clubs › body › club, relative to pages/", () => {
    const chess = CLUBS.find((c) => c.slug === "SAC_Sports_Chess");
    const html = buildCrumbs(chess);
    expect(html).toContain('href="../index.html">Home');
    expect(html).toContain('href="clubs.html">Clubs');
    expect(html).toContain('href="clubs.html#body-sports">SAC Sports');
    expect(html).toContain('aria-current="page">Chess<');
  });

  it("is on every club page and matches the registry", () => {
    for (const c of CLUBS) {
      const page = read(c.page);
      expect(page, c.page).toContain(buildCrumbs(c).trim());
    }
  });
});

describe("generated pager", () => {
  const order = directoryOrder();

  it("previous/next follow the directory, body by body", () => {
    expect(order).toHaveLength(CLUBS.length);
    expect(order[0].body).toBe("academics");
    expect(order.at(-1).body).toBe("sports");
  });

  it("the first club has no previous, the last no next, and neither leaves a dead link", () => {
    const first = buildPager(order[0]);
    expect(first).not.toContain('rel="prev"');
    expect(first).toContain('rel="next"');
    const last = buildPager(order.at(-1));
    expect(last).not.toContain('rel="next"');
    expect(last).toContain('rel="prev"');
  });

  it("offers up to four peers from the same body, never the club itself, and different clubs different peers", () => {
    const cultural = CLUBS.filter((c) => c.body === "cultural");
    for (const c of cultural) {
      const peers = relatedClubs(c);
      expect(peers).toHaveLength(4);
      expect(peers.map((p) => p.slug)).not.toContain(c.slug);
      expect(peers.every((p) => p.body === "cultural")).toBe(true);
    }
    const sets = new Set(
      cultural.map((c) =>
        relatedClubs(c)
          .map((p) => p.slug)
          .join()
      )
    );
    expect(sets.size).toBe(cultural.length);
  });

  it("a body of one has no peers, so it points at the other bodies instead", () => {
    for (const id of ["food", "hostel"]) {
      const only = CLUBS.find((c) => c.body === id);
      const html = buildPager(only);
      expect(html).toContain("Elsewhere in the Council");
      expect(html).not.toContain(`#body-${id}`);
      for (const b of BODIES.filter((b) => b.id !== id)) expect(html).toContain(`#body-${b.id}`);
    }
  });

  it("every link in every pager goes to a page that exists", () => {
    for (const c of CLUBS) {
      for (const [, href] of buildPager(c).matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
        expect(() => read(`pages/${href}`), `${c.page} → ${href}`).not.toThrow();
      }
    }
  });

  it("is on every club page and matches the registry", () => {
    for (const c of CLUBS) expect(read(c.page), c.page).toContain(buildPager(c).trim());
  });

  it("its headings are not offered as 'jump to' chips", () => {
    expect(buildPager(CLUBS[0])).toContain("data-no-jump");
    expect(read("js/components/section-nav.js")).toContain("[data-no-jump]");
    expect(bodyById("cultural").label).toBe("SAC Cultural");
  });
});

describe("people cards", () => {
  const src = read("js/pages/club-images.js");

  it("replace the plain thumbnails for office bearers only", () => {
    expect(src).toContain('role === "ob_portrait"');
    expect(src).toContain('class: "people"');
    expect(src).toContain("renderPerson(");
    // other roles keep the pinned photo wall
    expect(src).toContain('"thumb-grid pinned-thumbs"');
  });

  it("read contact details from the page's own table, once, and never invent one", () => {
    expect(src).toContain("readContacts()");
    expect(src).not.toMatch(/@iiserkol\.ac\.in/);
    expect(src).toContain("phoneHref(info.phone)");
    // a card with no matching row gets no Call/Email/Copy at all
    expect(src).toContain("actions.length ?");
  });

  it("flag a name that has not been confirmed instead of printing a filename", () => {
    expect(src).toContain("name to be confirmed");
  });
});
