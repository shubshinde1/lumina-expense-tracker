
'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, MapPin } from "lucide-react";
import Link from "next/link";
import AmountInput from "@/components/AmountInput";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/lib/api";
import { toLocalDateTimeLocal, fromLocalDateTimeLocal } from "@/lib/dateUtils";
import { Geolocation } from "@capacitor/geolocation";

export default function EditTransactionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
      <EditContent />
    </Suspense>
  );
}

function EditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  
  const [isMounted, setIsMounted] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [subPaymentMode, setSubPaymentMode] = useState("");
  const [locationObj, setLocationObj] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isMounted && !user) {
      router.push("/");
    }
  }, [user, router, isMounted]);

  // Auto-fetch location on mount
  useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      try {
        setIsFetchingLocation(true);
        // On mobile, this will trigger the system permission popup if not already granted
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        if (!mounted) return;
        const { latitude, longitude } = position.coords;
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const place = data.address?.city || data.address?.town || data.address?.village || data.address?.state || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationObj({ lat: latitude, lng: longitude, address: place });
        } catch (e) {
          setLocationObj({ lat: latitude, lng: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        }
      } catch (error: any) {
        if (!mounted) return;
        console.warn("Location error:", error.message || "Denied/Unavailable");
      } finally {
        if (mounted) setIsFetchingLocation(false);
      }
    };

    fetchLocation();
    return () => { mounted = false; };
  }, []);

  const { data: transaction, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await api.get(`/transactions/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  const { data: categories, isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    }
  });

  const { data: paymentModes = [], isLoading: isLoadingPayModes } = useQuery<any[]>({
    queryKey: ['paymentModes'],
    queryFn: async () => {
      const response = await api.get('/payment-modes');
      return response.data || [];
    }
  });

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || "");
      setDate(toLocalDateTimeLocal(transaction.date));
      setCategoryId(transaction.category);
      setSubcategoryId(transaction.subcategory || "");
      setPaymentMode(transaction.paymentMode || "UPI");
      setSubPaymentMode(transaction.subPaymentMode || "");
      setLocationObj(transaction.location || null);
    }
  }, [transaction]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put(`/transactions/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.push('/dashboard/history');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to edit transaction");
    }
  });

  if (!isMounted) return null;
  if (!user) return null;
  if (!id) return <div className="p-12 text-center text-muted-foreground">Error: No ID Provided</div>;
  if (isLoadingTx) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const filteredCategories = (categories || []).filter((c: any) => c.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = amount.split('+').reduce((sum, val) => sum + (Number(val) || 0), 0);
    if (!finalAmount || !categoryId) return alert("Please fill amount and category");

    mutation.mutate({
      type,
      amount: finalAmount,
      description,
      date: fromLocalDateTimeLocal(date).toISOString(),
      category: categoryId,
      subcategory: subcategoryId || undefined,
      location: locationObj || undefined,
      paymentMode,
      subPaymentMode: subPaymentMode || undefined,
    });
  };

  if (!id) return <div className="p-12 text-center text-muted-foreground">Error: No ID Provided</div>;

  if (isLoadingTx) {
    return <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard/history"
          className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border/50 shadow-sm hover:bg-accent transition-colors"
        >
          <ArrowLeft className="text-foreground w-5 h-5" />
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex p-1.5 bg-card/50 rounded-full">
          <button
            type="button"
            onClick={() => { setType('expense'); setCategoryId(""); }}
            className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all duration-300 ${type === 'expense' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => { setType('income'); setCategoryId(""); }}
            className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all duration-300 ${type === 'income' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Income
          </button>
        </div>

        <div className="group relative">
          <label className="block font-medium text-xs text-muted-foreground mb-3 tracking-widest uppercase text-center">Amount</label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div className="w-full rounded-3xl p-6 bg-card border border-border space-y-6 shadow-xl">
          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3 tracking-widest uppercase">Category</label>
            {isLoadingCats ? (
              <div className="h-14 flex items-center justify-center bg-accent rounded-xl"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredCategories.map((c: any) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setCategoryId(c._id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      categoryId === c._id 
                        ? 'bg-accent/40 shadow-sm' 
                        : 'bg-card/30 border-border/80 hover:bg-card/50'
                    }`}
                    style={categoryId === c._id ? { borderColor: c.color, backgroundColor: `${c.color}15` } : {}}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-all duration-300"
                      style={{ 
                        backgroundColor: categoryId === c._id ? `${c.color}22` : `${c.color}0d`,
                      }}
                    >
                      <span 
                        className="material-symbols-outlined text-lg transition-colors duration-200" 
                        style={{ color: c.color }}
                      >
                        {c.icon}
                      </span>
                    </div>
                    <span className="text-[10px] truncate w-full text-center text-muted-foreground font-semibold">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredCategories.find((c: any) => c._id === categoryId)?.subcategories?.length > 0 && (
            <div className="group relative animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block font-medium text-xs text-muted-foreground mb-3 tracking-widest uppercase">Sub-Category</label>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.find((c: any) => c._id === categoryId)?.subcategories?.map((sub: any) => (
                  <button
                    key={sub._id}
                    type="button"
                    onClick={() => setSubcategoryId(sub._id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${subcategoryId === sub._id ? 'bg-primary text-black' : 'bg-accent text-muted-foreground hover:text-foreground'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3 tracking-widest uppercase">Description (Optional)</label>
            <input
              className="w-full h-14 px-6 bg-accent rounded-xl border-none ring-1 ring-border focus:ring-primary focus:bg-secondary outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50"
              placeholder="E.g., Dinner with friends"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3 tracking-widest uppercase">Date</label>
            <input
              className="w-full h-14 px-6 bg-accent rounded-xl border-none ring-1 ring-border focus:ring-primary focus:bg-secondary outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Payment Mode */}
          <div className="group relative space-y-3">
            <label className="block font-medium text-xs text-muted-foreground uppercase">
              Payment Mode
            </label>
            {isLoadingPayModes ? (
              <div className="h-10 flex items-center justify-center bg-card/50 rounded-xl"><Loader2 className="animate-spin text-muted-foreground w-4 h-4" /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {paymentModes.map((mode: any) => (
                  <button
                    key={mode._id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.name);
                      setSubPaymentMode("");
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      paymentMode === mode.name 
                        ? 'bg-foreground text-background shadow-sm' 
                        : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            )}

            {/* Sub-Payment Mode Selector */}
            {paymentModes.find((m: any) => m.name === paymentMode)?.subPaymentModes?.length > 0 && (
              <div className="group relative pt-1 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block font-medium text-[10px] text-muted-foreground uppercase mb-2">
                  Sub Payment Mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {paymentModes.find((m: any) => m.name === paymentMode)?.subPaymentModes.map((sub: any) => (
                    <button
                      key={sub._id}
                      type="button"
                      onClick={() => setSubPaymentMode(sub.name)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        subPaymentMode === sub.name 
                          ? 'bg-primary text-black shadow-sm' 
                          : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="group relative pt-4 pb-2 border-t border-border mt-6">
             <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className={`p-2 rounded-full ${isFetchingLocation ? 'bg-primary/20 text-primary animate-pulse' : locationObj ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'}`}>
                  {isFetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4"/>}
                </div>
                <div className="flex-1">
                   <p className="font-semibold text-foreground text-xs uppercase tracking-widest flex items-center justify-between">
                      Device Location
                      {locationObj && <span className="text-[10px] text-muted-foreground font-mono bg-accent px-1.5 py-0.5 rounded opacity-50">{locationObj.lat.toFixed(2)}, {locationObj.lng.toFixed(2)}</span>}
                   </p>
                   <p className="text-[11px] truncate mt-0.5">
                     {isFetchingLocation ? "Acquiring GPS fix..." : locationObj ? locationObj.address : "Location access denied or unavailable"}
                   </p>
                </div>
             </div>
          </div>
        </div>

        <button
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 h-16 mt-8 bg-primary text-primary-foreground font-heading font-bold text-lg rounded-xl shadow-[0_12px_24px_-8px_var(--tw-shadow-color)] [--tw-shadow-color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
        >
          {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Update Changes
        </button>
      </form>
    </div>
  );
}
