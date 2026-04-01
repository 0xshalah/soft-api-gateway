import React from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, Pencil, Trash2, Activity, Code2, Play } from "lucide-react";

interface EndpointCardProps {
  name: string;
  method: string;
  path: string;
  status: "Active" | "Inactive" | "Degraded" | "Down";
  lastUsed?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
  onCode?: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-success/10 text-success border-success/20",
  POST: "bg-primary/10 text-primary border-primary/20",
  PUT: "bg-warning/10 text-warning border-warning/20",
  DELETE: "bg-error/10 text-error border-error/20",
};

export function EndpointCard({ name, method, path, status, lastUsed, onEdit, onDelete, onTest, onCode }: EndpointCardProps) {
  return (
    <div className="group bg-surface p-6 rounded-card border border-slate-50 shadow-soft hover:shadow-glow transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-2.5 py-1 rounded-pill text-[11px] font-bold border uppercase tracking-wider",
            METHOD_COLORS[method] || "bg-slate-100 text-slate-500 border-slate-200"
          )}>
            {method}
          </span>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === "Active" ? "bg-success" : status === "Degraded" ? "bg-warning" : status === "Down" ? "bg-error" : "bg-slate-300",
              status === "Down" && "animate-pulse"
            )} />
            <span className={cn(
              "text-[13px] font-body font-medium",
              status === "Down" ? "text-error font-bold" : "text-text-muted"
            )}>
              {status}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-md transition-all" title="Edit Endpoint">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-error hover:bg-error/5 rounded-md transition-all ml-1" title="Delete Endpoint">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-display font-semibold text-text-main truncate">
          {name}
        </h4>
        <p className="mt-1 font-mono text-[13px] text-primary bg-primary/5 px-2 py-1 rounded-lg inline-block">
          {path}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {/* Placeholder Sparkline */}
        <div className="flex items-end gap-0.5 h-8 opacity-30">
          {[4, 7, 2, 8, 4, 6, 9, 3, 5, 7].map((h, i) => (
            <div 
              key={i} 
              className="w-1.5 bg-primary rounded-full" 
              style={{ height: `${h * 10}%` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 text-[12px] font-body text-text-muted">
          <div className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            <span>4ms</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onCode} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface border border-slate-200 hover:border-text-main hover:text-text-main rounded-lg text-text-muted transition-all text-xs font-semibold">
              <Code2 className="w-3.5 h-3.5" />
              Snippet
            </button>
            <button onClick={onTest} className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all text-xs font-bold text-shadow-sm">
              <Play className="w-3.5 h-3.5 fill-current" />
              Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
