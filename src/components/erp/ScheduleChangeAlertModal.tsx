'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Send,
  Sparkles,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle2,
  Loader2,
  Users,
} from 'lucide-react';
import { ScheduleChangeEvent } from '@/lib/types';

interface ScheduleChangeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleChangeEvent | null;
  onConfirmSend: (announcementText: string) => Promise<void>;
  onSkipSend: () => void;
}

export const ScheduleChangeAlertModal: React.FC<ScheduleChangeAlertModalProps> = ({
  isOpen,
  onClose,
  event,
  onConfirmSend,
  onSkipSend,
}) => {
  const [announcementText, setAnnouncementText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (event) {
      setAnnouncementText(event.generatedAnnouncementText);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onConfirmSend(announcementText);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Schedule Change Notification</h2>
              <p className="text-xs text-slate-500">
                Notify students & parents of {event.batchName} about this update
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Change Diff Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {event.subjectName} ({event.batchName})
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Rescheduled
              </span>
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-200/80">
              {event.changes.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium capitalize">{c.field}:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-400 line-through">{c.oldValue}</span>
                    <span className="text-indigo-600">➔</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                      {c.newValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcement Preview / Editor */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                <span>WhatsApp / Portal Alert Message</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Editable</span>
            </label>
            <textarea
              rows={5}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-sans text-xs text-slate-800 leading-relaxed"
            />
          </div>

          {/* Audience Scope Badge */}
          <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2.5">
            <Users className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Strictly Scoped Announcement</span>
              <p className="text-[10px] text-indigo-700/90 leading-normal">
                This alert will be delivered only to enrolled students and linked parents in{' '}
                <strong>{event.batchName}</strong> via WhatsApp & their portal feeds.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onSkipSend}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
          >
            Save Silently (No Alert)
          </button>

          <button
            type="button"
            disabled={isSending || !announcementText.trim()}
            onClick={handleSend}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dispatching...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Alert</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
