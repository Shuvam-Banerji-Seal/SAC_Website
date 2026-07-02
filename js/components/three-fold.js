/**
 * js/components/three-fold.js — Three.js 3D paper-fold effect.
 *
 * Creates a 3D paper sheet behind the page content that responds to
 * mouse movement with a gentle parallax curl. Uses dynamic import
 * so a missing/unavailable Three.js doesn't break the page.
 *
 * Performance:
 *   - Render loop pauses after 2 seconds of no mouse movement (idle)
 *   - Pauses when the tab is hidden (Page Visibility API)
 *   - All event listeners are properly cleaned up on destroy()
 *   - Passive listeners on mouse/touch to avoid blocking scrolling
 *   - Canvas promoted to its own compositor layer with will-change
 *
 * Usage:
 *   import { initPaperFold } from "./components/three-fold.js";
 *   initPaperFold();
 */

let renderer = null,
  scene = null,
  camera = null,
  paperMesh = null;
let animationId = null;
let mouseX = 0,
  mouseY = 0,
  targetX = 0,
  targetY = 0;
let lastMoveTime = 0;
let destroyed = false;
let tabHidden = false;

/* Idle timeout: stop rendering after this many ms of no mouse movement. */
const IDLE_MS = 2000;

/* ── Event handler refs (needed for removeEventListener in destroy) ── */

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  lastMoveTime = Date.now();
  // If the render loop was idle (no pending rAF), restart it
  if (!animationId && !destroyed && !tabHidden) {
    animate();
  }
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onVisibilityChange() {
  tabHidden = document.hidden;
  if (document.hidden) {
    // Tab hidden — stop the loop (cancel the next frame)
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else {
    // Tab visible again — restart if not destroyed
    if (!destroyed && !animationId) {
      // Don't restart if idle — let next mousemove restart it
      if (Date.now() - lastMoveTime < IDLE_MS) {
        animate();
      }
    }
  }
}

/* ── Public API ────────────────────────────────────────────────────── */

export async function initPaperFold() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  const masthead = document.querySelector(".masthead");
  if (!masthead) return;

  try {
    const loadThree = () =>
      new Promise((resolve) => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(
            () => import("three").then(resolve).catch(resolve),
            { timeout: 3000 },
          );
        } else {
          setTimeout(() => import("three").then(resolve).catch(resolve), 0);
        }
      });
    const THREE = await loadThree();
    if (!THREE) return;
    setupThree(THREE);
    lastMoveTime = Date.now();
    animate();
  } catch {
    // Three.js not loaded or WebGL not available — fail silently
  }
}

function setupThree(THREE) {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.zIndex = "-1";
  renderer.domElement.style.pointerEvents = "none";
  renderer.domElement.style.willChange = "transform";
  renderer.domElement.setAttribute("aria-hidden", "true");
  document.body.prepend(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const geo = new THREE.PlaneGeometry(6, 4, 16, 12);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x1a1612,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  paperMesh = new THREE.Mesh(geo, mat);
  scene.add(paperMesh);
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
}

function animate() {
  if (destroyed) return;

  animationId = requestAnimationFrame(animate);

  // Idle detection: if the mouse hasn't moved for IDLE_MS, stop rendering
  if (Date.now() - lastMoveTime > IDLE_MS) {
    animationId = null; // Clear so mousemove can restart
    return; // Don't render or request next frame
  }

  targetX += (mouseX * 0.1 - targetX) * 0.05;
  targetY += (mouseY * 0.05 - targetY) * 0.05;
  if (paperMesh) {
    paperMesh.rotation.x = -targetY * 0.3;
    paperMesh.rotation.y = targetX * 0.2;
    paperMesh.position.set(targetX * 0.3, -0.2 + targetY * 0.1, 0);
  }
  renderer?.render(scene, camera);
}

export function destroy() {
  destroyed = true;

  // Stop the render loop
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Remove event listeners (fixes memory leak)
  document.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("resize", onResize);
  document.removeEventListener("visibilitychange", onVisibilityChange);

  // Dispose Three.js resources
  if (renderer) {
    renderer.dispose();
    renderer.domElement?.remove();
  }
  paperMesh?.geometry?.dispose();
  paperMesh?.material?.dispose();
  renderer = scene = camera = paperMesh = null;
  mouseX = mouseY = targetX = targetY = 0;
}
