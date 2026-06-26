/**
 * js/components/three-fold.js — Three.js 3D paper-fold effect.
 *
 * Creates a 3D paper sheet behind the page content that responds to
 * mouse movement with a gentle parallax curl. Uses dynamic import
 * so a missing/unavailable Three.js doesn't break the page.
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

export async function initPaperFold() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  const masthead = document.querySelector(".masthead");
  if (!masthead) return;

  try {
    const THREE = await import("three");
    setupThree(THREE);
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

  document.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  animationId = requestAnimationFrame(animate);
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
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.dispose();
    renderer.domElement?.remove();
  }
  paperMesh?.geometry?.dispose();
  paperMesh?.material?.dispose();
  renderer = scene = camera = paperMesh = null;
}
