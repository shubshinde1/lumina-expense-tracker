"use client";
import { Users, LayoutDashboard, Tags, LogOut, ReceiptText, Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/dashboard/users", icon: Users },
    { label: "Transactions", href: "/dashboard/transactions", icon: ReceiptText },
    { label: "Global Categories", href: "/dashboard/categories", icon: Tags },
    { label: "Broadcast", href: "/dashboard/broadcast", icon: Megaphone },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
            onClick={onClose}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 w-64 bg-[#131315] border-r border-[#48474a] h-screen flex flex-col p-6 z-50 transition-transform duration-500 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
      <div className="mb-10">
        <h2 className="text-xl font-bold  text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#6bfe9c]/20 flex items-center justify-center text-[#6bfe9c]">
            <LayoutDashboard className="w-4 h-4" />
          </span>
          Lumina Admin
        </h2>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard" 
            ? pathname === "/dashboard" 
            : pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-[#6bfe9c]/10 text-[#6bfe9c] font-medium" 
                  : "text-zinc-400 hover:text-white hover:bg-[#1f1f22]"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button 
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-all mt-auto"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </aside>
    </>
  );
}
