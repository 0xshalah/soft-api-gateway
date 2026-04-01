import React from "react";
import { cn } from "@/lib/utils";
import { MoreHorizontal, ShieldCheck, ShieldAlert, Ban } from "lucide-react";

interface KeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: "Active" | "Revoked";
}

interface KeyTableProps {
  keys: KeyRecord[];
  onRevoke?: (id: string, name: string) => void;
}

export function KeyTable({ keys, onRevoke }: KeyTableProps) {
  return (
    <div className="bg-surface rounded-card border border-slate-50 shadow-soft overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="px-6 py-4 text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider">Prefix</th>
            <th className="px-6 py-4 text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider">Created</th>
            <th className="px-6 py-4 text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider">Last Used</th>
            <th className="px-6 py-4 text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-[13px] font-display font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {keys.map((key) => (
            <tr key={key.id} className="group hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-body font-medium text-text-main">{key.name}</td>
              <td className="px-6 py-4 font-mono text-sm text-primary">{key.prefix}</td>
              <td className="px-6 py-4 text-[13px] text-text-muted">{key.createdAt}</td>
              <td className="px-6 py-4 text-[13px] text-text-muted">{key.lastUsed}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {key.status === "Active" ? (
                    <ShieldCheck className="w-4 h-4 text-success" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-error" />
                  )}
                  <span className={cn(
                    "text-[13px] font-medium",
                    key.status === "Active" ? "text-success" : "text-error"
                  )}>
                    {key.status}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                {key.status === "Active" ? (
                  <button 
                    onClick={() => onRevoke && onRevoke(key.id, key.name)}
                    className="flex items-center gap-2 px-3 py-1.5 ml-auto text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 rounded-lg transition-all border border-transparent hover:border-error/20"
                    title="Revoke Key"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic px-3 py-1.5 cursor-not-allowed">
                    Revoked
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
