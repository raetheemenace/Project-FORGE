import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import logo from '../assets/logo.png';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    program: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!formData.studentId.trim()) errs.studentId = 'Student ID is required';
    else if (!/^\d{8}$/.test(formData.studentId)) errs.studentId = 'Must be 8 digits';
    if (!formData.program.trim()) errs.program = 'Program is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      await signUp(formData);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EFEFE9] p-4 relative overflow-hidden">
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(#001254 1px, transparent 1px), linear-gradient(90deg, #001254 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }} 
      />

      {/* Corner decorations - hidden on mobile */}
      <div className="hidden sm:block absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-[#001254]/10" />
      <div className="hidden sm:block absolute top-6 right-6 w-16 h-16 border-r-2 border-t-2 border-[#001254]/10" />
      <div className="hidden sm:block absolute bottom-6 left-6 w-16 h-16 border-l-2 border-b-2 border-[#001254]/10" />
      <div className="hidden sm:block absolute bottom-6 right-6 w-16 h-16 border-r-2 border-b-2 border-[#001254]/10" />

      {/* Glassmorphism Navigation Bar */}
      <nav className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-white/40 backdrop-blur-md border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-6 text-[#001254]/80 text-xs sm:text-sm font-medium">
          <Link to="/" className="hover:text-[#001254] transition-colors">HOME</Link>
          <Link to="/signin" className="hover:text-[#001254] transition-colors">SIGN IN</Link>
          <Link to="/signup" className="text-[#001254] font-semibold">SIGN UP</Link>
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-xl border border-[#001254]/10 shadow-lg shadow-[#001254]/5 overflow-hidden">
          {/* Header */}
          <div className="bg-[#001254] px-4 sm:px-8 py-6 sm:py-8 flex flex-col items-center gap-3 sm:gap-4">
            <img src={logo} alt="FORGE" className="w-40 sm:w-56 brightness-0 invert opacity-90" />
            <div className="h-[1px] w-16 sm:w-24 bg-white/20" />
            <p className="text-white/60 tracking-[0.15em] sm:tracking-[0.2em] uppercase text-center" style={{ fontSize: '0.6rem' }}>
              Lab & Resource Management
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-[#001254]/10">
            <Link
              to="/signin"
              className="flex-1 py-3 text-center transition-colors text-[#001254]/40 hover:text-[#001254]/60"
              style={{ fontSize: '0.85rem' }}
            >
              Sign In
            </Link>
            <button
              className="flex-1 py-3 text-center transition-colors text-[#001254] border-b-2 border-[#001254] bg-[#F2F0DB]/30"
              style={{ fontSize: '0.85rem' }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[#001254]/70 mb-1.5" style={{ fontSize: '0.8rem' }}>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-3 bg-[#f7f7f3] border border-[#001254]/10 rounded-lg focus:outline-none focus:border-[#0B4EA2] focus:ring-1 focus:ring-[#0B4EA2]/30 transition-all placeholder:text-[#001254]/25"
              />
              {errors.fullName && (
                <p className="mt-1 text-[#d4183d]" style={{ fontSize: '0.75rem' }}>
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[#001254]/70 mb-1.5" style={{ fontSize: '0.8rem' }}>
                Student ID
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="20210001"
                maxLength={8}
                className="w-full px-4 py-3 bg-[#f7f7f3] border border-[#001254]/10 rounded-lg focus:outline-none focus:border-[#0B4EA2] focus:ring-1 focus:ring-[#0B4EA2]/30 transition-all placeholder:text-[#001254]/25"
              />
              {errors.studentId && (
                <p className="mt-1 text-[#d4183d]" style={{ fontSize: '0.75rem' }}>
                  {errors.studentId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[#001254]/70 mb-1.5" style={{ fontSize: '0.8rem' }}>
                Program
              </label>
              <div className="relative">
                <select
                  name="program"
                  value={formData.program}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#f7f7f3] border border-[#001254]/10 rounded-lg focus:outline-none focus:border-[#0B4EA2] focus:ring-1 focus:ring-[#0B4EA2]/30 transition-all appearance-none text-[#001254]"
                >
                  <option value="">Select your program</option>
                  <option value="BS Information Technology">BS Information Technology</option>
                  <option value="BS Computer Science">BS Computer Science</option>
                  <option value="BS Computer Engineering">BS Computer Engineering</option>
                  <option value="BS Electronics Engineering">BS Electronics Engineering</option>
                  <option value="BS Mechanical Engineering">BS Mechanical Engineering</option>
                  <option value="BS Civil Engineering">BS Civil Engineering</option>
                  <option value="BS Chemical Engineering">BS Chemical Engineering</option>
                  <option value="BS Industrial Engineering">BS Industrial Engineering</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#001254]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.program && (
                <p className="mt-1 text-[#d4183d]" style={{ fontSize: '0.75rem' }}>
                  {errors.program}
                </p>
              )}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#001254] text-white rounded-lg hover:bg-[#001254]/90 active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[#001254]/30" style={{ fontSize: '0.7rem' }}>
          FORGE v2.0 | Student Lab & Resource Management System
        </p>
      </motion.div>
    </div>
  );
}
