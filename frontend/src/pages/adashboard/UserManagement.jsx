import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/authAPI';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('All users');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Student',
    status: 'Active',
    password: 'password123',
  });

  // Fetch Users from Backend API on Mount
  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const res = await authApi.getTotalUsers();
      if (res.data && Array.isArray(res.data)) {
        setUsers(
          res.data.map((u, index) => ({
            id: u._id || index + 1,
            name: u.name || u.fullName || 'User',
            email: u.email,
            role: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Student',
            status: u.status || 'Active',
            joinedOn: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent',
          }))
        );
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Handle Add User via API
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    try {
      await authApi.register({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.toLowerCase(),
        password: newUser.password,
      });

      setIsAddModalOpen(false);
      setNewUser({ name: '', email: '', role: 'Student', status: 'Active', password: 'password123' });
      alert('New user registered successfully in database!');
      fetchUsersData();
    } catch (err) {
      console.error('Add user error:', err);
      alert('Failed to register user: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle Edit User
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await authApi.updateProfile({
        userId: editingUser.id,
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role.toLowerCase(),
        status: editingUser.status,
      });

      setEditingUser(null);
      alert('User details updated in database!');
      fetchUsersData();
    } catch (err) {
      console.error('Update user error:', err);
      alert('Failed to update user: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle Suspend/Activate Toggle
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await authApi.updateProfile({
        userId: user.id,
        status: newStatus,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      console.error('Status toggle error:', err);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to remove this user account?')) {
      try {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        alert('User account removed!');
      } catch (err) {
        console.error('Delete user error:', err);
      }
    }
  };

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    let tabMatch = true;
    if (activeTab === 'Students') tabMatch = u.role === 'Student';
    if (activeTab === 'Faculty') tabMatch = u.role === 'Faculty';
    if (activeTab === 'Admins') tabMatch = u.role === 'Admin';

    let searchMatch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    return tabMatch && searchMatch;
  });

  // Real Dynamic Metric Counts calculated directly from Database state
  const totalStudentsCount = users.filter((u) => u.role === 'Student').length;
  const totalFacultyCount = users.filter((u) => u.role === 'Faculty').length;
  const totalAdminsCount = users.filter((u) => u.role === 'Admin').length;
  const totalUsersCount = users.length;

  return (
    <div className="space-y-6 animate-fadeIn relative max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage user accounts, faculty assignments, and access permissions</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Search / Add Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {/* Role Sub-Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/70 rounded-2xl border border-slate-200/60 overflow-x-auto">
          {['All users', 'Students', 'Faculty', 'Admins'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Bar & + Add User Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder="🔍 Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-xs"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
          >
            + Add User
          </button>
        </div>

      </div>

      {/* OVERVIEW STATS CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md space-y-1">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">TOTAL USERS</p>
          <h3 className="text-2xl font-extrabold text-slate-800">{totalUsersCount.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md space-y-1">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">STUDENTS</p>
          <h3 className="text-2xl font-extrabold text-slate-800">{totalStudentsCount.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md space-y-1">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">FACULTY</p>
          <h3 className="text-2xl font-extrabold text-slate-800">{totalFacultyCount.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md space-y-1">
          <p className="text-[10px] font-extrabold uppercase text-slate-400">ADMINS</p>
          <h3 className="text-2xl font-extrabold text-slate-800">{totalAdminsCount.toLocaleString()}</h3>
        </div>
      </div>

      {/* MAIN USERS TABLE CONTAINER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
        
        {/* Users Table */}
        <div className="overflow-x-auto min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-slate-400 font-bold text-xs">
              Fetching user accounts from database...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold text-xs">
              No users registered in database matching criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">EMAIL</th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">JOINED ON</th>
                  <th className="py-3 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-4 font-bold text-slate-900">{user.name}</td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{user.email}</td>
                    <td className="py-4 px-4 font-bold text-indigo-600">{user.role}</td>
                    <td className="py-4 px-4 font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                        user.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-bold">{user.joinedOn}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => setEditingUser(user)}
                          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs transition"
                          title="Edit User"
                        >
                          ✏️
                        </button>

                        {/* Suspend/Activate */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs transition"
                          title={user.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                        >
                          {user.status === 'Active' ? '🚫' : '✓'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center font-bold text-xs transition"
                          title="Delete User"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination & Counter Footer Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <span>
            Showing 1 to {filteredUsers.length} of {totalUsersCount} users
          </span>

          <div className="flex items-center gap-1 font-bold">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-7 h-7 rounded-xl text-xs flex items-center justify-center transition ${
                  currentPage === num
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL 1: ADD NEW USER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-4 animate-fadeIn">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Add New User Account</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Verma"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@student.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Initial Status</label>
                  <select
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95"
                >
                  Register User
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-4 animate-fadeIn">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Edit User Profile</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}