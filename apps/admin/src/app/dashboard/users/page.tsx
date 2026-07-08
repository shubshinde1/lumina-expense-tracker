"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Trash2, UserCog, CheckCircle, BarChart3, Clock, Users, Search } from "lucide-react";
import Link from "next/link";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/admin/users");
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      await apiFetch(`/admin/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              Platform Users <Users className="w-5.5 h-5.5 text-[#6bfe9c]" />
            </h1>
            <p className="text-zinc-400 text-xs mt-0.5">Manage platform members and permissions.</p>
        </div>
        
        <div className="w-full md:w-72 relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-zinc-500 group-focus-within:text-[#6bfe9c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input 
                type="text" 
                placeholder="Search by name or email..." 
                className="w-full bg-[#131315] border border-[#48474a] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-all placeholder:text-zinc-600"
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      ) : (
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] rounded-lg overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-[#2c2c2f] text-xs uppercase  text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold text-center">Role</th>
                  <th className="px-5 py-3 font-semibold text-center">Transactions</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#48474a]">
                {users
                  .filter(u => 
                      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(u => (
                  <tr key={u._id} className="hover:bg-[#252528] transition-colors">
                     <td className="px-5 py-2.5 text-white font-medium">
                          <div className="flex flex-col">
                              <span className="text-sm">{u.name}</span>
                              <span className="text-[9px] text-zinc-500 uppercase font-medium mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                          </div>
                     </td>
                    <td className="px-5 py-2.5 text-zinc-400 text-xs">{u.email}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-lg uppercase tracking-wider ${u.role === "admin" ? "bg-[#6bfe9c]/10 text-[#6bfe9c]" : "bg-blue-500/10 text-blue-400"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="text-xs font-bold text-zinc-300 bg-[#2c2c2f] px-3 py-1 rounded-lg border border-[#48474a]">
                          {u.transactionCount || 0}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right flex justify-end gap-2 items-center">
                      <Link 
                        href={`/dashboard/users/${u._id}`}
                        className="px-3 h-8.5 rounded-lg bg-[#6bfe9c]/10 hover:bg-[#6bfe9c]/20 text-[#6bfe9c] flex items-center justify-center transition-all text-[11px] font-bold uppercase tracking-tight"
                      >
                        Manage
                      </Link>
                      <button 
                        onClick={() => changeRole(u._id, u.role)}
                        className="w-8.5 h-8.5 rounded-lg bg-[#2c2c2f] hover:bg-[#48474a] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Toggle Role"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteUser(u._id)}
                        className="w-8.5 h-8.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
             <div className="text-center py-20 text-zinc-500 text-sm">No users found in database.</div>
          )}
        </div>
      )}
    </div>
  );
}
