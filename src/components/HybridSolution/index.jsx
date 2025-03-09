import { useContainerAdjustmentManager } from "./hooks/useContainerAdjustmentManager";
import { useCanvasManager } from "./hooks/useCanvasManager";
import { useVisibleDrivers } from "./hooks/useVisibleDrivers";
import { HybridController } from "./HybridController";
import { useRef } from "react";

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
  const {
    scale,
    pan,
    handleZoomIn,
    handleZoomOut,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
  } = useContainerAdjustmentManager({
    dimensions,
  });
  useCanvasManager({
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
  });
  const { visibleDrivers, setHoveredDriver, hoveredDriver } = useVisibleDrivers(
    {
      dataByDriverNo,
      scale,
      pan,
      dimensions,
      currentTime,
      scaleCoordinate,
      minLongitude,
      maxLongitude,
      minLatitude,
      maxLatitude,
    }
  );

  return (
    <div
      className="hybrid-solution"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="hybrid-solution__canvas"
      />
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="hybrid-solution__svg"
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

          // Check if driver is within visible area - adding padding to the edges
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
              className="hybrid-solution__driver"
              onMouseEnter={() => setHoveredDriver(driverNo)}
              onMouseLeave={() => setHoveredDriver(null)}
            >
              <circle
                r={hoveredDriver === driverNo ? 8 : 6}
                fill={`hsl(${parseInt(driverNo) * 137.508}, 70%, 50%)`}
              />
              <text
                x="10"
                y="5"
                className="hybrid-solution__text"
                style={{
                  opacity: hoveredDriver === driverNo ? 1 : 0,
                }}
              >
                Driver {driverNo}
              </text>
            </g>
          );
        })}
      </svg>

      <HybridController
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        moveUp={moveUp}
        moveDown={moveDown}
        moveLeft={moveLeft}
        moveRight={moveRight}
      />
    </div>
  );
};
