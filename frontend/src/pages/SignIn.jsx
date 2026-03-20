import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const SignIn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, loading, error } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [touched, setTouched] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [sessionMsg, setSessionMsg] = useState('');

  useEffect(() => {
    if (params.get('expired')) setSessionMsg('Your session has expired. Please sign in again.');
  }, [params]);

  const isEmpty = (f) => !form[f].trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (isEmpty('username') || isEmpty('password')) return;
    try {
      const user = await login(form.username, form.password);
      navigate(user.role === 'LAB_ADMIN' ? '/admin' : '/dashboard');
    } catch {
      // error shown via hook
    }
  };

  return (
    <div className="min-h-screen bg-[#060b18] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-orange-500 uppercase italic mb-1">FORGE</h1>
          <p className="text-xs text-zinc-500">Sign in to your account</p>
        </div>

        {sessionMsg && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-2.5 rounded-lg mb-4">
            <AlertCircle size={13} /> {sessionMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              onBlur={() => setTouched({ ...touched, username: true })}
              placeholder="Enter your username"
              className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 transition-colors ${
                touched.username && isEmpty('username')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
              }`}
            />
            {touched.username && isEmpty('username') && (
              <p className="text-red-400 text-xs mt-1">Username is required</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onBlur={() => setTouched({ ...touched, password: true })}
                placeholder="Enter your password"
                className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 transition-colors ${
                  touched.password && isEmpty('password')
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {touched.password && isEmpty('password') && (
              <p className="text-red-400 text-xs mt-1">Password is required</p>
            )}
          </div>

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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-6">
          No account?{' '}
          <Link to="/signup" className="text-orange-400 hover:text-orange-300 font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
