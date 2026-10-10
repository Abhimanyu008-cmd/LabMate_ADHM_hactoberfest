/**
 * LabMate - Live Lab Updates
 * Real-time operational status of laboratory halls, ongoing practical sessions,
 * workstation occupancy, and instructor notices.
 */

import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { LabSession, LabSessionStatus } from '../types/app';
import {
  Activity,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  Edit,
  Plus,
  RefreshCw,
  Bell
} from 'lucide-react';

export const LiveLabUpdates: React.FC = () => {
  const [sessions, setSessions] = useState<LabSession[]>(StorageService.getSessions());
  const [editingSession, setEditingSession] = useState<LabSession | null>(null);
  const [newStatus, setNewStatus] = useState<LabSessionStatus>('Upcoming');
  const [newAnnouncement, setNewAnnouncement] = useState<string>('');

  const currentUser = StorageService.getUserProfile();
  const isInstructor = currentUser.role === 'instructor';

  const handleOpenEdit = (session: LabSession) => {
    setEditingSession(session);
    setNewStatus(session.status);
    setNewAnnouncement(session.announcement || '');
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    StorageService.updateSessionStatus(editingSession.id, newStatus, newAnnouncement.trim());
    setSessions(StorageService.getSessions());
    setEditingSession(null);
  };

  const getStatusBadge = (status: LabSessionStatus) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-emerald-50 border-emerald-500/60 text-emerald-700';
      case 'Upcoming':
        return 'bg-cyan-50 border-cyan-500/60 text-cyan-700';
      case 'Delayed':
        return 'bg-amber-50 border-amber-500/60 text-amber-700';
      case 'Cancelled':
        return 'bg-rose-50 border-rose-500/60 text-rose-700';
      case 'Completed':
        return 'bg-slate-200 border-slate-300 text-slate-600';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Laboratory Facility Telemetry</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-700 font-mono">Live Session Status</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-700" />
            <span>Live Laboratory Updates</span>
          </h1>
          <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
            Monitor real-time room occupancy, ongoing experiments, and delay alerts. (Demonstration Schedule — prepared for departmental timetable synchronization).
          </p>
        </div>

        <button
          onClick={() => setSessions(StorageService.getSessions())}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-700" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* 2. Laboratory Hall Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(session => (
          <div
            key={session.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
          >
            <div>
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-700">{session.courseCode}</span>
                  <div className="text-[11px] text-slate-600">{session.subject}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${getStatusBadge(session.status)}`}>
                  {session.status}
                </span>
              </div>

              {/* Title & Details */}
              <div className="my-3 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {session.experimentTitle}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                    <span>{session.startTime} – {session.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                    <span>{session.room}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                    <span>Instructor: {session.instructor}</span>
                  </div>
                </div>

                {session.announcement && (
                  <div className="mt-1 text-xs text-cyan-800 bg-cyan-50 border border-cyan-200 p-2 rounded-lg flex items-start gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-700 shrink-0 mt-0.5" />
                    <span className="leading-snug">{session.announcement}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
              <span>
                Workstations: <strong className="text-slate-800 font-mono">{session.workstationsAvailable}</strong> / {session.totalWorkstations} free
              </span>

              {isInstructor && (
                <button
                  onClick={() => handleOpenEdit(session)}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-cyan-700 flex items-center gap-1 text-[11px] transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  <span>Update Status</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructor Update Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              Update Lab Session Status
            </h3>

            <div className="text-xs text-slate-700">
              <span className="font-semibold text-cyan-700">{editingSession.courseCode}:</span> {editingSession.experimentTitle}
            </div>

            <form onSubmit={handleSaveUpdate} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Session Status:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as LabSessionStatus)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Announcement / Delay Message:</label>
                <textarea
                  rows={3}
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="e.g. Lab room shifted to 308 due to oscilloscope calibration"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
