'use client';

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Loader2, 
  KeyRound, 
  CreditCard, 
  Megaphone, 
  ShieldAlert, 
  Inbox,
  MessageSquare,
  ArrowRight,
  X,
  Eye,
  ChevronDown,
  ChevronUp
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

// Local helper to parse SMS amounts and merchants for card title summaries
const getShortSummary = (body: string) => {
  const lower = body.toLowerCase();
  let amount = "";
  const amtMatch = body.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amtMatch) amount = `₹${amtMatch[1]}`;

  let merchant = "";
  const merchantMatch = body.match(/(?:at|to|info)\s+([A-Za-z0-9\s]+?)(?:\s+via|\s+on|\s+ref|\s+txn|\.)/i);
  if (merchantMatch) merchant = merchantMatch[1].trim();

  const isDebit = lower.includes("debited") || lower.includes("spent") || lower.includes("paid") || lower.includes("charged");

  if (amount) {
    return `${isDebit ? "Spent" : "Received"} ${amount}${merchant ? ` at ${merchant}` : ""}`;
  }
  return "New transaction SMS detected";
};

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [offlineSmsList, setOfflineSmsList] = useState<string[]>([]);
  const [loadingNotifId, setLoadingNotifId] = useState<string | null>(null);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return "00:00:00";
    }
  };

  const renderMessageJourney = (notif: any) => {
    const isOffline = !!notif.metadata?.isOfflinePending;
    const timeStr = formatTime(notif.createdAt);
    
    return (
      <div className="mt-3 pt-3 border-t border-[#48474a]/40 space-y-3 font-mono text-[10px] text-zinc-400">
        <span className="text-[#6bfe9c] font-black uppercase text-[9px] tracking-wider block">
          SMS Processing Journal
        </span>
        <div className="relative pl-3.5 border-l border-primary/20 space-y-2 text-[10px] leading-relaxed">
          <div className="relative">
            <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315] animate-pulse" />
            <span className="text-zinc-500 font-bold">[{timeStr}]</span> SMS received by device.
          </div>
          <div className="relative">
            <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315]" />
            <span className="text-zinc-500 font-bold">[{timeStr}]</span> Regex pattern match success. Extracted amount: <span className="text-primary font-bold">₹{notif.metadata?.amount || "parsed"}</span> ({notif.metadata?.type || "spend"}).
          </div>
          
          {isOffline ? (
            <>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[#131315]" />
                <span className="text-amber-500 font-bold">[{timeStr}] Warning:</span> No auth session active. Auto-logging deferred.
              </div>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315]" />
                <span className="text-zinc-500 font-bold">[{timeStr}]</span> Message payload saved to offline queue in SharedPreferences.
              </div>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315]" />
                <span className="text-zinc-500 font-bold">[{timeStr}]</span> Toast notification sent to device tray.
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315]" />
                <span className="text-zinc-500 font-bold">[{timeStr}]</span> Authentication verified. Active auth token loaded.
              </div>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315]" />
                <span className="text-zinc-500 font-bold">[{timeStr}]</span> Forwarding payload to backend <span className="text-zinc-300">/transactions/auto-log</span>...
              </div>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#131315]" />
                <span className="text-zinc-500 font-bold">[{timeStr}]</span> Backend logged successfully. Transaction ID: <span className="text-zinc-300 font-semibold">{notif.metadata?.transactionId || "created"}</span>.
              </div>
              <div className="relative">
                <span className="absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#6bfe9c] border-2 border-[#131315]" />
                <span className="text-[#6bfe9c] font-bold">[{timeStr}] Success:</span> Push notification alerts updated on app console.
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Authenticate user on mount
  useEffect(() => {
    setIsMounted(true);
    if (isMounted && !user) {
      router.push("/");
    }
  }, [user, router, isMounted]);

  // Load offline pending SMS messages from SharedPreferences on mount
  useEffect(() => {
    const fetchOfflineSms = async () => {
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const LuminaBridge = registerPlugin<any>('LuminaBridge');
        const res = await LuminaBridge.getPendingSmsList();
        if (res && res.smsList) {
          const list = JSON.parse(res.smsList);
          setOfflineSmsList(list);
        }
      } catch (e) {
        console.warn("LuminaBridge failed (running in browser mode):", e);
      }
    };

    if (isMounted && user) {
      fetchOfflineSms();
    }
  }, [isMounted, user]);

  // Real-time Event Listener to update list immediately when SMS is received in foreground
  useEffect(() => {
    const handleSmsReceivedEvent = async () => {
      // 1. Invalidate query to pull the new database notification
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // 2. Query SharedPreferences for the updated offline list (if logging fell back offline)
      try {
        const { registerPlugin } = await import("@capacitor/core");
        const LuminaBridge = registerPlugin<any>('LuminaBridge');
        const res = await LuminaBridge.getPendingSmsList();
        if (res && res.smsList) {
          const list = JSON.parse(res.smsList);
          setOfflineSmsList(list);
        }
      } catch (e) {
        console.warn("LuminaBridge fetch failed on broadcast event:", e);
      }
    };

    window.addEventListener("bankSmsReceived", handleSmsReceivedEvent);
    return () => {
      window.removeEventListener("bankSmsReceived", handleSmsReceivedEvent);
    };
  }, [queryClient]);

  // Fetch db notifications
  const { data: dbNotifications = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    }
  });

  const unreadCount = dbNotifications.filter((n: any) => !n.isRead).length;

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
      toast.success("All database notifications marked as read");
    }
  });

  // 3. Delete Notification from DB
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Notification deleted");
    }
  });

  // Dismiss / remove an offline SMS transaction alert from SharedPreferences
  const dismissOfflineSms = async (smsBody: string) => {
    try {
      const { registerPlugin } = await import("@capacitor/core");
      const LuminaBridge = registerPlugin<any>('LuminaBridge');
      const res = await LuminaBridge.getPendingSmsList();
      if (res && res.smsList) {
        const list = JSON.parse(res.smsList);
        const filtered = list.filter((s: string) => s !== smsBody);
        
        await LuminaBridge.savePendingSmsList({ smsList: JSON.stringify(filtered) });
        setOfflineSmsList(filtered);
      }
    } catch (e) {
      console.error("Failed to dismiss offline SMS:", e);
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.metadata?.isOfflinePending) {
      return; // Offline pending SMS must be logged first
    }
    
    if (!notif.isRead) {
      markReadMutation.mutate(notif._id);
    }

    // Direct routing to transaction edit mode if transactionId is logged
    if (notif.metadata?.transactionId) {
      router.push(`/dashboard/edit?id=${notif.metadata.transactionId}`);
    } else if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  // Directly log the transaction in the background
  const handleDirectLog = async (smsText: string, notifId: string, isOffline: boolean) => {
    setLoadingNotifId(notifId);
    try {
      const res = await api.post('/transactions/auto-log', { smsText });
      toast.success("Transaction auto-logged successfully!");
      
      // If it was offline pending, clear it from preferences queue
      if (isOffline) {
        await dismissOfflineSms(smsText);
      }
      
      // Refresh the query list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });

      // Automatically redirect to edit mode for the created transaction
      if (res.data?.transaction?._id) {
        router.push(`/dashboard/edit?id=${res.data.transaction._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to auto-log transaction");
    } finally {
      setLoadingNotifId(null);
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

  // Convert offline local pending SMS queue into mapped notification objects
  const offlineNotifications = offlineSmsList.map((smsText, index) => {
    const summary = getShortSummary(smsText);
    return {
      _id: `offline_${index}`,
      title: "TRANSACTION SMS",
      message: smsText,
      type: "transaction",
      createdAt: new Date().toISOString(),
      isRead: false,
      metadata: {
        smsText,
        isOfflinePending: true,
        summary
      }
    };
  });

  // Combine lists with offline pending alerts showing first
  const allNotifications = [...offlineNotifications, ...dbNotifications];

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
      ) : allNotifications.length === 0 ? (
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
        <div className="space-y-4">
          {allNotifications.map((notif) => {
            const isTransaction = notif.type === "transaction" || notif.metadata?.smsText;

            // Render custom popup-card layout for Transaction SMS items
            if (isTransaction) {
              const smsText = notif.metadata?.smsText || notif.message;
              const summary = notif.metadata?.summary || getShortSummary(smsText);
              const isOffline = !!notif.metadata?.isOfflinePending;
              const isLoadingSms = loadingNotifId === notif._id;
              
                            return (
                <div 
                  key={notif._id}
                  className={`glass-card bg-card/90 backdrop-blur-2xl border border-primary/20 shadow-lg rounded-2xl p-4 relative overflow-hidden animate-in fade-in duration-300 cursor-pointer ${
                    isOffline ? "ring-1 ring-primary/30" : ""
                  }`}
                  onClick={() => setExpandedNotifId(expandedNotifId === notif._id ? null : notif._id)}
                >
                  <div className="flex gap-4 items-center">
                    {/* Glow effect */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                    
                    {/* Glowing left message icon */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>

                    {/* Text details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5 flex items-center gap-1.5">
                        <span>{isOffline ? "TRANSACTION SMS (OFFLINE)" : "TRANSACTION SMS"}</span>
                        {expandedNotifId === notif._id ? <ChevronUp className="w-3 h-3 text-primary/60" /> : <ChevronDown className="w-3 h-3 text-primary/60" />}
                      </p>
                      <h4 className="text-xs font-bold text-foreground leading-tight truncate">{summary}</h4>
                      <p className={`text-[9px] text-muted-foreground mt-0.5 ${expandedNotifId === notif._id ? "whitespace-pre-wrap leading-relaxed" : "truncate"}`}>{smsText}</p>
                    </div>

                    {/* Action buttons matching the overlay popup */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isOffline ? (
                        <button 
                          onClick={() => handleDirectLog(smsText, notif._id, isOffline)}
                          disabled={isLoadingSms}
                          className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-75"
                          title="Log transaction directly"
                        >
                          {isLoadingSms ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                          )}
                        </button>
                      ) : (
                        notif.metadata?.transactionId && (
                          <button
                            onClick={() => router.push(`/dashboard/edit?id=${notif.metadata.transactionId}`)}
                            className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 active:scale-95 transition-all"
                            title="View/Edit transaction"
                          >
                            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        )
                      )}
                      
                      <button 
                        onClick={() => {
                          if (isOffline) {
                            dismissOfflineSms(smsText);
                          } else {
                            deleteMutation.mutate(notif._id);
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition-all"
                        title="Dismiss alert"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {expandedNotifId === notif._id && renderMessageJourney(notif)}
                </div>
              );
            }

            // Render standard security/system alerts layout
            return (
              <div 
                key={notif._id}
                className={`group flex items-start gap-4 p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                  notif.isRead 
                    ? "bg-card/40 border-border/50 hover:bg-accent/40" 
                    : "bg-primary/[0.03] border-primary/15 hover:bg-primary/[0.05]"
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                {!notif.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                )}

                {getNotifIcon(notif.type)}

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
            );
          })}
        </div>
      )}
    </div>
  );
}
