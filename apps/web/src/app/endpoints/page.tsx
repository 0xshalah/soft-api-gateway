"use client";

import React, { useState, useEffect } from "react";
import { EndpointCard } from "@/components/endpoints/endpoint-card";
import { AddEndpointModal } from "@/components/endpoints/add-endpoint-modal";
import { CodeSnippetModal } from "@/components/endpoints/code-snippet-modal";
import { PlaygroundModal } from "@/components/endpoints/playground-modal";
import { Plus, Search, Filter, Loader2, Rocket } from "lucide-react";
import { config } from "@/lib/config";

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<any | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<any | null>(null);
  const [codingEndpoint, setCodingEndpoint] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/api/endpoints`);
      if (!res.ok) throw new Error("Failed response");
      const data = await res.json();
      
      const formatted = data.map((e: any) => ({
        id: e.id,
        name: e.name,
        method: e.method,
        path: e.path,
        targetUrl: e.targetUrl,
        upstreamAuth: e.upstreamAuth,
        rules: e.rules,
        status: e.status || "Active",
        lastHealthCheck: e.lastHealthCheck
      }));
      setEndpoints(formatted);
    } catch (error) {
      console.error("Failed to fetch endpoints:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const filteredEndpoints = endpoints.filter(ep => 
    ep.name.toLowerCase().includes(search.toLowerCase()) || 
    ep.path.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the endpoint "${name}"?\n\nTraffic will immediately return 404 Not Found.`)) {
      return;
    }

    try {
      const res = await fetch(`${config.apiUrl}/api/endpoints/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete endpoint");
      
      // Refresh the list seamlessly
      fetchEndpoints();
    } catch (error) {
      console.error("Error deleting endpoint:", error);
      alert("Failed to delete endpoint. Please ensure the backend is running.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-semibold text-text-main">
            Endpoints Management
          </h2>
          <p className="mt-1 text-text-muted font-body">
            Register and monitor your upstream API routes.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingEndpoint(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-pill font-body font-bold shadow-glow hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Add Endpoint</span>
        </button>
      </div>

      <div className="flex items-center gap-3 bg-surface p-2 rounded-card border border-slate-100 shadow-soft">
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-background-light rounded-xl border border-slate-100">
          <Search className="w-5 h-5 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search endpoints by name or path..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-text-main font-body text-sm outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-text-main transition-colors font-medium text-sm">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-text-muted">Loading endpoints...</span>
        </div>
      ) : filteredEndpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-gradient-to-br from-surface to-background-light rounded-card border border-primary/10 shadow-soft animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-glow">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-display font-bold text-text-main mb-2">Halo, Selamat Datang di Gateway Anda!</h3>
          <p className="text-text-muted font-body text-center max-w-md mb-8">
            Bagaikan pos satpam 24/7, sistem ini akan melindungi API rahasia Anda. Mulailah dengan mendaftarkan alamat target (seperti Groq/OpenAI) pertama Anda.
          </p>
          <button 
            onClick={() => {
              setEditingEndpoint(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-pill font-body font-bold shadow-glow hover:bg-primary/90 transition-all active:scale-95 hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            <span>Daftarkan Endpoint Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEndpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              {...endpoint}
              onEdit={() => {
                setEditingEndpoint(endpoint);
                setIsModalOpen(true);
              }}
              onDelete={() => handleDelete(endpoint.id, endpoint.name)}
              onTest={() => setTestingEndpoint(endpoint)}
              onCode={() => setCodingEndpoint(endpoint)}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <AddEndpointModal 
          endpointToEdit={editingEndpoint}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEndpoint(null);
            fetchEndpoints();
          }} 
        />
      )}

      {testingEndpoint && (
        <PlaygroundModal 
          endpoint={testingEndpoint} 
          onClose={() => setTestingEndpoint(null)} 
        />
      )}

      {codingEndpoint && (
        <CodeSnippetModal 
          endpoint={codingEndpoint} 
          onClose={() => setCodingEndpoint(null)} 
        />
      )}
    </div>
  );
}
