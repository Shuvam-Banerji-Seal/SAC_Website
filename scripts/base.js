/* =========================================================================
   SAC site — base controller
   - Waits for the loader to finish, then reveals the page shell.
   - Strips the [hidden] attributes from header/main/footer so the
     transition defined in base.css can fade them in.
   - Also handles the no-JS fallback (in case loader.js fails to load).
   ========================================================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  function reveal() {
    const header = $(".site-header");
    const main   = $("#main");
    const footer = $(".site-footer");
    if (header) header.removeAttribute("hidden");
    if (main)   main.removeAttribute("hidden");
    if (footer) footer.removeAttribute("hidden");
    // Add the class on the next frame so the transition picks up the
    // initial opacity:0 state instead of skipping straight to 1.
    requestAnimationFrame(() => {
      document.body.classList.add("is-revealed");
    });
  }

  // Primary path: wait for the loader to signal done.
  const loader = document.getElementById("sac-loader");
  if (loader) {
    loader.addEventListener("sac:loader:done", reveal, { once: true });
    // Safety net: if for any reason the loader never signals done
    // (script error, network), reveal after 8 s anyway so the user
    // isn't stuck on the loading screen forever.
    setTimeout(() => {
      if (!document.body.classList.contains("is-revealed")) {
        console.warn("[SAC] loader timed out — revealing page anyway");
        if (loader) {
          loader.setAttribute("data-stage", "fading");
          setTimeout(() => loader.setAttribute("data-stage", "hidden"), 200);
        }
        reveal();
      }
    }, 8000);
  } else {
    // No loader element at all → just reveal.
    reveal();
  }

  // No-JS fallback: if scripts fail, the inline <script> above already
  // removed .no-js. We need to also unhide the shell.
  window.addEventListener("error", (e) => {
    if (e?.filename && e.filename.includes("loader.js")) {
      console.warn("[SAC] loader failed — falling back to instant reveal");
      reveal();
    }
  });
})();
