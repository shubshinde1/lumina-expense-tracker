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

    // Apply dark class
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Apply custom inline styles for accent and radius directly onto root
    html.style.setProperty('--primary', accentColor);
    // Setting complementary colors if needed:
    // This is optional if using exactly exact Hex; for shadcn, border radius is enough
    html.style.setProperty('--radius', `${radius}rem`);

    // Override the dynamic CSS variables in our v4 layout for specific stitch primary tokens
    // We override primary and ring globally:
    html.style.setProperty('--color-primary', accentColor);
    html.style.setProperty('--color-ring', accentColor);

  }, [theme, accentColor, radius, mounted]);

  // Prevent hydration mismatch flash by not rendering children identically initially if complex differences,
  // but for style tags alone it's perfectly fine
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
