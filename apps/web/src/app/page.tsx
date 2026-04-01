"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Clock, Zap, BarChart3, TrendingUp, Activity, Loader2 } from "lucide-react";
import { config } from "@/lib/config";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/api/analytics/overview`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 3000); // Super fast 3s polling for "Real-Time" feel
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-text-muted font-body animate-pulse">Syncing with Data Plane...</p>
      </div>
    );
  }

  // Calculate highest volume in chart to normalize heights
  const chartData = data?.trafficChart || [];
  const maxTraffic = Math.max(...chartData, 1);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-semibold text-text-main">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-text-muted font-body">
            System performance and traffic analytics at a glance.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-surface px-4 py-2 rounded-pill shadow-soft border border-slate-50">
          <Activity className="w-4 h-4 text-success" />
          <span className="text-[13px] font-body font-medium text-text-main">
            Live Traffic
          </span>
        </div>
      </div>

      {/* Grid: Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Requests"
          value={data?.totalRequests || "0"}
          subValue="Life-Time (All Endpoints)"
          icon={BarChart3}
          trend={{ value: "Live", isPositive: true }}
        />
        <StatCard
          label="Avg Latency"
          value={data?.avgLatency || "0ms"}
          subValue="Live Aggregation"
          icon={Clock}
          trend={{ value: "Stable", isPositive: true }}
        />
        <StatCard
          label="System Uptime"
          value={data?.systemUptime || "0%"}
          subValue="Based on Health Checks"
          icon={Zap}
          trend={{ value: "Active", isPositive: true }}
        />
      </div>

      {/* Placeholder: Traffic Chart */}
      <div className="bg-surface p-8 rounded-card border border-slate-50 shadow-soft h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          {/* Subtle grid pattern background placeholder */}
          <div className="w-full h-full bg-[radial-gradient(#8B5CF6_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>
        
        <TrendingUp className="w-12 h-12 text-primary/20 mb-4" />
        <h4 className="text-lg font-display font-semibold text-text-main">
          Live Traffic Stream
        </h4>
        <p className="mt-1 text-text-muted font-body text-sm">
          Menampilkan denyut volume permintaan 45 menit terakhir.
        </p>
        
        {/* Glowy Line Chart Rendering */}
        <div className="mt-8 flex items-end gap-[4px] w-full max-w-2xl h-32 px-4">
          {chartData.map((val: number, i: number) => {
            const heightPercent = Math.max((val / maxTraffic) * 100, 2); // default minimum 2% agar terlihat ada baselinenya
            return (
              <div 
                key={i} 
                className="flex-1 bg-primary/80 hover:bg-primary rounded-t-sm transition-all duration-700 ease-in-out relative group"
                style={{ height: `${heightPercent}%` }}
              >
                {/* Tooltip on Hover */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-text-main px-2 py-1 rounded shadow-lg text-xs border border-slate-50 transition-opacity z-10 font-mono">
                  {val} req
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
