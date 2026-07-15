'use client';

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

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
      const res = await api.get('/transactions/summary');
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
      {/* Sticky Global Header */}
      <header className="sticky top-0 z-45 w-full bg-background/80 backdrop-blur-md border-b border-border/40 px-5 py-4 flex items-center justify-between">
        <h1 className="font-heading text-xl font-black tracking-tight text-foreground">
          {getPageTitle(pathname)}
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 py-6 md:px-10 md:py-8 pb-32 max-w-5xl mx-auto w-full space-y-6">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
