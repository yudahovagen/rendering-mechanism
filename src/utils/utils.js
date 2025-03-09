export const implementationOptions = [
  { label: "Canvas", value: "canvas" },
  { label: "SVG", value: "svg" },
  { label: "WebGL", value: "webgl" },
  { label: "DOM", value: "dom" },
  { label: "Hybrid", value: "hybrid" },
];

// Updated vertex shader to handle point size
export const vertexShaderSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform float u_pointSize;

void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  gl_PointSize = u_pointSize;
}
`;

// Updated fragment shader to draw circles
export const fragmentShaderSource = `
precision mediump float;
uniform vec4 u_color;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(center);
  if (dist > 0.5) {
    discard;  // Makes points circular by discarding corner pixels
  }
  gl_FragColor = u_color;
}
`;
