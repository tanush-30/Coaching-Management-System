'use client';

import React from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Users, 
  Award,
  Sparkles,
  Building2
} from 'lucide-react';

export function StatsBanner() {
  const stats = [
    {
      value: '99.4%',
      label: 'Fee Recovery Rate',
      subtext: 'Automated WhatsApp reminders & UPI links eliminate bad debt',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      value: '10x',
      label: 'Faster Communication',
      subtext: 'Instant attendance absent notifications & exam report cards',
      icon: Zap,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      value: '0',
      label: 'Paper Registers Needed',
      subtext: 'Complete cloud digitization from enrollment to alumni tracking',
      icon: ShieldCheck,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      value: '4-in-1',
      label: 'Role-Specific Portals',
      subtext: 'Tailored interfaces for Admins, Faculty, Parents, and Students',
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  const coachingCategories = [
    'IIT-JEE & NEET Institutes',
    'CBSE & ICSE Coaching',
    'Commerce & CA Foundation',
    'Olympiad & NTSE Centers',
    'Language & Skill Academies',
    'State Board Tuition Hubs',
  ];

  return (
    <section className="py-12 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Ticker */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Built Specifically For:</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {coachingCategories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 transition-colors rounded-full text-xs font-semibold text-slate-700 border border-slate-200/60"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-3xl sm:text-4xl font-black tracking-tight ${stat.color} transition-transform duration-200 group-hover:scale-105 inline-block`}>
                    {stat.value}
                  </span>
                  <div className={`w-10 h-10 rounded-2xl ${stat.bgColor} flex items-center justify-center ${stat.color} shadow-xs group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h4 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 mb-1">
                  {stat.label}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {stat.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
