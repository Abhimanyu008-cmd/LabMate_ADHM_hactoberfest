/**
 * LabMate - Dashboard Page
 * Overview of student lab attendance, upcoming live sessions,
 * experiment progress, recent notices, and Ollama connection status.
 */

import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { checkOllamaConnection, getOllamaConfig } from '../services/ollamaService';
import { OllamaStatus, UserProfile } from '../types/app';
import { EXPERIMENTS } from '../data/experiments';
import {
  Zap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  ChevronRight,
  TrendingUp,
  MapPin,
  FileText,
  Activity,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<UserProfile>(StorageService.getUserProfile());
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);

  const attendance = StorageService.getAttendance();
  const sessions = StorageService.getSessions();
  const notices = StorageService.getNotices();
  const attempts = StorageService.getAttempts();
  const vivaSessions = StorageService.getVivaSessions();

  useEffect(() => {
    checkOllamaConnection(getOllamaConfig()).then(setOllamaStatus);
  }, []);

  // Calculate dynamic attendance metrics
  const totalAttended = attendance.filter(a => a.status === 'PRESENT').length;
  const totalRecorded = attendance.length;
  const attendancePct = totalRecorded > 0 ? Math.round((totalAttended / totalRecorded) * 100) : 0;

  // Calculate viva average score
  const avgViva = vivaSessions.length > 0
    ? (vivaSessions.reduce((acc, v) => acc + v.averageScore, 0) / vivaSessions.length).toFixed(1)
    : 'N/A';

  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Ongoing');

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Welcome & Status Hero */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Engineering Practical Portal</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-700 font-mono">{profile.batch}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-mono">Demo Dataset Active</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
            LabMate allows you to test virtual circuits with deterministic engineering calculations, detect electrical wiring mistakes, and prepare for viva examinations using a locally running Gemma model.
          </p>
        </div>

        {/* Quick Launch CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('lab')}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-slate-300/50 transition-all hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4" />
            <span>Launch Virtual Lab</span>
          </button>
        </div>
      </div>

      {/* 2. Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Lab Attendance % */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Lab Attendance</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {attendancePct}%
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {totalAttended} of {totalRecorded} practical sessions attended
            </div>
          </div>
          <div className="text-[11px] text-cyan-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>View Attendance Log</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Experiments Completed */}
        <div
          onClick={() => onNavigate('lab')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Experiments Completed</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-cyan-700">
              {attempts.filter(a => a.isCompleted).length} / {EXPERIMENTS.length}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Curriculum experiments verified
            </div>
          </div>
          <div className="text-[11px] text-cyan-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Enter Workbench</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Average Viva Score */}
        <div
          onClick={() => onNavigate('viva')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Average Viva Score</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-amber-700">
              {avgViva} <span className="text-xs text-amber-600/70">/ 10</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Based on {vivaSessions.length} recorded viva sessions
            </div>
          </div>
          <div className="text-[11px] text-cyan-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Practice Viva</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* AI Lab Mentor Status */}
        <div
          onClick={() => onNavigate('settings')}
          className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Local AI Model</span>
            <div className={`p-1.5 rounded-lg border ${ollamaStatus?.isConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-sm font-bold font-mono text-slate-900 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${ollamaStatus?.isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{ollamaStatus?.isConnected ? 'Ollama Online' : 'Ollama Standby'}</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
              Model: {getOllamaConfig().model}
            </div>
          </div>
          <div className="text-[11px] text-cyan-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Check Diagnostics</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* 3. Upcoming Laboratory Session & Notice Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Upcoming Lab Session Card (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">Next Scheduled Laboratory Session</span>
                <span className="text-[11px] font-mono text-cyan-700">· Demo Schedule</span>
              </div>
              <button
                onClick={() => onNavigate('updates')}
                className="text-xs text-cyan-700 hover:text-cyan-700 flex items-center gap-1 transition-colors"
              >
                <span>All Sessions</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {upcomingSession ? (
              <div className="mt-3.5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono text-cyan-700 font-semibold">{upcomingSession.courseCode}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{upcomingSession.experimentTitle}</h3>
                    <div className="text-xs text-slate-600">{upcomingSession.subject}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-500/60 text-emerald-700 text-xs font-medium shrink-0">
                    {upcomingSession.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-cyan-700" />
                    <span>{upcomingSession.startTime} – {upcomingSession.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-cyan-700" />
                    <span>{upcomingSession.room}</span>
                  </div>
                </div>

                {upcomingSession.announcement && (
                  <div className="text-xs text-slate-700 bg-cyan-50 border border-cyan-200 p-2.5 rounded-lg flex items-start gap-2">
                    <span className="font-semibold text-cyan-700 shrink-0">Instructor Note:</span>
                    <span className="text-slate-700">{upcomingSession.announcement}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-600">No upcoming laboratory sessions scheduled.</div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span>Workstations: {upcomingSession?.workstationsAvailable} of {upcomingSession?.totalWorkstations} available</span>
            <button
              onClick={() => onNavigate('lab')}
              className="text-cyan-700 hover:text-cyan-700 font-medium"
            >
              Practice Experiment in LabMate →
            </button>
          </div>
        </div>

        {/* Latest Lab Notices (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <span className="text-xs font-semibold text-slate-800">Latest Laboratory Notices</span>
              <button
                onClick={() => onNavigate('notices')}
                className="text-xs text-cyan-700 hover:text-cyan-700 flex items-center gap-1 transition-colors"
              >
                <span>View All ({notices.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              {notices.slice(0, 3).map(not => (
                <div
                  key={not.id}
                  onClick={() => onNavigate('notices')}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 hover:border-cyan-500/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="text-cyan-700 font-medium">{not.category}</span>
                    <span>{not.datePosted}</span>
                  </div>
                  <h4 className="text-xs font-medium text-slate-800 group-hover:text-slate-900 mt-1 line-clamp-1">
                    {not.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
            Official department notices and deadline alerts
          </div>
        </div>
      </div>

      {/* 4. Quick Access to Virtual Engineering Experiments */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Featured Laboratory Experiments</h3>
            <div className="text-[11px] text-slate-600">Interactive deterministic simulations with mistake detection</div>
          </div>
          <button
            onClick={() => onNavigate('lab')}
            className="text-xs text-cyan-700 hover:text-cyan-700 font-medium"
          >
            Open All Experiments →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXPERIMENTS.slice(0, 4).map(exp => {
            const isAttempted = attempts.some(a => a.experimentId === exp.id && a.isCompleted);
            return (
              <div
                key={exp.id}
                onClick={() => onNavigate('lab')}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-cyan-500/50 transition-all cursor-pointer group hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-mono text-cyan-700">Exp {exp.number}</span>
                    <span className="text-slate-500">{exp.category}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 transition-colors mt-1.5 leading-snug">
                    {exp.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                    {exp.aim}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className={isAttempted ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                    {isAttempted ? 'Completed' : 'Not started'}
                  </span>
                  <span className="text-cyan-700 font-mono group-hover:translate-x-1 transition-transform">
                    Simulate →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
