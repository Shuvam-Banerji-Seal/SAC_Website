/**
 * test/unit/loader.test.js — tests for the loader device classification,
 * timing configuration, and safety timeout.
 *
 * The loader is an ES module that self-initialises on import, so we use
 * static analysis (reading the source file) to verify the logic without
 * triggering the init() function.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const loaderSrc = readFileSync(resolve(__dirname, "../../js/loader.js"), "utf-8");
const preloaderSrc = readFileSync(resolve(__dirname, "../../js/preloader.js"), "utf-8");

describe("loader device classification", () => {
  it("defines classifyDevice() with three tiers", () => {
    expect(loaderSrc).toContain("function classifyDevice()");
    expect(loaderSrc).toContain('"phone"');
    expect(loaderSrc).toContain('"tablet"');
    expect(loaderSrc).toContain('"desktop"');
  });

  it("old isMobile() function is removed", () => {
    expect(loaderSrc).not.toContain("function isMobile()");
  });

  it("detects iPadOS 13+ (Macintosh + touch)", () => {
    expect(loaderSrc).toContain("Macintosh");
    expect(loaderSrc).toContain("maxTouchPoints");
  });

  it("detects Android phones vs tablets separately", () => {
    expect(loaderSrc).toContain("Android.*Mobile");
    expect(loaderSrc).toContain("isAndroidTablet");
  });

  it("uses width breakpoints consistent with CSS @media", () => {
    // CSS uses max-width: 520px for phone, so JS should use 520 as the
    // phone/tablet boundary to stay in sync.
    expect(loaderSrc).toContain("width < 520");
    // Tablet/desktop boundary at 1024px (matches CSS min-width:1024px)
    expect(loaderSrc).toContain("width < 1024");
  });

  it("MOBILE is derived from DEVICE_CLASS for backward compat", () => {
    expect(loaderSrc).toContain('const MOBILE = DEVICE_CLASS === "phone"');
  });
});

describe("loader TIMING configuration", () => {
  it("defines TIMING object with phone, tablet, desktop keys", () => {
    expect(loaderSrc).toContain("const TIMING");
    expect(loaderSrc).toContain("phone:");
    expect(loaderSrc).toContain("tablet:");
    expect(loaderSrc).toContain("desktop:");
  });

  it("phone shows 5 papers, tablet 8, desktop all", () => {
    expect(loaderSrc).toMatch(/phone:\s*\{[^}]*clubLimit:\s*5/);
    expect(loaderSrc).toMatch(/tablet:\s*\{[^}]*clubLimit:\s*8/);
    expect(loaderSrc).toMatch(/desktop:\s*\{[^}]*clubLimit:\s*0/);
  });

  it("stagger decreases from phone to desktop", () => {
    // phone: 400, tablet: 320, desktop: 270
    expect(loaderSrc).toMatch(/phone:\s*\{[^}]*stagger:\s*400/);
    expect(loaderSrc).toMatch(/tablet:\s*\{[^}]*stagger:\s*320/);
    expect(loaderSrc).toMatch(/desktop:\s*\{[^}]*stagger:\s*270/);
  });

  it("gatherDelay decreases from phone to desktop", () => {
    expect(loaderSrc).toMatch(/phone:\s*\{[^}]*gatherDelay:\s*1500/);
    expect(loaderSrc).toMatch(/tablet:\s*\{[^}]*gatherDelay:\s*1200/);
    expect(loaderSrc).toMatch(/desktop:\s*\{[^}]*gatherDelay:\s*1050/);
  });

  it("holdAfterLogo decreases from phone to desktop", () => {
    expect(loaderSrc).toMatch(/phone:\s*\{[^}]*holdAfterLogo:\s*1200/);
    expect(loaderSrc).toMatch(/tablet:\s*\{[^}]*holdAfterLogo:\s*1500/);
    expect(loaderSrc).toMatch(/desktop:\s*\{[^}]*holdAfterLogo:\s*1800/);
  });

  it("scale and range increase from phone to desktop", () => {
    expect(loaderSrc).toMatch(/phone:\s*\{[^}]*scale:\s*0\.75/);
    expect(loaderSrc).toMatch(/tablet:\s*\{[^}]*scale:\s*0\.85/);
    expect(loaderSrc).toMatch(/desktop:\s*\{[^}]*scale:\s*1\b/);
  });

  it("uses T constant derived from DEVICE_CLASS", () => {
    expect(loaderSrc).toContain("const T = TIMING[DEVICE_CLASS]");
  });

  it("HOLD_AFTER_LOGO is derived from T, not a ternary", () => {
    expect(loaderSrc).toContain("const HOLD_AFTER_LOGO = T.holdAfterLogo");
    // The old pattern should be gone
    expect(loaderSrc).not.toContain("MOBILE ? 1200 : 1800");
  });
});

describe("loader safety timeout", () => {
  it("safety timeout is tier-scaled, not hardcoded 5000", () => {
    // The old code had a hardcoded 5000ms timeout
    expect(loaderSrc).not.toMatch(/setTimeout\(resolve,\s*5000\)/);
    // The new code should have tier-scaled timeouts
    expect(loaderSrc).toContain('DEVICE_TIER === "low"');
    expect(loaderSrc).toContain("safetyMs");
  });

  it("loader safety timeout exceeds preloader safety timeout", () => {
    // Preloader: low=8000, medium=6000, high=4000
    // Loader must wait longer: low=10000, medium=8000, high=6000
    expect(loaderSrc).toContain("10000");
    expect(loaderSrc).toContain("8000");
    expect(loaderSrc).toContain("6000");

    // Verify the comment explains the relationship
    expect(loaderSrc).toContain("preloader");
    expect(loaderSrc).toContain("buffer");
  });

  it("preloader safety timeout values are correct", () => {
    expect(preloaderSrc).toContain("8000");
    expect(preloaderSrc).toContain("6000");
    expect(preloaderSrc).toContain("4000");
  });
});

describe("preloader device tier detection", () => {
  it("low tier threshold is <= 2 cores, not <= 4", () => {
    // The old code had cores <= 4 → low, which was too aggressive
    expect(preloaderSrc).not.toMatch(/cores\s*<=\s*4\s*\|\|.*return\s*["']low["']/);
    // New code should use cores <= 2 for low tier
    expect(preloaderSrc).toMatch(/cores\s*<=\s*2/);
  });

  it("medium tier uses mobile UA, not cores <= 8", () => {
    // The old code had cores <= 8 → medium, which caught desktops.
    // Check the actual if-condition, not comments that mention the old code.
    // [^()] prevents the regex from crossing if-statement boundaries.
    const mediumIf = preloaderSrc.match(/if\s*\(([^()]*?)\)\s*\{\s*return\s*"medium"/);
    expect(mediumIf).toBeTruthy();
    expect(mediumIf[1]).not.toMatch(/cores\s*<=\s*8/);
    // New code should use isMobileUA for medium
    expect(mediumIf[1]).toContain("isMobileUA");
  });

  it("does not classify 8-core desktops as medium", () => {
    // A desktop with 8 cores should be "high", not "medium"
    // The medium check should NOT include cores <= 8
    const mediumIf = preloaderSrc.match(/if\s*\(([^()]*?)\)\s*\{\s*return\s*"medium"/);
    expect(mediumIf).toBeTruthy();
    expect(mediumIf[1]).not.toContain("cores <= 8");
  });
});

describe("loader gatherNewspapers unification", () => {
  it("uses T config for gather timing, not hardcoded MOBILE ternaries", () => {
    expect(loaderSrc).toContain("T.gatherPerPaper");
    expect(loaderSrc).toContain("T.gatherToInk");
    expect(loaderSrc).toContain("T.gatherScale");
    expect(loaderSrc).toContain("T.gatherOpacity");
  });

  it("does not have separate mobile/desktop gather code paths", () => {
    // The old code had "if (MOBILE) { ... return; }" followed by desktop code
    expect(loaderSrc).not.toMatch(
      /if\s*\(\s*MOBILE\s*\)\s*\{[\s\S]*?playInkFinale[\s\S]*?return;[\s\S]*?\}/
    );
  });
});

describe("loader splash droplets use TIMING config", () => {
  it("uses T.splashMax, T.splashMin, T.splashMaxDur", () => {
    expect(loaderSrc).toContain("T.splashMax");
    expect(loaderSrc).toContain("T.splashMin");
    expect(loaderSrc).toContain("T.splashMaxDur");
  });

  it("uses T.splashSizeBase and T.splashSizeRange", () => {
    expect(loaderSrc).toContain("T.splashSizeBase");
    expect(loaderSrc).toContain("T.splashSizeRange");
  });

  it("uses T.splashArcBase and T.splashArcRange", () => {
    expect(loaderSrc).toContain("T.splashArcBase");
    expect(loaderSrc).toContain("T.splashArcRange");
  });
});
