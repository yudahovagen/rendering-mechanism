import { useEffect, useRef } from "react";

export const WebGLSolution = ({
  dimensions,
  dataByDriverNo,
  scaleCoordinate,
  minLongitude,
  maxLongitude,
  minLatitude,
  maxLatitude,
  currentTime,
}) => {
  const canvasRef = useRef(null);

  // Updated vertex shader to handle point size
  const vertexShaderSource = `
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
  const fragmentShaderSource = `
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

  // HSL to RGB conversion function
  const hslToRgb = (h, s, l) => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
  };

  const initGL = (gl) => {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
  };

  const drawRoutes = (gl) => {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1, 1, 1, 1); // White background
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const program = initGL(gl);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const colorLocation = gl.getUniformLocation(program, "u_color");
    const pointSizeLocation = gl.getUniformLocation(program, "u_pointSize");

    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    const positionBuffer = gl.createBuffer();

    Object.entries(dataByDriverNo).forEach(([driverNo, points]) => {
      // Convert points to WebGL coordinates
      const positions = points.flatMap((point) => [
        scaleCoordinate(
          point.longitude,
          minLongitude.current,
          maxLongitude.current,
          dimensions.width
        ),
        scaleCoordinate(
          point.latitude,
          minLatitude.current,
          maxLatitude.current,
          dimensions.height
        ),
      ]);

      // Calculate color using the same formula as other solutions
      const hue = (parseInt(driverNo) * 137.508) / 360;
      const [r, g, b] = hslToRgb(hue, 0.7, 0.5);

      // Draw route
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Set color and draw route with transparency
      gl.uniform4f(colorLocation, r, g, b, 0.5);
      gl.uniform1f(pointSizeLocation, 2.0);
      gl.drawArrays(gl.LINE_STRIP, 0, points.length);

      // Draw current position
      const currentPoint =
        points.find((p) => p.date >= currentTime) || points[0];
      const currentPos = [
        scaleCoordinate(
          currentPoint.longitude,
          minLongitude.current,
          maxLongitude.current,
          dimensions.width
        ),
        scaleCoordinate(
          currentPoint.latitude,
          minLatitude.current,
          maxLatitude.current,
          dimensions.height
        ),
      ];

      // Draw current position as a circle
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(currentPos),
        gl.STATIC_DRAW
      );
      gl.uniform4f(colorLocation, r, g, b, 1.0);
      gl.uniform1f(pointSizeLocation, 10.0);
      gl.drawArrays(gl.POINTS, 0, 1);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl");
    if (gl) {
      drawRoutes(gl);
    }
  }, [dimensions, dataByDriverNo, currentTime]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      style={{
        border: "1px solid black",
        maxWidth: "100%",
        height: "auto",
        display: "block",
      }}
    />
  );
};
