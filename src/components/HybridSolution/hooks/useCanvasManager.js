import { useEffect } from "react";
import { useState } from "react";
import { useRef } from "react";
import { fragmentShaderSource, vertexShaderSource } from "../../../utils/utils";

export const useCanvasManager = ({
  canvasRef,
  dimensions,
  scale,
  pan,
  dataByDriverNo,
  scaleCoordinate,
  minLongitude,
  maxLongitude,
  minLatitude,
  maxLatitude,
}) => {
  const glRef = useRef(null);
  const programRef = useRef(null);
  const [useWebGL, setUseWebGL] = useState(true);

  // Initialize WebGL context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    try {
      // Get WebGL context
      const gl =
        canvas.getContext("webgl", { antialias: true }) ||
        canvas.getContext("experimental-webgl", { antialias: true });

      if (!gl) {
        console.error("WebGL not supported, falling back to Canvas 2D");
        setUseWebGL(false);
        return;
      }

      glRef.current = gl;

      // Create vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) {
        console.error("Failed to create vertex shader");
        setUseWebGL(false);
        return;
      }

      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.compileShader(vertexShader);

      // Check for shader compilation errors
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error(
          "Vertex shader compilation failed:",
          gl.getShaderInfoLog(vertexShader)
        );
        gl.deleteShader(vertexShader);
        setUseWebGL(false);
        return;
      }

      // Create fragment shader
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fragmentShader) {
        console.error("Failed to create fragment shader");
        gl.deleteShader(vertexShader);
        setUseWebGL(false);
        return;
      }

      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(fragmentShader);

      // Check for shader compilation errors
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error(
          "Fragment shader compilation failed:",
          gl.getShaderInfoLog(fragmentShader)
        );
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setUseWebGL(false);
        return;
      }

      // Create program and link shaders
      const program = gl.createProgram();
      if (!program) {
        console.error("Failed to create WebGL program");
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setUseWebGL(false);
        return;
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      // Check for program linking errors
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking failed:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setUseWebGL(false);
        return;
      }

      // Store program for later use
      programRef.current = program;
    } catch (error) {
      console.error("Error initializing WebGL:", error);
      setUseWebGL(false);
    }

    return () => {
      // Clean up WebGL resources on unmount
      if (glRef.current && programRef.current) {
        glRef.current.deleteProgram(programRef.current);
        programRef.current = null;
      }
    };
  }, [dimensions]);

  // Draw routes on canvas
  const drawRoutes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (useWebGL && glRef.current && programRef.current) {
      // Draw with WebGL
      try {
        const gl = glRef.current;
        const program = programRef.current;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, "a_position");
        const resolutionLocation = gl.getUniformLocation(
          program,
          "u_resolution"
        );
        const colorLocation = gl.getUniformLocation(program, "u_color");

        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Always render all routes
        Object.values(dataByDriverNo).forEach((driverData) => {
          if (!driverData || driverData.length < 2) return;

          // Draw the entire route, not just from current time
          // Create vertices for each line segment
          const vertices = [];

          for (let i = 0; i < driverData.length - 1; i++) {
            // Convert to screen coordinates
            const x1 = scaleCoordinate(
              driverData[i].longitude,
              minLongitude.current,
              maxLongitude.current,
              dimensions.width
            );
            const y1 = scaleCoordinate(
              driverData[i].latitude,
              minLatitude.current,
              maxLatitude.current,
              dimensions.height
            );
            const x2 = scaleCoordinate(
              driverData[i + 1].longitude,
              minLongitude.current,
              maxLongitude.current,
              dimensions.width
            );
            const y2 = scaleCoordinate(
              driverData[i + 1].latitude,
              minLatitude.current,
              maxLatitude.current,
              dimensions.height
            );

            // Apply zoom and pan
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            const scaledX1 = centerX + (x1 - centerX) * scale + pan.x;
            const scaledY1 = centerY + (y1 - centerY) * scale + pan.y;
            const scaledX2 = centerX + (x2 - centerX) * scale + pan.x;
            const scaledY2 = centerY + (y2 - centerY) * scale + pan.y;

            // Skip segments that are completely outside the viewport with a large margin
            if (
              (scaledX1 < -200 && scaledX2 < -200) ||
              (scaledX1 > dimensions.width + 200 &&
                scaledX2 > dimensions.width + 200) ||
              (scaledY1 < -200 && scaledY2 < -200) ||
              (scaledY1 > dimensions.height + 200 &&
                scaledY2 > dimensions.height + 200)
            ) {
              continue;
            }

            // Line thickness based on zoom
            const lineWidth = Math.max(1, Math.min(3, scale));

            // Add vertices for a thick line (two triangles)
            const dx = scaledX2 - scaledX1;
            const dy = scaledY2 - scaledY1;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length > 0) {
              const nx = ((-dy / length) * lineWidth) / 2;
              const ny = ((dx / length) * lineWidth) / 2;

              vertices.push(
                scaledX1 + nx,
                scaledY1 + ny,
                scaledX2 + nx,
                scaledY2 + ny,
                scaledX1 - nx,
                scaledY1 - ny,

                scaledX1 - nx,
                scaledY1 - ny,
                scaledX2 + nx,
                scaledY2 + ny,
                scaledX2 - nx,
                scaledY2 - ny
              );
            }
          }

          if (vertices.length > 0) {
            // Upload vertex data to GPU
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array(vertices),
              gl.STATIC_DRAW
            );

            // Set color to black with 0.7 opacity
            gl.uniform4f(colorLocation, 0.0, 0.0, 0.0, 0.7);

            // Draw triangles
            gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
          }
        });

        // Clean up
        gl.deleteBuffer(buffer);
      } catch (error) {
        console.error("Error drawing with WebGL:", error);
        setUseWebGL(false);
      }
    } else {
      // Fallback to Canvas 2D
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Always render all routes
      Object.values(dataByDriverNo).forEach((driverData) => {
        if (!driverData || driverData.length < 2) return;

        // Draw the entire route, not just from current time
        for (let i = 0; i < driverData.length - 1; i++) {
          // Convert to screen coordinates
          const x1 = scaleCoordinate(
            driverData[i].longitude,
            minLongitude.current,
            maxLongitude.current,
            dimensions.width
          );
          const y1 = scaleCoordinate(
            driverData[i].latitude,
            minLatitude.current,
            maxLatitude.current,
            dimensions.height
          );
          const x2 = scaleCoordinate(
            driverData[i + 1].longitude,
            minLongitude.current,
            maxLongitude.current,
            dimensions.width
          );
          const y2 = scaleCoordinate(
            driverData[i + 1].latitude,
            minLatitude.current,
            maxLatitude.current,
            dimensions.height
          );

          // Apply zoom and pan
          const centerX = dimensions.width / 2;
          const centerY = dimensions.height / 2;
          const scaledX1 = centerX + (x1 - centerX) * scale + pan.x;
          const scaledY1 = centerY + (y1 - centerY) * scale + pan.y;
          const scaledX2 = centerX + (x2 - centerX) * scale + pan.x;
          const scaledY2 = centerY + (y2 - centerY) * scale + pan.y;

          // Skip segments that are completely outside the viewport with a large margin
          if (
            (scaledX1 < -200 && scaledX2 < -200) ||
            (scaledX1 > dimensions.width + 200 &&
              scaledX2 > dimensions.width + 200) ||
            (scaledY1 < -200 && scaledY2 < -200) ||
            (scaledY1 > dimensions.height + 200 &&
              scaledY2 > dimensions.height + 200)
          ) {
            continue;
          }

          // Draw line
          ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
          ctx.lineWidth = Math.max(1, Math.min(3, scale));
          ctx.beginPath();
          ctx.moveTo(scaledX1, scaledY1);
          ctx.lineTo(scaledX2, scaledY2);
          ctx.stroke();
        }
      });
    }
  };

  useEffect(() => {
    drawRoutes();
  }, [dimensions, scale, pan, useWebGL]);

  return;
};
