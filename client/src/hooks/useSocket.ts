import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface ProgressState {
  jobId: string;
  status: "pending" | "downloading" | "merging" | "ready" | "failed";
  progress: number;
  speed?: string;
  eta?: string;
  error?: string;
  filePath?: string;
}

export function useSocket(jobId: string | null) {
  const [progressData, setProgressData] = useState<ProgressState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // If no jobId, don't initiate or reset progress
    if (!jobId) {
      setProgressData(null);
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("subscribe", jobId);
    });

    socket.on("progress", (data: ProgressState) => {
      if (data.jobId === jobId) {
        setProgressData(data);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.emit("unsubscribe", jobId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [jobId]);

  return {
    progressData,
    isConnected,
    resetProgress: () => setProgressData(null),
  };
}

export function useMultiSocket(jobIds: string[]) {
  const [progressMap, setProgressMap] = useState<Record<string, ProgressState>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!jobIds || jobIds.length === 0) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      jobIds.forEach((id) => socket.emit("subscribe", id));
    });

    socket.on("progress", (data: ProgressState) => {
      setProgressMap((prev) => ({
        ...prev,
        [data.jobId]: data,
      }));
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      jobIds.forEach((id) => socket.emit("unsubscribe", id));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [jobIds.join(",")]);

  return {
    progressMap,
    isConnected,
    clearJob: (id: string) =>
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      }),
    clearAll: () => setProgressMap({}),
  };
}
