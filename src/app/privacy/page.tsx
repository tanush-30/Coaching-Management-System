import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Apex Coaching Management ERP',
  description: 'Data privacy, student records protection, and compliance policy for Apex Coaching Management ERP.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-extrabold shadow-md">
              🎓
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Apex<span className="text-indigo-400">ERP</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        {/* Header Title */}
        <div className="space-y-3 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DPDP Act & Student Data Protection Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Privacy Policy & Data Security
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: September 1, 2026 • Effective for all Institutes, Faculty, Parents, and Students
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              1. Overview & Commitment
            </h2>
            <p>
              Apex Coaching Management ERP (&quot;ApexERP&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is dedicated to safeguarding the privacy and security of coaching institutes, administrators, faculty members, parents, and students. This Privacy Policy details the types of information we collect, how it is handled, and the strict role-based controls enforced across our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              2. Data We Collect & Store
            </h2>
            <p>
              Depending on your account role (Admin, Teacher, Parent, Student), we process the following categories of information:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
              <li><strong className="text-white">Student & Academic Records:</strong> Name, Roll Number, Enrolled Batches, Attendance Logs, Exam Scores, and Ranks.</li>
              <li><strong className="text-white">Contact & Parent Information:</strong> Parent phone numbers, WhatsApp identifiers, and communication preferences for automated alerts.</li>
              <li><strong className="text-white">Fee & Financial Data:</strong> Total fee packages, installment schedules, payment transaction receipts, and outstanding dues.</li>
              <li><strong className="text-white">Authentication & Security Credentials:</strong> Firebase Auth tokens, signed session cookies, and encrypted audit trail timestamps.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              3. Strict Role-Based Access Control (RBAC)
            </h2>
            <p>
              Our database implements cryptographic and rule-level isolation to prevent cross-account data leakage:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Super Admin</div>
                <p className="text-xs text-slate-300">Complete institutional management, fee ledger control, and faculty assignment.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Faculty / Teacher</div>
                <p className="text-xs text-slate-300">Restricted exclusively to assigned batches; zero access to fee ledgers or other teachers&apos; batches.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Parent / Guardian</div>
                <p className="text-xs text-slate-300">Isolated access limited to their own ward&apos;s attendance, fee receipts, and performance reports.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">Student</div>
                <p className="text-xs text-slate-300">Strictly personal dashboard showing assigned homework, study materials, and personal grades.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. WhatsApp Notifications & Communications</h2>
            <p>
              Automated notifications (attendance punches, test scorecard PDFs, and fee installment receipts) are dispatched via official WhatsApp Business API endpoints. Phone numbers are utilized solely for academic dispatch and are never sold, rented, or distributed to third-party marketing services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Data Retention & Security Encryption</h2>
            <p>
              All customer data is encrypted in transit using TLS 1.3 / 256-bit SSL and at rest within secure enterprise cloud data centers. Database backups are taken daily with automated failover and audit logging.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">6. Contact Data Protection Officer</h2>
            <p className="text-sm text-slate-400">
              For security disclosures, data deletion requests, or compliance inquiries, please contact our Data Governance Desk at:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300">
              compliance@apexerp.co • Apex Coaching Management Systems, India
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
