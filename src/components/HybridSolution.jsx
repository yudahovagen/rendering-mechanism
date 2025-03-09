import { useState, useRef, useEffect, useCallback } from "react";
import { QuadTree, Rectangle } from "../utils/QuadTree";

export const HybridSolution = ({
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
  const [hoveredDriver, setHoveredDriver] = useState(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [visibleDrivers, setVisibleDrivers] = useState(
    new Set(Object.keys(dataByDriverNo))
  );
  const quadTreeRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const [useWebGL, setUseWebGL] = useState(true);

  // Initialize QuadTree
  useEffect(() => {
    const boundary = new Rectangle(0, 0, dimensions.width, dimensions.height);
    quadTreeRef.current = new QuadTree(boundary, 4);
    updateQuadTree();
  }, [dimensions]);

  // Update QuadTree with current positions
  const updateQuadTree = useCallback(() => {
    if (!quadTreeRef.current) return;

    quadTreeRef.current = new QuadTree(
      new Rectangle(0, 0, dimensions.width, dimensions.height),
      4
    );

    // Add current positions to quadtree
    Object.entries(dataByDriverNo).forEach(([driverNo, points]) => {
      const currentPoint =
        points.find((p) => p.date >= currentTime) || points[0];

      const x = scaleCoordinate(
        currentPoint.longitude,
        minLongitude.current,
        maxLongitude.current,
        dimensions.width
      );

      const y = scaleCoordinate(
        currentPoint.latitude,
        minLatitude.current,
        maxLatitude.current,
        dimensions.height
      );

      quadTreeRef.current.insert({
        x,
        y,
        data: { driverNo },
      });
    });
  }, [
    dimensions,
    dataByDriverNo,
    scaleCoordinate,
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude,
    currentTime,
  ]);

  // Update QuadTree when time changes
  useEffect(() => {
    updateQuadTree();
  }, [updateQuadTree, currentTime]);

  // Get current positions of all drivers
  const getCurrentPositions = useCallback(() => {
    const positions = {};
    Object.entries(dataByDriverNo).forEach(([driverNo, points]) => {
      const currentPoint =
        points.find((p) => p.date >= currentTime) || points[0];

      const x = scaleCoordinate(
        currentPoint.longitude,
        minLongitude.current,
        maxLongitude.current,
        dimensions.width
      );

      const y = scaleCoordinate(
        currentPoint.latitude,
        minLatitude.current,
        maxLatitude.current,
        dimensions.height
      );

      positions[driverNo] = { x, y };
    });

    return positions;
  }, [
    dataByDriverNo,
    scaleCoordinate,
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude,
    dimensions,
    currentTime,
  ]);

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

      // Set shader source
      const vertexShaderSource = `
        attribute vec2 a_position;
        uniform vec2 u_resolution;
        
        void main() {
          // Convert from pixels to 0.0 to 1.0
          vec2 zeroToOne = a_position / u_resolution;
          
          // Convert from 0->1 to 0->2
          vec2 zeroToTwo = zeroToOne * 2.0;
          
          // Convert from 0->2 to -1->+1 (clipspace)
          vec2 clipSpace = zeroToTwo - 1.0;
          
          // Flip Y coordinate
          gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        }
      `;

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

      // Set shader source
      const fragmentShaderSource = `
        precision mediump float;
        uniform vec4 u_color;
        
        void main() {
          gl_FragColor = u_color;
        }
      `;

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

      console.log("WebGL initialized successfully");
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
  const drawRoutes = useCallback(() => {
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

        // Only draw visible routes
        visibleDrivers.forEach((driverNo) => {
          const driverData = dataByDriverNo[driverNo];
          if (!driverData || driverData.length < 2) return;

          // Find start point based on current time
          let startIdx = 0;
          for (let i = 0; i < driverData.length; i++) {
            if (driverData[i].date >= currentTime) {
              startIdx = Math.max(0, i - 1);
              break;
            }
          }

          // Create vertices for each line segment
          const vertices = [];

          for (let i = startIdx; i < driverData.length - 1; i++) {
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

            // Set color
            const hue = parseInt(driverNo) * 137.508; // Same coloring as SVG
            const [r, g, b] = hslToRgb(hue, 0.7, 0.5);
            gl.uniform4f(colorLocation, r, g, b, 0.7);

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

      // Only draw visible routes
      visibleDrivers.forEach((driverNo) => {
        const driverData = dataByDriverNo[driverNo];
        if (!driverData || driverData.length < 2) return;

        // Find start point based on current time
        let startIdx = 0;
        for (let i = 0; i < driverData.length; i++) {
          if (driverData[i].date >= currentTime) {
            startIdx = Math.max(0, i - 1);
            break;
          }
        }

        // Draw line segments
        for (let i = startIdx; i < driverData.length - 1; i++) {
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

          // Draw line
          const hue = parseInt(driverNo) * 137.508;
          ctx.strokeStyle = `hsla(${hue}, 70%, 50%, 0.7)`;
          ctx.lineWidth = Math.max(1, Math.min(3, scale));
          ctx.beginPath();
          ctx.moveTo(scaledX1, scaledY1);
          ctx.lineTo(scaledX2, scaledY2);
          ctx.stroke();
        }
      });
    }
  }, [
    dataByDriverNo,
    dimensions,
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude,
    scale,
    pan,
    visibleDrivers,
    currentTime,
    useWebGL,
  ]);

  // Helper function to convert HSL to RGB for WebGL
  const hslToRgb = useCallback((h, s, l) => {
    h /= 360;
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
  }, []);

  // Update visibility based on current view
  const updateVisibility = useCallback(() => {
    // If not zoomed, show all drivers
    if (scale <= 1) {
      setVisibleDrivers(new Set(Object.keys(dataByDriverNo)));
      return;
    }

    // Calculate the visible area in world coordinates
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Determine corners of the visible area in world coordinates
    const visibleLeft = (0 - pan.x - centerX) / scale + centerX;
    const visibleTop = (0 - pan.y - centerY) / scale + centerY;
    const visibleRight = (dimensions.width - pan.x - centerX) / scale + centerX;
    const visibleBottom =
      (dimensions.height - pan.y - centerY) / scale + centerY;

    // Add margin to prevent drivers from disappearing too early (30% of screen)
    const marginX = (visibleRight - visibleLeft) * 0.3;
    const marginY = (visibleBottom - visibleTop) * 0.3;

    const expandedLeft = visibleLeft - marginX;
    const expandedTop = visibleTop - marginY;
    const expandedRight = visibleRight + marginX;
    const expandedBottom = visibleBottom + marginY;

    // Use quadtree to find visible drivers efficiently
    const visibleRange = new Rectangle(
      expandedLeft,
      expandedTop,
      expandedRight - expandedLeft,
      expandedBottom - expandedTop
    );

    const visiblePoints = quadTreeRef.current.query(visibleRange);

    // Collect visible drivers
    const newVisibleDrivers = new Set();
    visiblePoints.forEach((point) => {
      newVisibleDrivers.add(point.data.driverNo);
    });

    // If no drivers are visible, show all of them
    if (newVisibleDrivers.size === 0) {
      setVisibleDrivers(new Set(Object.keys(dataByDriverNo)));
    } else {
      setVisibleDrivers(newVisibleDrivers);
    }
  }, [scale, pan, dimensions, dataByDriverNo, quadTreeRef]);

  // Update visibility when zoom or pan changes
  useEffect(() => {
    updateVisibility();
  }, [scale, pan, updateVisibility]);

  // Draw routes when visibility or data changes
  useEffect(() => {
    drawRoutes();
  }, [
    visibleDrivers,
    dataByDriverNo,
    currentTime,
    scale,
    pan,
    dimensions,
    drawRoutes,
  ]);

  // Zoom handlers
  function handleZoomIn() {
    setScale((prevScale) => prevScale * 1.5);
  }

  function handleZoomOut() {
    setScale((prevScale) => Math.max(1, prevScale / 1.5));
  }

  // Pan handlers
  function moveUp() {
    setPan((prevPan) => ({ ...prevPan, y: prevPan.y + 50 }));
  }

  function moveDown() {
    setPan((prevPan) => ({ ...prevPan, y: prevPan.y - 50 }));
  }

  function moveLeft() {
    setPan((prevPan) => ({ ...prevPan, x: prevPan.x + 50 }));
  }

  function moveRight() {
    setPan((prevPan) => ({ ...prevPan, x: prevPan.x - 50 }));
  }

  // Get current positions for rendering
  const driverPositions = getCurrentPositions();

  return (
    <div
      style={{
        position: "relative",
        width: dimensions.width,
        height: dimensions.height,
        border: "1px solid red", // Debug border to see container
      }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          border: "1px solid blue", // Debug border to see canvas
        }}
      />

      <svg
        width={dimensions.width}
        height={dimensions.height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "all",
          border: "1px solid green", // Debug border to see SVG
        }}
      >
        {Array.from(visibleDrivers).map((driverNo) => {
          const position = driverPositions[driverNo];
          if (!position) return null;

          // Apply zoom and pan
          const centerX = dimensions.width / 2;
          const centerY = dimensions.height / 2;
          const scaledX = centerX + (position.x - centerX) * scale + pan.x;
          const scaledY = centerY + (position.y - centerY) * scale + pan.y;

          // Check if driver is within visible area
          if (
            scaledX < -20 ||
            scaledX > dimensions.width + 20 ||
            scaledY < -20 ||
            scaledY > dimensions.height + 20
          ) {
            return null;
          }

          const hue = parseInt(driverNo) * 137.508;

          return (
            <g
              key={driverNo}
              transform={`translate(${scaledX}, ${scaledY})`}
              onMouseEnter={() => setHoveredDriver(driverNo)}
              onMouseLeave={() => setHoveredDriver(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                r={hoveredDriver === driverNo ? 8 : 6}
                fill={`hsl(${hue}, 70%, 50%)`}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x="10"
                y="5"
                style={{
                  fontFamily: "Arial",
                  fontSize: "12px",
                  fill: "#000",
                  opacity: hoveredDriver === driverNo ? 1 : 0,
                }}
              >
                Driver {driverNo}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          +
        </button>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={moveUp}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              opacity: scale <= 1 ? 0.5 : 1,
            }}
            disabled={scale <= 1}
          >
            ↑
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={moveLeft}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                opacity: scale <= 1 ? 0.5 : 1,
              }}
              disabled={scale <= 1}
            >
              ←
            </button>
            <button
              onClick={moveRight}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                opacity: scale <= 1 ? 0.5 : 1,
              }}
              disabled={scale <= 1}
            >
              →
            </button>
          </div>
          <button
            onClick={moveDown}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              opacity: scale <= 1 ? 0.5 : 1,
            }}
            disabled={scale <= 1}
          >
            ↓
          </button>
        </div>
        <button
          onClick={handleZoomOut}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          -
        </button>
      </div>
    </div>
  );
};
