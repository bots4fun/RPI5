"use client"

import { useState } from "react";
import { Slider } from "@/components/ui/slider";

export default function Controls() {
  const [brightness, setBrightness] = useState(0);

  const handleBrightnessChange = async (value: number[]) => { 
    const brightness = value[0]
    setBrightness(brightness);
    await fetch(`/py/brightness/${brightness}`, {
      method: "PUT"
    })
  };

  return (
    <div className="w-full max-w-md p-4 bg-card rounded-md shadow-md">
      <h3 className="text-lg font-semibold text-foreground mb-2">Light Brightness Control</h3>
      <Slider 
        value={[brightness]} 
        onValueChange={handleBrightnessChange} 
        min={0} 
        max={100} 
        className="w-full"
      />
      <div className="text-center text-sm text- font-medium mt-2">
        {brightness}%
      </div>
    </div>
  );
}
