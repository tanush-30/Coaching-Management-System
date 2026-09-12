'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does WhatsApp automation work? Do our staff have to send messages manually?',
      a: 'No manual work is required. ApexERP connects directly to official WhatsApp Business API gateways. As soon as a teacher marks a student absent in class, or a fee installment becomes due, or exam marks are entered, the system auto-triggers personalized WhatsApp messages with branded templates and live links in under 30 seconds.',
    },
    {
      q: 'Can parents pay fees online directly via UPI and Credit/Debit cards?',
      a: 'Yes! Automated fee reminders include secure 1-click payment links (integrated with Razorpay / UPI QR). When a parent pays, the ERP automatically reconciles the payment, updates the student balance, and instantly delivers a downloadable GST-compliant PDF receipt on WhatsApp and the Parent Portal.',
    },
    {
      q: 'Can we import our existing student and batch data from Excel spreadsheets?',
      a: 'Yes, ApexERP has built-in CSV/Excel migration blueprints. You can import existing student names, roll numbers, parent contact info, batch assignments, and outstanding fee balances within minutes during onboarding.',
    },
    {
      q: 'How do teachers access the platform? Is there a separate app or portal for them?',
      a: 'Faculty members have their own dedicated Teacher Portal. Teachers can log in on any smartphone or tablet to take batch attendance in 10 seconds, assign homework, record test scores, and view student history without seeing sensitive institute financial data.',
    },
    {
      q: 'Is ApexERP suitable for single-branch tuition centers as well as multi-batch academies?',
      a: 'Absolutely. Whether you manage 40 students in a local tuition center or 1,200+ students across multiple JEE/NEET batches, ApexERP scales dynamically with customizable batch capacities, subject filters, and multi-user roles.',
    },
    {
      q: 'How secure is our institute’s student and revenue data?',
      a: 'All data is encrypted in transit and at rest using enterprise-grade 256-bit SSL encryption. Role-Based Access Control (RBAC) ensures teachers only see academic rosters while financial records and WhatsApp broadcast settings are restricted exclusively to authorized Administrators.',
    },
  ];

  return (
    <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-bold text-indigo-700">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Got Questions?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Everything you need to know about implementing ApexERP in your coaching institute.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-all duration-200 shadow-xs"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl"
                  aria-expanded={isOpen}
                >
                  <span className="font-extrabold text-sm sm:text-base text-slate-900">
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <div className={`accordion-grid ${isOpen ? 'open' : ''}`}>
                  <div className="accordion-inner">
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
