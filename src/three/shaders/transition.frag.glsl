// SAC IISER Kolkata — Scene Transition Fragment Shader
// Used for camera iris / clip-path style transitions between scenes

uniform sampler2D tDiffuse;
uniform float progress; // 0.0 = start, 1.0 = end
uniform vec2 resolution;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);

  // Iris wipe effect — circle expanding from center
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);
  float radius = progress * 1.5; // Expand beyond viewport edge

  float mask = smoothstep(radius - 0.05, radius, dist);

  // Vignette darkening at edges
  float vignette = 1.0 - smoothstep(0.3, 0.8, dist);
  color.rgb *= vignette * 0.3 + 0.7;

  // Fade to black outside the iris
  color.rgb *= (1.0 - mask);

  gl_FragColor = color;
}