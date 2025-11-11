"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CameraStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { lastMessage } = useWebSocket("/py/ws", { shouldReconnect: () => true });

  useEffect(() => {
    if (imgRef.current?.src) URL.revokeObjectURL(imgRef.current.src);
    if (lastMessage?.data instanceof Blob) {
      const url = URL.createObjectURL(lastMessage.data);
      if (imgRef.current) imgRef.current.src = url;
    }
  }, [lastMessage]);

  const toggleStream = useCallback(async () => {
    const action = isStreaming ? "stop" : "start";
    await fetch(`/py/${action}`, { method: "POST" });
    setIsStreaming(!isStreaming);
  }, [isStreaming]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader><CardTitle>Camera</CardTitle></CardHeader>
      <CardContent>
        <Button onClick={toggleStream}>{isStreaming ? "Stop" : "Start"} Stream</Button>
        <div className="relative bg-gray-100 aspect-video mt-2">
          <img ref={imgRef} alt="Camera" className="w-full h-full object-contain" />
        </div>
      </CardContent>
    </Card>
  );
}
