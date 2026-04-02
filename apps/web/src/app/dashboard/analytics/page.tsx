'use client';

import { useQuery } from "@tanstack/react-query";
import { Loader2, PieChart as PieChartIcon, TrendingUp, TrendingDown, Calendar, Wallet, MapPin, Target } from "lucide-react";
import api from "@/lib/api";
import { useState, useEffect } from "react";
import { formatDateIST, IST_TIMEZONE } from "@/lib/dateUtils";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area 
} from "recharts";
import HorizontalDateSelector from "@/components/HorizontalDateSelector";

export default function AnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'exact_date'>('all');
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await api.get('/transactions');
      return response.data;
    }
  });

  if (isLoading || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase ">crunching numbers…</p>
      </div>
    );
  }

  // Formatting Date purely for grouping lines
  const formatDateForGroup = (dateStr: string) => {
    return formatDateIST(dateStr, { day: 'numeric', month: 'short' });
  };

  // Time Filtering in IST
  const filterByTime = (tx: any) => {
    if (timeFilter === 'all') return true;
    
    // Get transaction date in IST midnight for comparison
    const txDate = new Date(tx.date);
    const txISTString = txDate.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
    const txISTDate = new Date(txISTString);
    
    if (timeFilter === 'exact_date') {
       const selISTString = selectedDate.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
       return txISTString === selISTString;
    }

    const nowISTString = new Date().toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
    const nowISTDate = new Date(nowISTString);
    
    if (timeFilter === 'week') {
      const weekAgo = new Date(nowISTDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txISTDate >= weekAgo;
    }
    if (timeFilter === 'month') {
       const currentMonth = nowISTDate.getMonth();
       const currentYear = nowISTDate.getFullYear();
       return txISTDate.getMonth() === currentMonth && txISTDate.getFullYear() === currentYear;
    }
    if (timeFilter === 'quarter') {
      const quarterAgo = new Date(nowISTDate);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return txISTDate >= quarterAgo;
    }
    if (timeFilter === 'year') {
      return txISTDate.getFullYear() === nowISTDate.getFullYear();
    }
    if (timeFilter === 'custom') {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      return txISTDate >= start && txISTDate <= end;
    }
    return true;
  }

  const filteredData = (transactions || []).filter(filterByTime);
  
  // Computations
  let totalIncome = 0;
  let totalExpense = 0;
  
  const categoryExpenses: Record<string, { value: number, color: string }> = {};
  const timelineDataMap: Record<string, { name: string, income: number, expense: number, dateMs: number }> = {};
  const locationsMap: Record<string, number> = {};

  filteredData.forEach((tx: any) => {
    const amt = tx.amount;
    const dateLabel = formatDateForGroup(tx.date);
    const dateMs = new Date(tx.date).getTime();

    if (!timelineDataMap[dateLabel]) {
      timelineDataMap[dateLabel] = { name: dateLabel, income: 0, expense: 0, dateMs };
    }

    if (tx.type === 'income') {
      totalIncome += amt;
      timelineDataMap[dateLabel].income += amt;
    } else {
      totalExpense += amt;
      timelineDataMap[dateLabel].expense += amt;
      
      // Category aggregation
      const catName = tx.category?.name || 'Other';
      const catColor = tx.category?.color || '#ff716c';
      if (!categoryExpenses[catName]) categoryExpenses[catName] = { value: 0, color: catColor };
      categoryExpenses[catName].value += amt;

      // Location aggregation
      if (tx.location && tx.location.address) {
        const loc = tx.location.address.split(',')[0]; // simplify long addresses
        locationsMap[loc] = (locationsMap[loc] || 0) + amt;
      }
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

  const pieData = Object.keys(categoryExpenses).map(key => ({
    name: key, value: categoryExpenses[key].value, color: categoryExpenses[key].color
  })).sort((a,b) => b.value - a.value);

  const timelineData = Object.values(timelineDataMap).sort((a, b) => a.dateMs - b.dateMs);
  
  const topLocations = Object.keys(locationsMap)
    .map(key => ({ name: key, amount: locationsMap[key] }))
    .sort((a,b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="px-4 py-3 md:p-8 space-y-4 animate-in fade-in duration-500 pb-32 overflow-hidden max-w-7xl mx-auto">
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-heading text-2xl font-bold  text-foreground">Analytics</h1>
          <p className="text-xs text-muted-foreground  uppercase mt-0.5">Deep financial intelligence</p>
        </div>
        <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center border border-border shadow-sm">
          <PieChartIcon className="text-primary w-6 h-6" />
        </div>
      </header>

      {/* Time Filters Secondary Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
        {(['all', 'week', 'month', 'year', 'custom'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase transition-all shrink-0 ${timeFilter === f ? 'bg-primary/20 text-primary border-primary/30' : 'bg-card text-muted-foreground/70 border-border hover:bg-accent'}`}
          >
            {f === 'all' ? 'All Time' : f === 'week' ? 'Past 7 Days' : f === 'month' ? 'This Month' : f === 'year' ? 'This Year' : 'Custom'}
          </button>
        ))}
      </div>

      {/* Modern Date Selection (Standardized) - Always Visible */}
      <section className="animate-in slide-in-from-top-2 fade-in duration-700">
         <HorizontalDateSelector 
          selectedDate={selectedDate} 
          onDateChange={(d) => {
            setSelectedDate(d);
            setTimeFilter('exact_date');
          }} 
         />
      </section>
      
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-center">
          <p className="text-[10px] uppercase  text-muted-foreground font-bold mb-1 flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-primary"/> Income</p>
          <h3 className="font-heading text-lg font-bold text-foreground">₹{totalIncome.toLocaleString('en-IN')}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-center">
          <p className="text-[10px] uppercase  text-muted-foreground font-bold mb-1 flex items-center gap-1.5"><TrendingDown className="w-3 h-3 text-destructive"/> Expense</p>
          <h3 className="font-heading text-lg font-bold text-foreground">₹{totalExpense.toLocaleString('en-IN')}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-center">
          <p className="text-[10px] uppercase  text-muted-foreground font-bold mb-1 flex items-center gap-1.5"><Wallet className="w-3 h-3 text-emerald-400"/> Net</p>
          <h3 className={`font-heading text-lg font-bold ${netSavings >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>₹{netSavings.toLocaleString('en-IN')}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-5"><Target className="w-24 h-24"/></div>
          <p className="text-[10px] uppercase  text-muted-foreground font-bold mb-1">Savings Rate</p>
          <h3 className="font-heading text-lg font-bold text-foreground">{savingsRate}%</h3>
        </div>
      </div>

      {/* Cash Flow Timeline */}
      {timelineData.length > 0 && (
         <section className="w-full rounded-3xl p-5 bg-card/50 border border-border">
          <h3 className="font-heading text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary"/> Cash Flow Trend</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#acaaad" tick={{ fill: '#acaaad', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis stroke="#acaaad" tick={{ fill: '#acaaad', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 12 }} />
                <Area type="monotone" dataKey="income" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="var(--color-destructive)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <section className="w-full rounded-3xl p-5 bg-card border border-border">
          <h3 className="font-heading text-sm font-bold text-foreground mb-2 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-primary"/> Spending by Category</h3>
          <div className="h-56 w-full relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']} contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs uppercase ">No expenses</div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 mt-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-foreground truncate">{entry.name}</span>
                <span className="text-xs font-bold font-mono ml-auto">₹{entry.value.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Spending Locations */}
        {topLocations.length > 0 && (
          <section className="w-full rounded-3xl p-5 bg-card border border-border">
            <h3 className="font-heading text-sm font-bold text-foreground mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary"/> Top Spending Locations</h3>
            <div className="space-y-4 pt-2">
              {topLocations.map((loc, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-foreground truncate max-w-[70%]">{loc.name}</span>
                    <span className="text-[11px] font-bold text-muted-foreground font-mono">₹{loc.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                  </div>
                  <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                     <div className="h-full bg-destructive/60 rounded-full" style={{ width: `${(loc.amount / topLocations[0].amount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

    </div>
  );
}
