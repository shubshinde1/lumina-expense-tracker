'use client';

import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Loader2, 
  KeyRound, 
  CreditCard, 
  Megaphone, 
  ShieldAlert, 
  Inbox
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";

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
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isMounted && !user) {
      router.push("/");
    }
  }, [user, router, isMounted]);

  // Fetch notifications list
  const { data: notifications = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    }
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

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
      toast.success("All notifications marked as read");
    }
  });

  // 3. Delete Notification
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Notification deleted");
    }
  });

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif._id);
    }
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "login":
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
        );
      case "transaction":
        return (
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        );
      case "system":
        return (
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
        );
      case "budget":
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-muted/10 text-muted-foreground flex items-center justify-center border border-muted/20 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  if (!isMounted || !user) return null;

  return (
    <div className="px-5 py-6 md:p-12 space-y-8 animate-in fade-in duration-500 pb-32 max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage system alerts, security updates, and auto-logged entries.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 text-xs font-black uppercase tracking-wider border border-primary/15 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            Read All
          </button>
        )}
      </header>

      {/* Content Body */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Querying Notification Database…</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-destructive font-medium">Failed to retrieve notifications. Please try again.</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-[2rem] bg-card border border-border flex items-center justify-center shadow-lg relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />
            <Inbox className="w-7 h-7 text-muted-foreground/60 transition-transform group-hover:scale-110" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">Inbox is Empty</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">No transaction auto-logs or system broadcasts have been received yet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {notifications.map((notif) => (
            <div 
              key={notif._id}
              className={`group flex items-start gap-4 p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                notif.isRead 
                  ? "bg-card/40 border-border/50 hover:bg-accent/40" 
                  : "bg-primary/[0.03] border-primary/15 hover:bg-primary/[0.05]"
              }`}
              onClick={() => handleNotificationClick(notif)}
            >
              {/* Unread Indicator Bar */}
              {!notif.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
              )}

              {/* Dynamic Icon */}
              {getNotifIcon(notif.type)}

              {/* Text content details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-bold text-foreground leading-snug truncate ${!notif.isRead ? 'text-primary font-black' : ''}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 break-words">
                  {notif.message}
                </p>
                {notif.actionUrl && (
                  <span className="text-[10px] text-primary/80 font-bold tracking-wide uppercase hover:underline inline-block mt-2">
                    View Activity &rarr;
                  </span>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(notif._id);
                }}
                disabled={deleteMutation.isPending}
                className="w-8 h-8 rounded-xl bg-accent/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0 active:scale-90"
                title="Delete notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
