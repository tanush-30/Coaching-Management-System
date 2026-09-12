'use client';

import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  UserCheck,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { UserRole } from '@/lib/types';
import { getInternalEmail, generateDefaultPassword } from '@/lib/auth-utils';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export function QuickLoginModal({ isOpen, onClose, defaultRole = 'admin' }: QuickLoginModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'role_access' | 'uid' | 'email' | 'phone'>('role_access');
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);

  // UID state
  const [customUid, setCustomUid] = useState('');
  const [uidPassword, setUidPassword] = useState('');
  const [showUidPassword, setShowUidPassword] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Close modal on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Role Fast Access -> Route directly to dedicated role-gated login
  const handleRoleFastAccess = (role: UserRole) => {
    onClose();
    router.push(`/login/${role}`);
  };

  // UID Login (Student / Faculty)
  const handleUidLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const normalized = customUid.trim().toUpperCase();
    const internalEmail = getInternalEmail(normalized);

    // Try direct Firebase Auth
    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, internalEmail, uidPassword);
        const tokenResult = await userCredential.user.getIdTokenResult(true);
        const userRole = (tokenResult.claims.role as UserRole) || 'student';
        
        const sessionRes = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: tokenResult.token, expectedRole: userRole }),
        });

        if (sessionRes.ok) {
          onClose();
          router.push(`/${userRole}`);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall back to local database match
      }
    }

    // Local Store Match fallback
    try {
      let storedStudents: any[] = [];
      let storedTeachers: any[] = [];
      try {
        const rawS = localStorage.getItem('apex_erp_students_v5');
        if (rawS) storedStudents = JSON.parse(rawS);
        const rawT = localStorage.getItem('apex_erp_teachers_v5');
        if (rawT) storedTeachers = JSON.parse(rawT);
      } catch {}

      const allMembers = [...storedStudents.map(s => ({ ...s, _role: 'student' })), ...storedTeachers.map(t => ({ ...t, _role: 'teacher' }))];
      const matched = allMembers.find((m: any) => {
        const mId = (m.rollNo || m.facultyId || m.id || '').trim().toUpperCase();
        const mName = (m.name || `${m.firstName || ''} ${m.lastName || ''}`).trim().toUpperCase();
        const mFirst = (m.firstName || '').trim().toUpperCase();
        return mId === normalized || mName === normalized || mFirst === normalized;
      });

      if (matched) {
        const memberFirstName = matched.firstName || matched.name?.split(' ')[0] || 'Member';
        const expectedPass = generateDefaultPassword(memberFirstName, matched.dob || '2008-06-15');
        const pass = uidPassword.trim();

        const isValid =
          pass.toLowerCase() === expectedPass.toLowerCase() ||
          pass.toLowerCase() === `${memberFirstName.toLowerCase()}123` ||
          pass.toLowerCase() === 'student123' ||
          pass.toLowerCase() === 'teacher123' ||
          pass.toLowerCase() === 'password' ||
          pass.toLowerCase() === '123456';

        if (isValid) {
          const targetRole = matched._role || (normalized.startsWith('FAC') || normalized.startsWith('TEA') ? 'teacher' : 'student');
          onClose();
          router.push(`/login/${targetRole}`);
          return;
        } else {
          setError(`Password mismatch for ${matched.name}. Expected default password is "${expectedPass}" (first 4 letters of name + DOB in DDMM format).`);
          return;
        }
      }

      setError(`Invalid User ID (UID) or Password. Default password format: first 4 letters of name + birth date in DDMM format.`);
    } catch {
      setError('Invalid User ID (UID) or Password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isFirebaseConfigured) {
      setError('Firebase is not configured in .env.local.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken(true);
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, expectedRole: 'admin' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Access denied: Super Admin credentials required.');
      }

      onClose();
      router.push('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password. Please verify your credentials or contact administrator.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isFirebaseConfigured) {
      setError('Firebase Phone Authentication is not configured.');
      setIsLoading(false);
      return;
    }

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'modal-recaptcha-container', {
          size: 'invisible',
        });
      }
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setPhoneStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isFirebaseConfigured || !confirmationResult) {
      setError('Authentication session expired. Please retry.');
      setIsLoading(false);
      return;
    }

    try {
      const credential = await confirmationResult.confirm(otp);
      const idToken = await credential.user.getIdToken(true);
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, expectedRole: 'parent' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to authenticate parent session.');
      }

      onClose();
      router.push('/parent');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfigs = [
    {
      role: 'admin' as UserRole,
      title: 'Administrator',
      subtitle: 'Complete ERP control, batches, fees & WhatsApp automation',
      icon: ShieldCheck,
      badge: 'Full Access',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      gradient: 'from-indigo-600 to-blue-600',
      tagline: 'Manage 500+ students, fees & staff',
    },
    {
      role: 'teacher' as UserRole,
      title: 'Faculty / Teacher',
      subtitle: 'Attendance register, homework posting & marks entry',
      icon: Users,
      badge: 'Academic Hub',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      gradient: 'from-emerald-600 to-teal-600',
      tagline: 'Class roster & gradebook view',
    },
    {
      role: 'parent' as UserRole,
      title: 'Parent / Guardian',
      subtitle: 'Track child attendance, fee receipts & exam scorecards',
      icon: UserCheck,
      badge: 'WhatsApp Linked',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
      gradient: 'from-amber-500 to-orange-600',
      tagline: 'Live attendance & online payments',
    },
    {
      role: 'student' as UserRole,
      title: 'Student Portal',
      subtitle: 'View homework, notes, test rank lists & study materials',
      icon: GraduationCap,
      badge: 'Study Center',
      badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
      gradient: 'from-violet-600 to-purple-600',
      tagline: 'Learning progress & score analytics',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in transition-opacity duration-300">
      <div id="modal-recaptcha-container" />
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all duration-200 hover:rotate-90"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xl tracking-tight text-white">Sign In to ApexERP</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-300">Choose your role portal or log in with credentials</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-5 grid grid-cols-4 gap-1 p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('role_access');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 ${
                activeTab === 'role_access'
                  ? 'bg-indigo-600 text-white shadow-md font-bold scale-[1.02]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portals</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('uid');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === 'uid'
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>UID Sign In</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('email');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === 'email'
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Admin Email</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('phone');
                setError('');
              }}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === 'phone'
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Parent OTP</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <span className="font-bold">Notice:</span> {error}
            </div>
          )}

          {/* TAB 1: Role Fast Access */}
          {activeTab === 'role_access' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Select your authorized institute role:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Single-Sign-On Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roleConfigs.map((cfg) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={cfg.role}
                      onClick={() => handleRoleFastAccess(cfg.role)}
                      disabled={isLoading}
                      className="group relative text-left p-4 rounded-2xl border-2 border-slate-200/90 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 transition-all duration-200 hover:shadow-md hover:scale-[1.01] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${cfg.gradient} flex items-center justify-center text-white shadow-sm`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                            {cfg.badge}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {cfg.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {cfg.subtitle}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Enter as {cfg.title.split(' ')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Looking for full dedicated authentication?</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    router.push('/login');
                  }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Go to /login →
                </button>
              </div>
            </div>
          )}

          {/* TAB: UID Sign In (Student / Faculty) */}
          {activeTab === 'uid' && (
            <form onSubmit={handleUidLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Student or Faculty User ID (UID)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customUid}
                    onChange={(e) => setCustomUid(e.target.value.toUpperCase())}
                    placeholder="e.g. STU-2026-001 or FAC-2026-001"
                    required
                    className="w-full px-4 py-2.5 font-mono font-bold uppercase bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your admin-assigned Enrollment ID or Faculty Member ID
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showUidPassword ? 'text' : 'password'}
                    value={uidPassword}
                    onChange={(e) => setUidPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUidPassword(!showUidPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showUidPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with UID</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/login');
                  }}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Forgot your password? Reset with phone OTP →
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Email & Password */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@apexcoaching.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Coaching Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('role_access')}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Switch to Quick Role Portal Access
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Phone OTP */}
          {activeTab === 'phone' && (
            <div>
              {phoneStep === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Registered phone number of Admin, Teacher, or Parent
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-500 text-center mt-1">
                      Enter the 6-digit SMS verification code sent to your device
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Enter Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
