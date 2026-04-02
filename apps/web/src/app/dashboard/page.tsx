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

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const firstName = user?.name?.split(" ")[0] || "there";

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/transactions/dashboard');
      return response.data;
    }
  });

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

  const { balance = 0, income = 0, expense = 0, recentTransactions = [] } = data || {};
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const spendPercent = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;

  // Derive today's spend intelligently using IST date
  const today = getTodayIST();
  const spentToday = recentTransactions.filter(t => t.type === 'expense' && new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today).reduce((a, b) => a + b.amount, 0);

  return (
    <div className="p-5 md:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-32 max-w-7xl mx-auto">

      {/* Greeting Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-muted-foreground  uppercase font-bold">{getGreeting()},</p>
          <h1 className="font-heading text-3xl font-bold  text-foreground">{firstName} <span className="text-xl">👋</span></h1>
        </div>
        <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center border border-border overflow-hidden shadow-inner">
          <div className="w-full h-full bg-gradient-to-tr from-primary/30 to-transparent flex items-center justify-center">
            <Wallet className="text-primary w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column (Primary Widgets) */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Main VIP Balance Card */}
          <section className="w-full rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/90 to-[#109048] border border-primary/20 shadow-[0_24px_50px_-12px_rgba(107,254,156,0.3)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/30 transition-colors duration-1000 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* NFC Chip Decoration */}
            <div className="absolute right-8 top-8 opacity-40">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 12h.01"></path><path d="M17 12h.01"></path><path d="M7 12h.01"></path></svg>
            </div>

            <p className="font-bold text-xs text-black/60 tracking-[0.2em] uppercase mb-1">Available Balance</p>
            <h2 className="font-heading text-6xl  font-extrabold text-black drop-shadow-sm flex items-start gap-1">
              <span className="text-black/60 text-3xl font-bold mt-1">₹</span>
              {Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            {balance < 0 && <p className="text-xs text-black/60 mt-1 font-bold ">CRITICAL STATE: IN THE RED</p>}

            <div className="flex flex-col md:flex-row gap-4 mt-10 w-full relative z-10">
              <div className="flex-1 bg-black/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-white/70 uppercase">Total Income</span>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                </div>
                <p className="font-heading text-xl font-extrabold text-white ">₹{income.toLocaleString('en-IN')}</p>
              </div>

              <div className="flex-1 bg-black/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-black/70 uppercase">Total Spent</span>
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                  </div>
                </div>
                <p className="font-heading text-xl font-extrabold text-black ">₹{expense.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </section>

          {/* Smart Insights & Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => router.push('/dashboard/add')} className="flex flex-col items-center justify-center p-4 bg-card rounded-2xl border border-border hover:bg-accent hover:border-primary/50 transition-all active:scale-95 group shadow-sm">
               <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Plus className="w-5 h-5"/></div>
               <span className="text-xs font-bold text-foreground">Add New</span>
            </button>
            <button onClick={() => router.push('/dashboard/analytics')} className="flex flex-col items-center justify-center p-4 bg-card rounded-2xl border border-border hover:bg-accent hover:border-primary/50 transition-all active:scale-95 group shadow-sm">
               <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><PieChart className="w-5 h-5"/></div>
               <span className="text-xs font-bold text-foreground">Analytics</span>
            </button>
            <div className="col-span-2 md:col-span-2 p-4 bg-accent/40 rounded-2xl border border-border flex flex-col justify-center">
               <p className="text-[10px] uppercase font-bold text-muted-foreground  mb-1.5 flex items-center gap-1.5"><LayoutList className="w-3.5 h-3.5"/> Today's Intel</p>
               <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                 You have spent <span className="text-destructive font-extrabold">₹{spentToday.toLocaleString('en-IN')}</span> today.
               </h3>
            </div>
          </div>

        </div>

        {/* Right Column (Secondary Widgets) */}
        <div className="space-y-6">
          
          {/* Spending Health Card */}
          <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                 <p className="text-[10px] uppercase font-bold text-muted-foreground  mb-0.5">Budget Sentinel</p>
                 <p className="text-sm font-extrabold text-foreground">Spending Health</p>
              </div>
              <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${spendPercent > 85 ? 'bg-destructive/10 text-destructive' : spendPercent > 60 ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/20 text-primary'}`}>
                <span className="text-xs font-black font-mono">{savingsRate >= 0 ? `${savingsRate}%` : '0%'}</span>
                <span className="text-[9px] uppercase  font-bold">{savingsRate >= 0 ? 'Saved' : 'Over'}</span>
              </div>
            </div>
            
            <div className="w-full h-3 bg-accent rounded-full overflow-hidden mb-3 border border-border/50">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${spendPercent > 85 ? 'bg-destructive' : spendPercent > 60 ? 'bg-orange-500' : 'bg-primary'}`}
                style={{ width: `${spendPercent}%` }}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground text-center">
              {income === 0 ? 'Awaiting income tracking' : `₹${expense.toLocaleString('en-IN')} consumed of ₹${income.toLocaleString('en-IN')} vault`}
            </p>
          </section>

          {/* Recent Transactions List */}
          <section className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col h-[calc(100%-12rem)] min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
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
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5 truncate">
                        <span className="shrink-0">{tx.category?.name} {subCategoryName && <span className="opacity-70 tracking-tight">/ {subCategoryName}</span>}</span>
                        {tx.location?.address && (
                          <span className="flex items-center gap-0.5 truncate"><span className="w-1 h-1 rounded-full bg-border inline-block shrink-0"/> <MapPin className="w-2.5 h-2.5 shrink-0"/> <span className="truncate">{tx.location.address.split(',')[0]}</span></span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <p className={`font-black font-heading text-[15px]  ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold  mt-0.5">
                       {formatDateIST(tx.date, { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )})}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
