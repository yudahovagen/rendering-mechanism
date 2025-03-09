import { useEffect, useState, useRef } from "react";
import { CanvasSolution } from "./components/CanvasSolution";
import { SvgSolution } from "./components/SvgSolution";
import { WebGLSolution } from "./components/WebGLSolution";
import { DOMSolution } from "./components/DOMSolution";
import { HybridSolution } from "./components/HybridSolution";

export const App = () => {
  const [dataByDriverNo, setDataByDriverNo] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const minLongitude = useRef(Infinity);
  const maxLongitude = useRef(0);
  const minLatitude = useRef(Infinity);
  const maxLatitude = useRef(0);
  const [speed, setSpeed] = useState(0.1);
  const timeRangeRef = useRef({ start: Infinity, end: 0 }); // Store time range
  const [dimensions, setDimensions] = useState({
    width: Math.min(window.innerWidth - 40, 800), // 20px padding on each side
    height: Math.min(window.innerHeight - 200, 600), // Room for controls
    padding: 40,
  });
  const [implementation, setImplementation] = useState("canvas");

  const isMobile = window.innerWidth < 500;

  // Scaling helper function
  const scaleCoordinate = (value, min, max, dimension) => {
    // Ensure max is greater than min
    const actualMin = Math.min(min, max);
    const actualMax = Math.max(min, max);

    return (
      ((value - actualMin) / (actualMax - actualMin)) *
        (dimension - 2 * dimensions.padding) +
      dimensions.padding
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/src/mockData.json");
        const jsonData = await response.json();

        // Organize data by driverNo
        const organizedData = jsonData.reduce((acc, item) => {
          const driverNo = item.DriveNo;
          if (!acc[driverNo]) {
            acc[driverNo] = [];
          }

          const timestamp = new Date(item.Date).getTime();
          // Update time range
          timeRangeRef.current.start = Math.min(
            timeRangeRef.current.start,
            timestamp
          );
          timeRangeRef.current.end = Math.max(
            timeRangeRef.current.end,
            timestamp
          );

          acc[driverNo].push({
            longitude: item.Longitude,
            latitude: item.Latitude,
            date: timestamp, // Store as timestamp
          });
          if (item.Longitude < minLongitude.current) {
            minLongitude.current = item.Longitude;
          }
          if (item.Longitude > maxLongitude.current) {
            maxLongitude.current = item.Longitude;
          }
          if (item.Latitude < minLatitude.current) {
            minLatitude.current = item.Latitude;
          }
          if (item.Latitude > maxLatitude.current) {
            maxLatitude.current = item.Latitude;
          }
          return acc;
        }, {});

        setDataByDriverNo(organizedData);
        // Initialize currentTime to start time
        setCurrentTime(timeRangeRef.current.start);
      } catch (error) {
        console.error("Error fetching mock data:", error);
      }
    };
    fetchData();
  }, []);

  // Update animation to use actual timestamps
  useEffect(() => {
    let animationFrame;

    if (isPlaying) {
      const animate = () => {
        setCurrentTime((prev) => {
          const nextTime = prev + speed * 1000; // speed * 1000ms
          return nextTime >= timeRangeRef.current.end
            ? timeRangeRef.current.start
            : nextTime;
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, speed]);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 40, 800),
        height: Math.min(window.innerHeight - 200, 600),
        padding: window.innerWidth < 400 ? 20 : 40, // Smaller padding on mobile
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        maxWidth: "100%",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "20px",
        }}
      >
        <label>
          <input
            type="radio"
            value="canvas"
            checked={implementation === "canvas"}
            onChange={(e) => setImplementation(e.target.value)}
          />
          Canvas
        </label>
        <label>
          <input
            type="radio"
            value="svg"
            checked={implementation === "svg"}
            onChange={(e) => setImplementation(e.target.value)}
          />
          SVG
        </label>
        <label>
          <input
            type="radio"
            value="webgl"
            checked={implementation === "webgl"}
            onChange={(e) => setImplementation(e.target.value)}
          />
          WebGL
        </label>
        <label>
          <input
            type="radio"
            value="dom"
            checked={implementation === "dom"}
            onChange={(e) => setImplementation(e.target.value)}
          />
          DOM
        </label>
        <label>
          <input
            type="radio"
            value="hybrid"
            checked={implementation === "hybrid"}
            onChange={(e) => setImplementation(e.target.value)}
          />
          Hybrid
        </label>
      </div>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          flexDirection: window.innerWidth < 500 ? "column" : "row",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: isMobile ? "12px 24px" : "8px 16px",
            fontSize: "16px",
            minWidth: "80px",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexGrow: 1,
            width: window.innerWidth < 500 ? "100%" : "auto",
          }}
        >
          <input
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{
              flexGrow: 1,
              maxWidth: "200px",
            }}
          />
          <span style={{ minWidth: "80px" }}>
            Speed: {parseFloat((speed * 10).toFixed(2))}x
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: "14px",
          marginBottom: "10px",
        }}
      >
        Time: {new Date(currentTime).toLocaleTimeString()}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {implementation === "canvas" ? (
          <CanvasSolution
            dimensions={dimensions}
            dataByDriverNo={dataByDriverNo}
            scaleCoordinate={scaleCoordinate}
            minLongitude={minLongitude}
            maxLongitude={maxLongitude}
            minLatitude={minLatitude}
            maxLatitude={maxLatitude}
            currentTime={currentTime}
          />
        ) : implementation === "svg" ? (
          <SvgSolution
            dimensions={dimensions}
            dataByDriverNo={dataByDriverNo}
            scaleCoordinate={scaleCoordinate}
            minLongitude={minLongitude}
            maxLongitude={maxLongitude}
            minLatitude={minLatitude}
            maxLatitude={maxLatitude}
            currentTime={currentTime}
          />
        ) : implementation === "webgl" ? (
          <WebGLSolution
            dimensions={dimensions}
            dataByDriverNo={dataByDriverNo}
            scaleCoordinate={scaleCoordinate}
            minLongitude={minLongitude}
            maxLongitude={maxLongitude}
            minLatitude={minLatitude}
            maxLatitude={maxLatitude}
            currentTime={currentTime}
          />
        ) : implementation === "hybrid" ? (
          <HybridSolution
            dimensions={dimensions}
            dataByDriverNo={dataByDriverNo}
            scaleCoordinate={scaleCoordinate}
            minLongitude={minLongitude}
            maxLongitude={maxLongitude}
            minLatitude={minLatitude}
            maxLatitude={maxLatitude}
            currentTime={currentTime}
          />
        ) : (
          <DOMSolution
            dimensions={dimensions}
            dataByDriverNo={dataByDriverNo}
            scaleCoordinate={scaleCoordinate}
            minLongitude={minLongitude}
            maxLongitude={maxLongitude}
            minLatitude={minLatitude}
            maxLatitude={maxLatitude}
            currentTime={currentTime}
          />
        )}
      </div>
    </div>
  );
};
