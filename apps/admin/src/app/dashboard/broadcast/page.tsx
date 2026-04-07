"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Megaphone, Send, Info, Users, ShieldCheck, MailOpen } from "lucide-react";

export default function BroadcastPage() {
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    target: "all",
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return alert("Please fill in all fields.");

    const confirmSend = confirm(`Are you sure you want to send this broadcast to ${formData.target === 'all' ? 'ALL active users' : 'all PREMIUM users'}?`);
    if (!confirmSend) return;

    setLoading(true);
    try {
      const res = await apiFetch("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      alert(res.message || "Broadcast sent successfully!");
      setFormData({ subject: "", message: "", target: "all" });
    } catch (err: any) {
      alert("Failed to send broadcast: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          Platform Broadcast <Megaphone className="w-6 h-6 text-[#6bfe9c]" />
        </h1>
        <p className="text-zinc-400 mt-1">Communicate with your user base via email & in-app notifications.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-8 rounded-3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Audience */}
              <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Target Audience</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, target: "all" })}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all ${
                      formData.target === "all"
                        ? "bg-[#6bfe9c]/10 border-[#6bfe9c] text-[#6bfe9c]"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <Users className="w-4 h-4" /> All Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, target: "premium" })}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all ${
                      formData.target === "premium"
                        ? "bg-amber-500/10 border-amber-500 text-amber-500"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" /> Premium Only
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. New Feature Announcement"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#131315] border border-[#48474a] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#6bfe9c] transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-3 block">Content Message</label>
                <textarea
                  rows={8}
                  placeholder="Type your broadcast message here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#131315] border border-[#48474a] rounded-2xl px-5 py-4 text-white resize-none focus:outline-none focus:border-[#6bfe9c] transition-all"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#6bfe9c] text-[#004a23] font-black uppercase tracking-widest py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(107,254,156,0.2)] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-[#004a23]/30 border-t-[#004a23] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> Send Broadcast
                    </>
                  )}
                </button>
                <button
                   type="button"
                   onClick={() => setPreview(!preview)}
                   className="px-8 bg-zinc-800 text-zinc-300 font-bold rounded-2xl border border-white/5 hover:bg-zinc-700 transition-colors"
                >
                    {preview ? "Hide Preview" : "Preview"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl">
             <div className="flex items-center gap-3 text-blue-400 mb-4 font-bold uppercase text-xs">
                 <Info className="w-4 h-4" /> Broadcast Info
             </div>
             <p className="text-zinc-400 text-sm leading-relaxed">
                 Broadcasts are sent via SMTP/Resend API. To prevent spam triggers, we recommend keeping messages concise and relevant.
             </p>
             <div className="mt-6 space-y-3">
                 <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                     <MailOpen className="w-3 h-3" /> Average open rate: 24%
                 </div>
             </div>
          </div>

          {/* Real-time Preview Area */}
          {preview && (
            <div className="bg-[#131315] border border-[#6bfe9c]/20 p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-[#6bfe9c] mb-6 font-bold uppercase text-[10px]">
                    Live Preview
                </div>
                <div className="p-6 bg-[#09090b] rounded-2xl border border-[#27272a] shadow-2xl">
                    <h2 className="text-[#6bfe9c] font-black text-lg mb-4">WEALTHY UPDATE</h2>
                    <div className="h-[1px] bg-[#27272a] mb-4" />
                    <p className="text-zinc-400 text-sm break-words whitespace-pre-wrap">
                        {formData.message || "Your message will appear here..."}
                    </p>
                    <div className="mt-10 pt-4 border-t border-[#27272a] text-[9px] text-zinc-600">
                        You're receiving this as a registered user of Wealthy.
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
