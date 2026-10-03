import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../api/studentAPI';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionInput, setSubmissionInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to check if due date is passed
  const isDueDatePassed = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Fetch Assignments from Backend API using studentApi
  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentAPI.getAssignments();
      if (response.data && Array.isArray(response.data)) {
        setAssignments(
          response.data.map((item) => ({
            id: item._id || item.id,
            title: item.title,
            course: item.course || 'Database Management Systems',
            dueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '10 Aug 2026',
            status: item.status || 'Pending',
            totalMarks: item.totalMarks || 20,
            obtainedMarks: item.obtainedMarks !== undefined ? item.obtainedMarks : null,
            instructor: item.instructor || 'Prof. Sharma',
            description: item.description || 'Complete the assigned task and submit your solution.',
            submissionText: item.submissionText || '',
            feedback: item.feedback || '',
          }))
        );
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments from server.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Filtered Assignments
  const filteredAssignments = assignments.filter((item) => {
    if (activeTab === 'Pending') return item.status === 'Pending';
    if (activeTab === 'Submitted') return item.status === 'Submitted';
    if (activeTab === 'Graded') return item.status === 'Graded';
    return true;
  });

  // Open Submission Modal with Due Date check
  const handleOpenSubmitModal = (assignment) => {
    if (isDueDatePassed(assignment.dueDate)) {
      alert(`⚠️ Submission Closed!\n\nThe due date (${assignment.dueDate}) for this assignment is over. You cannot submit or modify your work now.\n\nPlease contact your faculty (${assignment.instructor}) if you need an extension.`);
      return;
    }
    setSelectedAssignment(assignment);
    setSubmissionInput(assignment.submissionText || '');
    setSelectedFile(null);
  };

  // Submit Assignment via API
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setIsSubmitting(true);
    try {
      // If studentAPI supports file uploads / submissions, call it here:
      await studentAPI.submitAssignment(selectedAssignment.id, {
        submissionText: submissionInput,
        fileName: selectedFile ? selectedFile.name : undefined,
      });

      setAssignments((prev) =>
        prev.map((item) =>
          item.id === selectedAssignment.id
            ? {
                ...item,
                status: 'Submitted',
                submissionText: selectedFile ? `Submitted - ${selectedFile.name}` : (submissionInput || 'Submitted Successfully'),
              }
            : item
        )
      );

      alert('Assignment submitted successfully!');
      setSelectedAssignment(null);
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Assignments</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track your course assignments, submissions, and grades</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
        
        {/* Navigation Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto">
          {['All', 'Pending', 'Submitted', 'Graded'].map((tab) => {
            const count = assignments.filter((a) => tab === 'All' || a.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Assignments List Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-bold text-xs">
            Loading assignments...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 font-bold text-xs">
            {error}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-4xl">📂</div>
            <p className="text-sm font-bold text-slate-600">No assignments found for this category.</p>
            <p className="text-xs text-slate-400">Select another tab to view your course tasks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const isPastDue = isDueDatePassed(assignment.dueDate);

              return (
                <div
                  key={assignment.id}
                  className="p-5 rounded-3xl border border-slate-100 hover:border-indigo-100 bg-slate-50/40 hover:bg-white transition-all shadow-xs hover:shadow-md space-y-3"
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                        {assignment.course}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 mt-1">
                        {assignment.title}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      assignment.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      ● {assignment.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {assignment.description}
                  </p>

                  {/* Details Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100/80 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>
                        📅 Due:{' '}
                        <strong className={isPastDue ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                          {assignment.dueDate} {isPastDue && '(Expired)'}
                        </strong>
                      </span>
                      <span>👨‍🏫 Instructor: <strong className="text-slate-800">{assignment.instructor}</strong></span>
                      <span>💯 Marks: <strong className="text-slate-800">{assignment.obtainedMarks !== null ? `${assignment.obtainedMarks}/${assignment.totalMarks}` : `${assignment.totalMarks} Total`}</strong></span>
                    </div>

                    {/* Action Buttons with Due Date Validation */}
                    <div className="flex items-center gap-2">
                      {assignment.status === 'Pending' && (
                        <button
                          onClick={() => handleOpenSubmitModal(assignment)}
                          className={`px-4 py-2 font-bold text-xs rounded-2xl shadow-md transition active:scale-95 ${
                            isPastDue
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isPastDue ? 'Submission Closed 🔒' : 'Submit Assignment 📤'}
                        </button>
                      )}

                      {assignment.status === 'Submitted' && (
                        <button
                          onClick={() => handleOpenSubmitModal(assignment)}
                          className={`px-4 py-2 font-bold text-xs rounded-2xl transition ${
                            isPastDue
                              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          {isPastDue ? 'Deadline Passed (Read Only) 🔒' : 'Resubmit Assignment ✏️'}
                        </button>
                      )}

                      {assignment.status === 'Graded' && (
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 text-xs font-bold">
                          Grade: {assignment.obtainedMarks} / {assignment.totalMarks} Marks
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback Box for Graded Items */}
                  {assignment.feedback && (
                    <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-800 font-medium mt-2">
                      💬 <strong>Teacher Feedback:</strong> {assignment.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submission Modal Popup */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-5 animate-fadeIn">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Submit Assignment</h3>
                <p className="text-xs text-slate-400 font-medium">{selectedAssignment.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Upload Solution Document / PDF</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 rounded-2xl p-4 text-center cursor-pointer transition">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="hidden"
                    id="fileUploadInput"
                  />
                  <label htmlFor="fileUploadInput" className="cursor-pointer space-y-1 block">
                    <div className="text-2xl">📄</div>
                    <p className="text-xs font-bold text-slate-700">
                      {selectedFile ? selectedFile.name : 'Click to select file or drag & drop'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Supports PDF, DOCX, ZIP, CPP, SQL (Max 25MB)</p>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Submission Note / GitHub Link</label>
                <textarea
                  value={submissionInput}
                  onChange={(e) => setSubmissionInput(e.target.value)}
                  placeholder="Add any note or link for your instructor..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Confirm Submission'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}