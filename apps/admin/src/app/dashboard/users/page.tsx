"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Trash2, UserCog, CheckCircle } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <header className="mb-10">
        <h1 className="text-3xl font-bold  text-white">Users</h1>
        <p className="text-zinc-400 mt-1">Manage platform members and permissions.</p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading...</div>
      ) : (
        <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#2c2c2f] text-xs uppercase  text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#48474a]">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-[#252528] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${u.role === "admin" ? "bg-[#6bfe9c]/10 text-[#6bfe9c]" : "bg-blue-500/10 text-blue-400"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => changeRole(u._id, u.role)}
                      className="w-8 h-8 rounded-lg bg-[#2c2c2f] hover:bg-[#48474a] text-zinc-300 flex items-center justify-center transition-colors"
                      title="Toggle Role"
                    >
                      <UserCog className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteUser(u._id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
             <div className="text-center py-20 text-zinc-500 text-sm">No users found in database.</div>
          )}
        </div>
      )}
    </div>
  );
}
