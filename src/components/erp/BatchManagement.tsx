'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Users, 
  Clock, 
  Calendar, 
  GraduationCap, 
  MoreVertical, 
  X, 
  Trash2, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Batch, Student, Teacher } from '@/lib/types';
import { AddBatchModal } from './AddBatchModal';
import { UserAvatar } from '@/components/common/UserAvatar';

interface BatchManagementProps {
  batches: Batch[];
  students: Student[];
  teachers: Teacher[];
  onAddBatch: (batchData: any) => void;
  onUpdateBatch: (id: string, updates: any) => void;
  onDeleteBatch: (id: string) => void;
}

export const BatchManagement: React.FC<BatchManagementProps> = ({
  batches,
  students,
  teachers,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBatchRoster, setSelectedBatchRoster] = useState<Batch | null>(null);

  const totalCapacity = batches.reduce((sum, b) => sum + b.capacity, 0);
  const totalEnrolled = batches.reduce((sum, b) => sum + b.enrolledCount, 0);
  const overallOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Batch & Course Administration</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Academic Batches</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Batch & Classroom Management</h2>
          <p className="text-xs text-slate-500">Track batch strength, schedules, classrooms, and assigned lead faculty.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Active Batches</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{batches.length} Programs</div>
          <span className="text-[10px] text-indigo-600 font-medium">Session 2026-2027</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Overall Enrollment</span>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{totalEnrolled} / {totalCapacity}</div>
          <span className="text-[10px] text-emerald-600 font-medium">{overallOccupancy}% Capacity Filled</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Faculty</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{teachers.length} Faculty</div>
          <span className="text-[10px] text-slate-500 font-medium">IIT & AIIMS Mentors</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Avg Annual Fee</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹65,000</div>
          <span className="text-[10px] text-emerald-600 font-medium">Multi-Tier Installments</span>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => {
          const occupancyPercent = Math.round((batch.enrolledCount / batch.capacity) * 100);
          const isHighOccupancy = occupancyPercent >= 85;
          const assignedTeacher = teachers.find((t) => t.id === batch.teacherId);

          return (
            <div
              key={batch.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: batch.accentColor || '#4f46e5' }}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700">
                      {batch.grade}
                    </span>
                    {batch.batchCode && (
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {batch.batchCode}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    ₹{batch.annualFee.toLocaleString('en-IN')}/yr
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{batch.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{batch.courseName}</p>
                </div>

                {/* Specs */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-semibold">{batch.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{batch.scheduleDays.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{batch.startTime} - {batch.endTime} ({batch.room})</span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600">Batch Capacity:</span>
                    <span className={isHighOccupancy ? 'text-rose-600' : 'text-slate-800'}>
                      {batch.enrolledCount} / {batch.capacity} Students ({occupancyPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isHighOccupancy ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                    />
                  </div>
                  {isHighOccupancy && (
                    <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold pt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Near full capacity (Only {batch.capacity - batch.enrolledCount} seats left)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedBatchRoster(batch)}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Student Roster ({batch.enrolledCount})</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete batch ${batch.name}?`)) {
                      onDeleteBatch(batch.id);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Delete Batch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Batch Modal */}
      <AddBatchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        teachers={teachers}
        onAddBatch={onAddBatch}
      />

      {/* Batch Student Roster Modal */}
      {selectedBatchRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{selectedBatchRoster.grade} • {selectedBatchRoster.room}</span>
                  {selectedBatchRoster.batchCode && (
                    <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {selectedBatchRoster.batchCode}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedBatchRoster.name} — Student Roster</h3>
                <p className="text-xs text-slate-500">Lead Faculty: {selectedBatchRoster.teacherName}</p>
              </div>
              <button onClick={() => setSelectedBatchRoster(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Students List in Batch */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {students.filter((s) => s.batchIds.includes(selectedBatchRoster.id)).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No students currently enrolled in this batch.
                </div>
              ) : (
                students
                  .filter((s) => s.batchIds.includes(selectedBatchRoster.id))
                  .map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 text-xs">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={student.avatar}
                          name={student.name}
                          type="student"
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-[10px] text-indigo-600 font-mono font-bold">{student.rollNo}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-slate-700 font-medium">Parent: {student.parentName}</div>
                        <div className="text-[10px] text-slate-500">{student.parentPhone}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
