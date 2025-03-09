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

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    Object.entries(dataByDriverNo).forEach(([driverNo, points]) => {
      const color = `hsl(${parseInt(driverNo)}deg, 70%, 50%)`;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
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

  useEffect(() => {
    draw();
  }, [dimensions, currentTime, dataByDriverNo]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="canvas-solution"
    />
  );
};
