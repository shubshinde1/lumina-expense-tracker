"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to login");

      if (data.role !== "admin") {
        throw new Error("Unauthorized: Admin access required.");
      }

      localStorage.setItem("admin_token", data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-[#131315] border border-[#48474a]">
        <h1 className="text-2xl font-bold text-[#6bfe9c] mb-6  text-center">Lumina Admin Config</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs uppercase  text-zinc-400 font-medium mb-1.5 block">Admin Email</label>
            <input
              type="email"
              className="w-full bg-[#1f1f22] border border-[#48474a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase  text-zinc-400 font-medium mb-1.5 block">Password</label>
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
            className="w-full bg-[#6bfe9c] text-[#004a23] font-bold py-3 rounded-xl mt-4 hover:bg-[#6bfe9c]/90 transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
