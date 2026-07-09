'use client';

import { useThemeStore } from "@/stores/useThemeStore";
import { Moon, Sun, Check, Circle, Square, Settings as SettingsIcon, LogOut, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";

const COLORS = [
  { name: 'Neon Green', hex: '#6bfe9c' },
  { name: 'Purple', hex: '#d784ff' },
  { name: 'Blue', hex: '#60a5fa' },
  { name: 'Orange', hex: '#fb923c' },
  { name: 'Red', hex: '#ff716c' },
];

const RADIUS = [
  { name: 'Sharp', val: 0, icon: <Square /> },
  { name: 'Soft', val: 0.5, icon: <Square /> },
  { name: 'Round', val: 1.5, icon: <Circle /> },
];

export default function SettingsPage() {
  const { theme, setTheme, accentColor, setAccentColor, radius, setRadius } = useThemeStore();
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [autoOpenKeyboard, setAutoOpenKeyboard] = useState(user?.settings?.autoOpenKeyboard ?? true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleKeyboard = async (checked: boolean) => {
    setAutoOpenKeyboard(checked);
    setUpdatingSettings(true);
    try {
      const res = await api.put('/auth/settings', { autoOpenKeyboard: checked });
      if (user) {
        setUser({
          ...user,
          settings: res.data.settings
        });
      }
    } catch (err) {
      console.error("Failed to update user settings:", err);
      setAutoOpenKeyboard(!checked);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <div className="p-6 md:p-12 space-y-8 animate-in fade-in duration-500 pb-32 max-w-4xl mx-auto">

      <header className="flex items-center justify-between pb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold  text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground ">Customize your ledger.</p>
        </div>
        <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center border border-border shadow-sm">
          <SettingsIcon className="text-primary w-6 h-6" />
        </div>
      </header>

      {/* Profile Card */}
      <section className="glass-card w-full rounded-3xl p-6 bg-card/50 border border-border shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2" style={{ borderColor: accentColor }}>
          <span className="font-heading font-bold text-2xl" style={{ color: accentColor }}>{user?.name?.[0] || 'U'}</span>
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">{user?.name || 'User'}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="inline-block px-2 py-0.5 mt-2 text-[10px] uppercase  bg-accent rounded-full font-bold">
            {user?.plan || 'Free'} Plan
          </span>
        </div>
      </section>

      {/* Appearance Settings */}
      <section className="space-y-6">
        <h3 className="font-heading text-lg font-bold text-foreground">Appearance</h3>

        {/* Theme Toggle */}
        <div className="space-y-3">
          <p className="text-xs uppercase  text-muted-foreground font-bold">Theme Base</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-4 rounded-[var(--radius)] border transition-all ${theme === 'dark' ? 'bg-accent border-primary' : 'bg-card/50 border-border'}`}
            >
              <Moon className="w-5 h-5 text-foreground" />
              <span className="font-medium text-sm text-foreground">Dark</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-4 rounded-[var(--radius)] border transition-all ${theme === 'light' ? 'bg-accent border-primary' : 'bg-card/50 border-border'}`}
            >
              <Sun className="w-5 h-5 text-foreground" />
              <span className="font-medium text-sm text-foreground">Light</span>
            </button>
          </div>
        </div>

        {/* Accent Colors */}
        <div className="space-y-3">
          <p className="text-xs uppercase  text-muted-foreground font-bold">Accent Color</p>
          <div className="flex flex-wrap gap-4">
            {COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setAccentColor(c.hex)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: c.hex }}
              >
                {accentColor === c.hex && <Check className="text-black w-6 h-6" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Roundness */}
        <div className="space-y-3">
          <p className="text-xs uppercase  text-muted-foreground font-bold">Shape Geometry</p>
          <div className="grid grid-cols-3 gap-3">
            {RADIUS.map(r => (
              <button
                key={r.name}
                onClick={() => setRadius(r.val)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${radius === r.val ? 'bg-accent border-primary text-primary' : 'bg-card/50 border-border text-muted-foreground'}`}
              >
                {r.icon}
                <span className="font-medium text-[10px] uppercase ">{r.name}</span>
              </button>
            ))}
          </div>
          </div>
      </section>

      {/* Ledger Preferences */}
      <section className="space-y-4 pt-4 border-t border-border">
        <h3 className="font-heading text-lg font-bold text-foreground">Ledger Preferences</h3>
        
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-foreground">Auto-Open Keyboard</p>
              <p className="text-[10px] text-muted-foreground uppercase mt-0.5">Open keypad automatically on Add Transaction</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={autoOpenKeyboard} 
              disabled={updatingSettings}
              onChange={(e) => handleToggleKeyboard(e.target.checked)}
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-black"></div>
          </label>
        </div>
      </section>

      {/* Application Data */}
      <section className="space-y-4 pt-4 border-t border-border">
        <h3 className="font-heading text-lg font-bold text-foreground">Application Data</h3>

        <button
          onClick={() => router.push('/dashboard/categories')}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-foreground">Manage Configs</p>
              <p className="text-[10px] text-muted-foreground uppercase  mt-0.5">Categories & Subs</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-[var(--radius)] bg-destructive/10 text-destructive font-bold  active:scale-95 transition-all outline-none"
        >
          <LogOut className="w-5 h-5" />
          End Session
        </button>
      </section>

    </div>
  );
}
