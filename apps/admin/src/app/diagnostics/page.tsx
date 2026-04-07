"use client";
import { useState } from "react";

export default function DiagnosticsPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      const res = await fetch("https://wealth-expense-tracker.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const statusCode = res.status;
      setStatus(statusCode);
      
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({ error: err.message, stack: err.stack });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#6bfe9c] mb-2">Lumina Auth Diagnostics</h1>
        <p className="text-zinc-500 mb-8">Troubleshooting raw server output from Render API</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <form onSubmit={testLogin} className="space-y-6 bg-[#131315] p-8 rounded-3xl border border-[#48474a]">
              <div>
                <label className="text-xs uppercase text-zinc-400 font-bold mb-2 block">Diagnostic Email</label>
                <input
                  type="email"
                  className="w-full bg-[#1f1f22] border border-[#48474a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase text-zinc-400 font-bold mb-2 block">Diagnostic Password</label>
                <input
                  type="password"
                  className="w-full bg-[#1f1f22] border border-[#48474a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6bfe9c] text-[#004a23] font-bold py-3 rounded-xl hover:bg-[#6bfe9c]/90 disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? "FETCHING DUMP..." : "TRIGGER DIAGNOSTIC LOGIN"}
              </button>
            </form>
          </div>

          {/* Results Dump */}
          <div className="space-y-6">
             <div className="bg-[#131315] rounded-3xl border border-[#48474a] overflow-hidden">
                <div className="bg-[#1f1f22] px-6 py-4 border-b border-[#48474a] flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-zinc-400">HTTP Response Status</span>
                    {status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${status === 200 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                            {status} {status === 200 ? 'OK' : status === 401 ? 'Unauthorized' : 'Error'}
                        </span>
                    )}
                </div>
                <div className="p-6">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed text-zinc-300 h-[300px]">
                        {response ? JSON.stringify(response, null, 2) : "// Awaiting input..."}
                    </pre>
                </div>
             </div>

             {response?.role && (
                 <div className={`p-4 rounded-2xl border ${response.role === 'admin' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <p className="text-xs uppercase font-bold text-zinc-500">Detected Role On Server</p>
                    <p className={`text-xl font-bold mt-1 ${response.role === 'admin' ? 'text-[#6bfe9c]' : 'text-red-400'}`}>
                        {response.role.toUpperCase()}
                    </p>
                    {response.role !== 'admin' && (
                        <p className="text-[10px] text-zinc-600 mt-2">
                           Warning: This account does not have admin permissions. Check MongoDB Atlas again.
                        </p>
                    )}
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
