'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Search,
  Filter,
  UserPlus,
  Phone,
  Mail,
  BookOpen,
  Layers,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  LayoutGrid,
  List,
  Check,
  X,
} from 'lucide-react';
import { Batch, Teacher } from '@/lib/types';
import { AddTeacherModal } from './AddTeacherModal';
import { EditTeacherModal } from './EditTeacherModal';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { UserAvatar } from '@/components/common/UserAvatar';

interface TeacherManagementProps {
  teachers: Teacher[];
  batches: Batch[];
  onAddTeacher: (teacherData: Omit<Teacher, 'id'> & { facultyId?: string }) => void;
  onUpdateTeacher: (id: string, updates: Partial<Teacher>) => void;
  onDeleteTeacher: (id: string) => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  teachers,
  batches,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'on_leave'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [isPreEditConfirmOpen, setIsPreEditConfirmOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [assigningBatchTeacher, setAssigningBatchTeacher] = useState<Teacher | null>(null);

  const handleRequestEdit = (teacher: Teacher) => {
    setTeacherToEdit(teacher);
    setIsPreEditConfirmOpen(true);
  };

  const handleConfirmPreEdit = () => {
    setIsPreEditConfirmOpen(false);
    setIsEditModalOpen(true);
  };

  // Extract distinct subjects across all faculty
  const allSubjects = Array.from(
    new Set(teachers.flatMap((t) => t.subjects || []))
  ).filter(Boolean);

  // Filtered teachers list
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (teacher.qualifications && teacher.qualifications.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (teacher.subjects && teacher.subjects.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesSubject =
      selectedSubjectFilter === 'all' ||
      (teacher.subjects && teacher.subjects.includes(selectedSubjectFilter));

    const matchesStatus =
      selectedStatusFilter === 'all' || teacher.status === selectedStatusFilter;

    return matchesSearch && matchesSubject && matchesStatus;
  });

  const activeTeachersCount = teachers.filter((t) => t.status === 'active').length;
  const assignedBatchesCount = batches.filter((b) => Boolean(b.teacherId)).length;

  const handleToggleBatchAssignment = (batchId: string) => {
    if (!assigningBatchTeacher) return;
    const currentBatches = assigningBatchTeacher.assignedBatches || [];
    const updatedBatches = currentBatches.includes(batchId)
      ? currentBatches.filter((id) => id !== batchId)
      : [...currentBatches, batchId];

    onUpdateTeacher(assigningBatchTeacher.id, { assignedBatches: updatedBatches });
    setAssigningBatchTeacher({ ...assigningBatchTeacher, assignedBatches: updatedBatches });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Quick Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Faculty & Instructor Directory
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {teachers.length} Instructors Onboarded
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Faculty & Teacher Management</h2>
          <p className="text-xs text-slate-500">
            Enroll educators, manage subject masteries, assign classroom batches, and grant portal credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Faculty</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Faculty</span>
          <div className="text-2xl font-extrabold text-slate-900">{teachers.length} Teachers</div>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fully verified
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Status</span>
          <div className="text-2xl font-extrabold text-emerald-600">{activeTeachersCount} Active</div>
          <span className="text-[10px] text-slate-500 font-medium">Ready for classroom schedules</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batches Assigned</span>
          <div className="text-2xl font-extrabold text-indigo-600">{assignedBatchesCount} / {batches.length}</div>
          <span className="text-[10px] text-indigo-600 font-medium">Classroom coverage</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject Streams</span>
          <div className="text-2xl font-extrabold text-purple-600">{allSubjects.length || 4} Subjects</div>
          <span className="text-[10px] text-purple-600 font-medium">STEM, Medical & Olympiad</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search faculty by name, subject, degree, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none w-full sm:w-auto font-medium"
            >
              <option value="all">All Subjects ({teachers.length})</option>
              {allSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none w-full sm:w-auto font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Teachers Directory Content */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No faculty members found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedSubjectFilter !== 'all' || selectedStatusFilter !== 'all'
              ? 'Try clearing your filters or search terms to see all faculty records.'
              : 'Start by enrolling your institute’s faculty members and assigning them to batches.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll First Faculty Member</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const assignedBatchObjects = batches.filter(
              (b) => (teacher.assignedBatches || []).includes(b.id) || b.teacherId === teacher.id
            );

            return (
              <div
                key={teacher.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Status Dot */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <UserAvatar
                        src={teacher.avatar}
                        name={teacher.name}
                        type="faculty"
                        size="md"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          teacher.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        title={teacher.status === 'active' ? 'Active' : 'On Leave'}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{teacher.name}</h4>
                      {teacher.facultyId && (
                        <div className="text-[10px] text-purple-600 font-mono font-bold">{teacher.facultyId}</div>
                      )}
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{teacher.qualifications}</p>
                      <span
                        className={`inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                          teacher.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {teacher.status === 'active' ? '● ACTIVE' : '○ ON LEAVE'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Dropdown / Trigger */}
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRequestEdit(teacher)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Faculty Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove faculty record for ${teacher.name}?`)) {
                          onDeleteTeacher(teacher.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Teacher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subjects Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Specializations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      teacher.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No subjects specified</span>
                    )}
                  </div>
                </div>

                {/* Assigned Batches */}
                <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-500" /> Assigned Batches ({assignedBatchObjects.length})
                    </span>
                    <button
                      onClick={() => setAssigningBatchTeacher(teacher)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      + Manage
                    </button>
                  </div>
                  <div className="space-y-1 pt-1">
                    {assignedBatchObjects.length > 0 ? (
                      assignedBatchObjects.map((b) => (
                        <div
                          key={b.id}
                          className="text-xs font-semibold text-slate-700 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/70"
                        >
                          <span className="truncate pr-2">{b.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{b.grade}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No batches assigned yet.</p>
                    )}
                  </div>
                </div>

                {/* Contact Links & Joined Date */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${teacher.phone}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title={`Call/WhatsApp: ${teacher.phone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`mailto:${teacher.email}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      title={`Email: ${teacher.email}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Joined</span>
                    <span className="text-[11px] font-medium text-slate-700">
                      {teacher.joiningDate
                        ? new Date(teacher.joiningDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Active Term'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Batches</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher) => {
                  const assignedBatchObjects = batches.filter(
                    (b) => (teacher.assignedBatches || []).includes(b.id) || b.teacherId === teacher.id
                  );

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={teacher.avatar}
                            name={teacher.name}
                            type="faculty"
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{teacher.name}</div>
                            {teacher.facultyId && (
                              <div className="text-[10px] text-purple-600 font-mono font-bold">{teacher.facultyId}</div>
                            )}
                            <div className="text-[11px] text-slate-500">{teacher.qualifications}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-medium">{teacher.phone}</div>
                        <div className="text-[11px] text-slate-400">{teacher.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects?.map((sub) => (
                            <span
                              key={sub}
                              className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{assignedBatchObjects.length} Batches</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {assignedBatchObjects.map((b) => b.name).join(', ') || 'None assigned'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            teacher.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {teacher.status === 'active' ? 'Active' : 'On Leave'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAssigningBatchTeacher(teacher)}
                            className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Batches
                          </button>
                          <button
                            onClick={() => handleRequestEdit(teacher)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Faculty Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove faculty record for ${teacher.name}?`)) {
                                onDeleteTeacher(teacher.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        batches={batches}
        teachers={teachers}
        onAddTeacher={onAddTeacher}
      />

      {/* Quick Batch Assignment Modal */}
      {assigningBatchTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Classroom Batches</h3>
                <p className="text-xs text-slate-500">
                  Assign batches for <span className="font-bold text-indigo-600">{assigningBatchTeacher.name}</span>
                </p>
              </div>
              <button
                onClick={() => setAssigningBatchTeacher(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {batches.map((batch) => {
                const isAssigned = (assigningBatchTeacher.assignedBatches || []).includes(batch.id);
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => handleToggleBatchAssignment(batch.id)}
                    className={`w-full text-left p-3 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                      isAssigned
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{batch.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {batch.grade} • {batch.subject} • {batch.scheduleDays?.join(', ')}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        isAssigned ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isAssigned && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssigningBatchTeacher(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 1 Confirmation Before Editing Faculty */}
      <ConfirmationModal
        isOpen={isPreEditConfirmOpen}
        onClose={() => {
          setIsPreEditConfirmOpen(false);
          setTeacherToEdit(null);
        }}
        onConfirm={handleConfirmPreEdit}
        title="Confirm Faculty Profile Edit"
        message={
          <div>
            Are you sure you want to edit details of faculty member <strong className="text-slate-900">{teacherToEdit?.name}</strong>?
          </div>
        }
        confirmText="Yes, Open Edit Form"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Edit Faculty Modal */}
      <EditTeacherModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTeacherToEdit(null);
        }}
        teacher={teacherToEdit}
        batches={batches}
        onUpdateTeacher={onUpdateTeacher}
      />
    </div>
  );
};
