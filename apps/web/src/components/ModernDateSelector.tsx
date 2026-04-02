'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DateSelectorProps {
  onDateChange: (date: Date) => void;
  selectedDate: Date;
}

export default function ModernDateSelector({ onDateChange, selectedDate }: DateSelectorProps) {
  const years = [2026, 2025, 2024];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth());
  const [day, setDay] = useState(selectedDate.getDate());
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get days in current year/month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysCount = getDaysInMonth(year, month);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  const handleDayClick = (d: number) => {
    setDay(d);
    onDateChange(new Date(year, month, d));
  };

  const handleMonthClick = (mIndex: number) => {
    setMonth(mIndex);
    // If current day is more than days in new month, cap it
    const newDaysCount = getDaysInMonth(year, mIndex);
    const newDay = day > newDaysCount ? newDaysCount : day;
    setDay(newDay);
    onDateChange(new Date(year, mIndex, newDay));
  };

  const handleYearClick = (y: number) => {
    setYear(y);
    onDateChange(new Date(y, month, day));
  };

  const resetToToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setDay(today.getDate());
    onDateChange(today);
  };

  // Calculate "Week X" of the month
  const getWeekOfMonth = (d: number) => {
    return Math.ceil(d / 7);
  };

  // Get day name
  const getDayName = (d: number) => {
    const date = new Date(year, month, d);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  };

  return (
    <div className="w-full bg-[#0c0c0e] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col p-4 shadow-xl select-none">
      <div className="flex">
        {/* Left Vertical Section: Year & Week */}
        <div className="w-12 border-r border-white/5 flex flex-col items-center gap-6 py-2 relative">
          {/* Year Vertical */}
          <div className="flex flex-col gap-4">
             {years.map(y => (
               <button
                 key={y}
                 onClick={() => handleYearClick(y)}
                 className={cn(
                   "text-[10px] font-black uppercase tracking-widest vertical-text transition-colors",
                   year === y ? "text-[#1fc46a]" : "text-white/20 hover:text-white/40"
                 )}
                 style={{ writingMode: 'vertical-rl', rotate: '180deg' }}
               >
                 {y}
               </button>
             ))}
          </div>

          <div className="flex-1" />

          {/* Reset Button */}
          <button 
            onClick={resetToToday}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-90"
          >
            <RotateCcw size={14} />
          </button>

          {/* Week Indicator Vertical */}
          <div className={cn(
             "text-[10px] font-black uppercase tracking-widest vertical-text text-[#1fc46a] mt-4",
          )}
          style={{ writingMode: 'vertical-rl', rotate: '180deg' }}>
            WEEK {getWeekOfMonth(day)}
          </div>
        </div>

        {/* Right Section: Month & Days */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Month Selector */}
          <div className="flex items-center gap-6 px-6 py-2 overflow-x-auto no-scrollbar">
            {months.map((m, idx) => (
              <button
                key={m}
                onClick={() => handleMonthClick(idx)}
                className={cn(
                  "text-sm font-bold transition-all shrink-0",
                  month === idx ? "text-white scale-110" : "text-white/30 hover:text-white/50"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Days Horizontal Scroll */}
          <div 
            ref={scrollRef}
            className="flex gap-3 px-6 py-4 overflow-x-auto no-scrollbar scroll-smooth snap-x"
          >
            {days.map(d => {
              const active = d === day;
              return (
                <button
                  key={d}
                  onClick={() => handleDayClick(d)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl border transition-all snap-center shadow-sm",
                    active 
                      ? "bg-[#1fc46a] border-[#1fc46a] text-black ring-4 ring-[#1fc46a]/20" 
                      : "bg-white/[0.04] border-white/5 text-white hover:bg-white/[0.08]"
                  )}
                >
                  <p className={cn("text-[9px] font-bold opacity-60 mb-1", active && "text-black/60")}>
                    {getDayName(d)}
                  </p>
                  <p className="text-xl font-heading font-black tracking-tighter">
                    {d}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .vertical-text {
          text-orientation: mixed;
        }
      `}</style>
    </div>
  );
}
