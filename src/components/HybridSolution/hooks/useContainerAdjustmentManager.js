import { useState } from "react";
import { useCallback } from "react";
import { useRef } from "react";

export const useContainerAdjustmentManager = ({ dimensions }) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomInMaxLevel = useRef(10);
  const scaleFactor = useRef(1.2);
  // Zoom handlers
  const handleZoomIn = () => {
    const newScale = scale * scaleFactor.current;
    // Check if new scale would exceed max zoom level
    if (newScale > zoomInMaxLevel.current) return;

    // Calculate the new pan to keep the center point fixed
    const newPanX = pan.x * scaleFactor.current;
    const newPanY = pan.y * scaleFactor.current;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(1, scale / scaleFactor.current);

    if (newScale === 1) {
      setScale(newScale);
      setPan({ x: 0, y: 0 });
    } else {
      // Calculate the new pan to keep the center point fixed
      const newPanX = pan.x / scaleFactor.current;
      const newPanY = pan.y / scaleFactor.current;

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Helper function to check if new pan position is within bounds
  const isWithinBounds = useCallback(
    (newPanX, newPanY) => {
      const maxPanX = (dimensions.width * (scale - 1)) / 2;
      const maxPanY = (dimensions.height * (scale - 1)) / 2;

      return Math.abs(newPanX) <= maxPanX && Math.abs(newPanY) <= maxPanY;
    },
    [dimensions, scale]
  );

  // Pan handlers with bounds checking
  const moveUp = () => {
    setPan((prevPan) => {
      const newPanY = prevPan.y + 50;
      return isWithinBounds(prevPan.x, newPanY)
        ? { ...prevPan, y: newPanY }
        : prevPan;
    });
  };

  const moveDown = () => {
    setPan((prevPan) => {
      const newPanY = prevPan.y - 50;
      return isWithinBounds(prevPan.x, newPanY)
        ? { ...prevPan, y: newPanY }
        : prevPan;
    });
  };

  const moveLeft = () => {
    setPan((prevPan) => {
      const newPanX = prevPan.x + 50;
      return isWithinBounds(newPanX, prevPan.y)
        ? { ...prevPan, x: newPanX }
        : prevPan;
    });
  };

  const moveRight = () => {
    setPan((prevPan) => {
      const newPanX = prevPan.x - 50;
      return isWithinBounds(newPanX, prevPan.y)
        ? { ...prevPan, x: newPanX }
        : prevPan;
    });
  };

  return {
    scale,
    pan,
    setScale,
    setPan,
    handleZoomIn,
    handleZoomOut,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
  };
};
