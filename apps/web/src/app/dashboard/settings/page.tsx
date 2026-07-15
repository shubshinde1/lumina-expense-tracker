'use client';

import { useThemeStore } from "@/stores/useThemeStore";
import {
  Moon,
  Sun,
  Check,
  Circle,
  Square,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Keyboard,
  MessageSquare,
  User,
  Sliders,
  Landmark
} from "lucide-react";
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
  { name: 'Sharp', val: 0, icon: <Square className="w-4 h-4" /> },
  { name: 'Soft', val: 0.5, icon: <Square className="w-4 h-4 rounded-md" /> },
  { name: 'Round', val: 1.5, icon: <Circle className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const { theme, setTheme, accentColor, setAccentColor, radius, setRadius } = useThemeStore();
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [autoOpenKeyboard, setAutoOpenKeyboard] = useState(user?.settings?.autoOpenKeyboard ?? true);
  const [smsParserActive, setSmsParserActive] = useState(user?.settings?.smsParserActive ?? true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state with store if user changes
  useEffect(() => {
    if (user?.settings) {
      setAutoOpenKeyboard(user.settings.autoOpenKeyboard ?? true);
      setSmsParserActive(user.settings.smsParserActive ?? true);
    }
  }, [user]);

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

  const handleToggleSmsParser = async (checked: boolean) => {
    setSmsParserActive(checked);
    setUpdatingSettings(true);
    try {
      const res = await api.put('/auth/settings', { smsParserActive: checked });
      if (user) {
        setUser({
          ...user,
          settings: res.data.settings
        });
      }
    } catch (err) {
      console.error("Failed to update user settings:", err);
      setSmsParserActive(!checked);
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
    <div className="space-y-6 animate-in fade-in duration-500 select-none">

      {/* Profile Card (Top card) */}
      <section className="bg-white dark:bg-[#1c1c1e] rounded-[28px] p-5 flex items-center gap-4 shadow-sm border border-zinc-200 dark:border-zinc-800/30">
        <div
          className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-[#2c2c2e] flex items-center justify-center border-2 shadow-inner shrink-0"
          style={{ borderColor: accentColor }}
        >
          <span className="font-heading font-black text-xl" style={{ color: accentColor }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-zinc-900 dark:text-white text-base tracking-tight truncate">{user?.name || 'User'}</h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user?.email}</p>
          <div className="mt-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-0.5 text-[9px] uppercase tracking-wider rounded-full font-black border"
              style={{
                color: accentColor,
                borderColor: `${accentColor}30`,
                backgroundColor: `${accentColor}10`
              }}
            >
              <User className="w-3 h-3" />
              {user?.plan || 'Free'} Plan
            </span>
          </div>
        </div>
      </section>

      {/* Section 1: Appearance */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-4">Appearance</span>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800/30 divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-900 dark:text-white">

          {/* Row 1: Theme Base */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400 shrink-0">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Theme Base</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Choose Dark or Light base mode</p>
              </div>
            </div>
            <div className="flex bg-zinc-100 dark:bg-[#2c2c2e] p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700/30 shrink-0">
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${theme === 'dark'
                    ? 'bg-white dark:bg-[#3a3a3c] text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-350'
                  }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${theme === 'light'
                    ? 'bg-white dark:bg-[#3a3a3c] text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-350'
                  }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Row 2: Accent Color */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-teal-500/10 text-teal-400 shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Accent Color</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Highlight color of application elements</p>
              </div>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              {COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => setAccentColor(c.hex)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 relative border border-black/40 cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: accentColor === c.hex ? `0 0 10px ${c.hex}40` : 'none'
                  }}
                >
                  {accentColor === c.hex && <Check className="text-black w-3.5 h-3.5" strokeWidth={4} />}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Roundness */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 shrink-0">
                <Circle className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Roundness</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Roundness level of component edges</p>
              </div>
            </div>
            <div className="flex bg-zinc-100 dark:bg-[#2c2c2e] p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700/30 shrink-0">
              {RADIUS.map(r => (
                <button
                  key={r.name}
                  onClick={() => setRadius(r.val)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${radius === r.val
                      ? 'bg-white dark:bg-[#3a3a3c] text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-350'
                    }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Section 2: Ledger Preferences */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-4">Ledger Preferences</span>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800/30 divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-900 dark:text-white">

          {/* Row 1: Auto-Open Keyboard */}
          <div className="px-5 py-4.5 flex items-center justify-between gap-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/10 transition-colors duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-400 shrink-0">
                <Keyboard className="w-4.5 h-4.5" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Auto-Open Keyboard</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Pop keypad up automatically on Add Transaction</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={autoOpenKeyboard}
                disabled={updatingSettings}
                onChange={(e) => handleToggleKeyboard(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm"
                style={{
                  backgroundColor: autoOpenKeyboard ? accentColor : undefined,
                }}
              ></div>
            </label>
          </div>

          {/* Row 2: SMS Transaction Parser */}
          <div className="px-5 py-4.5 flex items-center justify-between gap-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/10 transition-colors duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/10 text-green-400 shrink-0">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">SMS Transaction Parser</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Log transactions from incoming banking SMS text alerts</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={smsParserActive}
                disabled={updatingSettings}
                onChange={(e) => handleToggleSmsParser(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm"
                style={{
                  backgroundColor: smsParserActive ? accentColor : undefined,
                }}
              ></div>
            </label>
          </div>

        </div>
      </div>

      {/* Section 3: Application Configs */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-4">Application Data</span>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800/30 text-zinc-900 dark:text-white">

          {/* Row 1: Manage Configs */}
          <button
            onClick={() => router.push('/dashboard/categories')}
            className="w-full px-5 py-4.5 flex items-center justify-between gap-4 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e] transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-pink-500/10 text-pink-400 shrink-0">
                <SettingsIcon className="w-4.5 h-4.5" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Manage Configs</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Setup Categories & Subcategories</p>
              </div>
            </div>
            <ChevronRight 
              className="w-5 h-5 text-zinc-400 dark:text-zinc-600"
            />
          </button>

          {/* Row 2: Manage Payment Modes */}
          <button
            onClick={() => router.push('/dashboard/payment-modes')}
            className="w-full px-5 py-4.5 flex items-center justify-between gap-4 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e] border-t border-zinc-200 dark:border-zinc-800/60 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/10 text-cyan-400 shrink-0">
                <Landmark className="w-4.5 h-4.5" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Payment Modes</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5 truncate">Setup UPI, Cards & Bank Accounts</p>
              </div>
            </div>
            <ChevronRight 
              className="w-5 h-5 text-zinc-400 dark:text-zinc-600"
            />
          </button>

        </div>
      </div>

      {/* Section 4: Session Control */}
      <div className="space-y-2 pt-4">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800/30 text-zinc-900 dark:text-white">

          {/* Row 1: End Session */}
          <button
            onClick={handleLogout}
            className="w-full px-5 py-4.5 flex items-center justify-between gap-4 hover:bg-red-500/5 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm text-red-400">End Session</p>
                <p className="text-[10px] text-red-400/60 uppercase mt-0.5 truncate">Log out from your current user account</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400/40" />
          </button>

        </div>
      </div>

    </div>
  );
}
