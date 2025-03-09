import { useCallback } from "react";
import { useState } from "react";
import { useEffect } from "react";

export const useResizeScreen = () => {
  const [dimensions, setDimensions] = useState({
    width: Math.min(window.innerWidth - 40, 800), // 20px padding on each side
    height: Math.min(window.innerHeight - 200, 600), // Room for controls
    padding: 40,
  });

  const scaleCoordinate = useCallback(
    (value, min, max, dimension) => {
      // Ensure max is greater than min
      const actualMin = Math.min(min, max);
      const actualMax = Math.max(min, max);

      return (
        ((value - actualMin) / (actualMax - actualMin)) *
          (dimension - 2 * dimensions.padding) +
        dimensions.padding
      );
    },
    [dimensions?.padding]
  );

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

  return { dimensions, scaleCoordinate };
};
