'use client';

import React, { useState } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBanner } from '@/components/landing/StatsBanner';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { WhatsAppFeatureSection } from '@/components/landing/WhatsAppFeatureSection';
import { RolePortalsShowcase } from '@/components/landing/RolePortalsShowcase';
import { RoiCalculator } from '@/components/landing/RoiCalculator';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { QuickLoginModal } from '@/components/landing/QuickLoginModal';
import { UserRole } from '@/lib/types';

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginDefaultRole, setLoginDefaultRole] = useState<UserRole>('admin');

  const handleOpenLogin = (role: UserRole = 'admin') => {
    setLoginDefaultRole(role);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Floating Navigation Header */}
      <LandingHeader onOpenLogin={() => handleOpenLogin('admin')} />

      {/* Main Sections */}
      <main className="flex-1">
        {/* Hero Section with Interactive Preview */}
        <HeroSection onOpenLoginWithRole={handleOpenLogin} />

        {/* Live Metrics & Coaching Category Badges */}
        <StatsBanner />

        {/* 6 Modular Core Pillars */}
        <FeaturesGrid />

        {/* WhatsApp Automation OS Deep Dive & Live Simulator */}
        <WhatsAppFeatureSection />

        {/* 4-in-1 Role Portals Explorer (Admin, Faculty, Parent, Student) */}
        <RolePortalsShowcase onOpenLoginWithRole={handleOpenLogin} />

        {/* Interactive ROI & Revenue Recovery Calculator */}
        <RoiCalculator onOpenLogin={() => handleOpenLogin('admin')} />

        {/* Side-by-Side Comparison: Old Way vs ApexERP */}
        <ComparisonSection />

        {/* Coaching Founders & Teachers Testimonials */}
        <TestimonialsSection />

        {/* Frequently Asked Questions Accordion */}
        <FaqSection />

        {/* Final Conversion CTA Banner */}
        <CtaSection onOpenLogin={handleOpenLogin} />
      </main>

      {/* Footer */}
      <LandingFooter onOpenLoginWithRole={handleOpenLogin} />

      {/* Quick Login Modal with 1-Click Role Access & Credentials */}
      <QuickLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        defaultRole={loginDefaultRole}
      />
    </div>
  );
}
