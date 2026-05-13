// SAC IISER Kolkata — Particle Vertex Shader
// Handles per-particle position, size, and color pass-through

attribute float size;
attribute vec3 color;
attribute float targetX;
attribute float targetY;
attribute float targetZ;
attribute float letterId;

uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;

varying vec3 vColor;
varying float vAlpha;
varying float vLetterId;

void main() {
  vColor = color;
  vLetterId = letterId;

  // Soft breathing oscillation based on letter ID for visual interest
  float breath = sin(uTime * 1.5 + letterId * 2.094) * 0.15 + 0.85;
  vAlpha = breath;

  // Compute final point size with perspective scaling
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float pSize = size * uSize * uPixelRatio;
  pSize *= (1.0 / -mvPosition.z); // Perspective attenuation

  gl_PointSize = pSize;
  gl_Position = projectionMatrix * mvPosition;
}