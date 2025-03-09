import { useCallback } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import { useState } from "react";

export const useVisibleDrivers = ({
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
}) => {
  const [hoveredDriver, setHoveredDriver] = useState(null);
  const [visibleDrivers, setVisibleDrivers] = useState(
    new Set(Object.keys(dataByDriverNo))
  );
  const visibleDriversRef = useRef(new Set());

  const updateVisibility = useCallback(() => {
    // Only filter drivers when zoomed in significantly
    if (scale <= 1.05) {
      setVisibleDrivers(new Set(Object.keys(dataByDriverNo)));
      return;
    }

    // Calculate the visible area in world coordinates
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Determine corners of the visible area in world coordinates
    const visibleLeft = (0 - pan.x - centerX) / scale + centerX;
    const visibleTop = (0 - pan.y - centerY) / scale + centerY;
    const visibleRight = (dimensions.width - pan.x - centerX) / scale + centerX;
    const visibleBottom =
      (dimensions.height - pan.y - centerY) / scale + centerY;

    // Increase margin to prevent drivers from disappearing too early (100% of screen instead of 50%)
    const marginX = (visibleRight - visibleLeft) * 1.0;
    const marginY = (visibleBottom - visibleTop) * 1.0;

    const expandedLeft = visibleLeft - marginX;
    const expandedTop = visibleTop - marginY;
    const expandedRight = visibleRight + marginX;
    const expandedBottom = visibleBottom + marginY;

    // Collect visible drivers
    for (const [driverNo, driverData] of Object.entries(dataByDriverNo)) {
      const currentPoint =
        driverData.find((p) => p.date >= currentTime) || driverData[0];

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
      const scaledX = centerX + (x - centerX) * scale + pan.x;
      const scaledY = centerY + (y - centerY) * scale + pan.y;

      // Check if driver is within visible area with expanded bounds
      if (
        scaledX >= expandedLeft &&
        scaledX <= expandedRight &&
        scaledY >= expandedTop &&
        scaledY <= expandedBottom
      ) {
        if (!visibleDriversRef.current.has(driverNo)) {
          visibleDriversRef.current.add(driverNo);
        }
      } else {
        if (visibleDriversRef.current.has(driverNo)) {
          visibleDriversRef.current.delete(driverNo);
        }
      }
    }

    if (visibleDriversRef.current.size === 0) {
      setVisibleDrivers(new Set(Object.keys(dataByDriverNo)));
    } else {
      setVisibleDrivers(visibleDriversRef.current);
    }
  }, [dimensions, scale, pan, currentTime]);

  useEffect(() => {
    updateVisibility();
  }, [updateVisibility]);

  return {
    visibleDrivers,
    setHoveredDriver,
    hoveredDriver,
  };
};
