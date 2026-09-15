'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Megaphone,
  Pin,
  AlertCircle,
  Clock,
  Search,
  CheckCircle2,
  CheckCheck,
  User,
  Users,
  Building2,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { Announcement, AnnouncementPriority } from '@/lib/types';
import {
  getReadAnnouncementIds,
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead,
} from '@/lib/announcement-feed-service';

interface AnnouncementFeedProps {
  announcements: Announcement[];
  userId: string;
  userRoleTitle?: string;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
}

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
  announcements,
  userId,
  userRoleTitle = 'Recipient',
  onRefresh,
  title = 'Announcements & Official Notices',
  subtitle = 'Stay updated with important academy broadcasts, timetable changes, and batch notices.',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned_urgent' | 'batch' | 'individual'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read state from localStorage on client mount or userId change
  useEffect(() => {
    if (userId) {
      setReadIds(getReadAnnouncementIds(userId));
    }
  }, [userId]);

  // Handle single announcement read
  const handleSelectAnnouncement = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    if (!readIds.includes(ann.id)) {
      markAnnouncementAsRead(userId, ann.id);
      setReadIds((prev) => [...prev, ann.id]);
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = () => {
    const allIds = announcements.map((a) => a.id);
    markAllAnnouncementsAsRead(userId, allIds);
    setReadIds(allIds);
  };

  // Filtered list
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        ann.title.toLowerCase().includes(query) ||
        ann.message.toLowerCase().includes(query) ||
        (ann.senderName && ann.senderName.toLowerCase().includes(query)) ||
        (ann.batchNames && ann.batchNames.some((b) => b.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (activeFilter === 'pinned_urgent') {
        return ann.priority === 'pinned' || ann.priority === 'urgent';
      }
      if (activeFilter === 'batch') {
        return ann.audienceType === 'batch';
      }
      if (activeFilter === 'individual') {
        return ann.audienceType === 'individual';
      }

      return true;
    });
  }, [announcements, searchQuery, activeFilter]);

  const unreadCount = useMemo(() => {
    const readSet = new Set(readIds);
    return announcements.filter((a) => !readSet.has(a.id)).length;
  }, [announcements, readIds]);

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return 'Recent';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadge = (priority?: AnnouncementPriority) => {
    switch (priority) {
      case 'pinned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Pin className="w-3 h-3 text-amber-600" />
            Pinned
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            General
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100 shrink-0">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white shadow-xs">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors border border-slate-200 self-start md:self-auto shrink-0 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-violet-600" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters & Search Toolbar */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Notices ({announcements.length})
            </button>
            <button
              onClick={() => setActiveFilter('pinned_urgent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'pinned_urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pinned & Urgent
            </button>
            <button
              onClick={() => setActiveFilter('batch')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Batch Specific
            </button>
            <button
              onClick={() => setActiveFilter('individual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'individual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Direct Notices
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Announcements Feed List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
            <Megaphone className="w-8 h-8 stroke-1" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">No announcements found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No announcements match your search criteria. Try a different keyword.'
                : 'There are currently no active official notices or broadcasts targeted to your account.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAnnouncements.map((ann) => {
            const isRead = readIds.includes(ann.id);
            return (
              <div
                key={ann.id}
                onClick={() => handleSelectAnnouncement(ann)}
                className={`group bg-white rounded-2xl p-5 md:p-6 border transition-all cursor-pointer hover:shadow-md ${
                  !isRead
                    ? 'border-violet-300 bg-violet-50/20 shadow-xs hover:border-violet-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {!isRead && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600 text-white">
                          NEW
                        </span>
                      )}
                      {getPriorityBadge(ann.priority)}

                      {/* Audience Badge */}
                      {ann.audienceType === 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          <Building2 className="w-3 h-3" /> All Academy
                        </span>
                      )}
                      {ann.audienceType === 'batch' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Users className="w-3 h-3" />
                          {ann.batchNames && ann.batchNames.length > 0
                            ? ann.batchNames.join(', ')
                            : 'Batch Notice'}
                        </span>
                      )}
                      {ann.audienceType === 'individual' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <User className="w-3 h-3" /> Direct Notice
                        </span>
                      )}

                      {/* Channel indicators */}
                      {ann.channels && ann.channels.includes('whatsapp') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                          <MessageSquare className="w-2.5 h-2.5" /> WhatsApp Alert
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                      {ann.title}
                    </h3>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {ann.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {ann.senderName || 'Apex Administration'}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTimestamp(ann.sentAt || ann.sent_at || ann.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal Drawer */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {getPriorityBadge(selectedAnnouncement.priority)}
                  {selectedAnnouncement.audienceType === 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      <Building2 className="w-3 h-3" /> All Academy
                    </span>
                  )}
                  {selectedAnnouncement.audienceType === 'batch' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Users className="w-3 h-3" />
                      {selectedAnnouncement.batchNames?.join(', ') || 'Batch Notice'}
                    </span>
                  )}
                  {selectedAnnouncement.audienceType === 'individual' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <User className="w-3 h-3" /> Direct Notice
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {selectedAnnouncement.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center">
                  {(selectedAnnouncement.senderName || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">
                    {selectedAnnouncement.senderName || 'Apex Administration'}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {selectedAnnouncement.senderRole === 'teacher' ? 'Faculty Member' : 'Administration'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {formatTimestamp(
                    selectedAnnouncement.sentAt ||
                    selectedAnnouncement.sent_at ||
                    selectedAnnouncement.createdAt
                  )}
                </span>
              </div>
            </div>

            {/* Body Message */}
            <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-2 scrollbar-thin">
              {selectedAnnouncement.message}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Marked as Read</span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
