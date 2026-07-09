'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Edit2, ArrowDownRight, ArrowUpRight, SearchX, MapPin, Banknote, QrCode, Building2, CreditCard, RotateCcw, Search, X, Download } from "lucide-react";
import api from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useThemeStore } from "@/stores/useThemeStore";
import { formatDateIST, formatTimeIST, getTodayIST, getYesterdayIST, isSameDayIST, getStartOfMonthIST } from "@/lib/dateUtils";
import HorizontalDateSelector from "@/components/HorizontalDateSelector";

function groupByDate(transactions: any[]) {
  const groupsMap = new Map<string, any[]>();
  
  // Purely sort descending (newest first completely)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const todayStr = getTodayIST();
  const yesterdayStr = getYesterdayIST();

  sortedTransactions.forEach((tx) => {
    // Simpler way:
    const txGroupDate = new Date(tx.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    let label: string;
    if (txGroupDate === todayStr) label = 'Today';
    else if (txGroupDate === yesterdayStr) label = 'Yesterday';
    else label = formatDateIST(tx.date, { day: 'numeric', month: 'long', year: 'numeric' });

    if (!groupsMap.has(label)) groupsMap.set(label, []);
    groupsMap.get(label)!.push(tx);
  });
  
  return Array.from(groupsMap.entries()).map(([dateLabel, txs]) => ({ dateLabel, txs }));
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'custom' | 'exact_date'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Infinite Scroll & Pagination States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search input debouncer
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTransactions = async (pageNum: number, isReset: boolean) => {
    try {
      if (isReset) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params: any = {
        page: pageNum.toString(),
        limit: "15",
      };

      if (filter !== "all") {
        params.type = filter;
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const now = new Date();
      if (timeFilter === 'week') {
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        params.startDate = weekAgo.toISOString();
      } else if (timeFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = startOfMonth.toISOString();
      } else if (timeFilter === 'quarter') {
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        params.startDate = quarterAgo.toISOString();
      } else if (timeFilter === 'custom') {
        if (customStart) params.startDate = new Date(customStart).toISOString();
        if (customEnd) params.endDate = new Date(customEnd).toISOString();
      } else if (timeFilter === 'exact_date') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.startDate = startOfDay.toISOString();
        params.endDate = endOfDay.toISOString();
      }

      const queryString = new URLSearchParams(params).toString();
      const res = await api.get(`/transactions?${queryString}`);

      const newTxs = res.data.transactions || [];
      const pages = res.data.pages || 1;
      const total = res.data.total || 0;
      const balance = res.data.totalBalance || 0;

      if (isReset) {
        setTransactions(newTxs);
        setPage(1);
      } else {
        setTransactions(prev => [...prev, ...newTxs]);
      }

      setTotalPages(pages);
      setTotalCount(total);
      setTotalBalance(balance);
      setHasMore(pageNum < pages);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  // Reset page and list on filter changes
  useEffect(() => {
    fetchTransactions(1, true);
  }, [filter, timeFilter, selectedDate, customStart, customEnd, debouncedSearch]);

  // Load next pages on page increment
  useEffect(() => {
    if (page > 1) {
      fetchTransactions(page, false);
    }
  }, [page]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      if (!target) return;

      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      if (target instanceof Document) {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      } else {
        scrollTop = target.scrollTop;
        scrollHeight = target.scrollHeight;
        clientHeight = target.clientHeight;
      }

      if (
        scrollHeight - scrollTop - clientHeight <= 120 &&
        !loadingMore &&
        hasMore &&
        !isLoading
      ) {
        setPage(p => p + 1);
      }
    };
    window.addEventListener("scroll", handleScroll, { capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [loadingMore, hasMore, isLoading]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      fetchTransactions(1, true);
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    }
  });

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      const params: any = {};
      if (filter !== "all") params.type = filter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const now = new Date();
      if (timeFilter === 'week') {
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        params.startDate = weekAgo.toISOString();
      } else if (timeFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = startOfMonth.toISOString();
      } else if (timeFilter === 'quarter') {
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        params.startDate = quarterAgo.toISOString();
      } else if (timeFilter === 'custom') {
        if (customStart) params.startDate = new Date(customStart).toISOString();
        if (customEnd) params.endDate = new Date(customEnd).toISOString();
      } else if (timeFilter === 'exact_date') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.startDate = startOfDay.toISOString();
        params.endDate = endOfDay.toISOString();
      }

      const queryString = new URLSearchParams(params).toString();
      const res = await api.get(`/transactions?${queryString}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.transactions || []);

      if (format === 'csv') {
        exportToCSV(list);
      } else {
        exportToExcel(list);
      }
    } catch (error) {
      console.error("Export failed", error);
      alert("Export failed: " + error);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (list: any[]) => {
    const headers = ["Category", "Type", "Description", "Date", "Amount", "Payment Mode", "Location"];
    const rows = list.map(t => [
      t.category?.name || "Other",
      t.type,
      t.description || "",
      new Date(t.date).toLocaleDateString(),
      t.amount,
      t.paymentMode || "UPI",
      t.location?.address || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wealthy_history_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const exportToExcel = (list: any[]) => {
    const rowsXML = list.map(t => `
      <Row>
        <Cell><Data ss:Type="String">${escapeXml(t.category?.name || "Other")}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.type)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.description || "")}</Data></Cell>
        <Cell><Data ss:Type="String">${new Date(t.date).toLocaleDateString()}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.paymentMode || "UPI")}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.location?.address || "")}</Data></Cell>
      </Row>
    `).join("");

    const xmlTemplate = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="Transactions">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Category</Data></Cell>
        <Cell><Data ss:Type="String">Type</Data></Cell>
        <Cell><Data ss:Type="String">Description</Data></Cell>
        <Cell><Data ss:Type="String">Date</Data></Cell>
        <Cell><Data ss:Type="String">Amount</Data></Cell>
        <Cell><Data ss:Type="String">Payment Mode</Data></Cell>
        <Cell><Data ss:Type="String">Location</Data></Cell>
      </Row>
      ${rowsXML}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wealthy_history_${new Date().toISOString().slice(0,10)}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFilterChange = (updater: () => void) => {
    updater();
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase ">Fetching history…</p>
      </div>
    );
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="px-4 py-3 md:p-8 space-y-4 animate-in fade-in duration-500 pb-32 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">History</h1>
          <p className="text-[11px] text-muted-foreground uppercase mt-0.5 tracking-wider">Your complete transaction log</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:flex-none md:w-64">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <input 
              type="text" 
              placeholder="Search transactions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl h-[42px] pl-10 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center animate-in fade-in"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={exporting || transactions.length === 0}
              className="flex items-center gap-1.5 px-3.5 h-[42px] bg-card border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Exporting...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-primary" /> Export
                </>
              )}
            </button>
            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full pt-1.5 z-50 min-w-[125px] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="bg-[#131315] border border-border rounded-xl shadow-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      handleExport('csv');
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    CSV format
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExport('excel');
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1.5 border-t border-border/20 cursor-pointer font-medium"
                  >
                    Excel (.xls)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Primary Type Filters */}
      <div className="flex gap-1 p-1 bg-card rounded-2xl border border-border w-full">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filter === f
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
      <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
        {(['all', 'week', 'month', 'quarter', 'custom'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase transition-all shrink-0 ${timeFilter === f ? 'bg-primary/20 text-primary border-primary/30' : 'bg-card text-muted-foreground/70 border-border hover:bg-accent'}`}
          >
            {f === 'all' ? 'All Time' : f === 'week' ? 'Past 7 Days' : f === 'month' ? 'This Month' : f === 'quarter' ? 'Past 3 Months' : 'Custom'}
          </button>
        ))}
      </div>

      {/* Date Selector - Standards Cross-Page Component */}
      <div className="animate-in fade-in duration-300">
        <HorizontalDateSelector 
          selectedDate={selectedDate} 
          onDateChange={(d) => {
            setSelectedDate(d);
            setTimeFilter('exact_date');
          }} 
        />
      </div>
      
      {/* Custom Date Inputs */}
      {timeFilter === 'custom' && (
        <div className="flex items-center gap-3 p-3 bg-accent rounded-xl animate-in fade-in duration-300">
           <div className="flex-1">
             <label className="text-[10px] uppercase text-muted-foreground mb-1 block">Start Date</label>
             <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-card rounded-lg border-border text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary" />
           </div>
           <div className="flex-1">
             <label className="text-[10px] uppercase text-muted-foreground mb-1 block">End Date</label>
             <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-card rounded-lg border-border text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary" />
           </div>
        </div>
      )}

      {/* Summary strip */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-card rounded-2xl border border-border">
          <span className="text-xs text-muted-foreground">{totalCount} transactions</span>
          <span className={`font-heading font-bold text-sm ${totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {totalBalance >= 0 ? '+' : ''}₹{Math.abs(totalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Grouped Transactions */}
      {transactions.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <SearchX className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ dateLabel, txs }) => (
            <div key={dateLabel}>
              <p className="text-[11px] font-bold uppercase text-muted-foreground mb-2 px-1">{dateLabel}</p>
              <div className="space-y-2">
                {txs.map((tx: any) => {
                  const subCategoryName = tx.subcategory && tx.category?.subcategories 
                    ? tx.category.subcategories.find((s: any) => s._id === tx.subcategory)?.name 
                    : null;

                  return (
                    <SwipeableTxCard 
                      key={tx._id} 
                      tx={tx} 
                      subCategoryName={subCategoryName} 
                      onEdit={() => router.push(`/dashboard/edit?id=${tx._id}`)}
                      onDelete={() => setDeleteConfirmId(tx._id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {!hasMore && transactions.length > 0 && (
            <p className="text-[10px] text-center text-muted-foreground uppercase py-4">End of transaction history</p>
          )}
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

function SwipeableTxCard({ tx, subCategoryName, onEdit, onDelete }: any) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX - dragX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const dx = currentX - startX;
    
    if (dx > 0) setDragX(0);
    else if (dx < -140) setDragX(-140);
    else setDragX(dx);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragX < -70) {
      setDragX(-140);
    } else {
      setDragX(0); 
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (dragX === -140) {
      e.stopPropagation();
      setDragX(0);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden mb-3 md:mb-2 bg-card border border-border">
      <div className="absolute inset-y-0 right-0 flex md:hidden items-center justify-end w-[140px]" style={{ zIndex: 0 }}>
        <button 
          onClick={(e) => { e.preventDefault(); onEdit(); }} 
          className="h-full flex-1 flex flex-col items-center justify-center bg-primary/20 hover:bg-primary/30 text-primary transition-colors border-r border-border/10"
        >
           <Edit2 className="w-4 h-4 mb-1" />
           <span className="text-[10px] font-bold uppercase">Edit</span>
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); onDelete(); }} 
          className="h-full flex-1 flex flex-col items-center justify-center bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
        >
           <Trash2 className="w-4 h-4 mb-1" />
           <span className="text-[10px] font-bold uppercase">Delete</span>
        </button>
      </div>
      
      <div 
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${dragX}px) scale(${1 - Math.min(Math.abs(dragX) / 140, 1) * 0.10})`, transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        className="relative z-10 flex items-center justify-between p-4 rounded-2xl bg-card border border-transparent group hover:bg-accent/40 md:py-3 cursor-grab active:cursor-grabbing w-full"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 pointer-events-none md:pointer-events-auto">
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
          <div className="pr-2 flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground leading-tight truncate">{tx.description || tx.category?.name || "Unknown"}</h4>
            <div className="flex flex-col gap-0.5 mt-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate w-full">
                <span className="shrink-0">{tx.category?.name} {subCategoryName && <span className="opacity-70 font-medium tracking-tight">/ {subCategoryName}</span>}</span>
                <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                <span className="shrink-0 font-medium tracking-tight text-muted-foreground/80">{formatTimeIST(tx.date, { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              {tx.location?.address && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 truncate w-full">
                    <MapPin className="w-2.5 h-2.5 shrink-0"/> 
                    <span className="truncate">{tx.location.address}</span>
                  </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex items-center shrink-0 pointer-events-none md:pointer-events-auto h-full">
          <div className="flex flex-col items-end transform transition-transform duration-300 md:group-hover:-translate-x-[90px]">
            <p className={`font-bold font-heading text-sm ${tx.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
              {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            {(() => {
              const mode = tx.paymentMode || 'UPI';
              let colorClasses = "bg-indigo-500/10 text-indigo-500"; 
              let Icon = QrCode;
              if (mode === 'Cash') { colorClasses = "bg-emerald-500/10 text-emerald-500"; Icon = Banknote; }
              else if (mode === 'Net Banking') { colorClasses = "bg-blue-500/10 text-blue-500"; Icon = Building2; }
              else if (mode === 'Credit Card') { colorClasses = "bg-amber-500/10 text-amber-500"; Icon = CreditCard; }
              else if (mode === 'Debit Card') { colorClasses = "bg-orange-500/10 text-orange-500"; Icon = CreditCard; }

              return (
                <div className={`flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full ${colorClasses}`}>
                  <Icon className="w-[10px] h-[10px]" />
                  <span className="text-[9px] uppercase font-bold tracking-widest">{mode}</span>
                </div>
              );
            })()}
          </div>

          <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 items-center gap-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 z-10 pointer-events-none group-hover:pointer-events-auto">
              <button
                onClick={(e) => { e.preventDefault(); onEdit(); }}
                className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card flex items-center justify-center transition-all bg-transparent"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); onDelete(); }}
                className="w-8 h-8 rounded-full text-muted-foreground flex items-center justify-center hover:bg-destructive hover:text-white transition-all bg-transparent"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
