"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Key, ArrowLeft, RefreshCw } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset' | 'login_otp'>('login');

  // Login/Global states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login OTP states
  const [loginOtp, setLoginOtp] = useState("");
  const [loadingLoginOtp, setLoadingLoginOtp] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [loadingForgot, setLoadingForgot] = useState(false);

  // Reset password states
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  // Automatically clear messages on mode switch
  useEffect(() => {
    setError("");
    setSuccess("");
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${baseURL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to login");

      // Redirect to OTP mode if 2FA verification is required
      if (data.requiresOtp) {
        setSuccess(data.message || "A login verification code has been sent to your email.");
        setMode("login_otp");
        setLoginOtp("");
        return;
      }

      if (data.role !== "admin") {
        throw new Error("Unauthorized: Admin access required.");
      }

      localStorage.setItem("admin_token", data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingLoginOtp(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${baseURL}/auth/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: loginOtp }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Invalid or expired OTP");

      localStorage.setItem("admin_token", data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingLoginOtp(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingForgot(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${baseURL}/auth/reset/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");

      setSuccess("Reset OTP has been sent to your email!");
      setEmail(forgotEmail);
      setMode("reset");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingForgot(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoadingReset(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${baseURL}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      setSuccess("Password updated successfully! Please log in.");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setMode("login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="w-full max-w-sm p-8 rounded-lg bg-[#131315] border border-[#48474a] shadow-2xl animate-in fade-in duration-300">

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <>
            <h1 className="text-2xl font-bold text-[#6bfe9c] mb-2 text-center">Wealthy Admin Config</h1>
            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest text-center mb-6">Authenticate Credentials</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs text-center animate-in fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-[#6bfe9c] rounded-lg text-xs text-center animate-in fade-in">
                {success}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">Admin Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] uppercase text-zinc-400 font-bold block tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setMode("forgot");
                    }}
                    className="text-[10px] font-bold text-[#6bfe9c] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#6bfe9c] text-[#004a23] font-bold py-3 rounded-lg mt-4 hover:bg-[#6bfe9c]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                Authenticate
              </button>
            </form>
          </>
        )}

        {/* LOGIN OTP VERIFICATION MODE (2FA) */}
        {mode === 'login_otp' && (
          <>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Credentials
            </button>

            <h1 className="text-2xl font-bold text-[#6bfe9c] mb-2 text-center">Login Verification</h1>
            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest text-center mb-6">Enter Login OTP Code</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs text-center animate-in fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-[#6bfe9c] rounded-lg text-xs text-center animate-in fade-in flex flex-col gap-1.5 items-center justify-center">
                <span>{success}</span>
                <span className="font-mono text-[11px] font-bold text-white tracking-wide bg-black/30 px-2 py-0.5 rounded border border-[#48474a]/30">{email}</span>
              </div>
            )}

            <form onSubmit={handleLoginOtp} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">OTP Code</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors tracking-widest text-center font-bold"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingLoginOtp}
                className="w-full bg-[#6bfe9c] text-[#004a23] font-bold py-3 rounded-lg mt-4 hover:bg-[#6bfe9c]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {loadingLoginOtp && <RefreshCw className="w-4 h-4 animate-spin" />}
                Confirm Login
              </button>
            </form>
          </>
        )}

        {/* FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>

            <h1 className="text-2xl font-bold text-[#6bfe9c] mb-2 text-center">Forgot Password</h1>
            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest text-center mb-6">Request Verification Code</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs text-center animate-in fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingForgot}
                className="w-full bg-[#6bfe9c] text-[#004a23] font-bold py-3 rounded-lg mt-4 hover:bg-[#6bfe9c]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {loadingForgot && <RefreshCw className="w-4 h-4 animate-spin" />}
                Send OTP Email
              </button>
            </form>
          </>
        )}

        {/* RESET PASSWORD MODE */}
        {mode === 'reset' && (
          <>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to OTP Request
            </button>

            <h1 className="text-2xl font-bold text-[#6bfe9c] mb-2 text-center">Reset Password</h1>
            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest text-center mb-6">Enter Verification Code</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs text-center animate-in fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-[#6bfe9c] rounded-lg text-xs text-center animate-in fade-in">
                {success}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    disabled
                    className="w-full bg-[#1f1f22]/50 border border-[#48474a] rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-400 focus:outline-none cursor-not-allowed"
                    value={email}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">OTP Code</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit code"
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors tracking-widest text-center font-bold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1.5 block tracking-wider">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="w-full bg-[#1f1f22] border border-[#48474a] rounded-lg pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#6bfe9c] transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingReset}
                className="w-full bg-[#6bfe9c] text-[#004a23] font-bold py-3 rounded-lg mt-4 hover:bg-[#6bfe9c]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {loadingReset && <RefreshCw className="w-4 h-4 animate-spin" />}
                Reset Password
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
