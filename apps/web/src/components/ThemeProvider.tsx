'use client';

import { useThemeStore } from "@/stores/useThemeStore";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentColor, radius } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyClass = (isDark: boolean) => {
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    };

    const handleChange = () => {
      if (theme === 'system') {
        applyClass(mediaQuery.matches);
      }
    };

    if (theme === 'system') {
      applyClass(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
    } else {
      applyClass(theme === 'dark');
    }

    // Apply custom inline styles for accent and radius directly onto root
    html.style.setProperty('--primary', accentColor);
    html.style.setProperty('--radius', `${radius}rem`);

    // Override the dynamic CSS variables in our v4 layout for specific stitch primary tokens
    html.style.setProperty('--color-primary', accentColor);
    html.style.setProperty('--color-ring', accentColor);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, accentColor, radius, mounted]);

  // Prevent hydration mismatch flash by not rendering children identically initially if complex differences,
  // but for style tags alone it's perfectly fine
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
