import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const FIELDS = [
  { key: 'fullName',   label: 'Full Name',   type: 'text',     placeholder: 'Juan dela Cruz' },
  { key: 'username',   label: 'Username',    type: 'text',     placeholder: 'juandc' },
  { key: 'studentId',  label: 'Student ID',  type: 'text',     placeholder: '7-digit number (e.g. 2021001)' },
  { key: 'program',    label: 'Program',     type: 'text',     placeholder: 'BS Information Technology' },
  { key: 'password',   label: 'Password',    type: 'password', placeholder: 'Create a password' },
];

const validate = (form) => {
  const errors = {};
  FIELDS.forEach(({ key }) => {
    if (!form[key]?.trim()) errors[key] = 'This field is required';
  });
  if (form.studentId && !/^\d{7}$/.test(form.studentId.trim())) {
    errors.studentId = 'Student ID must be exactly 7 numeric digits';
  }
  return errors;
};

const SignUp = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState({ fullName: '', username: '', studentId: '', program: '', password: '' });
  const [touched, setTouched] = useState({});
  const [showPw, setShowPw] = useState(false);

  const errors = validate(form);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(FIELDS.map(({ key }) => [key, true]));
    setTouched(allTouched);
    if (Object.keys(errors).length) return;
    try {
      await register(form);
      navigate('/dashboard');
    } catch {
      // error shown via hook
    }
  };

  return (
    <div className="min-h-screen bg-[#060b18] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-orange-500 uppercase italic mb-1">FORGE</h1>
          <p className="text-xs text-zinc-500">Create your student account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {FIELDS.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={key === 'password' ? (showPw ? 'text' : 'password') : type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  onBlur={() => setTouched({ ...touched, [key]: true })}
                  placeholder={placeholder}
                  className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 transition-colors ${
                    touched[key] && errors[key]
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
                  } ${key === 'password' ? 'pr-10' : ''}`}
                />
                {key === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {touched[key] && errors[key] && (
                <p className="text-red-400 text-xs mt-1">{errors[key]}</p>
              )}
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2.5 rounded-lg">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-all active:scale-95 text-sm mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link to="/signin" className="text-orange-400 hover:text-orange-300 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
