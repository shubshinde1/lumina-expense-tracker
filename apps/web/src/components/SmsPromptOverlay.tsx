"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowRight, X } from "lucide-react";

export default function SmsPromptOverlay() {
  const [smsData, setSmsData] = useState<{ sender: string; body: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleSmsEvent = (e: any) => {
      const { sender, body } = e.detail;
      setSmsData({ sender, body });
      setVisible(true);
      
      // Auto-hide notification after 15 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 15000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("bankSmsReceived", handleSmsEvent);
    return () => {
      window.removeEventListener("bankSmsReceived", handleSmsEvent);
    };
  }, []);

  if (!visible || !smsData) return null;

  // Extract a quick summary to show in the toast
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

  const handleLog = () => {
    setVisible(false);
    router.push(`/dashboard/add?sms=${encodeURIComponent(smsData.body)}`);
  };

  return (
    <div className="fixed top-4 inset-x-4 z-[9999] max-w-sm mx-auto animate-in slide-in-from-top-10 duration-500">
      <div className="glass-card bg-card/90 backdrop-blur-2xl border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl p-4 flex gap-4 items-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <MessageSquare className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Transaction SMS</p>
          <h4 className="text-xs font-bold text-foreground leading-tight truncate">{getShortSummary(smsData.body)}</h4>
          <p className="text-[9px] text-muted-foreground truncate mt-0.5">{smsData.body}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={handleLog}
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            title="Log transaction"
          >
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={() => setVisible(false)}
            className="w-8 h-8 rounded-lg bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition-all"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
