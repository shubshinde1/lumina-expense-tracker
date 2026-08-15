'use client';

import { ArrowUpRight, ArrowDownRight, Wallet, Loader2, ChevronRight, TrendingDown, TrendingUp, Plus, PieChart, LayoutList, MapPin, Settings, CloudOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useRouter } from "next/navigation";
import { getTodayIST, formatDateIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLiveTransactions, useLiveTable, createLocalEntity, OfflineBadge } from "@/hooks/useLocalDB";

const TEMPLATES = [
  { label: "☕ Coffee", amount: 50, description: "Coffee", type: "expense", categoryKeyword: "Food" },
  { label: "🚇 Metro", amount: 30, description: "Metro travel", type: "expense", categoryKeyword: "Transport" },
  { label: "🛒 Groceries", amount: 500, description: "Groceries", type: "expense", categoryKeyword: "Groceries" },
  { label: "🍔 Food", amount: 200, description: "Lunch/Dinner", type: "expense", categoryKeyword: "Food" },
  { label: "🍿 Movie", amount: 350, description: "Movie ticket", type: "expense", categoryKeyword: "Entertainment" },
  { label: "⛽ Fuel", amount: 1000, description: "Fuel refuel", type: "expense", categoryKeyword: "Transport" }
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { radius } = useThemeStore();
  const pillRoundness = radius === 0 ? "rounded-none" : "rounded-full";
  const [isMounted, setIsMounted] = useState(false);

  const { transactions, loading: txLoading } = useLiveTransactions();
  const { items: categories, loading: catLoading } = useLiveTable('categories');
  const isLoading = txLoading || catLoading;
  const error = null;
  const [isQuickLogging, setIsQuickLogging] = useState(false);

  // Compute stats in-memory from local database
  const balance = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  const income = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const expense = transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const recentTransactions = transactions.slice(0, 5).map(tx => {
    const catRef = tx.category;
    let matchedCategory = null;
    if (typeof catRef === 'string') {
      matchedCategory = (categories || []).find((c: any) => c.id === catRef || c.server_id === catRef);
    } else if (typeof catRef === 'object' && catRef !== null) {
      matchedCategory = {
        id: catRef._id || catRef.id,
        server_id: catRef._id || catRef.id,
        name: catRef.name,
        icon: catRef.icon,
        color: catRef.color,
        subcategories: catRef.subcategories || []
      };
    }
    return {
      ...tx,
      category: matchedCategory || { name: 'Uncategorized', icon: 'wallet', color: '#9a9daa' }
    };
  });

  const data = { balance, income, expense, recentTransactions };

  const handleQuickLog = async (clip: { label: string; amount: number; description: string; type: string; categoryKeyword: string }) => {
    const match = (categories || []).find((c: any) => 
      c.name.toLowerCase().includes(clip.categoryKeyword.toLowerCase()) ||
      clip.categoryKeyword.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!match) {
      toast.error(`Please configure category "${clip.categoryKeyword}" first.`);
      return;
    }

    try {
      setIsQuickLogging(true);
      await createLocalEntity('transaction', {
        type: clip.type,
        amount: clip.amount,
        description: clip.description,
        date: new Date().toISOString(),
        category: match.id,
        subcategory: match.subcategories && match.subcategories.length > 0 ? match.subcategories[0]._id : undefined,
        paymentMode: "UPI"
      });
      toast.success(`Logged: ${clip.description} - ₹${clip.amount}`);
    } catch (e) {
      toast.error("Failed to log transaction");
    } finally {
      setIsQuickLogging(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (isMounted && !user) {
      router.push("/");
    }
  }, [user, router, isMounted]);

  // Sync user session to native Android SharedPreferences on dashboard mount (as a fail-safe)
  useEffect(() => {
    const syncSessionToNative = async () => {
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform() && user) {
          const LuminaBridge = registerPlugin<any>('LuminaBridge');
          
          const getBaseURL = () => {
            if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
            return 'https://lumina-expense-tracker-85ym.vercel.app/api';
          };
          
          await LuminaBridge.saveUserSession({
            token: user.token,
            email: user.email,
            apiUrl: getBaseURL()
          });
          console.log("✅ Synced active auth session to native storage from Dashboard");
        }
      } catch (err) {
        console.warn("⚠️ Failed to sync session to native from Dashboard:", err);
      }
    };

    if (user && isMounted) {
      syncSessionToNative();
    }
  }, [user, isMounted]);

  // Sync dashboard stats to native Android Widget
  useEffect(() => {
    const syncStatsToWidget = async () => {
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform() && data) {
          const LuminaBridge = registerPlugin<any>('LuminaBridge');
          const formattedBalance = `₹${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
          const formattedInflow = `₹${data.income.toLocaleString('en-IN')}`;
          const formattedOutflow = `₹${data.expense.toLocaleString('en-IN')}`;
          
          await LuminaBridge.updateWidgetData({
            balance: formattedBalance,
            inflow: formattedInflow,
            outflow: formattedOutflow
          });
          console.log("✅ Synced updated statistics to home screen widget storage");
        }
      } catch (err) {
        console.warn("⚠️ Failed to sync stats to widget:", err);
      }
    };

    if (data && isMounted) {
      syncStatsToWidget();
    }
  }, [data, isMounted]);



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

  return (
    <div className="space-y-3 animate-in fade-in duration-700">
      {/* Main Stats Card */}
      <section className="relative overflow-hidden py-2 px-1 text-foreground dark:text-white">
        <div className="absolute top-0 right-0 p-2 opacity-5 text-foreground dark:text-white">
          <Wallet className="w-32 h-32 rotate-12" />
        </div>
        
        <div className="relative space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/40 mb-3 ml-1">Total Liquidity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light text-muted-foreground/60 dark:text-white/50">₹</span>
              <h2 className="text-5xl md:text-6xl font-heading font-black tracking-tighter text-foreground dark:text-white">
                {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-muted/40 border border-border/50 dark:bg-white/[0.04] dark:border-white/5 rounded-3xl p-5 hover:bg-muted/60 dark:hover:bg-white/[0.08] transition-colors group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 group-hover:scale-110 transition-transform">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground dark:text-white/30">Inflow</span>
              </div>
              <p className="text-lg font-heading font-bold tracking-tight text-primary">
                ₹{income.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-muted/40 border border-border/50 dark:bg-white/[0.04] dark:border-white/5 rounded-3xl p-5 hover:bg-muted/60 dark:hover:bg-white/[0.08] transition-colors group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive dark:bg-destructive/20 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground dark:text-white/30">Outflow</span>
              </div>
              <p className="text-lg font-heading font-bold tracking-tight text-destructive">
                ₹{expense.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick-Add Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Log Expense</h3>
          {isQuickLogging && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto py-1 -mx-6 px-6 no-scrollbar scroll-smooth">
          {TEMPLATES.map((clip) => (
            <button
              key={clip.label}
              type="button"
              disabled={isQuickLogging}
              onClick={() => handleQuickLog(clip)}
              className={`bg-card border border-border/50 hover:border-primary/50 hover:bg-accent px-3.5 py-1.5 text-xs text-foreground font-medium flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm ${pillRoundness}`}
            >
              <span>{clip.label}</span>
              <span className="text-[10px] text-muted-foreground font-bold">₹{clip.amount}</span>
            </button>
          ))}
        </div>
      </div>

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
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Analytics</span>
         </Link>
         <Link href="/dashboard/categories" className="flex flex-col items-center justify-center p-5 rounded-3xl bg-card border border-border hover:bg-accent/50 transition-all group shadow-sm active:scale-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform shadow-inner">
               <LayoutList className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Categories</span>
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
              ? tx.category.subcategories.find((s: any) => s._id === tx.subcategory || s.id === tx.subcategory)?.name 
              : null;

            return (
            <div key={tx.id} onClick={() => router.push(`/dashboard/edit?id=${tx.id}`)} className="flex items-center justify-between p-3 rounded-2xl hover:bg-accent/60 transition-colors cursor-pointer group">
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
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <OfflineBadge status={tx.sync_status} clientMutationId={tx.client_mutation_id} />
                  {(!tx.sync_status || tx.sync_status === 'synced') && tx.location?.address ? (
                    <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground/50">
                      <MapPin className="w-2.5 h-2.5 shrink-0"/> 
                      <span className="truncate max-w-[80px]">{tx.location.address}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
