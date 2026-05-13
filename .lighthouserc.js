/**
 * SAC IISER Kolkata — Lighthouse CI Configuration
 * Performance budgets that must pass before merging.
 */

module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:4173/"],
      numberOfRuns: 3,
      settings: {
        // Use mobile throttling by default
        formFactor: "mobile",
        throttlingMethod: "simulate",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.85 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "speed-index": ["warn", { maxNumericValue: 3500 }],
        interactive: ["warn", { maxNumericValue: 3800 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
