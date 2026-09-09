'use client';

// Force dynamic rendering — this page uses Firebase Auth (phone OTP + email login)
// Firebase Client SDK is browser-only and cannot run during static generation
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { GraduationCap, Mail, Phone, Lock, ArrowRight, Loader2, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

type LoginMode = 'email' | 'phone';
type PhoneStep = 'enter_phone' | 'enter_otp';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('email');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter_phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Demo / Dev Login Handler (Instant bypass when Firebase keys aren't configured yet) ---
  const handleDemoLogin = () => {
    document.cookie = 'apex_session=demo-admin-session; path=/; max-age=86400; SameSite=Strict';
    router.replace('/');
  };

  // --- Email/Password Login ---
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isFirebaseConfigured) {
      // If Firebase credentials are not yet configured in .env.local, log in via Demo Mode
      handleDemoLogin();
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Phone OTP: Step 1 — Send OTP ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setPhoneStep('enter_otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Phone OTP: Step 2 — Verify OTP ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setError('');
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      router.replace('/');
    } catch {
      setError('Invalid OTP. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />
      </div>

      {/* Invisible reCAPTCHA container (required for phone OTP) */}
      <div id="recaptcha-container" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">ApexERP</h1>
              <p className="text-sm text-slate-400 mt-0.5">Coaching Management System</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-800 rounded-xl mb-6 text-sm font-semibold">
            <button
              onClick={() => { setMode('email'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                mode === 'email'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => { setMode('phone'); setPhoneStep('enter_phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                mode === 'phone'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-4 h-4" />
              Phone OTP
            </button>
          </div>

          {/* Dev Mode / Firebase Not Configured Banner */}
          {!isFirebaseConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                Local Dev Preview Mode
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Firebase keys are not configured in <code className="text-amber-300 bg-amber-950/50 px-1 py-0.5 rounded">.env.local</code>. You can explore the full ERP with mock data immediately!
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Enter Dashboard (Demo Admin)
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm mb-5 animate-fade-in">
              {error}
            </div>
          )}

          {/* EMAIL FORM */}
          {mode === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@apexacademy.edu"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          {/* PHONE OTP FORM */}
          {mode === 'phone' && (
            <div>
              {phoneStep === 'enter_phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Mobile Number
                    </label>
                    <div className="relative flex">
                      <span className="flex items-center px-3.5 bg-slate-700 border border-r-0 border-slate-600 rounded-l-xl text-slate-300 text-sm font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 00000"
                        className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">An OTP will be sent to this number via SMS</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || phone.length < 10}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-slate-400">OTP sent to <span className="text-white font-bold">+91 {phone}</span></p>
                    <button
                      type="button"
                      onClick={() => { setPhoneStep('enter_phone'); setOtp(''); setError(''); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 underline"
                    >
                      Change number
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Enter 6-digit OTP
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & Sign In <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-slate-600 mt-6">
            Apex Academy of Excellence · Secure ERP Portal
          </p>
        </div>
      </div>
    </div>
  );
}
