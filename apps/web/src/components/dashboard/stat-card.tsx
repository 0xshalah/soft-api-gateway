import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ label, value, subValue, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="group relative bg-surface p-6 rounded-card border border-slate-50 shadow-soft transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-body font-medium text-text-muted uppercase tracking-wider">
            {label}
          </p>
          <h3 className="mt-2 text-3xl font-display font-semibold text-text-main">
            {value}
          </h3>
          {subValue && (
            <p className="mt-1 text-[13px] font-body text-text-muted">
              {subValue}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center transition-colors group-hover:bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span className={cn(
            "px-2 py-1 rounded-pill text-[11px] font-bold",
            trend.isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error"
          )}>
            {trend.value}
          </span>
          <span className="text-[11px] font-body text-text-muted">
            vs last 24h
          </span>
        </div>
      )}
    </div>
  );
}
