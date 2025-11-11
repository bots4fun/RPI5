"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CameraStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // WebSocket connection
  const { lastMessage, readyState } = useWebSocket("/py/ws", {
    shouldReconnect: () => true,
  });

  // Update image frame when WebSocket receives a Blob
  useEffect(() => {
    if (imgRef.current?.src) {
      URL.revokeObjectURL(imgRef.current.src);
    }
    if (lastMessage?.data instanceof Blob) {
      const url = URL.createObjectURL(lastMessage.data);
      if (imgRef.current) imgRef.current.src = url;
    } else if (lastMessage?.data) {
      // If your backend sends JSON like { viewers: 3 }
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.viewers !== undefined) {
          setViewerCount(data.viewers);
        }
      } catch {
        // ignore non-JSON messages
      }
    }
  }, [lastMessage]);

  // Start/stop stream via API
  const toggleStream = useCallback(async () => {
    const action = isStreaming ? "stop" : "start";
    try {
      await fetch(`/py/${action}`, { method: "POST" });
      setIsStreaming(!isStreaming);
    } catch (err) {
      setError("Failed to toggle stream.");
    }
  }, [isStreaming]);

  const connectionStatus = ReadyState[readyState];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>JPEG Stream</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status: {connectionStatus}</span>
          <Button
            onClick={toggleStream}
            variant={isStreaming ? "destructive" : "default"}
          >
            {isStreaming ? "Stop" : "Start"} Stream
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Video container with viewer overlay */}
        <div className="relative bg-gray-100 aspect-video">
          {/* Viewer count overlay */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm z-10">
            Viewers: {viewerCount}
          </div>

          {/* Connection placeholder */}
          {readyState !== ReadyState.OPEN && (
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <span className="text-gray-500">{connectionStatus}...</span>
            </div>
          )}

          {/* Stream image */}
          <img
            ref={imgRef}
            alt="JPEG Stream"
            className="w-full h-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
