"use client";
import { useEffect, useState, use, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  ArrowLeft, User, Calendar, Receipt, TrendingUp, LayoutGrid, 
  ShieldAlert, ShieldCheck, Key, MapPin, XCircle, RefreshCw, 
  Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown 
} from "lucide-react";
import Link from "next/link";

export default function UserDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Paginated and filtered user transaction history state
  const [history, setHistory] = useState<any[]>([]);
  const [totalHistory, setTotalHistory] = useState(0);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyType, setHistoryType] = useState("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historySortBy, setHistorySortBy] = useState("date");
  const [historySortOrder, setHistorySortOrder] = useState("desc");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [exportingHistory, setExportingHistory] = useState(false);
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

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const queryParams = new URLSearchParams({
        userId: params.id,
        page: historyPage.toString(),
        limit: historyLimit.toString(),
        type: historyType,
        sortBy: historySortBy,
        sortOrder: historySortOrder,
        ...(historyStartDate && { startDate: historyStartDate }),
        ...(historyEndDate && { endDate: historyEndDate }),
      });
      const res = await apiFetch(`/admin/transactions?${queryParams.toString()}`);
      setHistory(res.transactions || []);
      setTotalHistory(res.total || 0);
      setHistoryPages(res.pages || 1);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [params.id, historyPage, historyLimit, historyType, historyStartDate, historyEndDate, historySortBy, historySortOrder]);

  const handleFilterChange = (updater: () => void) => {
    updater();
    setHistoryPage(1);
  };

  const handleSort = (field: string) => {
    if (historySortBy === field) {
      setHistorySortOrder(historySortOrder === "asc" ? "desc" : "asc");
    } else {
      setHistorySortBy(field);
      setHistorySortOrder("desc");
    }
    setHistoryPage(1);
  };

  const clearFilters = () => {
    setHistoryStartDate("");
    setHistoryEndDate("");
    setHistoryType("all");
    setHistorySortBy("date");
    setHistorySortOrder("desc");
    setHistoryPage(1);
  };

  const hasActiveFilters = historyStartDate || historyEndDate || historyType !== "all" || historySortBy !== "date" || historySortOrder !== "desc";

  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= historyPages; i++) {
      if (
        i === 1 ||
        i === historyPages ||
        (i >= historyPage - delta && i <= historyPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    return range;
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExportingHistory(true);
      const queryParams = new URLSearchParams({
        userId: params.id,
        page: "1",
        limit: totalHistory.toString(),
        type: historyType,
        sortBy: historySortBy,
        sortOrder: historySortOrder,
        ...(historyStartDate && { startDate: historyStartDate }),
        ...(historyEndDate && { endDate: historyEndDate }),
      });

      const res = await apiFetch(`/admin/transactions?${queryParams.toString()}`);
      const list = res.transactions || [];

      if (format === 'csv') {
        exportToCSV(list);
      } else {
        exportToExcel(list);
      }
    } catch (error) {
      console.error("Export failed", error);
      alert("Export failed: " + error);
    } finally {
      setExportingHistory(false);
    }
  };

  const exportToCSV = (list: any[]) => {
    const headers = ["Category", "Type", "Description", "Date", "Amount", "Location"];
    const rows = list.map(t => [
      t.category?.name || "Other",
      t.type,
      t.description || "",
      new Date(t.date).toLocaleDateString(),
      t.amount,
      t.location?.address || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `personal_history_${params.id}_${new Date().toISOString().slice(0,10)}.csv`);
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
  <Worksheet ss:Name="Personal History">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Category</Data></Cell>
        <Cell><Data ss:Type="String">Type</Data></Cell>
        <Cell><Data ss:Type="String">Description</Data></Cell>
        <Cell><Data ss:Type="String">Date</Data></Cell>
        <Cell><Data ss:Type="String">Amount</Data></Cell>
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
    link.setAttribute("download", `personal_history_${params.id}_${new Date().toISOString().slice(0,10)}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchUserData = () => {
    setLoading(true);
    apiFetch(`/admin/users/${params.id}/analytics`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUserData();
  }, [params.id]);

  const toggleSuspension = async () => {
    try {
      await apiFetch(`/admin/users/${params.id}/suspend`, { method: "PUT" });
      fetchUserData();
      alert("User status updated successfully");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const updatePlan = async (plan: string) => {
    try {
      await apiFetch(`/admin/users/${params.id}/plan`, { 
        method: "PUT",
        body: JSON.stringify({ plan })
      });
      fetchUserData();
      alert("User plan updated successfully");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const resetPassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) return alert("Password must be at least 6 characters");
    try {
      await apiFetch(`/admin/users/${params.id}/password`, { 
        method: "PUT",
        body: JSON.stringify({ newPassword })
      });
      alert("User password reset successfully");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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
    <div className="max-w-6xl animate-in fade-in zoom-in-95 duration-500">
      <Link href="/dashboard/users" className="text-zinc-500 hover:text-white flex items-center gap-2 mb-4 transition-colors text-sm group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Users
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${data.user?.isSuspended ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-[#6bfe9c]/10 border-[#6bfe9c]/20 text-[#6bfe9c]'} border flex items-center justify-center transition-all`}>
                {data.user?.isSuspended ? <ShieldAlert className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
                <p className="text-[#6bfe9c] text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5">Account Management</p>
                <h1 className="text-2xl font-black text-white tracking-tight">
                    {data.user?.name || `User: ${params.id.slice(-6)}`}
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 bg-[#131315] border border-[#48474a]/50 px-2 py-0.5 rounded-lg">
                        <span className={`w-1.5 h-1.5 rounded-full ${data.user?.isSuspended ? 'bg-red-500 animate-pulse' : 'bg-[#6bfe9c]'}`} />
                        <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">{data.user?.isSuspended ? 'Suspended' : 'Active'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${data.user?.plan === 'premium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {data.user?.plan} {data.user?.role === 'admin' ? '(Admin)' : ''}
                    </span>
                    <span className="text-zinc-600 font-bold text-xs">•</span>
                    <p className="text-zinc-400 text-xs font-medium">{data.user?.email}</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2.5 bg-[#131315] p-3 rounded-lg border border-[#48474a]">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-300">Data visualization for last 6 months</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
        <div className="lg:col-span-3 space-y-5">
            {/* Trend Chart */}
            <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-lg p-4.5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        Spending Trends <TrendingUp className="w-4 h-4 text-[#6bfe9c]" />
                    </h3>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2f" vertical={false} />
                            <XAxis 
                                dataKey="month" 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#131315', border: '1px solid #48474a', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '11px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                            <Bar dataKey="income" name="Income" fill="#6bfe9c" radius={[3, 3, 0, 0]} barSize={20} />
                            <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-lg p-4.5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                    Categories <LayoutGrid className="w-4 h-4 text-blue-400" />
                </h3>
                <div className="h-[250px] w-full flex flex-col items-center">
                    <ResponsiveContainer width="100%" height="70%">
                        <PieChart>
                            <Pie
                                data={data.categoryDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="total"
                            >
                                {data.categoryDistribution.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#131315', border: '1px solid #48474a', borderRadius: '8px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full mt-2 space-y-1.5 overflow-y-auto max-h-[70px] custom-scrollbar">
                        {data.categoryDistribution.map((cat: any, i: number) => (
                            <div key={cat.name} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }} />
                                    <span className="text-zinc-400">{cat.name}</span>
                                </div>
                                <span className="text-zinc-200 font-bold">₹{cat.total}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Sidebar Quick Actions */}
        <div className="space-y-4">
            <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-lg p-4 sticky top-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                    Quick Actions <ShieldCheck className="w-4 h-4 text-[#6bfe9c]" />
                </h3>

                <div className="space-y-4">
                    {/* Account Status */}
                    <div>
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1.5 block tracking-wider">Account Access</label>
                        <button 
                            onClick={toggleSuspension}
                            className={`w-full py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 border cursor-pointer ${data.user?.isSuspended ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'}`}
                        >
                            {data.user?.isSuspended ? (
                                <><ShieldCheck className="w-3.5 h-3.5" /> Activate User</>
                            ) : (
                                <><ShieldAlert className="w-3.5 h-3.5" /> Suspend User</>
                            )}
                        </button>
                        <p className="text-[9px] text-zinc-600 mt-1.5 text-center">
                            Suspended users are blocked from logging in.
                        </p>
                    </div>

                    {/* Plan Toggle */}
                    <div className="pt-4 border-t border-[#48474a]/30">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1.5 block tracking-wider">Subscription Plan</label>
                        <div className="flex gap-2 p-1 bg-[#131315] rounded-lg border border-[#48474a]">
                            <button 
                                onClick={() => updatePlan('free')}
                                className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${data.user?.plan === 'free' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-500 hover:text-white'}`}
                            >
                                FREE
                            </button>
                            <button 
                                onClick={() => updatePlan('premium')}
                                className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${data.user?.plan === 'premium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}
                            >
                                PREMIUM
                            </button>
                        </div>
                    </div>

                    {/* Password Reset */}
                    <div className="pt-4 border-t border-[#48474a]/30">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1.5 block tracking-wider">Forced Password Reset</label>
                        <div className="relative group">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 transition-colors group-focus-within:text-[#6bfe9c]" />
                            <input 
                                type="password" 
                                id="new_pass_input"
                                placeholder="New password" 
                                className="w-full bg-[#131315] border border-[#48474a] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                const input = document.getElementById('new_pass_input') as HTMLInputElement;
                                resetPassword(input.value);
                                input.value = '';
                            }}
                            className="w-full mt-2 bg-zinc-800 text-zinc-300 py-2 rounded-lg text-[9px] font-bold hover:bg-zinc-700 transition-colors border border-white/5 cursor-pointer"
                        >
                            UPDATE PASSWORD
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a] rounded-lg overflow-hidden mt-5">
        <div className="p-4 border-b border-[#48474a]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Personal History <Receipt className="w-4 h-4 text-zinc-500" />
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/25 transition-all cursor-pointer animate-in fade-in"
                >
                  <XCircle className="w-3 h-3" /> Clear Filters
                </button>
              )}

              {/* Export Dropdown */}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  disabled={exportingHistory || totalHistory === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-[#48474a]/50 rounded-lg text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {exportingHistory ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-[#6bfe9c]" /> Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 text-[#6bfe9c]" /> Export Data
                    </>
                  )}
                </button>
                {isExportDropdownOpen && (
                  <div className="absolute left-0 top-full pt-1.5 z-50 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="bg-[#131315] border border-[#48474a] rounded-lg shadow-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          handleExport('csv');
                          setIsExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        CSV format
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExport('excel');
                          setIsExportDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-[#6bfe9c]/10 hover:text-[#6bfe9c] transition-colors flex items-center gap-1.5 border-t border-[#48474a]/20 cursor-pointer"
                      >
                        Excel (.xls)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Type toggle */}
              <div className="flex items-center gap-1.5 bg-[#1f1f22] p-1 rounded-lg border border-[#48474a]">
                <button 
                  onClick={() => handleFilterChange(() => setHistoryType("all"))}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${historyType === 'all' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => handleFilterChange(() => setHistoryType("income"))}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${historyType === 'income' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
                >
                  Income
                </button>
                <button 
                  onClick={() => handleFilterChange(() => setHistoryType("expense"))}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${historyType === 'expense' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
                >
                  Expense
                </button>
              </div>

              <span className="text-[10px] text-zinc-500 font-bold bg-[#131315] border border-[#48474a] px-2.5 py-1.5 rounded-lg">{totalHistory} Transactions Found</span>
            </div>
        </div>

        {/* Date Filters Block */}
        <div className="p-4 bg-[#252528]/20 border-b border-[#48474a]/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1 block tracking-wider">From Date</label>
            <input
              type="date"
              value={historyStartDate}
              onChange={(e) => handleFilterChange(() => setHistoryStartDate(e.target.value))}
              className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1 block tracking-wider">To Date</label>
            <input
              type="date"
              value={historyEndDate}
              onChange={(e) => handleFilterChange(() => setHistoryEndDate(e.target.value))}
              className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
              <thead className="bg-[#2c2c2f]/50 text-[9px] uppercase text-zinc-400 tracking-wider select-none">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Category</th>
                  <th className="px-4 py-2.5 font-bold">Description</th>
                  <th 
                    className="px-4 py-2.5 font-bold cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {historySortBy === "date" ? (
                        historySortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#6bfe9c]" /> : <ArrowDown className="w-3 h-3 text-[#6bfe9c]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-2.5 font-bold text-center">Location</th>
                  <th 
                    className="px-4 py-2.5 font-bold text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount
                      {historySortBy === "amount" ? (
                        historySortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#6bfe9c]" /> : <ArrowDown className="w-3 h-3 text-[#6bfe9c]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#48474a]/30">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-zinc-500 animate-pulse text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6bfe9c]" />
                        Loading transactions...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-20 text-zinc-600 italic text-xs">
                        No transaction history found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    history.map((t: any) => (
                      <tr key={t._id} className="hover:bg-[#252528]/50 transition-colors">
                           <td className="px-4 py-1.5">
                              <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#131315] border border-[#48474a] flex items-center justify-center shrink-0">
                                      <span className="material-symbols-outlined text-[15px]" style={{ color: t.category?.color || '#6bfe9c' }}>
                                          {t.category?.icon || 'receipt_long'}
                                      </span>
                                  </div>
                                  <span className="text-zinc-300 text-xs font-medium">{t.category?.name}</span>
                              </div>
                          </td>
                          <td className="px-4 py-1.5 text-zinc-400 text-xs italic">{t.description || "---"}</td>
                          <td className="px-4 py-1.5 text-zinc-500 text-[11px]">
                              {new Date(t.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-1.5 text-center">
                              {t.location?.lat ? (
                                  <a 
                                      href={`https://www.google.com/maps?q=${t.location.lat},${t.location.lng}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-1 text-blue-400 hover:text-blue-300 transition-colors group"
                                  >
                                      <MapPin className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                      <span className="text-[9px] font-bold underline underline-offset-4 decoration-blue-400/30 truncate max-w-[80px]">
                                          {t.location.address || 'View Map'}
                                      </span>
                                  </a>
                              ) : (
                                  <span className="text-zinc-600 text-[9px]">---</span>
                              )}
                          </td>
                          <td className="px-4 py-1.5 text-right">
                               <span className={`text-xs font-bold ${t.type === 'income' ? 'text-[#6bfe9c]' : 'text-red-400'}`}>
                                  {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                              </span>
                          </td>
                      </tr>
                    ))
                  )}
              </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!loadingHistory && historyPages > 1 && (
          <div className="p-4 border-t border-[#48474a]/30 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1f1f22]/20">
            <div className="text-[10px] text-zinc-500 font-medium">
              Showing page <span className="text-zinc-300 font-bold">{historyPage}</span> of <span className="text-zinc-300 font-bold">{historyPages}</span> ({totalHistory} total transactions)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                className="p-1.5 bg-zinc-800 border border-[#48474a]/50 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationRange().map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-zinc-600 select-none">
                      ...
                    </span>
                  );
                }
                const isCurrent = historyPage === p;
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => setHistoryPage(Number(p))}
                    className={`min-w-[28px] h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isCurrent 
                        ? "bg-[#6bfe9c] text-[#004a23] shadow-md shadow-[#6bfe9c]/10" 
                        : "bg-zinc-800/40 text-zinc-400 border border-[#48474a]/40 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={historyPage === historyPages}
                onClick={() => setHistoryPage(p => Math.min(historyPages, p + 1))}
                className="p-1.5 bg-zinc-800 border border-[#48474a]/50 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
