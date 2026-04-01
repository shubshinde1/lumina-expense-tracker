import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Lumina | Expense Tracker",
  description: "Secure and elegant expense tracking.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumina",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0e10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0,0,24&display=swap" rel="stylesheet" />
      </head>
      <body className={`min-h-[100dvh] bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden ${outfit.variable} ${jakarta.variable} font-sans`} suppressHydrationWarning>
        {/* Ambient Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className="orb w-[500px] h-[500px] bg-primary rounded-full -top-48 -left-24"></div>
          <div className="orb w-[400px] h-[400px] bg-purple-500 rounded-full bottom-0 -right-24 delay-1000"></div>
          <div className="orb w-[300px] h-[300px] bg-orange-500 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 delay-2000"></div>
        </div>

        <Providers>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
