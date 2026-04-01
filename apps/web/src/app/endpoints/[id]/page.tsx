"use client";

import React from "react";
import { ConfigForm } from "@/components/endpoints/config-form";
import { LiveLogTerminal } from "@/components/endpoints/live-log-terminal";
import { ArrowLeft, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";

export default function EndpointDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Link 
            href="/endpoints" 
            className="group flex items-center gap-2 text-text-muted hover:text-primary transition-colors font-body text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Endpoints
          </Link>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-display font-semibold text-text-main">
              Endpoint Detail
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 rounded-pill border border-success/20">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-bold text-success uppercase">
                Healthy
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[13px] font-body text-text-muted">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>Public Route: /api/v1/auth/login</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-6 py-3 bg-white border border-slate-100 rounded-pill font-body font-bold text-text-muted hover:text-text-main hover:bg-slate-50 transition-all shadow-soft">
            Reset Stats
          </button>
          <button className="px-6 py-3 bg-error/10 text-error border border-error/20 rounded-pill font-body font-bold hover:bg-error/20 transition-all">
            Delete Route
          </button>
        </div>
      </div>

      {/* Main Grid: 60/40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
        {/* Left: Configuration Form (60%) */}
        <div className="lg:col-span-6">
          <ConfigForm endpointId={params.id} />
        </div>

        {/* Right: Live Log Terminal (40%) */}
        <div className="lg:col-span-4 h-full">
          <LiveLogTerminal endpointId={params.id} />
        </div>
      </div>

      {/* Quick Metrics Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Request Rate", value: "120 RPM", sub: "Peak: 150" },
          { label: "Error Rate", value: "0.02%", sub: "Last 24h" },
          { label: "Avg Latency", value: "38ms", sub: "p95: 45ms" },
          { label: "Payload Size", value: "1.2 KB", sub: "Avg per req" },
        ].map((m, i) => (
          <div key={i} className="bg-surface p-4 rounded-2xl border border-slate-50 shadow-soft">
            <p className="text-[11px] font-display font-semibold text-text-muted uppercase tracking-wider">
              {m.label}
            </p>
            <p className="mt-1 text-lg font-display font-bold text-text-main">
              {m.value}
            </p>
            <p className="text-[11px] font-body text-slate-400">
              {m.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
