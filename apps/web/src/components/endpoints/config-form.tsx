"use client";

import React, { useState } from "react";
import { Save, Globe, Shield, RefreshCcw } from "lucide-react";

interface ConfigFormProps {
  endpointId: string;
}

export function ConfigForm({ endpointId }: ConfigFormProps) {
  const [targetUrl, setTargetUrl] = useState("https://api.upstream.service/v1");
  const [rateLimit, setRateLimit] = useState(60);
  const [method, setMethod] = useState("GET");

  return (
    <div className="bg-surface p-8 rounded-card border border-slate-50 shadow-soft space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-semibold text-text-main">
          Configuration
        </h3>
        <span className="text-[11px] font-mono font-bold bg-slate-100 px-2 py-1 rounded text-text-muted uppercase">
          ID: {endpointId.substring(0, 8)}
        </span>
      </div>

      <div className="space-y-6">
        {/* Target URL */}
        <div className="space-y-2">
          <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Target Upstream URL
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-sm"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
        </div>

        {/* Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <RefreshCcw className="w-3.5 h-3.5" />
            HTTP Method
          </label>
          <div className="flex gap-2">
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-4 py-2 rounded-pill text-[12px] font-bold transition-all border ${
                  method === m 
                    ? "bg-primary text-white border-primary shadow-glow" 
                    : "bg-surface text-text-muted border-slate-100 hover:bg-slate-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Limit Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Rate Limit (Requests per min)
            </label>
            <span className="text-sm font-display font-bold text-primary">
              {rateLimit} RPM
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
            value={rateLimit}
            onChange={(e) => setRateLimit(parseInt(e.target.value))}
          />
          <div className="flex justify-between text-[10px] font-medium text-slate-300">
            <span>UNLIMITED</span>
            <span>500 RPM</span>
            <span>1000 RPM</span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-50">
        <button className="w-full bg-primary text-white py-4 rounded-pill font-body font-bold shadow-glow hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-95">
          <Save className="w-5 h-5" />
          Update Configuration
        </button>
      </div>
    </div>
  );
}
