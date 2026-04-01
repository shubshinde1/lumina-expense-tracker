'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Settings2, Loader2, ChevronDown, Edit3, X, Check } from "lucide-react";
import api from "@/lib/api";

const ICONS_LIST = [
  "wallet", "account_balance", "payments", "credit_card", "receipt_long", "savings", "store",
  "shopping_cart", "restaurant", "fastfood", "local_cafe", "local_bar", "flight", "directions_car",
  "commute", "local_gas_station", "healing", "medical_services", "fitness_center", "school",
  "menu_book", "movie", "sports_esports", "stadium", "checkroom", "child_care", "pets", "home",
  "water_damage", "bolt", "wifi", "phone_iphone", "music_note", "subscriptions", "card_giftcard",
  "volunteer_activism", "work", "business_center", "pedal_bike", "train", "subway", "directions_bus",
  "two_wheeler", "local_taxi", "ev_station", "oil_barrel", "plumbing", "handyman", "cleaning_services",
  "local_laundry_service", "iron", "toys", "beach_access", "celebration", "park", "nightlife",
  "hotel", "luggage", "airplane_ticket", "pool", "self_care", "spa", "medication", "monitor_heart",
  "glasses", "content_cut", "dry_cleaning", "shopping_bag", "local_mall", "dns", "computer", "devices",
  "print", "video_camera_front", "headphones", "mic", "camera_alt", "photo_camera", "brush", "palette",
  "sports_basketball", "sports_tennis", "sports_soccer", "electric_bolt", "gas_meter", "propane_tank",
  "water_drop", "attach_money", "currency_exchange", "price_change", "monetization_on",
  "account_balance_wallet", "receipt", "request_quote", "paid", "point_of_sale", "calculate",
  "account_circle", "currency_rupee", "currency_pound", "currency_yen", "currency_bitcoin"
];

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");
  const [newCatIcon, setNewCatIcon] = useState("wallet");
  const [newCatColor, setNewCatColor] = useState("#6bfe9c");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Edit States
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatType, setEditCatType] = useState<"expense" | "income">("expense");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [editCatColor, setEditCatColor] = useState("");
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);

  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    }
  });

  const createCatMutation = useMutation({
    mutationFn: async (payload: any) => await api.post('/categories', payload),
    onSuccess: () => {
      setNewCatName("");
      setShowIconPicker(false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => await api.put(`/categories/${id}`, payload),
    onSuccess: () => {
      setEditingCatId(null);
      setShowEditIconPicker(false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/categories/${id}`),
    onSuccess: () => {
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to delete category");
    }
  });

  const addSubMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => await api.post(`/categories/${id}/subcategories`, { name }),
    onSuccess: () => {
      setSubName("");
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const updateSubMutation = useMutation({
    mutationFn: async ({ catId, subId, name }: { catId: string, subId: string, name: string }) => await api.put(`/categories/${catId}/subcategories/${subId}`, { name }),
    onSuccess: () => {
      setEditingSubId(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const deleteSubMutation = useMutation({
    mutationFn: async ({ catId, subId }: { catId: string, subId: string }) => await api.delete(`/categories/${catId}/subcategories/${subId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to delete subcategory");
    }
  });

  const openEditCat = (cat: any) => {
    setEditingCatId(cat._id);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatColor(cat.color);
    setEditCatIcon(cat.icon);
    setExpanded(cat._id);
  };

  if (isLoading) return <div className="flex justify-center flex-col items-center gap-4 min-h-screen pb-20"><Loader2 className="animate-spin text-primary w-8 h-8" /><p className="text-xs uppercase  text-muted-foreground font-bold">Loading configs...</p></div>;

  return (
    <div className="p-6 md:p-12 space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-32 max-w-4xl mx-auto">
      
      {/* Header */}
      <header className="flex items-center justify-between pb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold  text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground  mt-1">Manage dictionary & sub-types.</p>
        </div>
        <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center border border-border shadow-sm">
          <Settings2 className="text-primary w-6 h-6" />
        </div>
      </header>

      {/* Add Category VIP Form */}
      <section className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm relative overflow-visible z-30">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Create Category</p>
        
        <div className="flex flex-col md:flex-row gap-3 relative z-10 w-full">
           <input
             type="text"
             placeholder="Category Name"
             value={newCatName}
             onChange={(e) => setNewCatName(e.target.value)}
             className="flex-1 bg-accent/50 border border-border rounded-2xl px-5 py-3.5 outline-none text-sm focus:border-primary transition-colors focus:bg-accent/80 font-medium w-full"
           />
           <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3 sm:h-14 mt-1 sm:mt-0">
             {/* Segmented Toggle Switch */}
             <div className="flex bg-accent/30 p-1.5 rounded-xl shrink-0 sm:min-w-[140px] col-span-3 sm:col-span-1 h-12 sm:h-full">
               <button
                 type="button"
                 onClick={() => setNewCatType('expense')}
                 className={`flex-1 flex items-center justify-center text-[10px] uppercase tracking-[0.15em] font-bold rounded-lg transition-all duration-300 ${newCatType === 'expense' ? 'bg-destructive/20 shadow-sm text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 Expense
               </button>
               <button
                 type="button"
                 onClick={() => setNewCatType('income')}
                 className={`flex-1 flex items-center justify-center text-[10px] uppercase tracking-[0.15em] font-bold rounded-lg transition-all duration-300 ${newCatType === 'income' ? 'bg-primary/20 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 Income
               </button>
             </div>

             <div className="relative group overflow-hidden rounded-xl border border-border cursor-pointer flex items-center justify-center bg-accent/50 hover:border-primary transition-colors h-12 sm:h-full sm:w-14">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="absolute -inset-8 w-24 h-24 cursor-pointer opacity-0"
                />
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-inner pt-2 pb-2" style={{backgroundColor: newCatColor}}></div>
             </div>

             <button
               type="button"
               onClick={() => setShowIconPicker(!showIconPicker)}
               className={`flex items-center justify-center gap-1 sm:gap-2 bg-accent/50 border rounded-xl sm:px-5 outline-none transition-colors cursor-pointer h-12 sm:h-full ${showIconPicker ? 'border-primary text-primary' : 'border-border hover:border-primary'}`}
             >
               <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{newCatIcon}</span>
               <span className="hidden sm:inline font-medium text-sm">Icon</span>
               <ChevronDown className={`hidden sm:block w-3.5 h-3.5 transition-transform duration-300 ${showIconPicker ? 'rotate-180' : ''}`} />
             </button>

             <button
               onClick={() => {
                 if (newCatName) createCatMutation.mutate({ name: newCatName, color: newCatColor, icon: newCatIcon, type: newCatType });
               }}
               disabled={createCatMutation.isPending || !newCatName}
               className="h-12 sm:h-full sm:px-5 bg-gradient-to-br from-primary to-[#1fc46a] rounded-xl flex items-center justify-center text-[#003417] active:scale-95 disabled:opacity-50 disabled:grayscale transition-all font-black border-2 border-primary/20"
             >
               <Plus className="w-5 h-5" strokeWidth={3} />
             </button>
           </div>
        </div>

        {/* Floating Icon Picker grid */}
         {showIconPicker && (
          <div className="absolute top-[85%] left-0 right-0 z-[100] bg-card/95 backdrop-blur-xl rounded-3xl p-5 border border-border mt-4 shadow-2xl h-56 overflow-y-auto grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2 animate-in slide-in-from-top-4 fade-in duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
             {ICONS_LIST.map(icon => (
                <button
                  key={icon}
                  onClick={() => { setNewCatIcon(icon); setShowIconPicker(false); }}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all ${newCatIcon === icon ? 'bg-primary/20 text-primary border border-primary/50 scale-105' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  title={icon}
                >
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </button>
             ))}
          </div>
         )}
      </section>

      {/* Categories Ledger List */}
      <section className="space-y-3 z-20 relative">
        {categories?.map((cat: any) => (
          <div key={cat._id} className="bg-card rounded-2xl border border-border overflow-visible transition-all shadow-sm relative">
            
            {editingCatId === cat._id ? (
              /* Inline Category Edit View */
              <div className="p-4 sm:p-5 bg-accent/30 rounded-2xl relative z-40">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-3">Editing Category</p>
                <div className="flex flex-col md:flex-row gap-3 relative z-10 w-full">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    className="flex-1 bg-card border border-border rounded-xl px-4 py-3 outline-none text-sm focus:border-primary transition-colors font-medium shadow-sm w-full"
                  />
                  <div className="grid grid-cols-4 sm:flex gap-2 sm:h-12 mt-1 sm:mt-0">
                     {/* Segmented Toggle Switch */}
                    <div className="flex bg-card border border-border p-1 rounded-xl shadow-sm col-span-4 sm:col-span-1 h-11 sm:h-full sm:min-w-[120px]">
                      <button
                        type="button"
                        onClick={() => setEditCatType('expense')}
                        className={`flex-1 flex items-center justify-center text-[9px] uppercase  font-bold rounded-lg transition-all duration-300 ${editCatType === 'expense' ? 'bg-destructive/20 shadow-sm text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Exp
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditCatType('income')}
                        className={`flex-1 flex items-center justify-center text-[9px] uppercase  font-bold rounded-lg transition-all duration-300 ${editCatType === 'income' ? 'bg-primary/20 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Inc
                      </button>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-border cursor-pointer flex items-center justify-center bg-card shadow-sm h-11 sm:h-full sm:w-12">
                        <input
                          type="color"
                          value={editCatColor}
                          onChange={(e) => setEditCatColor(e.target.value)}
                          className="absolute -inset-8 w-24 h-24 cursor-pointer opacity-0 z-10"
                        />
                        <div className="w-5 h-5 rounded shadow-inner" style={{backgroundColor: editCatColor}}></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                      className="flex items-center justify-center bg-card border border-border rounded-xl outline-none shadow-sm h-11 sm:h-full sm:px-3"
                    >
                      <span className="material-symbols-outlined text-[18px]">{editCatIcon}</span>
                    </button>

                    <button
                      onClick={() => {
                        updateCatMutation.mutate({ id: cat._id, payload: { name: editCatName, type: editCatType, color: editCatColor, icon: editCatIcon } });
                      }}
                      disabled={updateCatMutation.isPending || !editCatName}
                      className="h-11 sm:h-full sm:px-4 bg-primary text-[#003417] rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setEditingCatId(null); setShowEditIconPicker(false); }}
                      className="h-11 sm:h-full sm:px-3 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-xl flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Edit Floating Icon Picker grid */}
                {showEditIconPicker && (
                  <div className="absolute top-[100%] left-0 right-0 z-[100] bg-card/95 backdrop-blur-xl rounded-3xl p-5 border border-border mt-2 shadow-2xl h-56 overflow-y-auto grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2 animate-in slide-in-from-top-4 fade-in duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {ICONS_LIST.map(icon => (
                        <button
                          key={icon}
                          onClick={() => { setEditCatIcon(icon); setShowEditIconPicker(false); }}
                          className={`aspect-square rounded-xl flex items-center justify-center transition-all ${editCatIcon === icon ? 'bg-primary/20 text-primary border border-primary/50 scale-105' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                          title={icon}
                        >
                          <span className="material-symbols-outlined text-[20px]">{icon}</span>
                        </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Display Category View */
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/40 transition-colors group" 
                onClick={() => setExpanded(expanded === cat._id ? null : cat._id)}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-[1rem] flex items-center justify-center border group-hover:scale-105 transition-transform shadow-sm" 
                    style={{ backgroundColor: `${cat.color}15`, borderColor: `${cat.color}30`, color: cat.color }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold font-heading text-[15px]">{cat.name}</h4>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 mt-1">{cat.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm text-muted-foreground group-hover:bg-accent group-hover:text-foreground transition-all">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded === cat._id ? "rotate-180" : "rotate-0"}`} />
                  </div>
                </div>
              </div>
            )}

            {/* Subcategories (Expanded view) */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded === cat._id ? 'max-h-[800px] opacity-100 border-t border-border bg-accent/20' : 'max-h-0 opacity-0'}`}>
              <div className="p-5 space-y-3">
                
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-3 mb-4">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mt-1">Sub-categories</p>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditCat(cat); }} 
                      className="flex-1 sm:flex-none justify-center text-[10px] uppercase font-bold  text-primary hover:bg-primary/10 px-3 py-2 sm:py-1.5 rounded transition-colors flex items-center gap-1.5 bg-primary/5 sm:bg-transparent"
                    >
                       <Edit3 className="w-3 h-3"/> Edit Parent
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCatMutation.mutate(cat._id); }} 
                      className="flex-1 sm:flex-none justify-center text-[10px] uppercase font-bold  text-destructive hover:bg-destructive/10 px-3 py-2 sm:py-1.5 rounded transition-colors flex items-center gap-1.5 bg-destructive/5 sm:bg-transparent"
                    >
                       <Trash2 className="w-3 h-3"/> Delete Parent
                    </button>
                  </div>
                </div>

                {cat.subcategories?.map((sub: any) => (
                  <div key={sub._id} className="min-h-[48px] flex items-center justify-between bg-card rounded-xl px-4 py-2 border border-border/50 shadow-sm hover:border-border transition-colors group/sub">
                    
                    {editingSubId === sub._id ? (
                      <div className="flex flex-1 items-center gap-3 w-full">
                        <input
                          type="text"
                          value={editSubName}
                          onChange={(e) => setEditSubName(e.target.value)}
                          className="flex-1 bg-accent/50 border border-primary/50 rounded-lg px-3 py-1.5 outline-none text-sm focus:border-primary font-medium shadow-sm h-[36px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editSubName) {
                              updateSubMutation.mutate({ catId: cat._id, subId: sub._id, name: editSubName });
                            }
                          }}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => editSubName && updateSubMutation.mutate({ catId: cat._id, subId: sub._id, name: editSubName })}
                            className="bg-primary/20 text-primary w-9 h-9 rounded-lg flex flex-col items-center justify-center hover:bg-primary hover:text-[#003417] transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSubId(null)}
                            className="bg-muted text-muted-foreground w-9 h-9 flex flex-col items-center justify-center rounded-lg hover:bg-foreground hover:text-background transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold">{sub.name}</span>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/sub:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingSubId(sub._id); setEditSubName(sub.name); }} 
                            className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteSubMutation.mutate({ catId: cat._id, subId: sub._id }); }} 
                            className="text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if(subName) addSubMutation.mutate({ id: cat._id, name: subName });
                  }} 
                  className="flex items-center gap-3 mt-4"
                >
                  <input
                    type="text"
                    placeholder={`New ${cat.name} type...`}
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className="flex-1 bg-card border border-border rounded-xl px-4 py-3 outline-none text-sm focus:border-primary transition-colors focus:ring-1 focus:ring-primary shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!subName || addSubMutation.isPending}
                    className="h-[46px] px-6 rounded-xl bg-accent hover:bg-primary border border-border hover:border-primary/50 text-muted-foreground hover:text-black font-bold text-xs disabled:opacity-50 transition-all shadow-sm active:scale-95"
                  >
                    Add
                  </button>
                </form>

              </div>
            </div>

          </div>
        ))}
      </section>

    </div>
  );
}
