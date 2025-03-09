import "./App.css";
import { useState, useRef } from "react";
import { CanvasSolution } from "./components/CanvasSolution";
import { SvgSolution } from "./components/SvgSolution";
import { WebGLSolution } from "./components/WebGLSolution";
import { DOMSolution } from "./components/DOMSolution";
import { HybridSolution } from "./components/HybridSolution";
import { useDataFetcher } from "./hooks/useDataFetcher";
import { useResizeScreen } from "./hooks/useResizeScreen";
import { useAnimationManager } from "./hooks/useAnimationManager";
import { implementationOptions } from "./utils/utils";

const renderImplementationByType = function (implementation, props) {
  switch (implementation) {
    case "canvas":
      return <CanvasSolution {...props} />;
    case "svg":
      return <SvgSolution {...props} />;
    case "webgl":
      return <WebGLSolution {...props} />;
    case "dom":
      return <DOMSolution {...props} />;
    case "hybrid":
      return <HybridSolution {...props} />;
    default:
      return <CanvasSolution {...props} />;
  }
};

export const App = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const timeRangeRef = useRef({ start: Infinity, end: 0 });
  const [implementation, setImplementation] = useState(
    implementationOptions[0].value
  );
  const { dimensions, scaleCoordinate } = useResizeScreen();
  const {
    dataByDriverNo,
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude,
  } = useDataFetcher({
    setCurrentTime,
    timeRangeRef,
  });
  const { isPlaying, setIsPlaying, speed, setSpeed } = useAnimationManager({
    setCurrentTime,
    timeRangeRef,
  });

  return (
    <div className="app">
      <div className="app__implementation-options">
        {implementationOptions.map((option) => (
          <label className="app__implementation-option" key={option.value}>
            <input
              type="radio"
              value={option.value}
              checked={implementation === option.value}
              onChange={(e) => setImplementation(e.target.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      <div className="app__controls">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="app__play-pause-button"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="app__speed-control">
          <input
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="app__speed-range"
          />
          <span className="app__speed-display">
            Speed: {parseFloat((speed * 10).toFixed(2))}x
          </span>
        </div>
      </div>

      <span className="app__time-display">
        Time: {new Date(currentTime).toLocaleTimeString()}
      </span>

      <div className="app__render-container">
        {renderImplementationByType(implementation, {
          dimensions,
          dataByDriverNo,
          scaleCoordinate,
          minLongitude,
          maxLongitude,
          minLatitude,
          maxLatitude,
          currentTime,
        })}
      </div>
    </div>
  );
};
