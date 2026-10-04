import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/authAPI';

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('Profile'); // 'Profile' | 'Settings'
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('General');
  const [loading, setLoading] = useState(true);

  // Clean Faculty Profile State (No hardcoded values)
  const [facultyProfile, setFacultyProfile] = useState({
    name: '',
    email: '',
    title: '',
    facultyId: '',
    phone: '',
    department: '',
    office: '',
    bio: '',
    coursesCount: 0,
    studentsCount: 0,
    experienceYears: '',
    avatar: '',
  });

  // Settings State
  const [settings, setSettings] = useState({
    language: 'English',
    timezone: '(GMT+5:30) India Standard Time',
    emailNotifs: true,
    studentSubmissionAlerts: true,
    classReminders: true,
    theme: 'Light',
    profileVisibility: 'Public',
  });

  // Password Change State
  const [passwords, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Fetch real faculty profile from Backend API
  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const res = await authApi.getProfile();
      if (res.data) {
        setFacultyProfile({
          name: res.data.name || res.data.fullName || '',
          email: res.data.email || '',
          title: res.data.title || res.data.designation || 'Faculty Member',
          phone: res.data.phone || '',
          department: res.data.department || 'Computer Science & Engineering',
          office: res.data.office || '',
          bio: res.data.bio || '',
          facultyId: res.data.facultyId || res.data._id || '',
          coursesCount: res.data.coursesCount || 0,
          studentsCount: res.data.studentsCount || 0,
          experienceYears: res.data.experienceYears || 'N/A',
          avatar: res.data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        });
      }
    } catch (err) {
      console.error('Error fetching faculty profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditFormData({
      name: facultyProfile.name,
      email: facultyProfile.email,
      title: facultyProfile.title,
      phone: facultyProfile.phone,
      office: facultyProfile.office,
      bio: facultyProfile.bio,
    });
    setIsEditModalOpen(true);
  };

  // Submit Profile Form to Backend
  const handleProfileFormSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await authApi.updateProfile(editFormData);
      alert('Faculty profile updated successfully in database!');
      setIsEditModalOpen(false);
      fetchFacultyData();
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Save Settings Form / Password Update
  const handleSaveSettings = async (e) => {
    e.preventDefault();

    if (activeSettingsSubTab === 'Account' && passwords.newPassword) {
      try {
        await authApi.updateProfile({ password: passwords.newPassword });
        alert('Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '' });
        return;
      } catch (err) {
        console.error('Password update error:', err);
        alert('Failed to update password: ' + (err.response?.data?.message || err.message));
        return;
      }
    }

    alert('Faculty settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-fadeIn relative max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Faculty Profile & Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage your academic profile, contact details, and platform preferences</p>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('Profile')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'Profile'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('Settings')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'Settings'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* TAB 1: PROFILE VIEW */}
      {activeTab === 'Profile' && (
        <div className="space-y-6">
          
          {/* Main Profile Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
            {loading ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                Loading profile details from database...
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={facultyProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                      alt={facultyProfile.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-indigo-100 shadow-md"
                    />
                    <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white">
                      ✓
                    </span>
                  </div>

                  {/* Title & Bio Info */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">
                          {facultyProfile.name || 'Faculty Member'}
                        </h3>
                        <p className="text-xs font-bold text-indigo-600">{facultyProfile.title || 'Department Faculty'}</p>
                        <p className="text-xs text-slate-500 font-medium">{facultyProfile.email}</p>
                      </div>

                      <button
                        onClick={handleOpenEditModal}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 self-center sm:self-start flex items-center gap-1.5"
                      >
                        ✏️ Edit Profile
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 border-t border-slate-100">
                      {facultyProfile.bio || 'No bio provided yet.'}
                    </p>
                  </div>
                </div>

                {/* Stat Counters Row */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center">
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">COURSES</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-0.5">{facultyProfile.coursesCount}</p>
                  </div>
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">STUDENTS</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-0.5">{facultyProfile.studentsCount}</p>
                  </div>
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">EXPERIENCE</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-0.5">{facultyProfile.experienceYears}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Academic Metadata Info Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
              Academic & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div className="flex justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold">Faculty ID</span>
                <span className="font-bold text-slate-800">{facultyProfile.facultyId || 'N/A'}</span>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold">Department</span>
                <span className="font-bold text-slate-800">{facultyProfile.department || 'N/A'}</span>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold">Phone Contact</span>
                <span className="font-bold text-slate-800">{facultyProfile.phone || 'N/A'}</span>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold">Office Location</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">{facultyProfile.office || 'N/A'}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SETTINGS VIEW */}
      {activeTab === 'Settings' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Faculty Preferences & Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            
            {/* Sub Navigation Sidebar */}
            <div className="sm:col-span-4 bg-slate-50 p-2 rounded-2xl space-y-1">
              {['General', 'Notifications', 'Privacy', 'Account'].map((subTab) => (
                <button
                  key={subTab}
                  type="button"
                  onClick={() => setActiveSettingsSubTab(subTab)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeSettingsSubTab === subTab
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>⚙️</span>
                  <span>{subTab}</span>
                </button>
              ))}
            </div>

            {/* Sub Tab Forms */}
            <form onSubmit={handleSaveSettings} className="sm:col-span-8 space-y-5">
              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
                {activeSettingsSubTab} Settings
              </h4>

              {activeSettingsSubTab === 'General' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="(GMT+5:30) India Standard Time">(GMT+5:30) India Standard Time</option>
                      <option value="(GMT+0:00) Greenwich Mean Time">(GMT+0:00) Greenwich Mean Time</option>
                    </select>
                  </div>
                </>
              )}

              {activeSettingsSubTab === 'Notifications' && (
                <>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-600">Email Notifications</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, emailNotifs: !settings.emailNotifs })}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                        settings.emailNotifs ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        settings.emailNotifs ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Student Submission Alerts</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, studentSubmissionAlerts: !settings.studentSubmissionAlerts })}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                        settings.studentSubmissionAlerts ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        settings.studentSubmissionAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </>
              )}

              {activeSettingsSubTab === 'Privacy' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Profile Visibility</label>
                  <select
                    value={settings.profileVisibility}
                    onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                  >
                    <option value="Public">Public (Students & Staff)</option>
                    <option value="Staff Only">Staff Only</option>
                  </select>
                </div>
              )}

              {activeSettingsSubTab === 'Account' && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700">Change Password</h5>
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwords, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswordData({ ...passwords, newPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95"
                >
                  Save Settings Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fadeIn">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Edit Faculty Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProfileFormSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Title / Designation</label>
                <input
                  type="text"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Phone Contact</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Office Room / Building</label>
                <input
                  type="text"
                  value={editFormData.office || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, office: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Faculty Bio / Summary</label>
                <textarea
                  value={editFormData.bio || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}