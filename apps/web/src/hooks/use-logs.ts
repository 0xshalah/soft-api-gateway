import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { config } from "@/lib/config";

export interface LiveLog {
  id: string;
  timestamp: string;
  endpointId: string;
  statusCode: number;
  latencyMs: number;
  method: string;
  path: string;
}

interface UseLogsOptions {
  endpointId: string;
  gatewayUrl?: string;
  maxLogs?: number;
}

interface UseLogsReturn {
  logs: LiveLog[];
  isConnected: boolean;
  latency: number | null;
  clearLogs: () => void;
}

export function useLogs({
  endpointId,
  gatewayUrl = config.apiUrl,
  maxLogs = 200,
}: UseLogsOptions): UseLogsReturn {
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pingTimestampRef = useRef<number | null>(null);

  const clearLogs = useCallback(() => setLogs([]), []);

  useEffect(() => {
    if (!endpointId) return;

    // 1. Connect to the /logs namespace
    const socket = io(`${gatewayUrl}/logs`, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // 2. Subscribe to a specific endpoint's log stream
      socket.emit("subscribe:endpoint", { endpointId });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // 3. Receive throttled batches from the server (250ms flush interval)
    socket.on("logs:batch", (data: { endpointId: string; logs: LiveLog[] }) => {
      if (data.endpointId !== endpointId) return;
      setLogs((prev) => {
        const combined = [...prev, ...data.logs];
        // Enforce max buffer size to prevent browser memory leak
        return combined.slice(-maxLogs);
      });
    });

    // 4. Calculate RTT latency from heartbeat
    socket.on("heartbeat", () => {
      if (pingTimestampRef.current !== null) {
        setLatency(Date.now() - pingTimestampRef.current);
      }
      pingTimestampRef.current = Date.now();
    });

    return () => {
      // 5. Clean unsubscribe — prevents ghost subscriptions on server
      socket.emit("unsubscribe:endpoint", { endpointId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [endpointId, gatewayUrl, maxLogs]);

  return { logs, isConnected, latency, clearLogs };
}
