"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Flame, Activity, Users } from "lucide-react";

export default function DashboardPage() {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/admin/users").then(res => {
      setUserCount(res.length || 0);
    }).catch(console.error);
  }, []);

  return (
    <div className="max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold  text-white flex items-center gap-3">
          Overview <Flame className="w-6 h-6 text-[#6bfe9c]" />
        </h1>
        <p className="text-zinc-400 mt-1">Lumina Platform Health & Metrics</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6bfe9c]/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-[#6bfe9c]/20 flex items-center justify-center text-[#6bfe9c]">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="text-sm font-semibold uppercase  text-zinc-300">Total Users</h3>
          </div>
          <p className="text-5xl font-bold text-white ">
            {userCount === null ? "..." : userCount}
          </p>
        </div>

        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </span>
            <h3 className="text-sm font-semibold uppercase  text-zinc-300">System Status</h3>
          </div>
          <p className="text-3xl font-bold text-blue-400 ">Online</p>
          <p className="text-sm text-zinc-500 mt-2">All services operational</p>
        </div>
      </div>
    </div>
  );
}
