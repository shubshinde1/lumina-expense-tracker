"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Flame, Activity, Users, Receipt, TrendingUp, TrendingDown, Clock, ShieldCheck, ShieldAlert, Zap, Globe } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/stats")
      .then(res => {
        setStats(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500 py-20 text-center animate-pulse">Loading Platform Data...</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            Wealthy Overview <Flame className="w-5.5 h-5.5 text-[#6bfe9c]" />
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Real-time Platform Health & Financial metrics</p>
        </div>
      </header>

      {/* Primary User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Registered */}
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-4 rounded-lg relative overflow-hidden group hover:border-[#6bfe9c]/50 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-8.5 h-8.5 rounded-lg bg-[#6bfe9c]/10 flex items-center justify-center text-[#6bfe9c]">
              <Users className="w-4.5 h-4.5" />
            </span>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Total Registered</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-0.5">{stats?.totalUsers || 0}</p>
          <p className="text-[9px] text-[#6bfe9c] flex items-center gap-1 font-bold uppercase tracking-wider">
            Total User Base
          </p>
        </div>

        {/* Active Users */}
        <div className="bg-[#131315]/80 border border-[#48474a]/30 p-4 rounded-lg flex flex-col items-center text-center hover:border-[#6bfe9c]/30 transition-colors">
          <div className="w-8.5 h-8.5 rounded-full bg-[#6bfe9c]/10 text-[#6bfe9c] flex items-center justify-center mb-3">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Active Accounts</p>
        </div>

        {/* Suspended Users */}
        <div className="bg-[#131315]/80 border border-[#48474a]/30 p-4 rounded-lg flex flex-col items-center text-center hover:border-red-500/30 transition-colors">
          <div className="w-8.5 h-8.5 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.suspendedUsers || 0}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Suspended</p>
        </div>

        {/* Free Users */}
        <div className="bg-[#131315]/80 border border-[#48474a]/30 p-4 rounded-lg flex flex-col items-center text-center hover:border-blue-500/30 transition-colors">
          <div className="w-8.5 h-8.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.freeUsers || 0}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Free Tier</p>
        </div>

        {/* Premium Users */}
        <div className="bg-[#131315]/80 border border-[#48474a]/30 p-4 rounded-lg flex flex-col items-center text-center hover:border-amber-500/30 transition-colors">
          <div className="w-8.5 h-8.5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <Zap className="w-4.5 h-4.5" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.premiumUsers || 0}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Premium Tier</p>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-lg p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          System Status <Activity className="w-4.5 h-4.5 text-blue-400" />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-[#131315]/80 rounded-lg border border-[#6bfe9c]/10">
            <div>
              <p className="text-sm font-bold text-[#6bfe9c]">API Service</p>
              <p className="text-xs text-zinc-500 mt-0.5">Response Time: 42ms</p>
            </div>
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#6bfe9c] shadow-[0_0_12px_#6bfe9c]" />
          </div>
          <div className="flex items-center justify-between p-3 bg-[#131315]/80 rounded-lg border border-[#6bfe9c]/10">
            <div>
              <p className="text-sm font-bold text-[#6bfe9c]">Database (MongoDB)</p>
              <p className="text-xs text-zinc-500 mt-0.5">Atlas Cluster: Healthy</p>
            </div>
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#6bfe9c] shadow-[0_0_12px_#6bfe9c]" />
          </div>
          <div className="flex items-center justify-between p-3 bg-[#131315]/80 rounded-lg border border-blue-500/10">
            <div>
              <p className="text-sm font-bold text-blue-400">Mobile Sync Service</p>
              <p className="text-xs text-zinc-500 mt-0.5">Socket Connections: 4 active</p>
            </div>
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
