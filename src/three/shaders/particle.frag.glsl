// SAC IISER Kolkata — Particle Fragment Shader
// Renders each particle as a soft glowing circle with radial gradient

precision mediump float;

varying vec3 vColor;
varying float vAlpha;
varying float vLetterId;

void main() {
  // Distance from center of point (gl_PointCoord is [0,1] across the point sprite)
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  // Soft circular falloff — create a glowing dot
  float radius = 0.5;
  float softness = 0.3;
  float alpha = smoothstep(radius, radius - softness, dist);

  // Core is brighter, edges fade out
  float core = smoothstep(radius * 0.3, 0.0, dist);
  vec3 coreColor = mix(vColor, vec3(1.0), core * 0.5);

  // Per-letter subtle color shift
  vec3 letterShift = vec3(0.0);
  if (vLetterId < 0.5) {
    letterShift = vec3(0.1, 0.05, 0.0); // S — slight warm tint
  } else if (vLetterId < 1.5) {
    letterShift = vec3(0.15, 0.0, 0.15); // A — slight purple tint
  } else {
    letterShift = vec3(0.0, 0.05, 0.1); // C — slight blue tint
  }

  vec3 finalColor = coreColor + letterShift;
  float finalAlpha = alpha * vAlpha * 0.8;

  // Discard edges for clean circles
  if (finalAlpha < 0.01) discard;

  gl_FragColor = vec4(finalColor, finalAlpha);
}