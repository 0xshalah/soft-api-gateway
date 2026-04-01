"use client";

import React, { useState } from "react";
import { X, Globe, Save, Loader2, AlertTriangle } from "lucide-react";
import { config } from "@/lib/config";

interface AddEndpointModalProps {
  onClose: () => void;
  endpointToEdit?: any | null;
}

export function AddEndpointModal({ onClose, endpointToEdit }: AddEndpointModalProps) {
  const isEdit = !!endpointToEdit;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: endpointToEdit?.name || "",
    path: endpointToEdit?.path || "/",
    method: endpointToEdit?.method || "GET",
    targetUrl: endpointToEdit?.targetUrl || "https://",
    upstreamAuth: endpointToEdit?.upstreamAuth || "",
    rateLimitRpm: endpointToEdit?.rules?.[0]?.rateLimitRpm || 60
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const applyPreset = (preset: "custom" | "groq" | "openai") => {
    if (preset === "groq") {
      setFormData({
        ...formData,
        name: formData.name || "Groq Inference API",
        path: formData.path === "/" ? "/v1/chat/completions" : formData.path,
        method: "POST",
        targetUrl: "https://api.groq.com/openai/v1/chat/completions",
        upstreamAuth: ""
      });
    } else if (preset === "openai") {
      setFormData({
        ...formData,
        name: formData.name || "OpenAI API",
        path: formData.path === "/" ? "/v1/chat/completions" : formData.path,
        method: "POST",
        targetUrl: "https://api.openai.com/v1/chat/completions",
        upstreamAuth: ""
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.path || !formData.targetUrl) return;

    try {
      setLoading(true);
      const url = isEdit ? `${config.apiUrl}/api/endpoints/${endpointToEdit.id}` : `${config.apiUrl}/api/endpoints`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rateLimitRpm: Number(formData.rateLimitRpm)
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'register'} endpoint. Please review your inputs.`);
      }

      const data = await res.json();
      console.log("Endpoint created:", data);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create endpoint.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-text-main/20 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-card shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-semibold text-text-main">
              {isEdit ? "Edit Upstream Endpoint" : "Register Upstream Endpoint"}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {!isEdit && (
            <div className="mb-6 space-y-2">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                Magic Presets
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => applyPreset("groq")} className="px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all">🪄 Groq AI</button>
                <button type="button" onClick={() => applyPreset("openai")} className="px-3 py-1.5 text-sm bg-success/10 text-success border border-success/20 rounded-lg hover:bg-success/20 transition-all">🪄 OpenAI</button>
              </div>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                Endpoint Name
              </label>
              <input
                autoFocus
                name="name"
                type="text"
                required
                placeholder="e.g. Auth Service"
                className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                  Method
                </label>
                <select
                  name="method"
                  className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main appearance-none"
                  value={formData.method}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                  Listen Path
                </label>
                <input
                  name="path"
                  type="text"
                  required
                  placeholder="/api/v1/resource"
                  className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main font-mono text-sm"
                  value={formData.path}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                Target Upstream URL
              </label>
              <input
                name="targetUrl"
                type="url"
                required
                placeholder="https://api.internal/resource"
                className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main font-mono text-sm"
                value={formData.targetUrl}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                Upstream Auth Header <span className="text-slate-400 normal-case font-normal">(Optional)</span>
              </label>
              <input
                name="upstreamAuth"
                type="text"
                placeholder={formData.targetUrl.includes("groq") ? "Bearer gsk_..." : formData.targetUrl.includes("openai") ? "Bearer sk-proj-..." : "e.g. Bearer my_secret..."}
                className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main font-mono text-sm"
                value={formData.upstreamAuth}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                Rate Limit (Req / Minute)
              </label>
              <input
                name="rateLimitRpm"
                type="number"
                min="1"
                required
                className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main"
                value={formData.rateLimitRpm}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-6 mt-4 border-t border-slate-100">
              <button 
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-[1] py-3 font-body font-bold text-text-muted hover:text-text-main transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] flex justify-center items-center gap-2 bg-text-main text-white py-3 rounded-pill font-body font-bold shadow-lg hover:bg-text-main/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? "Saving..." : isEdit ? "Update Endpoint" : "Save Endpoint"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
