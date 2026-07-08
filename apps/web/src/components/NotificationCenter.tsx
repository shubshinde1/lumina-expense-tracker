'use client';

import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  BellRing, 
  X, 
  KeyRound, 
  CreditCard, 
  Megaphone, 
  ShieldAlert, 
  Trash2, 
  CheckCheck, 
  Loader2,
  Inbox
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Formats mongoose timestamps to local relative time (e.g. "3 mins ago")
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const prevNotifsRef = useRef<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications with 15-second polling interval
  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  // Real-time Toast Alerts for new incoming notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const currentUnread = notifications.filter((n: any) => !n.isRead);
      const newUnread = currentUnread.filter(n => !prevNotifsRef.current.includes(n._id));

      if (newUnread.length > 0) {
        // Trigger a toast alert for the newest unread notification
        const latest = newUnread[0];
        toast(latest.title, {
          description: latest.message,
          action: latest.actionUrl ? {
            label: "View",
            onClick: () => {
              markReadMutation.mutate(latest._id);
              router.push(latest.actionUrl);
            }
          } : undefined
        });

        // Haptic vibe if on mobile PWA device
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }

      // Update ref to track current notifications
      prevNotifsRef.current = notifications.map((n: any) => n._id);
    }
  }, [notifications, router]);

  // Click outside listener to close notification panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Mark Notification as Read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => await api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // 2. Mark All as Read
  const markAllReadMutation = useMutation({
    mutationFn: async () => await api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("All marked as read");
    }
  });

  // 3. Delete Notification
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif._id);
    }
    setIsOpen(false);
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "login":
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
        );
      case "transaction":
        return (
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
      case "system":
        return (
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20 shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
        );
      case "budget":
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-muted/10 text-muted-foreground flex items-center justify-center border border-muted/20 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative z-[99]">
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm relative hover:bg-accent/50 transition-colors"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5 h-5 text-primary animate-pulse" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-black font-heading font-black text-[10px] flex items-center justify-center shadow-[0_0_12px_rgba(107,254,156,0.3)] border border-black/10">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        )}
      </button>

      {/* Glassmorphic Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-3xl border border-border bg-card/90 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground">In-App Ledger Alerts</h3>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {unreadCount} unread notification(s)
              </p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-[9px] font-black uppercase text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/10 active:scale-95 transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Read All
              </button>
            )}
          </div>

          {/* List Container */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-0.5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Updating Ledger...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center border border-border">
                  <Inbox className="w-5 h-5 text-muted-foreground/60" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Clean Ledger</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">No recent alerts from your devices.</p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id}
                  className={`group flex gap-3 p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    notif.isRead 
                      ? "bg-transparent border-transparent hover:bg-accent/30" 
                      : "bg-primary/[0.03] border-primary/10 hover:bg-primary/[0.05]"
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Read state dot indicator */}
                  {!notif.isRead && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}

                  {/* Icon wrapper */}
                  <div className="pl-1">
                    {getNotifIcon(notif.type)}
                  </div>

                  {/* Content details */}
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-xs font-bold text-foreground leading-snug truncate ${!notif.isRead ? 'font-extrabold text-primary' : ''}`}>
                      {notif.title}
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-normal mt-0.5 break-words line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-muted-foreground/60 block mt-1.5 font-mono">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Individual Delete Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notif._id);
                    }}
                    className="w-7 h-7 rounded-lg bg-accent/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0 active:scale-90"
                    title="Delete alert"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
