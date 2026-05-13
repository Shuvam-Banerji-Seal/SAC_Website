/**
 * SAC IISER Kolkata — Three.js Loader Scene
 * Sets up the minimal Three.js scene used during the loading sequence.
 * Deprecated: Scene setup is now handled by SceneManager + HeroLoader.
 * This file exists for backward compatibility and potential future use.
 */

import * as THREE from 'three';
import SceneManager from '../three/SceneManager.js';

const LoaderScene = {
  /**
   * Create a minimal loader scene with a rotating ring placeholder.
   * @returns {SceneManager}
   */
  create(sceneManager, options = {}) {
    if (!sceneManager) {
      sceneManager = new SceneManager();
      sceneManager.init({
        container: document.getElementById('loader-overlay'),
        ...options,
      });
    }

    // Add a simple ambient light
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    sceneManager.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 1.0, 20);
    pointLight.position.set(0, 0, 8);
    sceneManager.scene.add(pointLight);

    return sceneManager;
  },
};

export default LoaderScene;
