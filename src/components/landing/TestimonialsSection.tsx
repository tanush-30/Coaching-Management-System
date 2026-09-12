'use client';

import React from 'react';
import { Star, Quote, CheckCircle2, Award } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Rajesh Sharma',
      role: 'Director & Founder',
      institute: 'Target IIT-JEE Academy (Pune & Kota)',
      avatarText: 'RS',
      gradient: 'from-indigo-600 to-blue-600',
      quote:
        'Before ApexERP, our front desk spent 2 hours every evening manually calling parents of absent students. Now, WhatsApp alerts go out within 30 seconds of roll call. Our fee collection rate also shot up to 99.2% in just two months!',
      metric: 'Recovered ₹3.8L in overdue fees',
      stars: 5,
    },
    {
      name: 'Dr. Sunita Kulkarni',
      role: 'Academic Director',
      institute: 'Apex Medical Prep Hub (Hyderabad)',
      avatarText: 'SK',
      gradient: 'from-emerald-600 to-teal-600',
      quote:
        'The automated NEET report cards with percentile analysis and rank lists blew our parents away. The Parent Portal gives them full visibility without calling the teachers during lecture hours.',
      metric: 'Saved 140+ faculty hours/mo',
      stars: 5,
    },
    {
      name: 'Prof. Anand Mishra',
      role: 'Senior Physics Faculty',
      institute: 'Genesis Science Classes',
      avatarText: 'AM',
      gradient: 'from-amber-600 to-orange-600',
      quote:
        'Taking attendance takes literally 10 seconds now. Marking tests and assigning homework through the Teacher Portal is smooth and effortless. Truly designed by people who understand coaching workflows.',
      metric: '10-second attendance roll call',
      stars: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-bold text-emerald-800">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Trusted by Leading Coaching Institutes</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Loved by Institute Owners, Teachers & Parents
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Discover why coaching academies across India trust ApexERP to power their daily academic and business operations.
          </p>
        </div>

        {/* 3 Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-3xl bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Star Ratings */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.stars)].map((_, sIdx) => (
                    <Star key={sIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/80 space-y-3">
                {/* Highlight metric */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{t.metric}</span>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${t.gradient} flex items-center justify-center text-white font-extrabold text-xs shadow-xs`}>
                    {t.avatarText}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">{t.name}</h4>
                    <p className="text-[11px] text-slate-500">{t.role} • {t.institute}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
