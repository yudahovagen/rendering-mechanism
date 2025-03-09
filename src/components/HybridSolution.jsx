import { useState, useRef, useEffect, useCallback } from "react";

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
  const zoomInMaxLevel = useRef(10); // Maximum zoom in level
  const [hoveredDriver, setHoveredDriver] = useState(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [visibleDrivers, setVisibleDrivers] = useState(
    new Set(Object.keys(dataByDriverNo))
  );
  const glRef = useRef(null);
  const programRef = useRef(null);
  const [useWebGL, setUseWebGL] = useState(true);
  const visibleDriversRef = useRef(new Set());

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

  // Update visibility based on current view
  const updateVisibility = useCallback(() => {
    // Only filter drivers when zoomed in significantly
    if (scale <= 1.05) {
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

    // Increase margin to prevent drivers from disappearing too early (100% of screen instead of 50%)
    const marginX = (visibleRight - visibleLeft) * 1.0;
    const marginY = (visibleBottom - visibleTop) * 1.0;

    const expandedLeft = visibleLeft - marginX;
    const expandedTop = visibleTop - marginY;
    const expandedRight = visibleRight + marginX;
    const expandedBottom = visibleBottom + marginY;

    // Collect visible drivers
    for (const [driverNo, driverData] of Object.entries(dataByDriverNo)) {
      const currentPoint =
        driverData.find((p) => p.date >= currentTime) || driverData[0];

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

      // Apply zoom and pan
      const scaledX = centerX + (x - centerX) * scale + pan.x;
      const scaledY = centerY + (y - centerY) * scale + pan.y;

      // Check if driver is within visible area with expanded bounds
      if (
        scaledX >= expandedLeft &&
        scaledX <= expandedRight &&
        scaledY >= expandedTop &&
        scaledY <= expandedBottom
      ) {
        // check if driver is already in the set
        if (!visibleDriversRef.current.has(driverNo)) {
          visibleDriversRef.current.add(driverNo);
        }
      } else {
        if (visibleDriversRef.current.has(driverNo)) {
          visibleDriversRef.current.delete(driverNo);
        }
      }
    }

    // If no drivers are visible, show all of them
    if (visibleDriversRef.current.size === 0) {
      setVisibleDrivers(new Set(Object.keys(dataByDriverNo)));
    } else {
      setVisibleDrivers(visibleDriversRef.current);
    }
  }, [dimensions, scale, pan, currentTime]);

  // Update visibility when zoom or pan changes
  useEffect(() => {
    updateVisibility();
  }, [updateVisibility]);

  // Only redraw routes when necessary
  useEffect(() => {
    drawRoutes();
  }, [dimensions, scale, pan, useWebGL]);

  // Zoom handlers
  const handleZoomIn = () => {
    const newScale = scale * 1.2;
    // Check if new scale would exceed max zoom level
    if (newScale > zoomInMaxLevel.current) return;

    // Calculate the new pan to keep the center point fixed
    const newPanX = pan.x * 1.2;
    const newPanY = pan.y * 1.2;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(1, scale / 1.2);

    if (newScale === 1) {
      setScale(newScale);
      setPan({ x: 0, y: 0 });
    } else {
      // Calculate the new pan to keep the center point fixed
      const newPanX = pan.x / 1.2;
      const newPanY = pan.y / 1.2;

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Helper function to check if new pan position is within bounds
  function isWithinBounds(newPanX, newPanY) {
    const maxPanX = (dimensions.width * (scale - 1)) / 2;
    const maxPanY = (dimensions.height * (scale - 1)) / 2;

    return Math.abs(newPanX) <= maxPanX && Math.abs(newPanY) <= maxPanY;
  }

  // Pan handlers with bounds checking
  function moveUp() {
    setPan((prevPan) => {
      const newPanY = prevPan.y + 50;
      return isWithinBounds(prevPan.x, newPanY)
        ? { ...prevPan, y: newPanY }
        : prevPan;
    });
  }

  function moveDown() {
    setPan((prevPan) => {
      const newPanY = prevPan.y - 50;
      return isWithinBounds(prevPan.x, newPanY)
        ? { ...prevPan, y: newPanY }
        : prevPan;
    });
  }

  function moveLeft() {
    setPan((prevPan) => {
      const newPanX = prevPan.x + 50;
      return isWithinBounds(newPanX, prevPan.y)
        ? { ...prevPan, x: newPanX }
        : prevPan;
    });
  }

  function moveRight() {
    setPan((prevPan) => {
      const newPanX = prevPan.x - 50;
      return isWithinBounds(newPanX, prevPan.y)
        ? { ...prevPan, x: newPanX }
        : prevPan;
    });
  }

  return (
    <div
      style={{
        position: "relative",
        width: dimensions.width,
        height: dimensions.height,
        border: "1px solid black",
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
        }}
      >
        {Array.from(visibleDrivers).map((driverNo) => {
          const currentPoint =
            dataByDriverNo[driverNo].find((p) => p.date >= currentTime) ||
            dataByDriverNo[driverNo][0];

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

          // Apply zoom and pan
          const centerX = dimensions.width / 2;
          const centerY = dimensions.height / 2;
          const scaledX = centerX + (x - centerX) * scale + pan.x;
          const scaledY = centerY + (y - centerY) * scale + pan.y;

          // Check if driver is within visible area
          if (
            scaledX < -20 ||
            scaledX > dimensions.width + 20 ||
            scaledY < -20 ||
            scaledY > dimensions.height + 20
          ) {
            return null;
          }

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
                fill={`hsl(${parseInt(driverNo) * 137.508}, 70%, 50%)`}
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
