/**
 * LabMate - Lab Notice Board
 * Central repository for laboratory exam schedules, manual uploads, and safety bulletins.
 */

import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { LabNotice, NoticeCategory, NoticePriority } from '../types/app';
import {
  Bell,
  Search,
  Filter,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Download,
  ShieldAlert,
  Clock
} from 'lucide-react';

const CATEGORIES: Array<NoticeCategory | 'ALL'> = [
  'ALL',
  'Practical Examination',
  'Experiment Deadline',
  'Lab Manual Upload',
  'Safety Notice',
  'Viva Schedule',
  'Lab Announcement'
];

export const NoticeBoard: React.FC = () => {
  const [notices, setNotices] = useState<LabNotice[]>(StorageService.getNotices());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<NoticeCategory | 'ALL'>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form state
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formCat, setFormCat] = useState<NoticeCategory>('Lab Announcement');
  const [formPriority, setFormPriority] = useState<NoticePriority>('Medium');
  const [formDeadline, setFormDeadline] = useState<string>('');

  const currentUser = StorageService.getUserProfile();
  const isInstructor = currentUser.role === 'instructor';

  const filteredNotices = notices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          n.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || n.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    StorageService.addNotice({
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCat,
      priority: formPriority,
      postedBy: currentUser.name,
      deadline: formDeadline || undefined
    });

    setNotices(StorageService.getNotices());
    setShowAddModal(false);
    setFormTitle('');
    setFormDesc('');
    setFormDeadline('');
  };

  const handleDelete = (id: string) => {
    StorageService.deleteNotice(id);
    setNotices(StorageService.getNotices());
  };

  const getPriorityStyle = (priority: NoticePriority) => {
    switch (priority) {
      case 'High':
        return 'text-rose-600 font-semibold';
      case 'Medium':
        return 'text-amber-600 font-medium';
      case 'Low':
        return 'text-slate-600';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Departmental Communications</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-700 font-mono">Academic Session 2026</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-cyan-700" />
            <span>Laboratory Notice Board</span>
          </h1>
          <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
            Official circulars for practical exam dates, manual revisions, and deadlines. Filter by category or keyword search.
          </p>
        </div>

        {isInstructor && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-slate-300/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Notice</span>
          </button>
        )}
      </div>

      {/* 2. Search and Category Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notices by title or content..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Notices' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Notices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotices.map(notice => (
          <div
            key={notice.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
          >
            <div>
              {/* Header row with clean typography */}
              <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-200/70">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-700 font-medium">{notice.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Posted {notice.datePosted}</span>
                </div>
                <span className={getPriorityStyle(notice.priority)}>
                  {notice.priority} Priority
                </span>
              </div>

              {/* Title & Body */}
              <div className="my-3">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {notice.title}
                </h3>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  {notice.description}
                </p>
              </div>

              {/* Deadline & Attachment if present */}
              {(notice.deadline || notice.attachmentName) && (
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-xs text-slate-700 mt-2">
                  {notice.deadline && (
                    <div className="flex items-center gap-1.5 text-amber-700">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Deadline: {notice.deadline}</span>
                    </div>
                  )}
                  {notice.attachmentName && (
                    <div className="flex items-center justify-between text-cyan-700">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-700" />
                        <span className="font-mono text-[11px]">{notice.attachmentName}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{notice.attachmentSize}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Row */}
            <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-600 mt-3">
              <span>Posted by: <strong className="text-slate-700 font-medium">{notice.postedBy}</strong></span>

              {isInstructor && (
                <button
                  onClick={() => handleDelete(notice.id)}
                  className="p-1 rounded text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete notice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredNotices.length === 0 && (
        <div className="py-16 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl">
          No notices match your selected category or search filter.
        </div>
      )}

      {/* Instructor Add Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              Publish Laboratory Circular
            </h3>

            <form onSubmit={handleAddNotice} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Notice Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule for Mid-Semester Viva Voce"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Category:</label>
                <select
                  value={formCat}
                  onChange={(e) => setFormCat(e.target.value as NoticeCategory)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                >
                  {CATEGORIES.filter(c => c !== 'ALL').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Priority Level:</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as NoticePriority)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Detailed Description:</label>
                <textarea
                  rows={4}
                  placeholder="Enter notice details, room allocations, preparation requirements..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  required
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Deadline (Optional):</label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
