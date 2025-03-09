import { useState } from "react";
import { useEffect } from "react";

export const useAnimationManager = ({ setCurrentTime, timeRangeRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.1);

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

  return { isPlaying, setIsPlaying, speed, setSpeed };
};
