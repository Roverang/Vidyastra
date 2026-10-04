import api from './axios';

export const authApi = {
  // POST /auth/login
  login: (data) => api.post('/auth/login', data),

  // POST /auth/send-otp
  sendOtp: (email) => api.post('/auth/send-otp', { email }),

  // POST /auth/verify-otp
  verifyOtp: (data) => api.post('/auth/verify-otp', data), // { email, otp }

  // POST /auth/reset-password (resetToken comes from verifyOtp's response)
  resetPassword: (data) => api.post('/auth/reset-password', data), // { email, newPassword, resetToken }

  // POST /auth/register
  register: (data) => api.post('/auth/register', data), // { email, name, role, password }
};