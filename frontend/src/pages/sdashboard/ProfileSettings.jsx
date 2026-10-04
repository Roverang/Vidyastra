import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/authAPI';

export default function ProfileSettings() {
  // Clean Initial User Profile State (No hardcoded mock data)
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    institution: '',
    studentId: '',
    phone: '',
    joinedOn: '',
    coursesCount: 0,
  });

  // Modal State for Edit Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    institution: '',
    phone: '',
  });

  // Fetch real user profile from Backend API
  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await authApi.getProfile();
      
      if (res.data) {
        setUserProfile({
          name: res.data.name || res.data.fullName || '',
          email: res.data.email || '',
          institution: res.data.institution || 'Student Portal Member',
          studentId: res.data.studentId || res.data._id || 'N/A',
          phone: res.data.phone || 'N/A',
          joinedOn: res.data.createdAt ? new Date(res.data.createdAt).toLocaleDateString() : 'Recent',
          coursesCount: res.data.enrolledCourses?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching student profile from API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Open Edit Profile Modal
  const handleEditProfile = () => {
    setEditFormData({
      name: userProfile.name,
      email: userProfile.email,
      institution: userProfile.institution,
      phone: userProfile.phone,
    });
    setIsEditModalOpen(true);
  };

  // Handle Input Changes in Modal
  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit Profile Changes to Backend API
  const handleProfileFormSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await authApi.updateProfile(editFormData);
      alert('Profile updated successfully in database!');
      setIsEditModalOpen(false);
      fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn relative max-w-4xl mx-auto">
      
      {/* Top Header Row */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">My Profile</h2>
      </div>

      {/* Profile Card Container */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
        <h3 className="font-bold text-slate-800 text-base">Profile Information</h3>

        {/* User Info Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl shadow-inner flex-shrink-0">
            👤
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-base">
              {loading ? 'Loading...' : userProfile.name || 'Student Member'}
            </h4>
            <p className="text-xs text-slate-500 font-medium">{userProfile.email}</p>
            <p className="text-[11px] text-indigo-600 font-bold">{userProfile.institution}</p>
          </div>
        </div>

        {/* Edit Profile Button */}
        <button
          onClick={handleEditProfile}
          className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
        >
          ✏️ Edit Profile
        </button>

        {/* Metadata List */}
        <div className="space-y-4 pt-2 text-xs">
          <div className="flex justify-between items-center text-slate-600 font-medium py-2 border-b border-slate-50">
            <span className="text-slate-400 font-bold">Student ID</span>
            <span className="font-bold text-slate-800">{userProfile.studentId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 font-medium py-2 border-b border-slate-50">
            <span className="text-slate-400 font-bold">Phone</span>
            <span className="font-bold text-slate-800">{userProfile.phone || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 font-medium py-2 border-b border-slate-50">
            <span className="text-slate-400 font-bold">Joined On</span>
            <span className="font-bold text-slate-800">{userProfile.joinedOn || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 font-medium py-2">
            <span className="text-slate-400 font-bold">Courses Enrolled</span>
            <span className="font-bold text-slate-800">{userProfile.coursesCount}</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Popup */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-5 animate-fadeIn">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Edit Profile</h3>
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
                  name="name"
                  value={editFormData.name}
                  onChange={handleModalInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleModalInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Institution & Branch</label>
                <input
                  type="text"
                  name="institution"
                  value={editFormData.institution}
                  onChange={handleModalInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleModalInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}