'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Smartphone, 
  MessageSquare, 
  Users, 
  CreditCard, 
  Calendar, 
  Check, 
  X, 
  Send, 
  Download, 
  QrCode,
  Bell,
  Search,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Award
} from 'lucide-react';

export const WireframeExplorer: React.FC = () => {
  const [activeWireframe, setActiveWireframe] = useState<'admin' | 'attendance_mobile' | 'parent_app' | 'whatsapp_dispatch'>('admin');

  // Interactive states for mobile attendance wireframe simulation
  const [simAttendance, setSimAttendance] = useState<Record<string, 'present' | 'absent'>>({
    's1': 'present',
    's2': 'present',
    's3': 'present',
    's4': 'absent',
  });
  const [attendanceSubmitted, setAttendanceSubmitted] = useState(false);

  // Interactive states for parent app wireframe simulation
  const [simPaymentPaid, setSimPaymentPaid] = useState(false);

  // Interactive states for WhatsApp dispatch wireframe simulation
  const [dispatchedAlerts, setDispatchedAlerts] = useState<string[]>([
    'Absence notice dispatched to Suresh Reddy (+91 98770 99881) at 04:12 PM',
    'Fee reminder with UPI link dispatched to Meera Deshmukh (+91 97654 11223) at 10:30 AM',
  ]);

  const toggleStudent = (id: string) => {
    setSimAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present'
    }));
    setAttendanceSubmitted(false);
  };

  const handleMarkAllPresent = () => {
    setSimAttendance({
      's1': 'present',
      's2': 'present',
      's3': 'present',
      's4': 'present',
    });
    setAttendanceSubmitted(false);
  };

  const handleSubmitAttendanceSim = () => {
    setAttendanceSubmitted(true);
    const absentees = Object.entries(simAttendance).filter(([_, status]) => status === 'absent');
    if (absentees.length > 0) {
      setDispatchedAlerts(prev => [
        `🚨 Absence WhatsApp Alert dispatched for Student #${absentees[0][0]} at ${new Date().toLocaleTimeString()}`,
        ...prev
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wireframe Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400">Interactive Blueprint & Wireframe Prototype</span>
          <h3 className="text-lg font-bold text-white">Clickable Multi-Role UI Specifications</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'admin', label: '1. Admin Command Center', icon: LayoutDashboard },
            { id: 'attendance_mobile', label: '2. Faculty Mobile Marker', icon: Smartphone },
            { id: 'parent_app', label: '3. Parent App & UPI', icon: CreditCard },
            { id: 'whatsapp_dispatch', label: '4. WhatsApp Automation Engine', icon: MessageSquare },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeWireframe === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWireframe(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wireframe Display Canvas */}
      <div className="bg-slate-100 p-4 md:p-8 rounded-3xl border border-slate-300 shadow-inner flex justify-center items-center min-h-[580px]">
        {/* 1. ADMIN COMMAND CENTER WIREFRAME */}
        {activeWireframe === 'admin' && (
          <div className="w-full max-w-5xl bg-white rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden font-sans">
            {/* Top Navigation Bar Wireframe */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">A</div>
                <span className="font-bold text-sm tracking-tight">APEX ERP <span className="text-xs text-indigo-400 font-normal">v1.0 (Blueprint)</span></span>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 w-72">
                <Search className="w-3.5 h-3.5" />
                <span>Search students, batches, receipts... (Ctrl+K)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>WhatsApp Cloud API: Active</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">AD</div>
              </div>
            </div>

            {/* Dashboard Body */}
            <div className="p-6 space-y-6 bg-slate-50/50">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Enrolled</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">106 Students</div>
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
                    <TrendingUp className="w-3 h-3" /> +14 new this month
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Collection</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">₹4,85,000</div>
                  <span className="text-[10px] text-emerald-600 font-medium">92% target achieved</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Overdue Fee Dues</span>
                  <div className="text-2xl font-bold text-rose-600 mt-1">₹1,15,000</div>
                  <span className="text-[10px] text-rose-500 font-medium">4 installments overdue</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Today's Attendance</span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">94.8%</div>
                  <span className="text-[10px] text-slate-500 font-medium">2 absentees notified</span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-bold text-sm text-slate-900">Today's Live Batch Schedule & Attendance Status</h4>
                    <span className="text-xs text-indigo-600 font-semibold cursor-pointer">View Master Schedule →</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { batch: 'JEE Adv Titans (12th)', time: '04:00 PM - 06:30 PM', room: 'Hall A', status: 'Marked (27/28 Present)', badge: 'bg-emerald-100 text-emerald-700' },
                      { batch: 'NEET Super-30 (12th)', time: '04:00 PM - 06:30 PM', room: 'Hall B', status: 'Marked (23/24 Present)', badge: 'bg-emerald-100 text-emerald-700' },
                      { batch: 'Class 10 CBSE Achievers', time: '06:30 PM - 08:00 PM', room: 'Room 102', status: 'Upcoming Class', badge: 'bg-amber-100 text-amber-700' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{row.batch}</div>
                          <div className="text-slate-500 text-[11px]">{row.time} • {row.room}</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full font-semibold ${row.badge}`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 border-b pb-3">Quick Executive Actions</h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <button className="w-full text-left p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 font-semibold text-indigo-700 flex items-center justify-between">
                      <span>+ Register New Student</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                      <span>📢 Send WhatsApp Broadcast</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                      <span>💳 Send Overdue Fee Payment Links</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                      <span>📊 Generate Batch Report Cards</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. FACULTY MOBILE ATTENDANCE MARKER WIREFRAME */}
        {activeWireframe === 'attendance_mobile' && (
          <div className="w-[340px] bg-slate-900 p-3 rounded-[38px] shadow-2xl border-4 border-slate-800 font-sans">
            <div className="bg-white rounded-[30px] overflow-hidden text-slate-900 min-h-[520px] flex flex-col justify-between">
              {/* Phone Header */}
              <div>
                <div className="bg-indigo-600 text-white px-4 py-3">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>Apex Faculty Portal</span>
                    <span className="bg-indigo-700 px-2 py-0.5 rounded text-[10px]">Mobile View</span>
                  </div>
                  <h4 className="font-bold text-sm">JEE Adv Titans (12th)</h4>
                  <p className="text-[11px] text-indigo-100">04-Sep-2026 • 04:00 PM (Hall A)</p>
                </div>

                {/* Quick Presets */}
                <div className="p-3 bg-slate-100 border-b flex items-center justify-between gap-2">
                  <button 
                    onClick={handleMarkAllPresent}
                    className="flex-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 py-1.5 px-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark All Present
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium">Tap student to toggle</span>
                </div>

                {/* Student Attendance List */}
                <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
                  {[
                    { id: 's1', name: 'Aarav Sharma', roll: 'APX-001' },
                    { id: 's2', name: 'Ananya Gupta', roll: 'APX-004' },
                    { id: 's3', name: 'Diya Patel', roll: 'APX-002' },
                    { id: 's4', name: 'Isha Reddy', roll: 'APX-006' },
                  ].map(student => {
                    const isPresent = simAttendance[student.id] === 'present';
                    return (
                      <div 
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isPresent 
                            ? 'bg-emerald-50/70 border-emerald-200' 
                            : 'bg-rose-50 border-rose-300 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{student.name}</div>
                          <div className="text-[10px] text-slate-500">{student.roll}</div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                          isPresent ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white animate-pulse'
                        }`}>
                          {isPresent ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {isPresent ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button & Notification Confirmation */}
              <div className="p-3 bg-slate-50 border-t space-y-2">
                {attendanceSubmitted ? (
                  <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-center text-xs font-bold animate-fade-in">
                    ✅ Attendance Saved! WhatsApp alerts dispatched to absent student parents.
                  </div>
                ) : (
                  <button 
                    onClick={handleSubmitAttendanceSim}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit & Send WhatsApp Alerts
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. PARENT MOBILE APP & UPI WIREFRAME */}
        {activeWireframe === 'parent_app' && (
          <div className="w-[340px] bg-slate-900 p-3 rounded-[38px] shadow-2xl border-4 border-slate-800 font-sans">
            <div className="bg-slate-50 rounded-[30px] overflow-hidden text-slate-900 min-h-[520px] flex flex-col justify-between">
              {/* App Top */}
              <div>
                <div className="bg-slate-900 text-white px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-400 font-bold">Apex Parent App</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Live Portal</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">AS</div>
                    <div>
                      <div className="text-xs font-bold text-white">Aarav Sharma</div>
                      <div className="text-[10px] text-slate-400">Class 12 • JEE Adv Titans</div>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary Pill */}
                <div className="p-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Attendance</span>
                      <span className="text-lg font-extrabold text-emerald-600">96.4%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">28 Present / 1 Absent</span>
                      <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer">View Calendar 📅</span>
                    </div>
                  </div>
                </div>

                {/* Fee Installment Box */}
                <div className="px-3 space-y-2">
                  <div className="text-xs font-bold text-slate-800">Fee Status & Receipts</div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">Term 3 Final Revision Fee</div>
                        <div className="text-[10px] text-slate-500">Due: 15-Oct-2026</div>
                      </div>
                      <span className="font-bold text-slate-900">₹30,000</span>
                    </div>

                    {simPaymentPaid ? (
                      <div className="bg-emerald-50 border border-emerald-300 p-2 rounded-lg text-center text-xs font-bold text-emerald-700">
                        🎉 Payment Captured via UPI! Receipt #REC-2026-0904 generated.
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSimPaymentPaid(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5" /> 1-Click Pay via UPI (GPay/PhonePe)
                      </button>
                    )}
                  </div>
                </div>

                {/* Academics Box */}
                <div className="p-3 space-y-2">
                  <div className="text-xs font-bold text-slate-800">Latest Academic Report</div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">JEE Minor Test 04</div>
                      <div className="text-[10px] text-slate-500">Score: 158 / 180 (Rank #2)</div>
                    </div>
                    <button className="bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded text-[11px] flex items-center gap-1 border border-indigo-200">
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="bg-white border-t px-6 py-2 flex justify-between text-slate-400 text-[10px] font-bold">
                <div className="text-indigo-600 text-center">
                  <LayoutDashboard className="w-4 h-4 mx-auto" />
                  <span>Home</span>
                </div>
                <div className="text-center">
                  <Calendar className="w-4 h-4 mx-auto" />
                  <span>Attendance</span>
                </div>
                <div className="text-center">
                  <CreditCard className="w-4 h-4 mx-auto" />
                  <span>Fees</span>
                </div>
                <div className="text-center">
                  <Award className="w-4 h-4 mx-auto" />
                  <span>Reports</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. WHATSAPP DISPATCH ENGINE WIREFRAME */}
        {activeWireframe === 'whatsapp_dispatch' && (
          <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden font-sans">
            {/* WhatsApp Header */}
            <div className="bg-[#075e54] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow">
                  <MessageSquare className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Apex Academy Verified WhatsApp Channel</h4>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span> Official Meta Business API Bot
                  </p>
                </div>
              </div>
              <span className="text-xs bg-emerald-700/80 px-2.5 py-1 rounded-full font-medium">Auto-Dispatcher</span>
            </div>

            {/* Chat Body & Real-Time Event Stream */}
            <div className="p-5 bg-[#efeae2] space-y-4 min-h-[380px] max-h-[420px] overflow-y-auto">
              <div className="text-center my-2">
                <span className="bg-white/80 text-slate-600 text-[10px] px-3 py-1 rounded-full font-semibold shadow-xs">
                  TODAY'S AUTOMATED PARENT ALERTS
                </span>
              </div>

              {/* Message 1: Absence */}
              <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-[85%] shadow-sm border border-slate-200/60 space-y-1.5 text-xs text-slate-800">
                <div className="font-bold text-rose-700 flex items-center gap-1">
                  <span>🚨 Apex Attendance Alert</span>
                </div>
                <p>Dear <strong>Suresh Reddy</strong>, this is to inform you that <strong>Isha Reddy</strong> was marked <strong>ABSENT</strong> for <strong>NEET Super-30 (12th)</strong> today (04-Sep-2026) at 04:10 PM.</p>
                <div className="text-[10px] text-slate-400 text-right">04:12 PM • Read ✓✓</div>
              </div>

              {/* Message 2: Fee Reminder with UPI Link */}
              <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-[85%] shadow-sm border border-slate-200/60 space-y-1.5 text-xs text-slate-800">
                <div className="font-bold text-indigo-700 flex items-center gap-1">
                  <span>💳 Fee Payment Notice & 1-Click UPI</span>
                </div>
                <p>Dear <strong>Meera Deshmukh</strong>, fee installment of <strong>₹20,000</strong> for <strong>Rohan Deshmukh</strong> is overdue.</p>
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] text-indigo-900">
                  <span>👉 Instant UPI Link: <span className="underline font-bold">https://pages.razorpay.com/pl_apex_rohan</span></span>
                </div>
                <div className="text-[10px] text-slate-400 text-right">10:30 AM • Delivered ✓✓</div>
              </div>

              {/* Message 3: Report Card */}
              <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-[85%] shadow-sm border border-slate-200/60 space-y-1.5 text-xs text-slate-800">
                <div className="font-bold text-emerald-700 flex items-center gap-1">
                  <span>📊 Exam Report Published</span>
                </div>
                <p>Dear <strong>Sunil Sharma</strong>, <strong>Aarav Sharma</strong> scored <strong>158 / 180 (87.8%)</strong> with <strong>Rank #2</strong> in JEE Minor Test 04.</p>
                <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg border text-[11px]">
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-bold">ReportCard_APX-2026-001.pdf</span>
                </div>
                <div className="text-[10px] text-slate-400 text-right">Yesterday • Read ✓✓</div>
              </div>
            </div>

            {/* Bottom Engine Summary */}
            <div className="p-3 bg-slate-100 border-t flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Trigger Latency: &lt; 1.2 seconds</span>
              <span className="text-emerald-700 font-bold">100% Delivery Rate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
