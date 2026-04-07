"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ReceiptText, Search, ArrowUpRight, ArrowDownLeft, Filter } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/admin/transactions");
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  return (
    <div className="max-w-6xl animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Global History <ReceiptText className="w-6 h-6 text-[#6bfe9c]" />
          </h1>
          <p className="text-zinc-400 mt-1">Every transaction recorded across the Lumina platform.</p>
        </div>

        <div className="flex items-center gap-3 bg-[#1f1f22] p-1.5 rounded-2xl border border-[#48474a]">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("income")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'income' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
          >
            Income
          </button>
          <button 
            onClick={() => setFilter("expense")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'expense' ? 'bg-[#6bfe9c] text-[#004a23]' : 'text-zinc-400 hover:text-white'}`}
          >
            Expense
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Scanning Platform Records...</div>
      ) : (
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] rounded-3xl overflow-hidden mb-10">
          <table className="w-full text-left">
            <thead className="bg-[#2c2c2f] text-[10px] uppercase text-zinc-400 tracking-wider">
              <tr>
                <th className="px-6 py-5 font-bold">User</th>
                <th className="px-6 py-5 font-bold">Category</th>
                <th className="px-6 py-5 font-bold">Description</th>
                <th className="px-6 py-5 font-bold">Date</th>
                <th className="px-6 py-5 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#48474a]/50">
              {filteredTransactions.map(t => (
                <tr key={t._id} className="hover:bg-[#252528] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-white font-semibold text-sm">{t.user?.name || 'Deleted User'}</span>
                        <span className="text-[10px] text-zinc-500">{t.user?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#131315] border border-[#48474a] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]" style={{ color: t.category?.color || '#6bfe9c' }}>
                                {t.category?.icon || 'receipt_long'}
                            </span>
                        </div>
                        <span className="text-zinc-300 text-sm">{t.category?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm italic">{t.description || "---"}</td>
                  <td className="px-6 py-4 text-zinc-500 text-xs font-medium">
                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold flex items-center gap-1 ${t.type === 'income' ? 'text-[#6bfe9c]' : 'text-red-400'}`}>
                            {t.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            ₹{t.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] uppercase text-zinc-600 font-bold">{t.paymentMode || 'UPI'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-20 text-zinc-600 italic text-sm">
                No matching transactions found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
