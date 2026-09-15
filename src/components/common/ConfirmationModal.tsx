'use client';

import React from 'react';
import { AlertCircle, HelpCircle, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'warning' | 'danger' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const iconConfig = {
    primary: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      icon: <HelpCircle className="w-6 h-6" />,
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-600',
      icon: <AlertTriangle className="w-6 h-6" />,
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30',
    },
    danger: {
      bg: 'bg-rose-50 border-rose-200 text-rose-600',
      icon: <AlertCircle className="w-6 h-6" />,
      btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-600',
      icon: <CheckCircle2 className="w-6 h-6" />,
      btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp relative"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${iconConfig.bg}`}>
            {iconConfig.icon}
          </div>
          <div className="space-y-1.5 pr-4">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <div className="text-xs text-slate-600 leading-relaxed">{message}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${iconConfig.btn} disabled:opacity-50`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
