import { useEffect, useRef } from "react";

export const CanvasSolution = ({
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

  // Draw function
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw each driver's route and current position
    Object.entries(dataByDriverNo).forEach(([driverNo, points]) => {
      // Generate a color for this driver
      const hue = parseInt(driverNo) * 137.508;
      const color = `hsl(${hue}deg, 70%, 50%)`;

      // Draw the route
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;

      points.forEach((point, i) => {
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

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw current position
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

      ctx.beginPath();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Redraw when dimensions or currentTime changes
  useEffect(() => {
    draw();
  }, [dimensions, currentTime, dataByDriverNo]);

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
