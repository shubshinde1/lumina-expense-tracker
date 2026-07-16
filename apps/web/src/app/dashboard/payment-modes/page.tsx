'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, ChevronDown, Edit3, X, Check, ArrowLeft, Landmark, CloudOff } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

export default function PaymentModesPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  
  const [newModeName, setNewModeName] = useState("");
  const [editingModeId, setEditingModeId] = useState<string | null>(null);
  const [editModeName, setEditModeName] = useState("");

  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");

  // Query: Fetch all payment modes (global + user)
  const { data: paymentModes = [], isLoading } = useQuery<any[]>({
    queryKey: ['paymentModes'],
    queryFn: async () => {
      const response = await api.get('/payment-modes');
      return response.data || [];
    }
  });

  // Mutation: Create parent payment mode
  const createModeMutation = useMutation({
    mutationFn: async (name: string) => await api.post('/payment-modes', { name }),
    onSuccess: () => {
      setNewModeName("");
      queryClient.invalidateQueries({ queryKey: ['paymentModes'] });
    }
  });

  // Mutation: Update parent payment mode
  const updateModeMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => await api.put(`/payment-modes/${id}`, { name }),
    onSuccess: () => {
      setEditingModeId(null);
      queryClient.invalidateQueries({ queryKey: ['paymentModes'] });
    }
  });

  // Mutation: Delete parent payment mode
  const deleteModeMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/payment-modes/${id}`),
    onSuccess: () => {
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ['paymentModes'] });
    }
  });

  // Mutation: Add sub-payment mode
  const addSubMutation = useMutation({
    mutationFn: async ({ modeId, name }: { modeId: string, name: string }) => 
      await api.post(`/payment-modes/${modeId}/subpaymentmodes`, { name }),
    onSuccess: () => {
      setSubName("");
      queryClient.invalidateQueries({ queryKey: ['paymentModes'] });
    }
  });

  // Mutation: Update sub-payment mode
  const updateSubMutation = useMutation({
    mutationFn: async ({ modeId, subId, name }: { modeId: string, subId: string, name: string }) => 
      await api.put(`/payment-modes/${modeId}/subpaymentmodes/${subId}`, { name }),
    onSuccess: () => {
      setEditingSubId(null);
      queryClient.invalidateQueries({ queryKey: ['paymentModes'] });
    }
  });

  // Mutation: Delete sub-payment mode
  const deleteSubMutation = useMutation({
    mutationFn: async ({ modeId, subId }: { modeId: string, subId: string }) => 
      await api.delete(`/payment-modes/${modeId}/subpaymentmodes/${subId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentModes'] });
    }
  });

  const handleCreateMode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModeName.trim()) return;
    createModeMutation.mutate(newModeName.trim());
  };

  const handleAddSub = (modeId: string) => {
    if (!subName.trim()) return;
    addSubMutation.mutate({ modeId, name: subName.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center flex-col items-center gap-4 min-h-screen pb-20">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="text-xs uppercase text-muted-foreground font-bold">Loading payment modes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Navigation Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="w-10 h-10 bg-card border border-border/50 flex items-center justify-center rounded-xl shadow-sm hover:bg-accent transition-colors"
        >
          <ArrowLeft className="text-foreground w-5 h-5" />
        </Link>
      </header>

      {/* Add Custom Payment Mode Form */}
      <section className="bg-card rounded-[28px] p-6 border border-border shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-4">Create Payment Mode</p>
        
        <form onSubmit={handleCreateMode} className="flex gap-2.5 w-full">
          <input
            type="text"
            placeholder="e.g. E-Wallet, Voucher Card..."
            value={newModeName}
            onChange={(e) => setNewModeName(e.target.value)}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/40 font-medium"
          />
          <button
            type="submit"
            disabled={createModeMutation.isPending}
            className="bg-primary hover:bg-primary/95 text-black px-4 rounded-xl flex items-center justify-center transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {createModeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </form>
      </section>

      {/* Payment Modes Grid List */}
      <section className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground px-4">Available Modes</p>
        
        <div className="space-y-3.5">
          {paymentModes.map((mode: any) => (
            <div 
              key={mode._id} 
              className="bg-card rounded-[24px] overflow-hidden border border-border shadow-sm transition-all"
            >
              
              {/* Parent Payment Mode Header Bar */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  {editingModeId === mode._id ? (
                    <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                      <input
                        type="text"
                        value={editModeName}
                        onChange={(e) => setEditModeName(e.target.value)}
                        className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none w-full"
                      />
                      <button
                        onClick={() => updateModeMutation.mutate({ id: mode._id, name: editModeName })}
                        className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingModeId(null)}
                        className="p-1.5 bg-muted text-muted-foreground rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-left">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                        {mode.name}
                        {mode.isGlobal && (
                          <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">System</span>
                        )}
                        {mode.isOffline && (
                          <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold border border-border flex items-center gap-0.5"><CloudOff className="w-2 h-2"/>Offline</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                        {mode.subPaymentModes?.length || 0} sub-modes configured
                      </p>
                    </div>
                  )}
                </div>

                {/* Parent Actions */}
                <div className="flex items-center gap-2">
                  {!mode.isGlobal && editingModeId !== mode._id && (
                    <>
                      <button
                        onClick={() => {
                          setEditingModeId(mode._id);
                          setEditModeName(mode.name);
                        }}
                        className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteModeMutation.mutate(mode._id)}
                        className="p-2 hover:bg-red-500/10 text-red-400/80 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === mode._id ? null : mode._id)}
                    className={`p-2 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-transform duration-300 cursor-pointer ${
                      expanded === mode._id ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-Payment Modes Nested Panel */}
              {expanded === mode._id && (
                <div className="px-4 pb-4 pt-2 bg-muted/40 border-t border-border space-y-4">
                  
                  {/* Create Sub-Payment Mode Row */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Add sub-mode under ${mode.name}...`}
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none w-full"
                    />
                    <button
                      onClick={() => handleAddSub(mode._id)}
                      disabled={addSubMutation.isPending}
                      className="bg-secondary hover:bg-secondary/80 text-foreground px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-border"
                    >
                      Add
                    </button>
                  </div>

                  {/* Sub-Payment Modes list */}
                  <div className="space-y-1.5">
                    {mode.subPaymentModes?.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground uppercase text-center py-2">No sub-modes configured yet</p>
                    ) : (
                      mode.subPaymentModes.map((sub: any) => (
                        <div 
                          key={sub._id} 
                          className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border"
                        >
                          {editingSubId === sub._id ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editSubName}
                                onChange={(e) => setEditSubName(e.target.value)}
                                className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none w-full"
                              />
                              <button
                                onClick={() => updateSubMutation.mutate({ modeId: mode._id, subId: sub._id, name: editSubName })}
                                className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingSubId(null)}
                                className="p-1 bg-muted text-muted-foreground rounded-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs text-foreground font-bold flex items-center gap-1.5">
                              {sub.name}
                              {sub.isOffline && (
                                <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold border border-border flex items-center gap-0.5"><CloudOff className="w-2 h-2"/>Offline</span>
                              )}
                            </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingSubId(sub._id);
                                    setEditSubName(sub.name);
                                  }}
                                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteSubMutation.mutate({ modeId: mode._id, subId: sub._id })}
                                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
