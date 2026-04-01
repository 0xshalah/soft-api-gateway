"use client";

import React, { useEffect, useRef } from "react";
import { Terminal, Activity, Trash2, Cpu, Wifi, WifiOff } from "lucide-react";
import { useLogs } from "@/hooks/use-logs";
import { cn } from "@/lib/utils";

interface LiveLogTerminalProps {
  endpointId: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  PATCH: "text-purple-400",
  DELETE: "text-rose-400",
};

export function LiveLogTerminal({ endpointId }: LiveLogTerminalProps) {
  const { logs, isConnected, latency, clearLogs } = useLogs({ endpointId });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-[#0F172A] rounded-card border border-slate-800 shadow-2xl flex flex-col h-full min-h-[500px] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Terminal Header */}
      <div className="bg-[#1E293B] px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
          </div>
          <span className="ml-4 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            Live Traffic Stream
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className={cn(
            "flex items-center gap-2 text-[10px] font-mono",
            isConnected ? "text-emerald-400" : "text-rose-400"
          )}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                LIVE
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                OFFLINE
              </>
            )}
          </div>

          {/* RTT Latency */}
          {latency !== null && (
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              RTT {latency}ms
            </div>
          )}

          <button
            onClick={clearLogs}
            className="text-slate-500 hover:text-white transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className="flex-1 p-6 font-mono text-[13px] overflow-y-auto space-y-1.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1E293B transparent" }}
      >
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
            <Cpu className="w-8 h-8 opacity-20" />
            <p className={isConnected ? "animate-pulse" : ""}>
              {isConnected
                ? "Subscribed. Awaiting incoming traffic..."
                : "Connecting to log stream..."}
            </p>
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-4 p-1 hover:bg-slate-800/50 rounded transition-colors group"
          >
            <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
            <span className={cn("font-bold shrink-0 w-14", METHOD_COLORS[log.method] ?? "text-slate-400")}>
              {log.method}
            </span>
            <span className="text-slate-300 flex-1 truncate">{log.path}</span>
            <span
              className={cn(
                "shrink-0 font-bold",
                log.statusCode < 400 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {log.statusCode}
            </span>
            <span className="text-slate-500 shrink-0 group-hover:text-amber-400 transition-colors">
              {log.latencyMs}ms
            </span>
          </div>
        ))}
      </div>

      {/* Terminal Footer */}
      <div className="bg-[#1E293B]/50 px-6 py-2 border-t border-slate-800 flex justify-between items-center">
        <div className="text-[10px] font-mono text-slate-500">
          STREAMS: 1 | BUFFER: {logs.length}/200 | EP: {endpointId.substring(0, 8)}
        </div>
        <div className="text-[10px] font-mono text-slate-500 italic">
          v0.4.2-beta
        </div>
      </div>
    </div>
  );
}
