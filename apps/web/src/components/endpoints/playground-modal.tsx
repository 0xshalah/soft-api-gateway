"use client";

import React, { useState } from "react";
import { X, Play, Loader2, KeyRound } from "lucide-react";
import { config } from "@/lib/config";

export function PlaygroundModal({ endpoint, onClose }: any) {
  const [key, setKey] = useState("");
  const [body, setBody] = useState('{\n  "messages": [\n    {"role": "user", "content": "Hai!"}\n  ]\n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(0);

  const gatewayUrl = `${config.dataPlaneUrl}/proxy${endpoint.path}`;
  const method = endpoint.method === "ALL" ? "POST" : endpoint.method;

  const handleSend = async () => {
    if (!key) {
      alert("Masukkan Access Key Sandbox Anda terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      const start = Date.now();
      const res = await fetch(gatewayUrl, {
        method,
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: (method === "GET" || method === "DELETE") ? undefined : body
      });
      
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : await res.text();
      
      setLatency(Date.now() - start);
      setResponse({ status: res.status, ok: res.ok, data });
    } catch (err: any) {
      setResponse({ error: err.message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-text-main/30 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-4xl h-[85vh] flex flex-col rounded-card shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in zoom-out duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-background-light">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-text-main">
                API Playground
              </h3>
              <p className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded inline-block mt-0.5">{method} {gatewayUrl}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Request */}
          <div className="flex-[1] flex flex-col border-r border-slate-100 p-6 overflow-y-auto">
            <div className="mb-6 space-y-2">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" /> API Key
              </label>
              <input
                type="password"
                placeholder="Paste Access Key here (e.g. sk_live_...)"
                className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main font-mono text-sm"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                Request Body (JSON)
              </label>
              <textarea
                className="w-full flex-1 p-4 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main font-mono text-sm resize-none whitespace-pre"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={(method === "GET" || method === "DELETE")}
              />
            </div>

            <button 
              onClick={handleSend}
              disabled={loading}
              className="mt-6 flex justify-center items-center gap-2 bg-text-main text-white py-3 rounded-xl font-body font-bold shadow-lg hover:bg-text-main/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              {loading ? "Sending..." : "Send Request"}
            </button>
          </div>

          {/* Right Panel: Response */}
          <div className="flex-[1.2] bg-[#0d1117] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 w-full p-4 flex items-center justify-between border-b border-slate-800 bg-[#0d1117] z-10">
              <span className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">Response Viewer</span>
              {response && (
                <div className="flex gap-3 text-xs font-mono">
                  <span className={response.ok ? "text-success" : "text-error"}>Status: {response.status}</span>
                  <span className="text-primary">Time: {latency}ms</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pt-16">
              {!response && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3">
                  <Play className="w-8 h-8 opacity-20" />
                  <p className="font-mono text-sm">Hit Send to test the proxy.</p>
                </div>
              )}
              {response && (
                <pre className="text-[#c9d1d9] font-mono text-sm whitespace-pre-wrap word-break-all">
                  {typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data || response.error}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
