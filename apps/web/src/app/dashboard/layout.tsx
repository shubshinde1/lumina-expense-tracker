'use client';

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const setupLaunchNavigation = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { registerPlugin } = await import("@capacitor/core");
        const LuminaBridge = registerPlugin<any>('LuminaBridge');

        // 1. Cold Start Check: Retrieve initial launching route from Native Intent
        const res = await LuminaBridge.getLaunchRoute();
        if (active && res && res.route) {
          console.log("🚀 Redirecting to launching route (Cold start):", res.route);
          router.push(res.route);
        }

        // 2. Warm Start Check: Listen to real-time route navigation intent updates
        const handleNativeNavigate = (e: any) => {
          const { route } = e.detail;
          if (active && route) {
            console.log("🚀 Redirecting to launching route (Warm start):", route);
            router.push(route);
          }
        };

        window.addEventListener("navigateToRoute", handleNativeNavigate);

        return () => {
          window.removeEventListener("navigateToRoute", handleNativeNavigate);
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
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
