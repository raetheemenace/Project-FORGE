import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import logo from '../assets/logo.png';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    tipEmail: '',
    studentId: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'studentId' && value.toUpperCase() !== 'ADMIN01') {
      value = value.replace(/\D/g, '');
    }
    setFormData({ ...formData, [e.target.name]: value });
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    const isAdmin = formData.studentId.trim().toUpperCase() === 'ADMIN01';
    if (!formData.tipEmail.trim()) {
      errs.tipEmail = 'TIP Email is required';
    } else if (!isAdmin && !/^m[a-zA-Z.]+@tip\.edu\.ph$/.test(formData.tipEmail)) {
      errs.tipEmail = 'Must be a valid TIP email (e.g. mjdelacruz@tip.edu.ph)';
    }
    if (!formData.studentId.trim()) errs.studentId = 'Student ID is required';
    else if (!isAdmin && !/^\d{7,8}$/.test(formData.studentId)) errs.studentId = 'Must be 7-8 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const response = await signIn(formData.tipEmail, formData.studentId, rememberMe);
      if (response.user?.role === 'LAB_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Invalid credentials. Please try again.' });
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
      <div className="hidden sm:block absolute top-6 left-6 w-16 h-[72px] border-l-2 border-t-2 border-[#001254]/10" />
      <div className="hidden sm:block absolute top-6 right-6 w-16 h-[72px] border-r-2 border-t-2 border-[#001254]/10" />
      <div className="hidden sm:block absolute bottom-6 left-6 w-16 h-[72px] border-l-2 border-b-2 border-[#001254]/10" />
      <div className="hidden sm:block absolute bottom-6 right-6 w-16 h-[72px] border-r-2 border-b-2 border-[#001254]/10" />

      {/* Glassmorphism Navigation Bar */}
      <nav className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-white/40 backdrop-blur-md border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-6 text-[#001254]/80 text-xs sm:text-sm font-medium">
          <Link to="/" className="hover:text-[#001254] transition-colors">HOME</Link>
          <Link to="/signin" className="text-[#001254] font-semibold">SIGN IN</Link>
          <Link to="/signup" className="hover:text-[#001254] transition-colors">SIGN UP</Link>
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
            <div className="h-px w-16 sm:w-24 bg-white/20" />
            <p className="text-white/60 tracking-[0.15em] sm:tracking-[0.2em] uppercase text-center" style={{ fontSize: '0.6rem' }}>
              Lab & Resource Management
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-[#001254]/10">
            <button
              className="flex-1 py-3 text-center transition-colors text-[#001254] border-b-2 border-[#001254] bg-[#F2F0DB]/30"
              style={{ fontSize: '0.85rem' }}
            >
              Sign In
            </button>
            <Link
              to="/signup"
              className="flex-1 py-3 text-center transition-colors text-[#001254]/40 hover:text-[#001254]/60"
              style={{ fontSize: '0.85rem' }}
            >
              Sign Up
            </Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[#001254]/70 mb-1.5" style={{ fontSize: '0.8rem' }}>
                TIP Email
              </label>
              <input
                type="email"
                name="tipEmail"
                value={formData.tipEmail}
                onChange={handleChange}
                placeholder="mjdelacruz@tip.edu.ph"
                className="w-full px-4 py-3 bg-[#f7f7f3] border border-[#001254]/10 rounded-lg focus:outline-none focus:border-[#0B4EA2] focus:ring-1 focus:ring-[#0B4EA2]/30 transition-all placeholder:text-[#001254]/25"
              />
              {errors.tipEmail && (
                <p className="mt-1 text-[#d4183d]" style={{ fontSize: '0.75rem' }}>
                  {errors.tipEmail}
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
                placeholder="2024001"
                maxLength={8}
                className="w-full px-4 py-3 bg-[#f7f7f3] border border-[#001254]/10 rounded-lg focus:outline-none focus:border-[#0B4EA2] focus:ring-1 focus:ring-[#0B4EA2]/30 transition-all placeholder:text-[#001254]/25"
              />
              {errors.studentId && (
                <p className="mt-1 text-[#d4183d]" style={{ fontSize: '0.75rem' }}>
                  {errors.studentId}
                </p>
              )}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center">{errors.submit}</p>
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#0B4EA2] border-[#001254]/20 rounded focus:ring-[#0B4EA2] focus:ring-offset-0"
              />
              <label
                htmlFor="rememberMe"
                className="text-[#001254]/70 cursor-pointer select-none"
                style={{ fontSize: '0.8rem' }}
              >
                Remember me on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#001254] text-white rounded-lg hover:bg-[#001254]/90 active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
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
