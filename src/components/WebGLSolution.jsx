import { useEffect, useRef } from "react";
import { fragmentShaderSource, vertexShaderSource } from "../utils/utils";

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
    gl.clearColor(1, 1, 1, 1);
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

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform4f(colorLocation, 0.0, 0.0, 0.0, 0.5);
      gl.uniform1f(pointSizeLocation, 2.0);
      gl.drawArrays(gl.LINE_STRIP, 0, points.length);

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

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(currentPos),
        gl.STATIC_DRAW
      );
      gl.uniform4f(colorLocation, 0.0, 0.0, 0.0, 1.0);
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
      className="webgl-solution"
    />
  );
};
