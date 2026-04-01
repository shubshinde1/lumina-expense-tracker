"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PieChart, PlusCircle, LayoutList, Settings, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Swipe detection logic
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchStart.x - touchEnd.x;
    
    if (dx > 40) {
      // Swiped Left
      router.push('/dashboard/add?type=expense');
    } else if (dx < -40) {
      // Swiped Right
      router.push('/dashboard/add?type=income');
    } else {
      // Simple tap fallback just goes to the standard add page
      router.push('/dashboard/add');
    }
    setTouchStart(null);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-border z-50 px-6 pb-safe">
      <ul className="flex items-center justify-between h-full max-w-md mx-auto relative cursor-default">
        <NavItem href="/dashboard" icon={<Home />} label="Home" active={pathname === "/dashboard"} />
        <NavItem href="/dashboard/analytics" icon={<PieChart />} label="Analytics" active={pathname === "/dashboard/analytics"} />

        {/* Center Floating Action Button (FAB) with Hover & Swipe */}
        <li className="relative -top-6 group z-50">
          
          {/* Invisible Hover Bridge to prevent losing hover state */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-48 h-12 -mb-2 z-0" />

          {/* Hover Options (Desktop or Mobile Tap-to-Hold) */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 flex items-center gap-4 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-10">
             <Link 
               href="/dashboard/add?type=expense"
               className="flex flex-col items-center gap-1 group/btn"
             >
               <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center shadow-lg transform group-hover/btn:scale-110 transition-transform">
                  <ArrowUpRight className="w-5 h-5 text-white" strokeWidth={3} />
               </div>
               <span className="text-[10px] font-bold  uppercase text-destructive bg-card/80 px-2 py-0.5 rounded backdrop-blur">Expense</span>
             </Link>

             <Link 
               href="/dashboard/add?type=income"
               className="flex flex-col items-center gap-1 group/btn"
             >
               <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg transform group-hover/btn:scale-110 transition-transform">
                  <ArrowDownRight className="w-5 h-5 text-black" strokeWidth={3} />
               </div>
               <span className="text-[10px] font-bold  uppercase text-primary bg-card/80 px-2 py-0.5 rounded backdrop-blur">Income</span>
             </Link>
          </div>

          {/* Main FAB Trigger */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
               // Only trigger click via router if it was purely a mouse click (non-touch) to avoid double-firing
               if (!touchStart) router.push('/dashboard/add');
            }}
            className="flex flex-col items-center cursor-pointer"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-[#1fc46a] rounded-full shadow-[0_8px_16px_-4px_rgba(107,254,156,0.3)] active:scale-95 transition-all text-[#003417] border-[4px] border-background relative">
               <PlusCircle className="w-6 h-6 z-10" strokeWidth={2.5} />
               {/* Swipe hints visible on hover/focus to teach user */}
               <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-0 group-hover:opacity-100 pointer-events-none" />
            </div>
          </div>
        </li>

        <NavItem href="/dashboard/history" icon={<LayoutList />} label="History" active={pathname === "/dashboard/history"} />
        <NavItem href="/dashboard/settings" icon={<Settings />} label="Settings" active={pathname === "/dashboard/settings"} />
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
