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
      className="dom-solution"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {Object.entries(dataByDriverNo).map(([driverNo, points]) => {
        const color = `hsl(${parseInt(driverNo)}deg, 70%, 50%)`;

        const currentPoint =
          points.find((p) => p.date >= currentTime) || points[0];

        return (
          <div key={driverNo}>
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
                  className="dom-solution__point"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    backgroundColor: color,
                  }}
                />
              );
            })}

            <div
              className="dom-solution__current-point"
              style={{
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
                backgroundColor: color,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
