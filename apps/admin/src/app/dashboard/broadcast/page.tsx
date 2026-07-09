"use client";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Megaphone, Send, Info, Users, ShieldCheck, MailOpen, Bell, Mail, User, X } from "lucide-react";

export default function BroadcastPage() {
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    target: "all",
    channels: "both",
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch("/admin/users");
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return alert("Please fill in all fields.");

    if (formData.target === "specific" && selectedUsers.length === 0) {
      return alert("Please search and select at least one user account.");
    }

    const targetText = formData.target === "all"
      ? "ALL active users"
      : formData.target === "premium"
      ? "all PREMIUM users"
      : `${selectedUsers.length} specific user(s)`;

    const confirmSend = confirm(`Are you sure you want to send this broadcast via ${formData.channels === 'both' ? 'both Email & In-App' : formData.channels === 'email' ? 'Email' : 'In-App Notification'} to ${targetText}?`);
    if (!confirmSend) return;

    setLoading(true);
    try {
      const res = await apiFetch("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          target: formData.target === "specific" ? selectedUsers.map(u => u._id) : formData.target
        }),
      });
      alert(res.message || "Broadcast sent successfully!");
      setFormData({ subject: "", message: "", target: "all", channels: "both" });
      setSelectedUsers([]);
      setUserSearch("");
    } catch (err: any) {
      alert("Failed to send broadcast: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-500">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          Platform Broadcast <Megaphone className="w-5.5 h-5.5 text-[#6bfe9c]" />
        </h1>
        <p className="text-zinc-400 text-xs mt-0.5">Communicate with your user base via email & in-app notifications.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-5 rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Audience */}
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block">Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, target: "all" });
                      setSelectedUsers([]);
                      setUserSearch("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                      formData.target === "all"
                        ? "bg-[#6bfe9c]/10 border-[#6bfe9c] text-[#6bfe9c]"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <Users className="w-4 h-4" /> All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, target: "premium" });
                      setSelectedUsers([]);
                      setUserSearch("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                      formData.target === "premium"
                        ? "bg-amber-500/10 border-amber-500 text-amber-500"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" /> Premium
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, target: "specific" });
                      setSelectedUsers([]);
                      setUserSearch("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                      formData.target === "specific"
                        ? "bg-blue-500/10 border-blue-500 text-blue-400"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <User className="w-4 h-4" /> Specific
                  </button>
                </div>
              </div>

              {/* User search input (only shown if "Specific" target is selected) */}
              {formData.target === "specific" && (
                <div className="relative z-20" ref={dropdownRef}>
                  <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5 block">Search User Accounts</label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserSearch(val);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full bg-[#131315] border border-[#48474a] rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-colors placeholder:text-zinc-600"
                    />
                    {userSearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {/* Selected user badges */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                      {selectedUsers.map(u => (
                        <div 
                          key={u._id} 
                          className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-[10px] text-blue-300 font-semibold animate-in zoom-in-95 duration-150"
                        >
                          <span>{u.name} ({u.email})</span>
                          <button
                            type="button"
                            onClick={() => setSelectedUsers(prev => prev.filter(user => user._id !== u._id))}
                            className="text-blue-500 hover:text-blue-300 transition-colors p-0.5 cursor-pointer"
                            title="Remove recipient"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-[#131315] border border-[#48474a] rounded-lg shadow-xl max-h-[160px] overflow-y-auto custom-scrollbar">
                      {users
                        .filter(u => 
                          (u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                           u.email.toLowerCase().includes(userSearch.toLowerCase())) &&
                          !selectedUsers.some(selected => selected._id === u._id)
                        )
                        .slice(0, 10)
                        .map(u => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => {
                              setSelectedUsers(prev => [...prev, u]);
                              setUserSearch("");
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex flex-col cursor-pointer border-b border-[#48474a]/20 last:border-b-0"
                          >
                            <span className="font-semibold text-zinc-200">{u.name}</span>
                            <span className="text-[10px] text-zinc-500 mt-0.5">{u.email}</span>
                          </button>
                        ))}
                      {users.filter(u => 
                        (u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                         u.email.toLowerCase().includes(userSearch.toLowerCase())) &&
                        !selectedUsers.some(selected => selected._id === u._id)
                      ).length === 0 && (
                        <div className="px-3 py-3 text-xs text-zinc-600 italic">No matching users found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Channels */}
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block">Delivery Channels</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, channels: "in_app" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
                      formData.channels === "in_app"
                        ? "bg-[#6bfe9c]/10 border-[#6bfe9c] text-[#6bfe9c]"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <Bell className="w-4 h-4" /> In-App Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, channels: "email" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
                      formData.channels === "email"
                        ? "bg-[#6bfe9c]/10 border-[#6bfe9c] text-[#6bfe9c]"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Email Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, channels: "both" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
                      formData.channels === "both"
                        ? "bg-[#6bfe9c]/10 border-[#6bfe9c] text-[#6bfe9c]"
                        : "bg-[#131315] border-[#48474a] text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5" />
                      <span className="text-zinc-500">+</span>
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    Both
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. New Feature Announcement"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6bfe9c] transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block">Content Message</label>
                <textarea
                  rows={5}
                  placeholder="Type your broadcast message here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#131315] border border-[#48474a] rounded-lg px-4 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-[#6bfe9c] transition-all"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#6bfe9c] text-[#004a23] font-black uppercase tracking-widest py-3.5 rounded-lg hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_6px_20px_rgba(107,254,156,0.15)] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-[#004a23]/30 border-t-[#004a23] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Broadcast
                    </>
                  )}
                </button>
                <button
                   type="button"
                   onClick={() => setPreview(!preview)}
                   className="px-6 bg-zinc-800 text-zinc-300 font-bold rounded-lg border border-white/5 hover:bg-zinc-700 transition-colors cursor-pointer text-xs"
                >
                    {preview ? "Hide Preview" : "Preview"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          {/* Info Card */}
          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
             <div className="flex items-center gap-2.5 text-blue-400 mb-3 font-bold uppercase text-[10px]">
                 <Info className="w-3.5 h-3.5" /> Broadcast Info
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
            <div className="bg-[#131315] border border-[#6bfe9c]/20 p-6 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-[#6bfe9c] mb-6 font-bold uppercase text-[10px]">
                    Live Preview
                </div>
                <div className="p-6 bg-[#09090b] rounded-lg border border-[#27272a] shadow-2xl">
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
