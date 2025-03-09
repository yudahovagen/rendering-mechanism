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
      className="svg-solution"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {Object.entries(dataByDriverNo).map(([driverNo, points]) => {
        const pathData = points
          .map((point, index) => {
            const x = scaleCoordinate(
              point.longitude,
              minLongitude.current,
              maxLongitude.current,
              dimensions.width
            );
            const y = scaleCoordinate(
              point.latitude,
              minLatitude.current,
              maxLatitude.current,
              dimensions.height
            );
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

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
              className="svg-solution__path"
              stroke={`hsl(${parseInt(driverNo)}deg, 70%, 50%)`}
              strokeWidth={"1"}
              fill="none"
              opacity="0.5"
            />
            <circle
              cx={currentX}
              cy={currentY}
              className="svg-solution__circle"
              r={"3"}
              fill={`hsl(${parseInt(driverNo)}deg, 70%, 50%)`}
              onMouseEnter={() => setHoveredDriver(driverNo)}
              onMouseLeave={() => setHoveredDriver(null)}
            />
            {hoveredDriver === driverNo && (
              <g>
                <rect
                  x={currentX + 10}
                  y={currentY - 20}
                  className="svg-solution__tooltip-rect"
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
                  className="svg-solution__tooltip-text"
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
