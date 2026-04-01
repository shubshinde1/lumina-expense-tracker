'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, MapPin } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

function AddTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Selected State
  const initialType = (searchParams.get('type') as "expense" | "income") || "expense";
  const [type, setType] = useState<"expense" | "income">(initialType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [locationObj, setLocationObj] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Auto-fetch location on mount
  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!mounted) return;
          const { latitude, longitude } = position.coords;
          try {
            // Optional: Reverse geocode to get a readable name (fallback to lat,lon)
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const place = data.address?.city || data.address?.town || data.address?.village || data.address?.state || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocationObj({ lat: latitude, lng: longitude, address: place });
          } catch (e) {
            setLocationObj({ lat: latitude, lng: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
          } finally {
            setIsFetchingLocation(false);
          }
        },
        (error) => {
          if (!mounted) return;
          console.warn("Location error:", error.message || "Denied/Unavailable");
          setIsFetchingLocation(false);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    }
    return () => { mounted = false; };
  }, []);

  const { data: categories, isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    }
  });

  const filteredCategories = (categories || []).filter((c: any) => c.type === type);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/transactions', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      router.push('/dashboard');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to add transaction");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return alert("Please fill amount and category");

    mutation.mutate({
      type,
      amount: Number(amount),
      description,
      date,
      category: categoryId,
      subcategory: subcategoryId || undefined,
      location: locationObj || undefined,
      paymentMode,
    });
  };

  return (
    <div className="p-6 md:p-12 space-y-8 animate-in slide-in-from-bottom duration-500 pb-32 max-w-3xl mx-auto">

      {/* Header Info */}
      <header className="flex items-center gap-4 pb-4">
        <Link
          href="/dashboard"
          className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center border border-border shadow-sm hover:bg-accent transition-colors"
        >
          <ArrowLeft className="text-foreground w-6 h-6" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold  text-foreground">Add Entry</h1>
          <p className="text-sm text-muted-foreground ">Record a new transaction.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Type Toggle */}
        <div className="flex p-1.5 bg-card/50 rounded-full">
          <button
            type="button"
            onClick={() => { setType('expense'); setCategoryId(""); }}
            className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all duration-300 ${type === 'expense' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => { setType('income'); setCategoryId(""); }}
            className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all duration-300 ${type === 'income' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Income
          </button>
        </div>

        {/* Amount */}
        <div className="group relative">
          <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase text-center">
            Amount
          </label>
          <div className="relative text-center">
            {/* <span className="absolute left-1/2 -ml-16 top-1/2 -translate-y-1/2 text-3xl font-heading text-muted-foreground/50">₹</span> */}
            <input
              className="w-full text-center bg-transparent border-none focus:ring-0 outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50 font-heading text-5xl font-bold"
              placeholder="0.00"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full rounded-3xl p-6 bg-card border border-border space-y-6 shadow-xl">

          {/* Category Selector */}
          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
              Category
            </label>
            {isLoadingCats ? (
              <div className="h-14 flex items-center justify-center bg-accent rounded-xl"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredCategories.map((c: any) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setCategoryId(c._id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${categoryId === c._id ? 'bg-accent border-primary/50' : 'bg-card/50 border-border hover:border-border'
                      }`}
                  >
                    <span className="material-symbols-outlined mb-1" style={{ color: c.color }}>{c.icon}</span>
                    <span className="text-[10px] truncate w-full text-center text-muted-foreground">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subcategory Selector */}
          {filteredCategories.find((c: any) => c._id === categoryId)?.subcategories?.length > 0 && (
            <div className="group relative animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
                Sub-Category
              </label>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.find((c: any) => c._id === categoryId)?.subcategories?.map((sub: any) => (
                  <button
                    key={sub._id}
                    type="button"
                    onClick={() => setSubcategoryId(sub._id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${subcategoryId === sub._id ? 'bg-primary text-black' : 'bg-accent text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
              Description (Optional)
            </label>
            <input
              className="w-full h-14 px-6 bg-accent rounded-xl border-none ring-1 ring-border focus:ring-primary focus:bg-secondary outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50"
              placeholder="E.g., Dinner with friends"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
              Date
            </label>
            <input
              className="w-full h-14 px-6 bg-accent rounded-xl border-none ring-1 ring-border focus:ring-primary focus:bg-secondary outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Payment Mode */}
          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
              Payment Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all ${paymentMode === mode ? 'bg-foreground text-background shadow-md' : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="group relative pt-4 pb-2 border-t border-border mt-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className={`p-2 rounded-full ${isFetchingLocation ? 'bg-primary/20 text-primary animate-pulse' : locationObj ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'}`}>
                {isFetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-xs uppercase  flex items-center justify-between">
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
          Record {type}
        </button>
      </form>
    </div>
  );
}

export default function AddTransactionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>}>
      <AddTransactionForm />
    </Suspense>
  );
}
