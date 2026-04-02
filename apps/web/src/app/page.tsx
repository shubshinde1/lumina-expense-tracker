'use client';

import { Fingerprint, Mail, Lock, User as UserIcon, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

type AuthStage = 'login' | 'signup' | 'verify-register' | 'forgot-password' | 'verify-reset';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<AuthStage>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  // 1. Login
  const loginMutation = useMutation({
    mutationFn: async () => await api.post('/auth/login', { email, password }),
    onSuccess: (res) => { toast.success("Login successful"); setUser(res.data); router.push("/dashboard"); },
    onError: (err: any) => toast.error(err.response?.data?.message || "Login failed")
  });

  // 2. Register: Request OTP
  const requestRegisterOtp = useMutation({
    mutationFn: async () => await api.post('/auth/register/otp', { email }),
    onSuccess: () => { toast.success("OTP sent to your email"); setActiveTab('verify-register'); },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to send OTP")
  });

  // 3. Register: Verify OTP & Create
  const completeRegister = useMutation({
    mutationFn: async () => await api.post('/auth/register', { name, email, password, otp }),
    onSuccess: (res) => { toast.success("Account verified successfully! Welcome to Lumina."); setUser(res.data); router.push("/dashboard"); },
    onError: (err: any) => toast.error(err.response?.data?.message || "Verification failed")
  });

  // 4. Reset: Request OTP
  const requestResetOtp = useMutation({
    mutationFn: async () => await api.post('/auth/reset/otp', { email }),
    onSuccess: () => { toast.success("Reset link sent via email"); setActiveTab('verify-reset'); },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to send reset link")
  });

  // 5. Reset: Verify OTP & Change Password
  const completeReset = useMutation({
    mutationFn: async () => await api.post('/auth/reset', { email, otp, newPassword: password }),
    onSuccess: () => { 
      toast.success("Password secured! Please log in."); 
      setActiveTab('login'); 
      setPassword(''); 
      setOtp(''); 
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Password reset failed")
  });

  const isPending = loginMutation.isPending || requestRegisterOtp.isPending || completeRegister.isPending || requestResetOtp.isPending || completeReset.isPending;

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') loginMutation.mutate();
    if (activeTab === 'signup') requestRegisterOtp.mutate();
    if (activeTab === 'verify-register') completeRegister.mutate();
    if (activeTab === 'forgot-password') requestResetOtp.mutate();
    if (activeTab === 'verify-reset') completeReset.mutate();
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      <header className="mb-12 text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-card rounded-xl mb-6 shadow-sm border border-border/50">
          <Fingerprint className="text-primary w-8 h-8" strokeWidth={1.5} />
        </div>
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-2">
          Wealthy
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest">Enter the ethereal ledger</p>
      </header>

      <section className="glass-card w-full max-w-[480px] rounded-[2rem] p-8 md:p-12 shadow-2xl z-10 border border-border bg-card/80 backdrop-blur-3xl">
        {(activeTab === 'login' || activeTab === 'signup') && (
          <div className="flex p-1.5 bg-accent/40 rounded-full mb-8 border border-border/30">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-bold uppercase transition-all duration-300 ${activeTab === 'login' ? 'bg-primary text-[#004a23] shadow-[0_0_15px_rgba(107,254,156,0.2)] scale-[1.02]' : 'text-muted-foreground/70 hover:text-foreground'}`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-bold uppercase transition-all duration-300 ${activeTab === 'signup' ? 'bg-primary text-[#004a23] shadow-[0_0_15px_rgba(107,254,156,0.2)] scale-[1.02]' : 'text-muted-foreground/70 hover:text-foreground'}`}
            >
              Sign Up
            </button>
          </div>
        )}

        {(activeTab === 'forgot-password' || activeTab === 'verify-reset' || activeTab === 'verify-register') && (
           <div className="mb-8">
             <button onClick={() => setActiveTab('login')} className="text-xs uppercase text-primary font-bold hover:underline mb-2">← Back to Login</button>
             <h2 className="text-xl font-bold text-foreground">
               {activeTab === 'verify-register' && 'Verify your email'}
               {activeTab === 'forgot-password' && 'Reset Password'}
               {activeTab === 'verify-reset' && 'Secure New Password'}
             </h2>
             {activeTab === 'verify-register' && <p className="text-xs text-muted-foreground mt-1">We sent a 6-digit code to {email || 'your email'}</p>}
           </div>
        )}

        <form className="space-y-5" onSubmit={handleAuth}>
          {/* Email Input (Needed for login, signup, and reset request) */}
          {(activeTab === 'login' || activeTab === 'signup' || activeTab === 'forgot-password') && (
             <div className="group relative">
              <label className="block font-bold text-[10px] text-muted-foreground mb-2 uppercase">Email Address</label>
              <div className="relative">
                <input
                  className="w-full h-14 px-6 bg-accent/50 rounded-xl border border-transparent focus:border-primary focus:bg-accent/80 outline-none transition-all duration-300 text-sm font-medium text-foreground placeholder-muted-foreground/30"
                  placeholder="name@domain.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors w-5 h-5" />
              </div>
            </div>
          )}

          {/* Name Input (Only on signup) */}
          {activeTab === 'signup' && (
            <div className="group relative">
              <label className="block font-bold text-[10px] text-muted-foreground mb-2 uppercase">Full Name</label>
              <div className="relative">
                <input
                  className="w-full h-14 px-6 bg-accent/50 rounded-xl border border-transparent focus:border-primary focus:bg-accent/80 outline-none transition-all duration-300 text-sm font-medium text-foreground placeholder-muted-foreground/30"
                  placeholder="John Doe"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors w-5 h-5" />
              </div>
            </div>
          )}

          {/* Password Input (login, signup, verify-reset) */}
          {(activeTab === 'login' || activeTab === 'signup' || activeTab === 'verify-reset') && (
            <div className="group relative">
              <div className="flex justify-between items-end mb-2">
                <label className="font-bold text-[10px] text-muted-foreground uppercase">
                  {activeTab === 'verify-reset' ? 'New Secret Key' : 'Secret Key'}
                </label>
                {activeTab === 'login' && (
                  <button type="button" onClick={() => setActiveTab('forgot-password')} className="text-[10px] text-primary hover:underline transition-colors uppercase font-bold">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  className="w-full h-14 px-6 pr-14 bg-accent/50 rounded-xl border border-transparent focus:border-primary focus:bg-accent/80 outline-none transition-all duration-300 text-sm font-medium text-foreground placeholder-muted-foreground/30"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors p-1 rounded-lg"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* OTP Input (verify-register, verify-reset) */}
          {(activeTab === 'verify-register' || activeTab === 'verify-reset') && (
            <div className="group relative">
              <label className="block font-bold text-[10px] text-muted-foreground mb-2 uppercase">6-Digit Secure OTP</label>
              <div className="relative">
                <input
                  className="w-full h-14 px-6 bg-accent/50 rounded-xl border border-transparent focus:border-primary focus:bg-accent/80 outline-none transition-all duration-300 text-sm font-medium text-foreground placeholder-muted-foreground/30 tracking-[0.5em] text-center"
                  placeholder="------"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <KeyRound className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors w-5 h-5" />
              </div>
            </div>
          )}

          <button
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 h-14 mt-6 bg-gradient-to-br from-primary to-[#1fc46a] text-[#003417] font-bold text-sm uppercase rounded-[1rem] hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100 shadow-sm border border-primary/20"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {activeTab === 'login' && 'Authorize Access'}
            {activeTab === 'signup' && 'Claim Identity (OTP Next)'}
            {activeTab === 'verify-register' && 'Verify & Enter Ledger'}
            {activeTab === 'forgot-password' && 'Request Reset Link'}
            {activeTab === 'verify-reset' && 'Confirm New Key'}
          </button>
        </form>
      </section>
    </main>
  );
}
