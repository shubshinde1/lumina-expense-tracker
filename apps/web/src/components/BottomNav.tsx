"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PieChart, PlusCircle, LayoutList, Bell, ArrowDownRight, ArrowUpRight, X, User, Mic } from "lucide-react";
import React, { useState, useEffect, useRef, cloneElement } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Hold & Swipe detection logic
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [dragSelection, setDragSelection] = useState<"expense" | "income" | "voice" | null>(null);

  // FAB click animation state
  const [isFabAnimating, setIsFabAnimating] = useState(false);
  const fabTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFabAnimation = () => {
    if (fabTimerRef.current) clearTimeout(fabTimerRef.current);
    setIsFabAnimating(true);
    fabTimerRef.current = setTimeout(() => {
      setIsFabAnimating(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (fabTimerRef.current) clearTimeout(fabTimerRef.current);
    };
  }, []);

  // Background poll notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data || [];
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const prevNotifsRef = useRef<string[]>([]);

  // Real-time Toast Alerts for new incoming notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const currentUnread = notifications.filter((n: any) => !n.isRead);
      const newUnread = currentUnread.filter(n => !prevNotifsRef.current.includes(n._id));

      if (newUnread.length > 0) {
        const latest = newUnread[0];
        toast.custom((t) => (
          <div className="bg-[#131315]/95 backdrop-blur-md border border-[#48474a]/60 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 max-w-sm w-[92vw] mx-auto animate-in slide-in-from-top-10 duration-300">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* Icon */}
              <div className="w-8.5 h-8.5 rounded-xl bg-[#6bfe9c]/10 flex items-center justify-center text-[#6bfe9c] border border-[#6bfe9c]/20 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              {/* Text details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Lumina App</span>
                  <span className="text-[9px] text-zinc-500 font-medium">now</span>
                </div>
                <h4 className="text-xs font-bold text-white truncate">{latest.title}</h4>
                <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{latest.message}</p>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {latest.actionUrl ? (
                <button
                  onClick={() => {
                    toast.dismiss(t);
                    api.put(`/notifications/${latest._id}/read`).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    });
                    router.push(latest.actionUrl);
                  }}
                  className="px-2.5 py-1.5 bg-[#6bfe9c] text-[#004a23] text-[9px] font-black uppercase tracking-wider rounded-lg transition-transform active:scale-95 cursor-pointer"
                >
                  View
                </button>
              ) : null}
              <button
                onClick={() => toast.dismiss(t)}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ));

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }
      prevNotifsRef.current = notifications.map((n: any) => n._id);
    }
  }, [notifications, router, queryClient]);

  // Prefetch dynamic and static routes on mount for offline readiness
  useEffect(() => {
    router.prefetch("/dashboard/add");
    router.prefetch("/dashboard/edit");
    router.prefetch("/dashboard/analytics");
    router.prefetch("/dashboard/history");
    router.prefetch("/dashboard/categories");
    router.prefetch("/dashboard/payment-modes");
    router.prefetch("/dashboard/settings");
  }, [router]);

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
      else setDragSelection("voice"); // Up-Center
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
    } else if (dragSelection === "voice") {
      router.push("/dashboard/add?voice=true");
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
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 pb-3 flex items-center gap-4 transition-all duration-300 pointer-events-none translate-y-4 ${isHolding ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"} z-10`}>
             {/* Expense (Left) */}
             <div 
               onClick={() => router.push("/dashboard/add?type=expense")}
               className={`flex flex-col items-center gap-1.5 transition-transform cursor-pointer ${dragSelection === 'expense' ? 'scale-115 -translate-y-1' : 'scale-100'}`}
             >
               <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${dragSelection === 'expense' ? 'bg-red-500 shadow-red-500/50' : 'bg-destructive'}`}>
                  <ArrowUpRight className="w-5 h-5 text-white" strokeWidth={3} />
               </div>
               <span className={`text-[9px] font-black uppercase tracking-wider bg-[#131315]/90 border border-zinc-800 px-2 py-0.5 rounded-lg backdrop-blur ${dragSelection === 'expense' ? 'text-red-500 border-red-550/30' : 'text-destructive/80'}`}>Expense</span>
             </div>

             {/* Voice Dictation (Center) */}
             <div 
               onClick={() => router.push("/dashboard/add?voice=true")}
               className={`flex flex-col items-center gap-1.5 transition-transform cursor-pointer ${dragSelection === 'voice' ? 'scale-115 -translate-y-1' : 'scale-100'}`}
             >
               <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${dragSelection === 'voice' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-emerald-600'}`}>
                  <Mic className="w-5 h-5 text-white animate-pulse" strokeWidth={2.5} />
               </div>
               <span className={`text-[9px] font-black uppercase tracking-wider bg-[#131315]/90 border border-zinc-800 px-2 py-0.5 rounded-lg backdrop-blur ${dragSelection === 'voice' ? 'text-emerald-500 border-emerald-550/30' : 'text-emerald-500/80'}`}>Dictate</span>
             </div>

             {/* Income (Right) */}
             <div 
               onClick={() => router.push("/dashboard/add?type=income")}
               className={`flex flex-col items-center gap-1.5 transition-transform cursor-pointer ${dragSelection === 'income' ? 'scale-115 -translate-y-1' : 'scale-100'}`}
             >
               <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors ${dragSelection === 'income' ? 'bg-[#1fc46a] shadow-[#1fc46a]/50' : 'bg-primary'}`}>
                  <ArrowDownRight className="w-5 h-5 text-black" strokeWidth={3} />
               </div>
               <span className={`text-[9px] font-black uppercase tracking-wider bg-[#131315]/90 border border-zinc-800 px-2 py-0.5 rounded-lg backdrop-blur ${dragSelection === 'income' ? 'text-[#1fc46a] border-primary/30' : 'text-primary/80'}`}>Income</span>
             </div>
          </div>

          {/* Main FAB Trigger */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
               triggerFabAnimation();
               if (!isHolding) router.push('/dashboard/add');
            }}
            className="flex flex-col items-center cursor-pointer select-none touch-none"
          >
            <div className={`flex items-center justify-center w-14 h-14 transition-all rounded-full border-[4px] border-background relative z-20 ${isHolding ? 'bg-[#0e0e10] scale-95 border-primary/50 text-white shadow-[0_0_30px] shadow-primary/30' : 'bg-primary text-primary-foreground shadow-[0_8px_16px_-4px] shadow-primary/30'}`}>
               <PlusCircle className={`w-6 h-6 transition-transform duration-300 ${isHolding ? 'rotate-45 text-white/50' : ''} ${isFabAnimating ? 'animate-fab-spin-pop' : ''}`} strokeWidth={2.5} />
               {dragSelection && (
                 <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-50 pointer-events-none" />
               )}
            </div>
          </div>
        </li>

        <NavItem href="/dashboard/history" icon={<LayoutList />} label="History" active={pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/edit")} />
        <NavItem href="/dashboard/settings" icon={<User />} label="Profile" active={pathname.startsWith("/dashboard/settings")} />
      </ul>
    </nav>
  );
}

function NavItem({ href, icon, label, active, badgeCount }: { href: string; icon: React.ReactNode; label: string; active: boolean; badgeCount?: number }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsAnimating(true);
    timerRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  useEffect(() => {
    if (active) {
      triggerAnimation();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  return (
    <li>
      <Link 
        href={href} 
        onClick={triggerAnimation}
        className="flex flex-col items-center justify-center space-y-1 w-12 group transition-all relative"
      >
        <div className={`relative w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"} ${isAnimating ? "animate-tab-squish" : ""}`}>
          {/* Outline Icon */}
          {cloneElement(icon as React.ReactElement<any>, {
            className: "w-5 h-5",
          })}
          {/* Filled Icon with transition-based clip-path */}
          {cloneElement(icon as React.ReactElement<any>, {
            className: "w-5 h-5 absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            fill: "currentColor",
            style: {
              clipPath: active ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
            }
          })}
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-primary text-black font-heading font-black text-[8px] flex items-center justify-center border border-card shadow-[0_2px_8px] shadow-primary/30">
            {badgeCount}
          </span>
        )}
        <span className={`text-[10px] font-bold  transition-colors ${active ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary"}`}>
          {label}
        </span>
      </Link>
    </li>
  );
}

