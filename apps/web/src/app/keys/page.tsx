"use client";

import React, { useState, useEffect } from "react";
import { KeyTable } from "@/components/keys/key-table";
import { GenerateModal } from "@/components/keys/generate-modal";
import { Plus, ShieldCheck, Key as KeyIcon, Loader2, LockKeyhole } from "lucide-react";
import { config } from "@/lib/config";

export default function KeysPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/api/keys`);
      if (!res.ok) throw new Error("Failed response");
      const data = await res.json();
      
      const formattedKeys = data.map((k: any) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: new Date(k.createdAt).toLocaleDateString(),
        lastUsed: k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "Never",
        status: k.status
      }));
      setKeys(formattedKeys);
    } catch (error) {
      console.error("Failed to fetch keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRevoke = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to REVOKE the API key "${name}"?\n\nThis action instantly invalidates the key.\nApplications using it will immediately receive 401 Unauthorized.`)) {
      return;
    }

    try {
      const res = await fetch(`${config.apiUrl}/api/keys/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to revoke key");
      
      // Refresh the list seamlessly
      fetchKeys();
    } catch (error) {
      console.error("Error revoking key:", error);
      alert("Failed to revoke key. Please ensure the backend is running.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-soft">
            <KeyIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-semibold text-text-main">
              Access Keys
            </h2>
            <p className="mt-1 text-text-muted font-body">
              Manage your secure API keys and access permissions.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-text-main text-white px-6 py-3 rounded-pill font-body font-bold shadow-lg hover:bg-text-main/90 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Generate New Key</span>
        </button>
      </div>

      <div className="p-4 bg-success/5 border border-success/10 rounded-2xl flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-success" />
        </div>
        <p className="text-sm font-body text-success/80">
          All keys are encrypted using SHA-256 before storage. We only store the first 6 characters for lookup.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider">
            Your Active Keys ({keys.length})
          </h4>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-text-muted">Loading secure keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-gradient-to-br from-surface to-background-light rounded-card border border-text-main/10 shadow-soft animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-text-main/10 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <LockKeyhole className="w-10 h-10 text-text-main" />
            </div>
            <h3 className="text-2xl font-display font-bold text-text-main mb-2">Kunci Menuju Gerbang Anda</h3>
            <p className="text-text-muted font-body text-center max-w-md mb-8">
              Sebelum *Chatbot* atau aplikasi bisa masuk ke *Gateway*, Anda harus membekalinya dengan Kunci Sandi agar tidak ditampar respons **401 Unauthorized**.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-text-main text-white px-8 py-4 rounded-pill font-body font-bold shadow-lg hover:bg-text-main/90 transition-all active:scale-95 hover:-translate-y-1"
            >
              <Plus className="w-5 h-5" />
              <span>Cetak Kunci Sandbox Pertama</span>
            </button>
          </div>
        ) : (
          <KeyTable keys={keys} onRevoke={handleRevoke} />
        )}
      </div>

      {isModalOpen && (
        <GenerateModal onClose={() => {
          setIsModalOpen(false);
          fetchKeys();
        }} />
      )}
    </div>
  );
}
