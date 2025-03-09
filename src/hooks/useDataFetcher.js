import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";

export const useDataFetcher = ({ setCurrentTime, timeRangeRef }) => {
  const [dataByDriverNo, setDataByDriverNo] = useState({});
  const minLongitude = useRef(Infinity);
  const maxLongitude = useRef(0);
  const minLatitude = useRef(Infinity);
  const maxLatitude = useRef(0);

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

  return {
    dataByDriverNo,
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude,
  };
};
