"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings, 
  Key, 
  Activity, 
  Zap,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Endpoints", href: "/endpoints", icon: Settings },
  { name: "Access Keys", href: "/keys", icon: Key },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] h-screen bg-surface border-r border-slate-100 flex flex-col shadow-soft z-50">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow">
          <Zap className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-display font-semibold tracking-tight text-text-main">
          Soft Gateway
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ease-in-out",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-text-muted hover:bg-slate-50 hover:text-text-main"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-text-muted group-hover:text-text-main"
                )} />
                <span className="font-body font-medium text-[15px]">
                  {item.name}
                </span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
        <div className="p-4 bg-background-light rounded-2xl border border-slate-100">
          <p className="text-[13px] font-body font-semibold text-text-main">
            SLA Health
          </p>
          <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-success w-[99.9%]" />
          </div>
          <p className="mt-2 text-[11px] font-medium text-text-muted">
            99.9% / 24h uptime
          </p>
        </div>
      </div>
    </aside>
  );
}
