'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Info,
} from 'lucide-react';
import { AuditLogEntry, AuditActionType, AuditTargetType } from '@/lib/types';
import { isFirebaseConfigured, getClientDb } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const ACTION_CONFIGS: Record<string, { label: string; color: string; badge: string }> = {
  PAYMENT_STATUS_CHANGE: {
    label: 'Payment Status Change',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-500',
  },
  PAYMENT_RECONCILE: {
    label: 'Payment Reconciled',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    badge: 'bg-teal-500',
  },
  SETTINGS_UPDATE: {
    label: 'Settings Updated',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-500',
  },
  MARKS_EDIT: {
    label: 'Exam Marks Edited',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badge: 'bg-amber-500',
  },
  ATTENDANCE_EDIT: {
    label: 'Attendance Modified',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badge: 'bg-rose-500',
  },
  STUDENT_RECORD_EDIT: {
    label: 'Student Record Edited',
    color: 'text-sky-700 bg-sky-50 border-sky-200',
    badge: 'bg-sky-500',
  },
  STUDENT_ENROLL: {
    label: 'Student Enrolled',
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    badge: 'bg-cyan-500',
  },
  STUDENT_STATUS_CHANGE: {
    label: 'Student Status Changed',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    badge: 'bg-purple-500',
  },
  FACULTY_RECORD_EDIT: {
    label: 'Faculty Record Edited',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badge: 'bg-blue-500',
  },
  FACULTY_ENROLL: {
    label: 'Faculty Enrolled',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-500',
  },
  TIMETABLE_CHANGE: {
    label: 'Timetable Modified',
    color: 'text-violet-700 bg-violet-50 border-violet-200',
    badge: 'bg-violet-500',
  },
  ANNOUNCEMENT_BROADCAST: {
    label: 'Announcement Broadcast',
    color: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200',
    badge: 'bg-fuchsia-500',
  },
};

