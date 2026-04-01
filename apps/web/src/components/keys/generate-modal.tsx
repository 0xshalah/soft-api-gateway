"use client";

import React, { useState } from "react";
import { X, Key as KeyIcon, Copy, Check, AlertTriangle, Zap, Loader2 } from "lucide-react";

interface GenerateModalProps {
  onClose: () => void;
}

export function GenerateModal({ onClose }: GenerateModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [keyName, setKeyName] = useState("");
  const [scopes, setScopes] = useState("read,write");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;
    
    try {
      setLoading(true);
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName,
          scopes: scopes.split(",").map(s => s.trim())
        })
      });
      
      if (!res.ok) throw new Error("Failed to create key");
      const data = await res.json();
      
      setGeneratedKey(data.secretKey);
      setStep("success");
    } catch (err) {
      console.error(err);
      alert("System Error: Failed to generate access key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-text-main/20 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-card shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <KeyIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-semibold text-text-main">
              {step === "form" ? "Generate New API Key" : "Key Generated"}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {step === "form" ? (
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
                  Key Name
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Production Mobile App"
                  className="w-full px-4 py-3 bg-background-light rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <p className="text-[13px] text-text-muted font-body leading-relaxed">
                  Keys are stored using SHA-256 hashes. You will only be able to view the secret key <strong>once</strong>.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 font-body font-bold text-text-muted hover:text-text-main transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center items-center gap-2 bg-primary text-white py-3 rounded-pill font-body font-bold shadow-glow hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {loading ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              <div className="p-6 bg-warning/10 border-2 border-warning/20 rounded-2xl flex flex-col items-center text-center animate-pulse-subtle">
                <div className="p-3 bg-warning/20 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                </div>
                <h4 className="text-warning font-display font-bold">Copy your Secret Key now!</h4>
                <p className="mt-2 text-sm text-warning/80 font-body">
                  For your security, we will never show this key again.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-background-light rounded-2xl border border-slate-100 font-mono text-sm break-all text-primary shadow-inner">
                  {generatedKey}
                  <button 
                    onClick={handleCopy}
                    className="ml-4 p-2 bg-primary text-white rounded-xl shadow-glow hover:bg-primary/90 active:scale-90 transition-all shrink-0"
                  >
                    {copying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

             <button 
                onClick={onClose}
                className="w-full bg-text-main text-white py-4 rounded-pill font-body font-bold hover:bg-text-main/90 transition-all shadow-lg overflow-hidden flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Done, I have saved it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
