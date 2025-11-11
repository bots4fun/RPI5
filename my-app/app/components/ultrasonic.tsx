"use client";

import { useState, useEffect } from "react";

export default function UltrasonicSensor() {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    const fetchDistance = async () => {
      try {
        const response = await fetch("/py/distance");
        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Fetched data:", data);
        setDistance(data.distance_cm);
      } catch (err) {
        console.error("Error fetching distance:", err);
      }
    };

    fetchDistance();
    const interval = setInterval(fetchDistance, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md p-4 bg-card rounded-md shadow-md text-center">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Ultrasonic Sensor
      </h3>
      <div className="text-3xl font-bold text-blue-600">
        {distance !== null ? `${distance} cm` : "-- cm"}
      </div>
      <p>Debug: {JSON.stringify(distance)}</p>
    </div>
  );
}