export const AuditLogsManagement: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all_time');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLogDetail, setActiveLogDetail] = useState<AuditLogEntry | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // Fetch or subscribe to audit_logs collection
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        const db = getClientDb();
        const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150));
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const fetched = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })) as AuditLogEntry[];
            setLogs(fetched);
            setIsLoading(false);
          },
          async (err) => {
            console.warn('[AuditLogsUI] Firestore listener fallback to API:', err);
            // Fallback to API route
            const res = await fetch('/api/admin/audit-logs?limit=150');
            if (res.ok) {
              const data = await res.json();
              if (data.logs) setLogs(data.logs);
            }
            setIsLoading(false);
          }
        );
        return () => unsubscribe();
      } else {
        // Local environment fallback
        const res = await fetch('/api/admin/audit-logs?limit=150');
        if (res.ok) {
          const data = await res.json();
          if (data.logs) setLogs(data.logs);
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('[AuditLogsUI] Error loading audit logs:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs in memory
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by action
    if (selectedAction !== 'all') {
      result = result.filter((l) => l.action === selectedAction);
    }

    // Filter by target category
    if (selectedCategory !== 'all') {
      result = result.filter(
        (l) => l.targetType === selectedCategory || l.targetRole === selectedCategory
      );
    }

    // Filter by date preset
    const now = new Date();
    if (dateRangePreset === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      result = result.filter((l) => (l.timestamp || '') >= todayStart);
    } else if (dateRangePreset === 'last_7_days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      const past7Start = past7.toISOString();
      result = result.filter((l) => (l.timestamp || '') >= past7Start);
    } else if (dateRangePreset === 'last_30_days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);
      const past30Start = past30.toISOString();
      result = result.filter((l) => (l.timestamp || '') >= past30Start);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        const email = (l.actorEmail || l.actor_id || l.actorId || '').toLowerCase();
        const target = (l.targetName || l.targetId || l.target_id || '').toLowerCase();
        const action = (l.action || '').toLowerCase();
        const id = (l.id || '').toLowerCase();
        return email.includes(q) || target.includes(q) || action.includes(q) || id.includes(q);
      });
    }

    return result;
  }, [logs, selectedAction, selectedCategory, dateRangePreset, searchQuery]);

  const displayedLogs = useMemo(() => {
    return filteredLogs.slice(0, visibleCount);
  }, [filteredLogs, visibleCount]);

  const getActionInfo = (action?: string) => {
    if (!action) {
      return {
        label: 'SYSTEM ACTION',
        color: 'text-slate-700 bg-slate-100 border-slate-200',
        badge: 'bg-slate-500',
      };
    }
    return (
      ACTION_CONFIGS[action] || {
        label: (action || '').replace(/_/g, ' ').toUpperCase(),
        color: 'text-slate-700 bg-slate-100 border-slate-200',
        badge: 'bg-slate-500',
      }
    );
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>IMMUTABLE SECURITY & AUDIT TRAIL</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">System Security & Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Read-only chronological audit ledger capturing administrative edits, payment reconciliations, profile modifications, and system configuration updates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Filter Audit Ledger
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Action Types</option>
              <option value="PAYMENT_STATUS_CHANGE">Payment Status Changes</option>
              <option value="PAYMENT_RECONCILE">Payment Reconciled</option>
              <option value="SETTINGS_UPDATE">Settings Updates</option>
              <option value="MARKS_EDIT">Exam Marks Edits</option>
              <option value="ATTENDANCE_EDIT">Attendance Edits</option>
              <option value="STUDENT_RECORD_EDIT">Student Record Edits</option>
              <option value="FACULTY_RECORD_EDIT">Faculty Record Edits</option>
              <option value="TIMETABLE_CHANGE">Timetable Changes</option>
              <option value="ANNOUNCEMENT_BROADCAST">Announcements</option>
            </select>
          </div>

          {/* Target Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Target Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Target Entities</option>
              <option value="payment">Payments</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
              <option value="settings">Settings</option>
              <option value="marks">Marks</option>
              <option value="attendance">Attendance</option>
              <option value="timetable">Timetable</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Date Window
            </label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all_time">All Time</option>
              <option value="today">Today Only</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Search Filter
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search actor, student, target ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Audit Trail Entries</h3>
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              {filteredLogs.length} Records
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Immutable & Read-Only</span>
          </div>
        </div>

        {/* Log Entries Table */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-700 border-b border-slate-200 z-10 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target Entity</th>
                <th className="py-2.5 px-4">Changed Fields</th>
                <th className="py-2.5 px-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No audit log records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No administrative changes match your current search and filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log, idx) => {
                  const actionInfo = getActionInfo(log.action);
                  const actorDisplay =
                    log.actorEmail || log.actorId || log.actorUid || 'admin-session';
                  const targetCategory =
                    log.targetType || log.targetRole || log.target_type || 'General';
                  const targetName =
                    log.targetName || log.targetId || log.target_id || log.student_id || '-';
                  const changesKeys = Object.keys(log.changes || {});

                  return (
                    <tr
                      key={log.id || idx}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setActiveLogDetail(log)}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="truncate max-w-[140px]">
                            <span className="font-bold text-slate-800 text-xs block truncate">
                              {actorDisplay}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {log.actorRole || 'admin'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${actionInfo.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${actionInfo.badge}`} />
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="block font-bold text-slate-800 text-xs truncate max-w-[160px]">
                          {targetName}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {targetCategory} • {log.targetId || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {changesKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {changesKeys.slice(0, 3).map((k) => (
                              <span
                                key={k}
                                className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                              >
                                {k}
                              </span>
                            ))}
                            {changesKeys.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                +{changesKeys.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLogDetail(log);
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                          title="Inspect Diffs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Pagination Bar */}
        {filteredLogs.length > visibleCount && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setVisibleCount((prev) => prev + 50)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Load More ({filteredLogs.length - visibleCount} remaining)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Side-by-Side Diff Inspection Modal */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Audit Entry Diff Inspector</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{activeLogDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveLogDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Actor</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {activeLogDetail.actorEmail || activeLogDetail.actorId || 'admin'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Action</span>
                  <span className="font-semibold text-indigo-700 truncate block">
                    {getActionInfo(activeLogDetail.action).label}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Timestamp</span>
                  <span className="font-semibold text-slate-800 text-[11px] block">
                    {formatTimestamp(activeLogDetail.timestamp)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Target Type</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {activeLogDetail.targetType || activeLogDetail.targetRole || 'general'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Target ID</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {activeLogDetail.targetId || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Target Name</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {activeLogDetail.targetName || '-'}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Field Changes */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Field-Level Modifications ({Object.keys(activeLogDetail.changes || {}).length})
                </h4>

                {activeLogDetail.changes && Object.keys(activeLogDetail.changes).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(activeLogDetail.changes).map(([field, diff]) => {
                      const oldValStr = diff && diff.old !== null && diff.old !== undefined
                        ? (typeof diff.old === 'object' ? JSON.stringify(diff.old) : String(diff.old))
                        : '(empty)';
                      const newValStr = diff && diff.new !== null && diff.new !== undefined
                        ? (typeof diff.new === 'object' ? JSON.stringify(diff.new) : String(diff.new))
                        : '(cleared)';
                      return (
                        <div
                          key={field}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md self-start">
                            {field}
                          </span>
                          <div className="flex items-center gap-2 text-xs flex-1 justify-end">
                            {/* Old Value */}
                            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1 rounded-lg max-w-[180px] truncate" title={oldValStr}>
                              <span className="text-[9px] text-rose-500 font-bold block uppercase">Previous</span>
                              <span className="font-mono">
                                {oldValStr}
                              </span>
                            </div>

                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                            {/* New Value */}
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg max-w-[180px] truncate" title={newValStr}>
                              <span className="text-[9px] text-emerald-500 font-bold block uppercase">Updated</span>
                              <span className="font-mono font-bold">
                                {newValStr}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                    No discrete field diffs recorded. Showing full record snapshots below.
                  </div>
                )}
              </div>

              {/* Metadata Box (if present) */}
              {activeLogDetail.metadata && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Context Metadata
                  </h4>
                  <pre className="bg-slate-900 text-emerald-400 text-[11px] p-3 rounded-xl overflow-x-auto font-mono">
                    {JSON.stringify(activeLogDetail.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                Immutable Audit Record
              </span>
              <button
                onClick={() => setActiveLogDetail(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
