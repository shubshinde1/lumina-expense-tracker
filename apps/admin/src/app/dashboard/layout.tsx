"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0e0e10] text-[#fefbfe] relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-x-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-6 bg-[#131315]/80 backdrop-blur-md sticky top-0 z-30 border-b border-[#48474a]/50">
            <h2 className="text-lg font-bold text-[#6bfe9c]">Lumina</h2>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl bg-zinc-800 text-zinc-400 active:scale-95 transition-all"
            >
                <Menu className="w-5 h-5" />
            </button>
        </header>

        <div className="p-6 md:p-10 relative">
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#6bfe9c]/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            {children}
        </div>
      </main>
    </div>
  );
}
