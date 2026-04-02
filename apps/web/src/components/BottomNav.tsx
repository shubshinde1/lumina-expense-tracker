"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PieChart, PlusCircle, LayoutList, Settings, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Hold & Swipe detection logic
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [dragSelection, setDragSelection] = useState<"expense" | "income" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsHolding(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isHolding) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - touchStart.x;
    const dy = currentY - touchStart.y;

    // Check if dragging upwards (-dy)
    if (dy < -30) {
      if (dx < -30) setDragSelection("expense"); // Up-Left
      else if (dx > 30) setDragSelection("income"); // Up-Right
      else setDragSelection(null);
    } else {
      setDragSelection(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsHolding(false);
    if (dragSelection === "expense") {
      router.push("/dashboard/add?type=expense");
    } else if (dragSelection === "income") {
      router.push("/dashboard/add?type=income");
    } else if (touchStart) {
      // If tapped without dragging far enough
      const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const totalDx = Math.abs(touchEnd.x - touchStart.x);
      const totalDy = Math.abs(touchEnd.y - touchStart.y);
      if (totalDx < 10 && totalDy < 10) {
        router.push("/dashboard/add");
      }
    }
    setDragSelection(null);
    setTouchStart(null);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-border z-50 px-6 pb-safe">
      <ul className="flex items-center justify-between h-full max-w-md mx-auto relative cursor-default">
        <NavItem href="/dashboard" icon={<Home />} label="Home" active={pathname === "/dashboard" || pathname === "/dashboard/"} />
        <NavItem href="/dashboard/analytics" icon={<PieChart />} label="Analytics" active={pathname.startsWith("/dashboard/analytics")} />

        {/* Center Floating Action Button (FAB) with Drag & Drop System */}
        <li className="relative -top-6 group z-50">
          {/* Options Canvas */}
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 pb-2 flex items-center gap-6 transition-all duration-300 pointer-events-none translate-y-4 ${isHolding ? "opacity-100 translate-y-0" : "opacity-0 group-hover:opacity-100 group-hover:translate-y-0"} z-10`}>
             <div className={`flex flex-col items-center gap-2 transition-transform ${dragSelection === 'expense' ? 'scale-125 -translate-y-2' : 'scale-100'}`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${dragSelection === 'expense' ? 'bg-red-500 shadow-red-500/50' : 'bg-destructive'}`}>
                  <ArrowUpRight className="w-6 h-6 text-white" strokeWidth={3} />
               </div>
               <span className={`text-[10px] font-black uppercase tracking-wider bg-card/90 px-2.5 py-1 rounded backdrop-blur ${dragSelection === 'expense' ? 'text-red-500' : 'text-destructive/80'}`}>Expense</span>
             </div>

             <div className={`flex flex-col items-center gap-2 transition-transform ${dragSelection === 'income' ? 'scale-125 -translate-y-2' : 'scale-100'}`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${dragSelection === 'income' ? 'bg-[#1fc46a] shadow-[#1fc46a]/50' : 'bg-primary'}`}>
                  <ArrowDownRight className="w-6 h-6 text-black" strokeWidth={3} />
               </div>
               <span className={`text-[10px] font-black uppercase tracking-wider bg-card/90 px-2.5 py-1 rounded backdrop-blur ${dragSelection === 'income' ? 'text-[#1fc46a]' : 'text-primary/80'}`}>Income</span>
             </div>
          </div>

          {/* Main FAB Trigger */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
               if (!isHolding) router.push('/dashboard/add');
            }}
            className="flex flex-col items-center cursor-pointer select-none touch-none"
          >
            <div className={`flex items-center justify-center w-14 h-14 bg-gradient-to-br transition-all rounded-full text-[#003417] border-[4px] border-background relative z-20 ${isHolding ? 'from-[#0e0e10] to-[#1f1f22] scale-95 border-primary/50 text-white shadow-[0_0_30px_rgba(107,254,156,0.3)]' : 'from-primary to-[#1fc46a] shadow-[0_8px_16px_-4px_rgba(107,254,156,0.3)]'}`}>
               <PlusCircle className={`w-6 h-6 transition-transform duration-300 ${isHolding ? 'rotate-45 text-white/50' : ''}`} strokeWidth={2.5} />
               {dragSelection && (
                 <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-50 pointer-events-none" />
               )}
            </div>
          </div>
        </li>

        <NavItem href="/dashboard/history" icon={<LayoutList />} label="History" active={pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/edit")} />
        <NavItem href="/dashboard/settings" icon={<Settings />} label="Settings" active={pathname.startsWith("/dashboard/settings")} />
      </ul>
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <li>
      <Link href={href} className="flex flex-col items-center justify-center space-y-1 w-12 group transition-all">
        <div className={`transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold  transition-colors ${active ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary"}`}>
          {label}
        </span>
      </Link>
    </li>
  );
}
