'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Edit2, ArrowDownRight, ArrowUpRight, SearchX, MapPin } from "lucide-react";
import api from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function groupByDate(transactions: any[]) {
  const groups: Record<string, any[]> = {};
  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) label = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });
  return groups;
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'custom'>('all');
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await api.get('/transactions');
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase ">Fetching history…</p>
      </div>
    );
  }

  // Time Filtering Logic
  const filterByTime = (tx: any) => {
    if (timeFilter === 'all') return true;
    
    const txDate = new Date(tx.date);
    const now = new Date();
    
    if (timeFilter === 'week') {
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      return txDate >= weekAgo;
    }
    if (timeFilter === 'month') {
       return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'quarter') {
      const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return txDate >= quarterAgo;
    }
    if (timeFilter === 'custom') {
      if (!customStart || !customEnd) return true;
      return txDate >= new Date(customStart) && txDate <= new Date(customEnd);
    }
    return true;
  }

  const filteredData = (transactions || [])
    .filter((tx: any) => filter === 'all' || tx.type === filter)
    .filter(filterByTime);
    
  const grouped = groupByDate(filteredData);
  const totalFiltered = filteredData.reduce((acc: number, tx: any) => acc + (tx.type === 'expense' ? -tx.amount : tx.amount), 0);

  return (
    <div className="p-5 md:p-10 space-y-6 animate-in fade-in duration-500 pb-32 max-w-7xl mx-auto">
      <header className="pt-2">
        <h1 className="font-heading text-2xl font-bold  text-foreground">History</h1>
        <p className="text-xs text-muted-foreground  uppercase mt-0.5">Your complete transaction log</p>
      </header>

      {/* Primary Type Filters */}
      <div className="flex gap-2 p-1 bg-card rounded-2xl border border-border w-fit overflow-x-auto max-w-full">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase  transition-all ${filter === f
                ? f === 'income' ? 'bg-primary/10 text-primary'
                  : f === 'expense' ? 'bg-destructive/10 text-destructive'
                    : 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {f}
          </button>
        ))}
      </div>
      
      {/* Time Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'week', 'month', 'quarter', 'custom'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase  transition-all ${timeFilter === f ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground/70 border-border hover:bg-accent'}`}
          >
            {f === 'all' ? 'All Time' : f === 'week' ? 'Past 7 Days' : f === 'month' ? 'This Month' : f === 'quarter' ? 'Past 3 Months' : 'Custom'}
          </button>
        ))}
      </div>
      
      {/* Custom Date Inputs */}
      {timeFilter === 'custom' && (
        <div className="flex items-center gap-3 p-3 bg-accent rounded-xl animate-in fade-in duration-300">
           <div className="flex-1">
             <label className="text-[10px] uppercase  text-muted-foreground mb-1 block">Start Date</label>
             <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-card rounded-lg border-border text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary" />
           </div>
           <div className="flex-1">
             <label className="text-[10px] uppercase  text-muted-foreground mb-1 block">End Date</label>
             <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-card rounded-lg border-border text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary" />
           </div>
        </div>
      )}

      {/* Summary strip */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-card rounded-2xl border border-border">
          <span className="text-xs text-muted-foreground">{filteredData.length} transactions</span>
          <span className={`font-heading font-bold text-sm ${totalFiltered >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {totalFiltered >= 0 ? '+' : ''}₹{Math.abs(totalFiltered).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Grouped Transactions */}
      {filteredData.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <SearchX className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <p className="text-[11px] font-bold uppercase  text-muted-foreground mb-2 px-1">{date}</p>
              <div className="space-y-2">
                {txs.map((tx: any) => (
                  <div key={tx._id} className="flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-accent/40 transition-colors border border-border group py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
                        style={{
                          backgroundColor: `${tx.category?.color || '#888'}20`,
                          borderColor: `${tx.category?.color || '#888'}40`,
                          color: tx.category?.color || '#888'
                        }}
                      >
                        <span className="material-symbols-outlined text-[20px]">{tx.category?.icon || 'wallet'}</span>
                      </div>
                      <div className="overflow-hidden pr-2">
                        <h4 className="font-semibold text-sm text-foreground leading-tight truncate">{tx.description || tx.category?.name || "Unknown"}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate flex-wrap">
                          <span>{tx.category?.name}</span>
                          {tx.location?.address && (
                             <>
                               <span className="w-1 h-1 rounded-full bg-border" />
                               <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/> {tx.location.address}</span>
                             </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <p className={`font-bold font-heading text-sm ${tx.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                          {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <div className={`flex items-center gap-0.5 mt-0.5`}>
                          {tx.type === 'income'
                            ? <ArrowDownRight className="w-3 h-3 text-primary" />
                            : <ArrowUpRight className="w-3 h-3 text-destructive" />}
                          <span className="text-[10px] text-muted-foreground capitalize">{tx.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-accent/50 md:bg-accent rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 mt-1 md:mt-0">
                         <button
                            onClick={(e) => { e.preventDefault(); router.push(`/dashboard/edit/${tx._id}`); }}
                            className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card flex items-center justify-center transition-all bg-card/50 md:bg-transparent"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setDeleteConfirmId(tx._id);
                            }}
                            className="w-8 h-8 rounded-full text-muted-foreground flex items-center justify-center hover:bg-destructive hover:text-white transition-all bg-card/50 md:bg-transparent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-3xl p-6 border border-border shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-destructive/20">
               <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="font-heading font-bold text-center text-xl text-foreground mb-2">Delete Transaction?</h3>
            <p className="text-center text-sm text-muted-foreground mb-6">Are you sure you want to completely remove this record? This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-accent text-foreground hover:bg-accent/80 transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => { 
                  deleteMutation.mutate(deleteConfirmId, {
                    onSuccess: () => setDeleteConfirmId(null)
                  }); 
                }} 
                disabled={deleteMutation.isPending}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-destructive text-white hover:bg-destructive/90 shadow-[0_8px_16px_-4px_var(--tw-shadow-color)] [--tw-shadow-color:color-mix(in_srgb,var(--color-destructive)_40%,transparent)] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
