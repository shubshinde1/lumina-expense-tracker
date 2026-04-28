"use client";

import { useState, useRef, useEffect } from "react";
import { Delete } from "lucide-react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function AmountInput({ value, onChange, autoFocus = false }: AmountInputProps) {
  const [showKeypad, setShowKeypad] = useState(autoFocus);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showKeypad && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showKeypad]);

  const handleKeyPress = (key: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart !== null ? input.selectionStart : value.length;
    const end = input.selectionEnd !== null ? input.selectionEnd : value.length;
    
    let nextAmount = value;
    let nextCursor = start;

    if (key === 'Del') {
      if (start === end && start > 0) {
        nextAmount = value.slice(0, start - 1) + value.slice(end);
        nextCursor = start - 1;
      } else if (start !== end) {
        nextAmount = value.slice(0, start) + value.slice(end);
        nextCursor = start;
      }
    } else {
      nextAmount = value.slice(0, start) + key + value.slice(end);
      nextCursor = start + key.length;
    }

    onChange(nextAmount);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  return (
    <div className="w-full text-center transition-all duration-300 py-4 cursor-text">
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        placeholder="0.00"
        value={value}
        onChange={(e) => {
          const val = e.target.value.replace(/[^0-9+.]/g, '');
          onChange(val);
        }}
        onClick={() => setShowKeypad(true)}
        className="w-full text-center bg-transparent border-none focus:ring-0 outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/30 font-heading text-5xl font-bold p-0"
      />
      {value.includes('+') && (
         <p className="text-xl font-heading text-primary mt-3 bg-primary/10 inline-block px-4 py-1 rounded-full border border-primary/20">
           = ₹{value.split('+').reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
         </p>
      )}

      {/* Custom Keypad Overlay */}
      {showKeypad && (
        <>
          <div className="fixed inset-0 z-[60] bg-transparent md:hidden" onClick={() => setShowKeypad(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[70] bg-card border-t border-border shadow-[0_-20px_40px_rgba(0,0,0,0.2)] p-4 pb-8 animate-in slide-in-from-bottom duration-300 rounded-t-[2.5rem]">
             <div className="flex justify-between items-center mb-4 px-4 max-w-md mx-auto">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount Input</span>
                <button type="button" onClick={() => setShowKeypad(false)} className="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-full">DONE</button>
             </div>
             <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <Key onClick={() => handleKeyPress('1')}>1</Key>
                <Key onClick={() => handleKeyPress('2')}>2</Key>
                <Key onClick={() => handleKeyPress('3')}>3</Key>
                
                <Key onClick={() => handleKeyPress('4')}>4</Key>
                <Key onClick={() => handleKeyPress('5')}>5</Key>
                <Key onClick={() => handleKeyPress('6')}>6</Key>

                <Key onClick={() => handleKeyPress('7')}>7</Key>
                <Key onClick={() => handleKeyPress('8')}>8</Key>
                <Key onClick={() => handleKeyPress('9')}>9</Key>

                {/* Bottom Row */}
                <div className="grid grid-cols-2 gap-2">
                  <Key onClick={() => handleKeyPress('+')} className="bg-primary/20 text-primary border-primary/20 font-bold text-2xl">+</Key>
                  <Key onClick={() => handleKeyPress('.')}>.</Key>
                </div>
                <Key onClick={() => handleKeyPress('0')}>0</Key>
                <Key onClick={() => handleKeyPress('Del')} className="bg-accent text-muted-foreground/80 hover:text-foreground"><Delete className="w-6 h-6"/></Key>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

function Key({ children, onClick, className = "" }: any) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`h-16 flex items-center justify-center text-3xl font-heading font-bold rounded-2xl bg-card border border-border shadow-sm active:scale-95 active:bg-accent transition-all ${className}`}
    >
      {children}
    </button>
  );
}
