'use client';

import { ArrowUpRight, ArrowDownRight, Wallet, Loader2, ChevronRight, TrendingDown, TrendingUp, Plus, PieChart, LayoutList, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { getTodayIST, formatDateIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";

type DashboardData = {
  balance: number;
  income: number;
  expense: number;
  recentTransactions: any[];
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/transactions/dashboard');
      return response.data;
    }
  });

  useEffect(() => {
    setIsMounted(true);
    if (isMounted && !user) {
      router.push("/");
    }
  }, [user, router, isMounted]);

  if (!isMounted || !user) return null;
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase ">Loading ledger…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20">
        <p className="text-destructive font-medium">Failed to load data. Please try again.</p>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";
  const { balance = 0, income = 0, expense = 0, recentTransactions = [] } = data || {};

  return (
    <div className="px-5 py-6 md:p-12 space-y-8 animate-in fade-in duration-700 pb-32 max-w-5xl mx-auto">
      {/* Header with Glassmorphism */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Status: Online</p>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, <span className="text-primary italic">{firstName}</span>
          </h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm overflow-hidden relative group cursor-pointer ring-1 ring-border/50">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <span className="font-heading font-bold text-primary group-hover:scale-110 transition-transform">{firstName[0]}</span>
        </div>
      </header>

      {/* Main Stats Card */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#0c0c0e] p-8 text-white border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32 rotate-12" />
        </div>
        
        <div className="relative space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3 ml-1">Total Liquidity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light text-white/50">₹</span>
              <h2 className="text-5xl md:text-6xl font-heading font-black tracking-tighter">
                {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 hover:bg-white/[0.05] transition-colors group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-[#1fc46a]/10 text-[#1fc46a] group-hover:scale-110 transition-transform">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Inflow</span>
              </div>
              <p className="text-lg font-heading font-bold tracking-tight text-[#1fc46a]">
                ₹{income.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 hover:bg-white/[0.05] transition-colors group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Outflow</span>
              </div>
              <p className="text-lg font-heading font-bold tracking-tight text-white">
                ₹{expense.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Hub */}
      <div className="grid grid-cols-3 gap-3">
         <Link href="/dashboard/add" className="flex flex-col items-center justify-center p-5 rounded-3xl bg-card border border-border hover:bg-accent/50 transition-all group shadow-sm active:scale-95">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform shadow-inner">
               <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Add New</span>
         </Link>
         <Link href="/dashboard/analytics" className="flex flex-col items-center justify-center p-5 rounded-3xl bg-card border border-border hover:bg-accent/50 transition-all group shadow-sm active:scale-95">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform shadow-inner">
               <PieChart className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Insights</span>
         </Link>
         <Link href="/dashboard/categories" className="flex flex-col items-center justify-center p-5 rounded-3xl bg-card border border-border hover:bg-accent/50 transition-all group shadow-sm active:scale-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform shadow-inner">
               <LayoutList className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Nodes</span>
         </Link>
      </div>

      {/* Main Feed Section */}
      <div className="flex flex-col flex-1 min-h-[400px]">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="font-heading text-lg font-bold text-foreground">Recent Activity</h3>
          <Link href="/dashboard/history" className="flex items-center gap-0.5 text-[10px] uppercase  text-primary font-bold hover:text-primary/80 transition-all bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20">
            View All
          </Link>
        </div>

        <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {recentTransactions.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center justify-center h-full opacity-50">
              <LayoutList className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold">Ghost town here</p>
              <p className="text-xs mt-1">Make your first transaction</p>
            </div>
          )}

          {recentTransactions.slice(0, 6).map((tx: any) => {
            const subCategoryName = tx.subcategory && tx.category?.subcategories 
              ? tx.category.subcategories.find((s: any) => s._id === tx.subcategory)?.name 
              : null;

            return (
            <div key={tx._id} onClick={() => router.push(`/dashboard/edit?id=${tx._id}`)} className="flex items-center justify-between p-3 rounded-2xl hover:bg-accent/60 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0"
                  style={{ backgroundColor: `${tx.category?.color || '#888'}20`, color: tx.category?.color || '#888' }}
                >
                  <span className="material-symbols-outlined text-[20px]">{tx.category?.icon || 'wallet'}</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-foreground leading-tight truncate">{tx.description || tx.category?.name || "Unknown"}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider flex items-center gap-1.5 truncate">
                    {tx.category?.name} {subCategoryName && <span className="opacity-50">/ {subCategoryName}</span>}
                    <span className="opacity-30">•</span>
                    {formatDateIST(tx.date, { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold font-heading text-sm ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                  {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                </p>
                {tx.location?.address && (
                  <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground/50 mt-0.5">
                    <MapPin className="w-2 h-2" />
                    <span className="truncate max-w-[80px]">{tx.location.address}</span>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
