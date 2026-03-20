import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserX, UserCheck } from 'lucide-react';
import api from '../../services/api.js';
import WebHeader from '../../components/layout/WebHeader.jsx';
import { getStoredUser } from '../../services/authService.js';

const UserManagement = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/admin/users').then((r) => setUsers(r.data.users || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (u) => {
    const action = u.disabled ? 'enable' : 'disable';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.fullName}?`)) return;
    try {
      await api.patch(`/admin/users/${u.userId}`, { disabled: !u.disabled });
      load();
    } catch { alert('Action failed'); }
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <button onClick={() => navigate('/admin')} className="p-1.5 text-zinc-400 hover:text-white"><ArrowLeft size={18} /></button>
        <span className="text-sm font-semibold">User Management</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <h2 className="hidden md:block text-xl font-bold text-white mb-6">User Management</h2>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 text-sm">Loading...</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.userId} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <div>
                  <p className={`text-sm font-semibold ${u.disabled ? 'text-zinc-500 line-through' : 'text-white'}`}>{u.fullName}</p>
                  <p className="text-xs text-zinc-500">{u.username} · {u.studentId} · {u.role}</p>
                  <p className="text-xs text-zinc-600">{u.program}</p>
                </div>
                <button
                  onClick={() => toggle(u)}
                  className={`p-2 rounded-lg transition-colors ${
                    u.disabled
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-red-400 hover:bg-red-500/10'
                  }`}
                  aria-label={u.disabled ? 'Enable account' : 'Disable account'}
                >
                  {u.disabled ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserManagement;
