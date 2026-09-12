'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Sparkles, 
  CheckCheck, 
  AlertTriangle, 
  CreditCard, 
  FileText, 
  Bell, 
  Smartphone, 
  Users, 
  Radio,
  Download
} from 'lucide-react';
import { Batch, WhatsAppMessage } from '@/lib/types';

interface WhatsAppAutomationHubProps {
  whatsappLogs: WhatsAppMessage[];
  batches: Batch[];
  onSendBroadcast: (batchId: string, subjectTitle: string, messageBody: string) => Promise<number> | number;
}

export const WhatsAppAutomationHub: React.FC<WhatsAppAutomationHubProps> = ({
  whatsappLogs,
  batches,
  onSendBroadcast,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'absence_alert' | 'fee_reminder' | 'payment_receipt' | 'broadcast'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogForSim, setSelectedLogForSim] = useState<WhatsAppMessage>(whatsappLogs[0] || null);

  // Broadcast Modal State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastBatchId, setBroadcastBatchId] = useState('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSentCount, setBroadcastSentCount] = useState<number | null>(null);

  const filteredLogs = whatsappLogs.filter((log) => {
    const matchesSearch =
      log.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipientPhone.includes(searchQuery) ||
      log.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = selectedFilter === 'all' || log.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;

    const count = await onSendBroadcast(broadcastBatchId, broadcastTitle, broadcastBody);
    setBroadcastSentCount(count);
    setBroadcastTitle('');
    setBroadcastBody('');
    setTimeout(() => {
      setIsBroadcastOpen(false);
      setBroadcastSentCount(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> WhatsApp Automated Messaging OS
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              Meta Cloud API Connected
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">WhatsApp Automation Hub & Dispatch Stream</h2>
          <p className="text-xs text-slate-500">
            Real-time event-driven messaging for attendance absence alerts, 1-click UPI fee reminders, and batch broadcasts.
          </p>
        </div>

        <button
          onClick={() => setIsBroadcastOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Radio className="w-4 h-4" />
          <span>+ Compose Batch Broadcast</span>
        </button>
      </div>

      {/* Main Two-Column Layout: Logs + Live WhatsApp Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Message Logs & Filter Bar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Pill */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 font-semibold">
              {[
                { id: 'all', label: `All (${whatsappLogs.length})` },
                { id: 'absence_alert', label: 'Absence Alerts' },
                { id: 'fee_reminder', label: 'Fee Reminders' },
                { id: 'payment_receipt', label: 'Receipts' },
                { id: 'broadcast', label: 'Broadcasts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedFilter === tab.id ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search log contents..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                No messages found matching this filter.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = selectedLogForSim?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogForSim(log)}
                    className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all space-y-2 text-xs ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.type === 'absence_alert'
                              ? 'bg-rose-100 text-rose-700'
                              : log.type === 'fee_reminder'
                              ? 'bg-amber-100 text-amber-800'
                              : log.type === 'payment_receipt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {log.type.replace('_', ' ')}
                        </span>
                        <span className="font-bold text-slate-900">{log.recipientName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                    </div>

                    <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed whitespace-pre-line font-sans">
                      {log.content.replace(/\*/g, '')}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <span>Recipient: {log.recipientPhone}</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> Delivered & Read (Meta Verified)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Interactive WhatsApp Mobile Phone Simulator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Parent Phone Preview</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Interactive</span>
          </div>

          <div className="w-full max-w-[340px] mx-auto bg-slate-900 p-3 rounded-[40px] shadow-2xl border-4 border-slate-800 font-sans">
            <div className="bg-[#efeae2] rounded-[32px] overflow-hidden text-slate-900 min-h-[500px] flex flex-col justify-between">
              {/* WhatsApp App Top Bar */}
              <div>
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs text-white">
                    🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate">Apex Academy (Official)</div>
                    <div className="text-[10px] text-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span> Verified Business
                    </div>
                  </div>
                </div>

                {/* Simulated Chat Bubble */}
                <div className="p-3 space-y-3">
                  <div className="text-center">
                    <span className="bg-white/80 text-slate-600 text-[9px] px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                      TODAY
                    </span>
                  </div>

                  {selectedLogForSim ? (
                    <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-slate-200/50 space-y-2 text-xs animate-slide-up">
                      <div className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed">
                        {selectedLogForSim.content}
                      </div>

                      <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                        <span>{selectedLogForSim.timestamp}</span>
                        <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Select a message from the log to preview here.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Simulated Input */}
              <div className="p-2.5 bg-slate-100 border-t flex items-center gap-2">
                <div className="flex-1 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[10px] text-slate-400">
                  Message Apex Academy...
                </div>
                <div className="w-7 h-7 rounded-full bg-[#075e54] flex items-center justify-center text-white">
                  <Send className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Compose Batch WhatsApp Broadcast</h3>
                  <p className="text-xs text-slate-500">Send verified announcements to parents in 1 click</p>
                </div>
              </div>
              <button onClick={() => setIsBroadcastOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {broadcastSentCount !== null ? (
              <div className="bg-emerald-100 border border-emerald-300 p-4 rounded-2xl text-center space-y-1 text-emerald-800">
                <div className="text-lg font-bold">🎉 Broadcast Dispatched!</div>
                <div className="text-xs font-medium">Successfully delivered to {broadcastSentCount} parents via WhatsApp Cloud API.</div>
              </div>
            ) : (
              <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Target Batch</label>
                  <select
                    value={broadcastBatchId}
                    onChange={(e) => setBroadcastBatchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Enrolled Students & Parents</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Announcement Title / Subject</label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Special Doubt Clearing Class Timings"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Message Body</label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Type official message here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Broadcast via WhatsApp</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
