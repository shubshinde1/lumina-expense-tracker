"use client";
import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import {
  ReceiptText,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  RefreshCw,
  Download
} from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter and pagination state
  const [selectedUser, setSelectedUser] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
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

  // Fetch all users once for dropdown selection filter
  useEffect(() => {
    apiFetch("/admin/users")
      .then((data) => setUsers(data || []))
      .catch(console.error);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // Reset input text to selected user if chosen, else clear it
        if (selectedUser) {
          const u = users.find(x => x._id === selectedUser);
          if (u) {
            setUserSearch(`${u.name} (${u.email})`);
          }
        } else {
          setUserSearch("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedUser, users]);

  // Fetch transactions based on filter state
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type,
        sortBy,
        sortOrder,
        ...(selectedUser && { userId: selectedUser }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const data = await apiFetch(`/admin/transactions?${queryParams.toString()}`);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, limit, type, selectedUser, startDate, endDate, sortBy, sortOrder]);

  const handleFilterChange = (updater: () => void) => {
    updater();
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const hasActiveFilters = selectedUser || startDate || endDate || type !== "all" || sortBy !== "date" || sortOrder !== "desc";

  const clearFilters = () => {
    setSelectedUser("");
    setUserSearch("");
    setIsDropdownOpen(false);
    setStartDate("");
    setEndDate("");
    setType("all");
    setSortBy("date");
    setSortOrder("desc");
    setPage(1);
  };

  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= pages; i++) {
      if (
        i === 1 ||
        i === pages ||
        (i >= page - delta && i <= page + delta)
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
      setExporting(true);
      // Fetch all records matching the current filters
      const queryParams = new URLSearchParams({
        page: "1",
        limit: total.toString(), // Fetch everything matching query
        sortBy,
        sortOrder,
      });

      if (selectedUser) queryParams.append("userId", selectedUser);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (type !== "all") queryParams.append("type", type);

      const data = await apiFetch(`/admin/transactions?${queryParams.toString()}`);
      const list = data.transactions || [];

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
    const headers = ["User Name", "User Email", "Category", "Type", "Description", "Date", "Amount", "Payment Mode"];
    const rows = list.map(t => [
      t.user?.name || "Deleted User",
      t.user?.email || "N/A",
      t.category?.name || "Other",
      t.type,
      t.description || "",
      new Date(t.date).toLocaleDateString(),
      t.amount,
      t.paymentMode || "UPI"
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (list: any[]) => {
    const rowsXML = list.map(t => `
      <Row>
        <Cell><Data ss:Type="String">${escapeXml(t.user?.name || "Deleted User")}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.user?.email || "N/A")}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.category?.name || "Other")}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.type)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.description || "")}</Data></Cell>
        <Cell><Data ss:Type="String">${new Date(t.date).toLocaleDateString()}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.paymentMode || "UPI")}</Data></Cell>
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
        <Cell><Data ss:Type="String">User Name</Data></Cell>
        <Cell><Data ss:Type="String">User Email</Data></Cell>
        <Cell><Data ss:Type="String">Category</Data></Cell>
        <Cell><Data ss:Type="String">Type</Data></Cell>
        <Cell><Data ss:Type="String">Description</Data></Cell>
        <Cell><Data ss:Type="String">Date</Data></Cell>
        <Cell><Data ss:Type="String">Amount</Data></Cell>
        <Cell><Data ss:Type="String">Payment Mode</Data></Cell>
      </Row>
      ${rowsXML}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_export_${new Date().toISOString().slice(0, 10)}.xls`);
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

  return (
    <div className="max-w-6xl animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            Global History <ReceiptText className="w-5.5 h-5.5 text-[#6bfe9c]" />
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Every transaction recorded across the Wealthy platform.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
            >
              <XCircle className="w-3 h-3" /> Clear Filters
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={exporting || total === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-[#48474a]/50 rounded-lg text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {exporting ? (
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

          <div className="flex items-center gap-2 bg-[#1f1f22] p-1 rounded-lg border border-[#48474a]">
            <button
              onClick={() => handleFilterChange(() => setType("all"))}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${type === 'all' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange(() => setType("income"))}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${type === 'income' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
            >
              Income
            </button>
            <button
              onClick={() => handleFilterChange(() => setType("expense"))}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${type === 'expense' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
            >
              Expense
            </button>
          </div>
        </div>
      </header>

      {/* Advanced Filters Block */}
      <div className="bg-[#1f1f22]/40 backdrop-blur-xl border border-[#48474a]/60 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end relative z-20">
        {/* User selection filter (Autocomplete Combobox) */}
        <div className="relative font-sans" ref={dropdownRef}>
          <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">User Account</label>
          <div className="relative group">
            <input
              type="text"
              placeholder="Search or select user..."
              value={userSearch}
              onChange={(e) => {
                const val = e.target.value;
                setUserSearch(val);
                setIsDropdownOpen(true);
                if (!val) {
                  handleFilterChange(() => setSelectedUser(""));
                }
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full bg-[#131315] border border-[#48474a] rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors placeholder:text-zinc-600"
            />
            {selectedUser ? (
              <button
                type="button"
                onClick={() => {
                  setUserSearch("");
                  handleFilterChange(() => setSelectedUser(""));
                  setIsDropdownOpen(false);
                }}
                className="absolute right-7 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-3 h-3" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-[#131315] border border-[#48474a] rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {(() => {
                const filteredUsers = users.filter(u =>
                  u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.email.toLowerCase().includes(userSearch.toLowerCase())
                );
                if (filteredUsers.length === 0) {
                  return <div className="p-4 text-xs text-zinc-500 text-center italic">No matching users</div>;
                }
                return (
                  <>
                    {userSearch === "" && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch("");
                          handleFilterChange(() => setSelectedUser(""));
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs transition-colors hover:bg-[#6bfe9c]/10 hover:text-[#6bfe9c] border-b border-[#48474a]/20 cursor-pointer ${!selectedUser ? "bg-[#6bfe9c]/10 text-[#6bfe9c] font-bold" : "text-zinc-400"
                          }`}
                      >
                        All Users
                      </button>
                    )}
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUser === u._id;
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            setUserSearch(`${u.name} (${u.email})`);
                            handleFilterChange(() => setSelectedUser(u._id));
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-xs transition-colors hover:bg-[#6bfe9c]/10 hover:text-[#6bfe9c] border-b border-[#48474a]/20 flex flex-col gap-0.5 cursor-pointer ${isSelected ? "bg-[#6bfe9c]/10 text-[#6bfe9c] font-bold" : "text-zinc-400"
                            }`}
                        >
                          <span className={`${isSelected ? "text-[#6bfe9c]" : "text-white"}`}>{u.name}</span>
                          <span className="text-[10px] text-zinc-500">{u.email}</span>
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Start Date filter */}
        <div>
          <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleFilterChange(() => setStartDate(e.target.value))}
            className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
          />
        </div>

        {/* End Date filter */}
        <div>
          <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleFilterChange(() => setEndDate(e.target.value))}
            className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
          />
        </div>

        {/* Limit Selection */}
        <div>
          <label className="text-[9px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">Show Rows</label>
          <select
            value={limit}
            onChange={(e) => handleFilterChange(() => setLimit(parseInt(e.target.value)))}
            className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#6bfe9c]" /> Scanning Platform Records...
        </div>
      ) : (
        <>
          <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] rounded-lg overflow-hidden mb-4 shadow-2xl">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left min-w-[750px]">
                <thead className="bg-[#2c2c2f] text-[9px] uppercase text-zinc-400 tracking-wider sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-4 py-2 font-bold">User</th>
                    <th className="px-4 py-2 font-bold">Category</th>
                    <th className="px-4 py-2 font-bold">Description</th>
                    <th
                      className="px-4 py-2 font-bold cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortBy === "date" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#6bfe9c]" /> : <ArrowDown className="w-3 h-3 text-[#6bfe9c]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-zinc-500" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-2 font-bold cursor-pointer hover:text-white transition-colors text-right"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Amount
                        {sortBy === "amount" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#6bfe9c]" /> : <ArrowDown className="w-3 h-3 text-[#6bfe9c]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-zinc-500" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#48474a]/40">
                  {transactions.map(t => (
                    <tr key={t._id} className="hover:bg-[#252528] transition-colors group">
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold text-xs">{t.user?.name || 'Deleted User'}</span>
                          <span className="text-[9px] text-zinc-500 mt-0.5">{t.user?.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#131315] border border-[#48474a] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[15px]" style={{ color: t.category?.color || '#6bfe9c' }}>
                              {t.category?.icon || 'receipt_long'}
                            </span>
                          </div>
                          <span className="text-zinc-300 text-xs font-medium">{t.category?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs italic">{t.description || "---"}</td>
                      <td className="px-4 py-2 text-zinc-500 text-[11px] font-medium">
                        {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-bold flex items-center gap-1 ${t.type === 'income' ? 'text-[#6bfe9c]' : 'text-red-400'}`}>
                            {t.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            ₹{t.amount.toLocaleString()}
                          </span>
                          <span className="text-[9px] uppercase text-zinc-600 font-bold mt-0.5">{t.paymentMode || 'UPI'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length === 0 && (
              <div className="text-center py-20 text-zinc-600 italic text-sm">
                No matching transactions found.
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 pb-8">
              <div className="text-xs text-zinc-500">
                Showing <span className="font-bold text-zinc-300">{Math.min((page - 1) * limit + 1, total)}</span> to{" "}
                <span className="font-bold text-zinc-300">{Math.min(page * limit, total)}</span> of{" "}
                <span className="font-bold text-[#6bfe9c]">{total}</span> transactions
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-lg bg-[#1f1f22] border border-[#48474a] text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-[#1f1f22] disabled:hover:text-zinc-400 flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {getPaginationRange().map((p, idx) => {
                  if (p === "...") {
                    return (
                      <span key={`dots-${idx}`} className="text-zinc-600 px-1 text-xs">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-10 h-10 rounded-lg font-bold text-xs transition-all cursor-pointer ${page === p
                          ? "bg-[#6bfe9c] text-[#004a23] shadow-md shadow-[#6bfe9c]/10"
                          : "bg-[#1f1f22] border border-[#48474a] text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(p + 1, pages))}
                  disabled={page === pages}
                  className="w-10 h-10 rounded-lg bg-[#1f1f22] border border-[#48474a] text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-[#1f1f22] disabled:hover:text-zinc-400 flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
