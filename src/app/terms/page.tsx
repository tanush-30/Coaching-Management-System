import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, FileCheck, Scale, CheckCircle2 } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Apex Coaching Management ERP',
  description: 'Terms of Service, subscription licensing, and acceptable use policy for Apex Coaching Management ERP.',
};

export default function TermsOfServicePage() {
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
            <Scale className="w-3.5 h-3.5" />
            <span>Educational SaaS Commercial License Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Terms of Service & Licensing
          </h1>
          <p className="text-sm text-slate-400">
            Last Updated: September 1, 2026 • Governing Institute Operators, Faculty, Parents, and Students
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, deploying, or utilizing the Apex Coaching Management ERP platform (&quot;ApexERP&quot;, &quot;Service&quot;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a coaching institute, academy, or educational enterprise, you represent that you possess the authority to bind such entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              2. Permitted Use & Account Integrity
            </h2>
            <p>
              Subscribers are granted a non-exclusive, non-transferable license to operate ApexERP for coaching center administration, student roster management, fee collection tracking, test scorecard generation, and parent communications.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
              <li>Accounts must maintain valid, verified phone numbers and email credentials.</li>
              <li>Unauthorized role elevation or credential sharing is strictly prohibited.</li>
              <li>Institutes are responsible for all content uploaded to their dedicated workspace.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              3. Service Availability & Support SLA
            </h2>
            <p>
              ApexERP guarantees a 99.9% application uptime commitment, backed by enterprise cloud clustering. Priority technical assistance is available during coaching operational hours (Monday through Saturday, 08:00 to 21:00 IST).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Fee Collection & Payment Records</h2>
            <p>
              ApexERP provides automated receipt generation, GST invoice breakdowns, and installment ledger logging. The platform does not directly hold client funds; fee reconciliation occurs via registered payment channels (UPI, NetBanking, POS, or Cash records) authorized by the respective institute.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Termination & Data Portability</h2>
            <p>
              Institutes maintain 100% ownership of their academic and fee data. Upon subscription termination or plan migration, institutes can export all student profiles, attendance histories, and transaction ledgers in CSV and PDF formats within 30 days of closure.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">6. Contact Legal Support</h2>
            <p className="text-sm text-slate-400">
              For commercial licensing inquiries or institutional SLA agreements:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300">
              legal@apexerp.co • Apex Coaching Management Systems, India
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
