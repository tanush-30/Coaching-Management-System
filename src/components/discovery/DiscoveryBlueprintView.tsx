'use client';

import React, { useState } from 'react';
import { 
  Compass, 
  Workflow, 
  Layers, 
  Layout, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Zap,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { WorkflowDiagnostic } from './WorkflowDiagnostic';
import { WireframeExplorer } from './WireframeExplorer';
import { EntityStructureMapper } from './EntityStructureMapper';

interface DiscoveryBlueprintViewProps {
  onProceedToPhase1: () => void;
}

export const DiscoveryBlueprintView: React.FC<DiscoveryBlueprintViewProps> = ({ onProceedToPhase1 }) => {
  const [activeSection, setActiveSection] = useState<'diagnostic' | 'wireframes' | 'entities' | 'specs'>('diagnostic');

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Hero Banner for Phase 0 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-10 shadow-2xl border border-indigo-900/50">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Phase 0: Discovery & Solution Blueprint
          </div>
          
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Consultative Blueprint & Architecture for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-200 to-indigo-100">Apex Coaching ERP</span>
          </h1>

          <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-3xl">
            A comprehensive operational diagnosis replacing physical registers, disconnected spreadsheets, and manual WhatsApp messaging with a unified, automated coaching operating system.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onProceedToPhase1}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/40 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Approve Blueprint & Launch Phase 1 Foundation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <a 
              href="#blueprint-sections"
              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs md:text-sm border border-slate-700 transition-all"
            >
              Explore Interactive Blueprints ↓
            </a>
          </div>
        </div>

        {/* Phase Timeline Indicators */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-indigo-950/60 border border-indigo-500/40 p-3 rounded-xl">
            <span className="text-indigo-400 font-bold block text-[10px] uppercase">Phase 0 (Active)</span>
            <span className="font-bold text-white text-xs">Discovery & Blueprint</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl opacity-80">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Phase 1 (Next)</span>
            <span className="font-bold text-slate-300 text-xs">Foundation & Core ERP</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl opacity-60">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Phase 2</span>
            <span className="font-bold text-slate-300 text-xs">Attendance & WhatsApp</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl opacity-60">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Phase 3–6</span>
            <span className="font-bold text-slate-300 text-xs">Academics, Apps & Rollout</span>
          </div>
        </div>
      </div>

      {/* Blueprint Sub-Sections Tabs */}
      <div id="blueprint-sections" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Interactive Blueprint Explorer</h2>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            {[
              { id: 'diagnostic', label: '1. Workflow Diagnostics & ROI', icon: Workflow },
              { id: 'wireframes', label: '2. Clickable Wireframe Prototypes', icon: Layout },
              { id: 'entities', label: '3. Batches, Fees & RBAC', icon: Layers },
              { id: 'specs', label: '4. Tech Architecture & Meta API', icon: Cpu },
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                    isSelected 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80 font-bold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 1: WORKFLOW DIAGNOSTICS */}
        {activeSection === 'diagnostic' && (
          <div className="space-y-6">
            <WorkflowDiagnostic />
          </div>
        )}

        {/* SECTION 2: WIREFRAME PROTOTYPES */}
        {activeSection === 'wireframes' && (
          <div className="space-y-6">
            <WireframeExplorer />
          </div>
        )}

        {/* SECTION 3: ENTITIES & STRUCTURE */}
        {activeSection === 'entities' && (
          <div className="space-y-6">
            <EntityStructureMapper />
          </div>
        )}

        {/* SECTION 4: TECH SPECS & API ARCHITECTURE */}
        {activeSection === 'specs' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Technical Integration & Event-Driven Engine Specs</h3>
                <p className="text-xs text-slate-500">How WhatsApp Business API, Razorpay Webhooks, and Next.js communicate.</p>
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">
                Low Latency &lt; 2s
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Meta Cloud API Spec */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> WhatsApp Cloud API Dispatcher
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`POST /v18.0/{phone_number_id}/messages
{
  "messaging_product": "whatsapp",
  "to": "+919877099881",
  "type": "template",
  "template": {
    "name": "daily_absence_alert",
    "language": { "code": "en_US" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Isha Reddy" },
        { "type": "text", "text": "NEET Super-30" },
        { "type": "text", "text": "04-Sep-2026" }
      ]
    }]
  }
}`}
                </div>
                <p className="text-xs text-slate-600">Dispatched automatically when faculty submits the daily attendance grid.</p>
              </div>

              {/* Razorpay Webhook Spec */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Razorpay Payment Webhook Listener
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`POST /api/webhooks/razorpay
Event: "payment_link.paid"
{
  "payload": {
    "payment_link": {
      "id": "pl_apex_rohan_term2",
      "amount": 2000000,
      "status": "paid"
    },
    "payment": {
      "id": "pay_Nkd81xLkjA9",
      "method": "upi",
      "vpa": "parent@okhdfcbank"
    }
  }
}`}
                </div>
                <p className="text-xs text-slate-600">Reconciles installment status to PAID and triggers WhatsApp digital receipt download.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Launch Call to Action */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border-2 border-indigo-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Ready to Transition to Phase 1?</h3>
          <p className="text-xs md:text-sm text-slate-600">
            Phase 0 Discovery & Blueprint is complete. Launch the live Foundation ERP to manage students, batches, fees, and receipts.
          </p>
        </div>
        <button
          onClick={onProceedToPhase1}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
        >
          <span>Begin Phase 1: Foundation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
