"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Flame, Activity, Users, Receipt, TrendingUp, TrendingDown, Clock } from "lucide-react";

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
    <div className="max-w-6xl animate-in fade-in zoom-in-95 duration-500 pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          Lumina Overview <Flame className="w-6 h-6 text-[#6bfe9c]" />
        </h1>
        <p className="text-zinc-400 mt-1">Real-time Platform Health & Financial metrics</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {/* Total Users */}
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl relative overflow-hidden group hover:border-[#6bfe9c]/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#6bfe9c]/5 rounded-full blur-2xl group-hover:bg-[#6bfe9c]/10 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-[#6bfe9c]/10 flex items-center justify-center text-[#6bfe9c]">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Total Users</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{stats?.totalUsers || 0}</p>
          <p className="text-xs text-[#6bfe9c] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Platform Growth
          </p>
        </div>

        {/* Total Transactions */}
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Receipt className="w-5 h-5" />
            </span>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Total Transactions</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{stats?.totalTransactions || 0}</p>
          <p className="text-xs text-blue-400 flex items-center gap-1 font-medium">
            <Activity className="w-3 h-3" /> Network Activity
          </p>
        </div>

        {/* Global Income */}
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl relative overflow-hidden group hover:border-[#6bfe9c]/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-[#6bfe9c]/10 flex items-center justify-center text-[#6bfe9c]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Total Volume (In)</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-1">₹{stats?.totalIncome?.toLocaleString() || 0}</p>
          <p className="text-xs text-zinc-500">Combined Platform Income</p>
        </div>

        {/* Global Expense */}
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl relative overflow-hidden group hover:border-red-500/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
              <TrendingDown className="w-5 h-5" />
            </span>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Total Volume (Out)</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-1">₹{stats?.totalExpense?.toLocaleString() || 0}</p>
          <p className="text-xs text-zinc-500">Combined Platform Expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity Feed */}
        <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                Recent Activity <Clock className="w-5 h-5 text-zinc-500" />
            </h3>
            <div className="space-y-4">
                {stats?.recentActivity?.map((act: any) => (
                    <div key={act._id} className="flex items-center justify-between p-4 bg-[#131315]/50 rounded-2xl border border-[#48474a]/50 hover:border-zinc-600 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#1f1f22] border border-[#48474a] flex items-center justify-center overflow-hidden">
                                <span className="material-symbols-outlined text-[20px]" style={{ color: act.category?.color || '#6bfe9c' }}>
                                    {act.category?.icon || 'receipt_long'}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{act.user?.name || 'Unknown User'}</p>
                                <p className="text-xs text-zinc-500">{act.description || act.category?.name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-bold ${act.type === 'income' ? 'text-[#6bfe9c]' : 'text-red-400'}`}>
                                {act.type === 'income' ? '+' : '-'}₹{act.amount}
                            </p>
                            <p className="text-[10px] text-zinc-600 uppercase font-medium">{new Date(act.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                    <div className="text-center py-10 text-zinc-600 border-2 border-dashed border-[#48474a] rounded-3xl">
                        No recent activity recorded yet.
                    </div>
                )}
            </div>
        </div>

        {/* System Health */}
        <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                System Status <Activity className="w-5 h-5 text-blue-400" />
            </h3>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#131315]/80 rounded-2xl border border-[#6bfe9c]/10">
                    <div>
                        <p className="text-sm font-bold text-[#6bfe9c]">API Service</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Response Time: 42ms</p>
                    </div>
                    <span className="flex h-3 w-3 rounded-full bg-[#6bfe9c] shadow-[0_0_12px_#6bfe9c]" />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#131315]/80 rounded-2xl border border-[#6bfe9c]/10">
                    <div>
                        <p className="text-sm font-bold text-[#6bfe9c]">Database (MongoDB)</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Atlas Cluster: Healthy</p>
                    </div>
                    <span className="flex h-3 w-3 rounded-full bg-[#6bfe9c] shadow-[0_0_12px_#6bfe9c]" />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#131315]/80 rounded-2xl border border-blue-500/10">
                    <div>
                        <p className="text-sm font-bold text-blue-400">Mobile Sync Service</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Socket Connections: 4 active</p>
                    </div>
                    <span className="flex h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
