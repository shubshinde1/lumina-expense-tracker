'use client';

import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { getStartOfMonthIST, isSameDayIST } from "@/lib/dateUtils";

interface HorizontalDateSelectorProps {
  selectedDate: Date;
  onDateChange: (d: Date) => void;
}

export default function HorizontalDateSelector({ 
  selectedDate, 
  onDateChange 
}: HorizontalDateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(getStartOfMonthIST(selectedDate));

  // Generate past 24 months for nice scrolling
  const pastMonths = Array.from({length: 24}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return getStartOfMonthIST(d);
  });
  
  // Group by Year
  const monthsByYear: { year: number, months: Date[] }[] = [];
  pastMonths.forEach(m => {
    let group = monthsByYear.find(g => g.year === m.getFullYear());
    if (!group) {
      group = { year: m.getFullYear(), months: [] };
      monthsByYear.push(group);
    }
    group.months.push(m);
  });

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
  
  // Group by Week (7 day max per week group)
  const weeks: { weekNum: number, days: Date[] }[] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push({
      weekNum: Math.floor(i / 7) + 1,
      days: allDays.slice(i, i + 7)
    });
  }

  const resetToToday = () => {
    const today = new Date();
    const todayDay = today.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' });
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    setCurrentMonth(getStartOfMonthIST(today));
    onDateChange(today);
    
    // Smooth scroll to the current month and day
    setTimeout(() => {
      // Find and scroll to today's month
      const monthId = `month-${todayYear}-${todayMonth}`;
      document.getElementById(monthId)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      
      // Find and scroll to today's day
      const dayId = `day-${todayDay}`;
      document.getElementById(dayId)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  };

  return (
    <div className="flex flex-col rounded-2xl bg-card border border-border overflow-hidden select-none w-full shadow-sm relative animate-in fade-in zoom-in-95 duration-500">
      
      {/* Reset To Today Button - Centered at the intersection "cross + origin" */}
      <button 
        onClick={resetToToday}
        className="absolute left-[44px] top-[48px] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:rotate-180 transition-all z-[60] shadow-md cursor-pointer"
        title="Reset to today"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Top Row: Year & Months Continuous Scroll */}
      <div id="months-scroll" className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] h-[48px] bg-background/50">
        {monthsByYear.map((group) => (
          <div key={group.year} className="flex shrink-0">
             {/* Sticky Year Label */}
             <div className="sticky left-0 w-[44px] flex items-center justify-center bg-card shrink-0 z-30 border-l border-r border-border">
                <span className="text-[10px] font-black text-primary -rotate-90 tracking-widest uppercase">{group.year}</span>
             </div>
             {/* Months List */}
             <div className="flex items-center px-4 gap-6 bg-transparent">
                {[...group.months].reverse().map(m => {
                  const isSelected = m.getMonth() === currentMonth.getMonth() && m.getFullYear() === currentMonth.getFullYear();
                  const mId = `month-${m.getFullYear()}-${m.getMonth()}`;
                  return (
                    <button 
                      id={mId}
                      key={m.getMonth()}
                      onClick={() => setCurrentMonth(m)}
                      className={`text-[12px] uppercase tracking-wider transition-all shrink-0 ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground font-semibold hover:text-foreground'}`}
                    >
                      {m.toLocaleString('default', { month: 'short' })}
                    </button>
                  )
                })}
             </div>
          </div>
        ))}
      </div>

      {/* Explicit Horizontal Section Divider */}
      <div className="w-full h-[1px] bg-border shrink-0 z-10" />

      {/* Bottom Row: Weeks & Days Continuous Scroll */}
      <div id="days-scroll" className="flex items-stretch h-[66px] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth bg-card">
        {weeks.map((group) => (
          <div key={group.weekNum} className="flex shrink-0">
             {/* Sticky Week Label */}
             <div className="sticky left-0 w-[44px] bg-card flex items-center justify-center shrink-0 z-20 border-l border-r border-border font-medium">
                <span className="text-[8px] font-black text-primary -rotate-90 tracking-widest whitespace-nowrap uppercase opacity-70">W{group.weekNum}</span>
             </div>
             {/* Days List for the Week */}
             <div className="flex items-center px-3 gap-3">
                {group.days.map(d => {
                  const isSelected = isSameDayIST(d, selectedDate);
                  const dayNum = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' });
                  const dayName = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toUpperCase();
                  const dId = `day-${dayNum}`;

                  return (
                    <button
                      id={dId}
                      key={dayNum}
                      onClick={() => onDateChange(d)}
                      className={`flex flex-col items-center justify-center min-w-[50px] h-[44px] rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-primary border-primary text-primary-foreground shadow-[0_4px_12px_rgba(16,185,129,0.25)]' 
                          : 'bg-accent/40 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <span className={`text-[8px] font-black uppercase tracking-widest mb-[1px] transition-colors ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{dayName}</span>
                      <span className={`text-[14px] font-bold leading-none transition-colors`}>{dayNum}</span>
                    </button>
                  )
                })}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
