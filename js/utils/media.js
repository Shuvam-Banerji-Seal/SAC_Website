/**
 * utils/media.js — lazy media loading helpers.
 *
 * Video thumbs are rendered with preload="none" plus a data-preload-lazy
 * marker; this observer flips them to preload="metadata" as they approach
 * the viewport. Without it, pages that show many clips (events timeline,
 * gallery archive, club media sections) fire a hundred-plus metadata
 * range-requests on load — real cost on mobile data.
 */

const NEAR_VIEWPORT = "600px 0px";

export function initLazyVideos(root = document) {
  const videos = Array.from(
    root.querySelectorAll("video[data-preload-lazy], audio[data-preload-lazy]")
  );
  if (!videos.length) return;

  if (!("IntersectionObserver" in window)) {
    videos.forEach((v) => {
      v.preload = "metadata";
      v.removeAttribute("data-preload-lazy");
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const media = entry.target;
        media.preload = "metadata";
        media.removeAttribute("data-preload-lazy");
        io.unobserve(media);
      });
    },
    { rootMargin: NEAR_VIEWPORT }
  );
  videos.forEach((v) => io.observe(v));
}

/** Standard attrs for inline <video> players used across pages. */
export function videoPlayerAttrs(asset, caption) {
  return {
    controls: true,
    preload: "none",
    "data-preload-lazy": "",
    playsinline: true,
    "aria-label": caption || asset.title || asset.filename || "SAC video",
  };
}
