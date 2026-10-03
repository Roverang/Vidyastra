import React, { useState } from 'react';
import { authApi } from '../../api/authAPI';
import nitjLogo from '../../../assets/nitj_logo.png'; // Update with your actual image path

export default function Register() {
  // Step Flow State: 'email' | 'otp' | 'details'
  const [step, setStep] = useState('email');

  // Form Data States
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // STEP 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      await authApi.sendOtp(email.trim());
      setStep('otp');
      setMessage(`Verification OTP sent to ${email.trim()}`);
    } catch (error) {
      console.error('Send OTP Error:', error);
      const errMsg = error.response?.data?.message || 'Failed to send OTP. Please check your email.';
      setMessage(`STATUS: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      await authApi.verifyOtp({ email: email.trim(), otp: otpInput.trim() });
      setStep('details');
      setMessage('Email verified successfully. Complete details below.');
    } catch (error) {
      console.error('Verify OTP Error:', error);
      const errMsg = error.response?.data?.message || 'Invalid or expired OTP. Try again.';
      setMessage(`STATUS: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Complete Account Registration
  const handleFinalRegisterSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setMessage('STATUS: Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('STATUS: Passwords do not match');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await authApi.register({
        name: fullName,
        email: email.trim(),
        password,
        role: role.toLowerCase(),
      });

      alert('Registration successful! Redirecting to login page...');
      window.location.href = '/login';
    } catch (error) {
      console.error('Registration error:', error);
      const errMsg = error.response?.data?.message || 'Failed to create account. Try again.';
      setMessage(`STATUS: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#e9ecef] font-sans text-slate-800">
      {/* Top Gold Line */}
      <div className="h-[3px] bg-[#fbb03b] w-full"></div>

      {/* Responsive NITJ Header */}
      <header className="bg-[#003b6d] text-white px-4 sm:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-4 max-w-7xl mx-auto text-center sm:text-left">
          {/* Logo Image */}
          <img 
            src={nitjLogo} 
            alt="NIT Jalandhar Logo" 
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0" 
          />
          <div className="font-serif">
            <div className="text-xs sm:text-sm font-normal text-slate-100 leading-snug tracking-wide">
              डॉ बी आर अम्बेडकर
            </div>
            <div className="text-sm sm:text-lg md:text-xl font-bold tracking-normal leading-tight">
              राष्ट्रीय प्रौद्योगिकी संस्थान जालंधर
            </div>
            <div className="text-[10px] sm:text-xs text-slate-200 tracking-normal">
              Dr B R Ambedkar
            </div>
            <div className="text-base sm:text-xl md:text-2xl font-semibold tracking-tight leading-none text-white">
              National Institute of Technology Jalandhar
            </div>
          </div>
        </div>
      </header>

      {/* Sub-Header Navigation Bar */}
      <nav className="bg-[#1a1a1a] text-[#fbb03b] text-xs sm:text-sm px-4 sm:px-8 py-2 font-medium text-center sm:text-left">
        | VIDYASTRA - ACADEMIC PORTAL |
      </nav>

      {/* Center White Register Box */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-white rounded-xl shadow-md border border-gray-200 p-5 sm:p-8 my-auto">
          
          {/* Header SVG Icon & Title */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
              <svg className="w-6 h-6 text-[#003366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#003366] tracking-tight">
              VIDYASTRA Register
            </h2>
          </div>

          {/* Alert Message */}
          {message && (
            <div className={`p-2.5 mb-4 border rounded text-xs font-semibold text-center ${
              !message.startsWith('STATUS:')
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* STEP 1: EMAIL & ACCOUNT TYPE INPUT */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Account Type:
                </label>
                <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded border border-gray-300 text-xs font-semibold">
                  {['Student', 'Faculty'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`py-1.5 sm:py-1 rounded transition ${
                        role === item
                          ? 'bg-[#337ab7] text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Institutional Email:
                </label>
                <input
                  type="email"
                  placeholder="Enter Institutional Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-sm rounded transition disabled:opacity-50 mt-2"
              >
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>

              <div className="text-center pt-2 text-xs border-t border-gray-100 text-gray-600">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { window.location.href = '/login'; }}
                  className="text-[#337ab7] font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP INPUT */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Enter Verification OTP:
                </label>
                <input
                  type="text"
                  placeholder="Enter OTP Code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-center text-sm font-bold tracking-widest border border-gray-300 rounded focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-sm rounded transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setMessage('');
                }}
                className="w-full text-xs text-red-600 hover:underline text-center block pt-1"
              >
                Change Email Address
              </button>
            </form>
          )}

          {/* STEP 3: FULL NAME & PASSWORDS DETAILS */}
          {step === 'details' && (
            <form onSubmit={handleFinalRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Create Password:
                </label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003366] mb-1">
                  Confirm Password:
                </label>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#337ab7] hover:bg-[#286090] text-white font-bold text-sm rounded transition disabled:opacity-50 mt-2"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            </form>
          )}

        </div>
      </main>

      {/* Official Blue Footer */}
      <footer className="bg-[#003b6d] text-white text-center py-3 px-4 text-[11px] sm:text-xs leading-relaxed mt-auto">
        <p>Copyright 2026 © VidyAstra | NIT Jalandhar</p>
        <p className="text-slate-300">
          Developed by: Computer Centre, Dr. B.R. Ambedkar National Institute of Technology, Jalandhar
        </p>
      </footer>
    </div>
  );
}