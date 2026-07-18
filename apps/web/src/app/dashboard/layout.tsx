'use client';

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { Bell, Settings, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pull to Refresh States & Handlers
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    
    if (scrollTop === 0) {
      if (!isPulling.current) {
        const currentY = e.touches[0].clientY;
        if (currentY > touchStartY.current) {
          touchStartY.current = currentY;
          isPulling.current = true;
        }
      }
      
      if (isPulling.current) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 0) {
          const pull = Math.min(diff * 0.45, 80);
          setPullDistance(pull);
          if (e.cancelable) e.preventDefault();
        } else {
          isPulling.current = false;
          setPullDistance(0);
        }
      }
    } else {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;
    
    if (pullDistance >= 50) {
      setIsRefreshing(true);
      setPullDistance(50);
      
      try {
        await queryClient.refetchQueries();
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (err) {
        console.error("Refresh failed", err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerOfflineBanner = () => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setShowOfflineBanner(true);
    bannerTimerRef.current = setTimeout(() => {
      setShowOfflineBanner(false);
    }, 4000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);
      if (!window.navigator.onLine) {
        triggerOfflineBanner();
      }
    }

    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineBanner(false);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      toast.success("Connected to internet!");
      queryClient.refetchQueries();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      triggerOfflineBanner();
      toast.warning("You are currently offline. Working in offline mode.");
    };

    const handleOfflineInteraction = () => {
      if (typeof window !== "undefined" && !window.navigator.onLine) {
        setIsOffline(true);
        triggerOfflineBanner();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-interaction", handleOfflineInteraction);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-interaction", handleOfflineInteraction);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [queryClient]);

  const checkConnection = async () => {
    const checkToast = toast.loading("Checking server connectivity...");
    try {
      await api.get("/transactions/dashboard");
      setIsOffline(false);
      setShowOfflineBanner(false);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      toast.success("Back online! Connected to server.", { id: checkToast });
      queryClient.refetchQueries();
    } catch (err) {
      setIsOffline(true);
      triggerOfflineBanner();
      toast.error("Still offline. Please check your internet connection.", { id: checkToast });
    }
  };

  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("[Offline Sync Listener] Sync complete! Invalidating all queries...");
      queryClient.invalidateQueries();
    };

    window.addEventListener('offline-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
    };
  }, [queryClient]);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data || [];
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  // Prefetch critical endpoints on login/load to populate local offline storage caches
  useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data || [];
    }
  });

  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data || [];
    }
  });

  useQuery({
    queryKey: ['paymentModes'],
    queryFn: async () => {
      const res = await api.get('/payment-modes');
      return res.data || [];
    }
  });

  useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/transactions/dashboard');
      return res.data || {};
    }
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const getPageTitle = (path: string) => {
    if (path === "/dashboard" || path === "/dashboard/") return "Home";
    if (path.startsWith("/dashboard/analytics")) return "Analytics";
    if (path.startsWith("/dashboard/history")) return "History";
    if (path.startsWith("/dashboard/notifications")) return "Notifications";
    if (path.startsWith("/dashboard/settings")) return "Settings";
    if (path.startsWith("/dashboard/categories")) return "Categories";
    if (path.startsWith("/dashboard/add")) return "Add Transaction";
    if (path.startsWith("/dashboard/edit")) return "Edit Transaction";
    return "Lumina";
  };

  useEffect(() => {
    let active = true;

    const setupLaunchNavigation = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { registerPlugin } = await import("@capacitor/core");
        const LuminaBridge = registerPlugin<any>('LuminaBridge');

        const checkForLaunchRoute = async () => {
          const res = await LuminaBridge.getLaunchRoute();
          if (active && res && res.route) {
            console.log("🚀 Redirecting to launching route:", res.route);
            router.push(res.route);
          }
        };

        await checkForLaunchRoute();

        const handleNativeNavigate = (e: any) => {
          const { route } = e.detail;
          if (active && route) {
            console.log("🚀 Redirecting to launching route (Warm start):", route);
            router.push(route);
          }
        };

        window.addEventListener("navigateToRoute", handleNativeNavigate);

        const handleResume = () => {
          console.log("📱 App resumed or focused, checking launch route...");
          checkForLaunchRoute();
        };

        document.addEventListener("resume", handleResume);
        window.addEventListener("focus", handleResume);

        return () => {
          window.removeEventListener("navigateToRoute", handleNativeNavigate);
          document.removeEventListener("resume", handleResume);
          window.removeEventListener("focus", handleResume);
        };
      } catch (err) {
        console.warn("Launch navigation setup failed:", err);
      }
    };

    setupLaunchNavigation();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="relative min-h-screen pb-20 bg-background text-foreground flex flex-col">
      {/* Sticky Header Group */}
      <div className="sticky top-0 z-45 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        {/* Offline Alert Bar */}
        {showOfflineBanner && (
          <div 
            onClick={checkConnection}
            className="bg-amber-500/10 hover:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-bold text-amber-500 flex items-center justify-center gap-2 cursor-pointer transition-all select-none active:scale-[0.99] animate-in slide-in-from-top duration-300"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Working Offline. Tap to reconnect.</span>
          </div>
        )}

        <header className="px-5 py-4 flex items-center justify-between">
          <h1 className="font-heading text-xl font-black tracking-tight text-foreground">
            {pathname === "/dashboard" || pathname === "/dashboard/" ? (
              <>
                {isMounted ? (
                  <>
                    {getGreeting()}, <span className="text-primary">{user?.name?.split(" ")[0] || "there"}</span>
                  </>
                ) : (
                  <>
                    Hello, <span className="text-primary">there</span>
                  </>
                )}
              </>
            ) : (
              getPageTitle(pathname)
            )}
          </h1>
          <div className="flex items-center gap-3">
            {/* Notifications Button */}
            <Link 
              href="/dashboard/notifications" 
              className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center relative shadow-sm hover:bg-accent/40 active:scale-95 transition-all"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-primary text-black font-heading font-black text-[8px] flex items-center justify-center border border-card shadow-[0_2px_8px_rgba(107,254,156,0.3)] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <main 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto no-scrollbar relative select-none touch-pan-y"
      >
        {/* Pull To Refresh Indicator */}
        <div 
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-40 transition-transform duration-100 ease-out"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 45)}px)`,
            opacity: Math.min(pullDistance / 45, 1),
          }}
        >
          <div className="bg-card/90 backdrop-blur-md border border-border/80 p-2 rounded-full shadow-lg flex items-center justify-center">
            <Loader2 
              className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} 
              style={{
                transform: !isRefreshing ? `rotate(${pullDistance * 6}deg)` : undefined
              }}
            />
          </div>
        </div>

        <div 
          className={`px-5 py-6 md:px-10 md:py-8 pb-32 max-w-5xl mx-auto w-full space-y-6 ${!isPulling.current ? 'transition-all duration-300' : ''}`}
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined
          }}
        >
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
