export const DOMSolution = ({
  dimensions,
  dataByDriverNo,
  scaleCoordinate,
  minLongitude,
  maxLongitude,
  minLatitude,
  maxLatitude,
  currentTime,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: dimensions.width,
        height: dimensions.height,
        border: "1px solid black",
        overflow: "hidden",
      }}
    >
      {Object.entries(dataByDriverNo).map(([driverNo, points]) => {
        // Generate color for this driver using the same formula
        const hue = parseInt(driverNo) * 137.508;
        const color = `hsl(${hue}deg, 70%, 50%)`;

        // Find current position
        const currentPoint =
          points.find((p) => p.date >= currentTime) || points[0];

        return (
          <div key={driverNo}>
            {/* Draw route points */}
            {points.map((point, index) => {
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

              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: `${x}px`,
                    top: `${y}px`,
                    width: "2px",
                    height: "2px",
                    backgroundColor: color,
                    opacity: 0.5,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}

            {/* Draw current position */}
            <div
              style={{
                position: "absolute",
                left: `${scaleCoordinate(
                  currentPoint.longitude,
                  minLongitude.current,
                  maxLongitude.current,
                  dimensions.width
                )}px`,
                top: `${scaleCoordinate(
                  currentPoint.latitude,
                  minLatitude.current,
                  maxLatitude.current,
                  dimensions.height
                )}px`,
                width: "10px",
                height: "10px",
                backgroundColor: color,
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
