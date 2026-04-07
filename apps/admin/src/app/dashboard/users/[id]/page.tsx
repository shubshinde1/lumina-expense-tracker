"use client";
import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from "recharts";
import { ArrowLeft, User, Calendar, Receipt, TrendingUp, TrendingDown, LayoutGrid } from "lucide-react";
import Link from "next/link";

export default function UserDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/admin/users/${params.id}/analytics`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-zinc-500 py-20 text-center animate-pulse">Analyzing User Data...</div>;
  if (!data) return <div className="text-zinc-500 py-20 text-center">User data not found.</div>;

  // Format monthly stats for chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = data.monthlyTrends.reduce((acc: any[], curr: any) => {
    const monthName = months[curr._id.month - 1];
    let existing = acc.find(a => a.month === monthName);
    if (!existing) {
      existing = { month: monthName, income: 0, expense: 0 };
      acc.push(existing);
    }
    if (curr._id.type === 'income') existing.income = curr.total;
    if (curr._id.type === 'expense') existing.expense = curr.total;
    return acc;
  }, []);

  const COLORS = ['#6bfe9c', '#3b82f6', '#f43f5e', '#a855f7', '#eab308', '#06b6d4'];

  return (
    <div className="max-w-6xl animate-in fade-in zoom-in-95 duration-500 pb-20">
      <Link href="/dashboard/users" className="text-zinc-500 hover:text-white flex items-center gap-2 mb-8 transition-colors text-sm group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Users
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-[#6bfe9c]/10 border border-[#6bfe9c]/20 flex items-center justify-center text-[#6bfe9c]">
                <User className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">User Analytics</h1>
                <p className="text-zinc-400 font-medium">Platform Profile Overiew</p>
            </div>
        </div>
        <div className="flex items-center gap-3 bg-[#131315] p-4 rounded-2xl border border-[#48474a]">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-300">Data visualization for last 6 months</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Spending Trends <TrendingUp className="w-4 h-4 text-[#6bfe9c]" />
                </h3>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2f" vertical={false} />
                        <XAxis 
                            dataKey="month" 
                            stroke="#71717a" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <YAxis 
                            stroke="#71717a" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#131315', border: '1px solid #48474a', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="income" name="Income" fill="#6bfe9c" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-3xl p-8">
             <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                Categories <LayoutGrid className="w-4 h-4 text-blue-400" />
            </h3>
            <div className="h-[300px] w-full flex flex-col items-center">
                <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                        <Pie
                            data={data.categoryDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="total"
                        >
                            {data.categoryDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                             contentStyle={{ backgroundColor: '#131315', border: '1px solid #48474a', borderRadius: '12px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="w-full mt-4 space-y-2 overflow-y-auto max-h-[80px] custom-scrollbar">
                    {data.categoryDistribution.map((cat: any, i: number) => (
                        <div key={cat.name} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }} />
                                <span className="text-zinc-400">{cat.name}</span>
                            </div>
                            <span className="text-zinc-200 font-bold">₹{cat.total}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-[#48474a]/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Personal History <Receipt className="w-4 h-4 text-zinc-500" />
            </h3>
            <span className="text-xs text-zinc-500 font-medium">{data.history.length} Transactions Found</span>
        </div>
        <table className="w-full text-left">
            <thead className="bg-[#2c2c2f]/50 text-[10px] uppercase text-zinc-400 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Description</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#48474a]/30">
                {data.history.map((t: any) => (
                    <tr key={t._id} className="hover:bg-[#252528]/50 transition-colors">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#131315] border border-[#48474a] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[16px]" style={{ color: t.category?.color || '#6bfe9c' }}>
                                        {t.category?.icon || 'receipt_long'}
                                    </span>
                                </div>
                                <span className="text-zinc-300 text-xs font-semibold">{t.category?.name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-xs italic">{t.description || "---"}</td>
                        <td className="px-6 py-4 text-zinc-500 text-[11px]">
                            {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                             <span className={`text-xs font-bold ${t.type === 'income' ? 'text-[#6bfe9c]' : 'text-red-400'}`}>
                                {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {data.history.length === 0 && (
            <div className="text-center py-20 text-zinc-600 italic text-sm">
                No transaction history for this user.
            </div>
        )}
      </div>
    </div>
  );
}
