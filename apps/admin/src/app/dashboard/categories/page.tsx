"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Tags, Trash2, PlusCircle, Check } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", icon: "Wallet", color: "#6bfe9c", type: "expense" });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/admin/categories");
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/admin/categories", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setShowForm(false);
      setFormData({ name: "", icon: "Wallet", color: "#6bfe9c", type: "expense" });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this global category?")) return;
    try {
      await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold  text-white flex items-center gap-3">
            Global Categories <Tags className="w-6 h-6 text-[#6bfe9c]" />
          </h1>
          <p className="text-zinc-400 mt-1">Manage system-wide default tags for matching expenses and incomes.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#6bfe9c] hover:bg-[#6bfe9c]/90 text-[#004a23] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          Add Global Category
        </button>
      </header>

      {showForm && (
        <form onSubmit={createCategory} className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-6 rounded-3xl overflow-hidden mb-8 grid grid-cols-5 gap-4 shadow-[#6bfe9c]/5 shadow-[0_24px_48px_-12px] animate-in slide-in-from-top-4 duration-300">
          <div className="col-span-1">
             <label className="text-xs uppercase  text-zinc-400 font-medium mb-1.5 block">Type</label>
             <select 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full bg-[#131315] border border-[#48474a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] appearance-none"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs uppercase  text-zinc-400 font-medium mb-1.5 block">Name</label>
            <input 
              required
              placeholder="e.g. Subscriptions"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-[#131315] border border-[#48474a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c]"
            />
          </div>
          <div className="col-span-1">
             <label className="text-xs uppercase  text-zinc-400 font-medium mb-1.5 block">Icon</label>
             <input 
              required
              placeholder="Material Icon Name"
              value={formData.icon} 
              onChange={e => setFormData({...formData, icon: e.target.value})}
              className="w-full bg-[#131315] border border-[#48474a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c]"
            />
          </div>
          <div className="col-span-1 flex flex-col justify-end">
             <button type="submit" className="w-full h-[46px] bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
               <Check className="w-4 h-4" /> Save
             </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading Categories...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat._id} className="bg-[#1f1f22]/60 backdrop-blur-xl border border-[#48474a] p-5 rounded-2xl flex items-center justify-between group hover:border-zinc-500 transition-colors relative overflow-hidden">
               <div className="flex items-center gap-4">
                 <div 
                   className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 bg-[#131315]"
                 >
                    <span 
                      className="material-symbols-outlined text-[24px]"
                      style={{ color: cat.color }}
                    >
                      {cat.icon || "category"}
                    </span>
                 </div>
                 <div>
                   <h3 className="text-white font-semibold flex items-center gap-2">{cat.name}</h3>
                   <span className="text-xs uppercase  px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: `${cat.type === 'income' ? '#6bfe9c' : '#ff716c'}15`, color: cat.type === 'income' ? '#6bfe9c' : '#ff716c' }}>
                     {cat.type}
                   </span>
                 </div>
               </div>
               
               <button 
                  onClick={() => deleteCategory(cat._id)}
                  className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="col-span-3 text-center py-24 border border-dashed border-[#48474a] rounded-3xl text-zinc-500 text-sm">
              No global categories defined. Create one above to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
