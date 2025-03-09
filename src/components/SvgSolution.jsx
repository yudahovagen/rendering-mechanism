import { useState } from "react";

export const SvgSolution = ({
  dimensions,
  dataByDriverNo,
  scaleCoordinate,
  minLongitude,
  maxLongitude,
  minLatitude,
  maxLatitude,
  currentTime,
}) => {
  const [hoveredDriver, setHoveredDriver] = useState(null);

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      style={{
        border: "1px solid black",
        maxWidth: "100%",
        height: "auto",
        display: "block", // Removes extra space below SVG
      }}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {Object.entries(dataByDriverNo).map(([driverNo, points]) => {
        const pathData = points
          .map((point, index) => {
            const x = scaleCoordinate(
              point.longitude,
              minLongitude.current, // min longitude
              maxLongitude.current, // max longitude
              dimensions.width
            );
            const y = scaleCoordinate(
              point.latitude,
              minLatitude.current, // min latitude
              maxLatitude.current, // max latitude (note: swapped min/max)
              dimensions.height
            );
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

        // Find current position based on timestamp
        const currentPoint =
          points.find((p) => p.date >= currentTime) || points[0];

        const currentX = scaleCoordinate(
          currentPoint.longitude,
          minLongitude.current,
          maxLongitude.current,
          dimensions.width
        );
        const currentY = scaleCoordinate(
          currentPoint.latitude,
          minLatitude.current,
          maxLatitude.current,
          dimensions.height
        );

        return (
          <g key={driverNo}>
            <path
              d={pathData}
              stroke={`hsl(${parseInt(driverNo) * 137.508}deg, 70%, 50%)`}
              strokeWidth={window.innerWidth < 400 ? "1" : "2"} // Thinner lines on mobile
              fill="none"
              opacity="0.5"
            />
            <circle
              cx={currentX}
              cy={currentY}
              r={window.innerWidth < 400 ? "3" : "5"} // Smaller circles on mobile
              fill={`hsl(${parseInt(driverNo) * 137.508}deg, 70%, 50%)`}
              onMouseEnter={() => setHoveredDriver(driverNo)}
              onMouseLeave={() => setHoveredDriver(null)}
              style={{ cursor: "pointer" }}
            />
            {hoveredDriver === driverNo && (
              <g>
                <rect
                  x={currentX + 10}
                  y={currentY - 20}
                  width="60"
                  height="20"
                  fill="white"
                  stroke="black"
                  strokeWidth="1"
                  rx="4"
                />
                <text
                  x={currentX + 40}
                  y={currentY - 5}
                  textAnchor="middle"
                  fill="black"
                  fontSize="12"
                >
                  Driver {driverNo}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
