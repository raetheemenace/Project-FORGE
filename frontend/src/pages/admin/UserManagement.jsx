import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  Users,
  ChevronLeft,
  ShieldCheck,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserX,
  UserCheck,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function RoleBadge({ role }) {
  const map = {
    LAB_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    STUDENT:   'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${map[role] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {role}
    </span>
  );
}

function StatusBadge({ disabled }) {
  return disabled
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium bg-red-50 text-red-700 border-red-200">DISABLED</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">ACTIVE</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#001254]/10">
          <h2 className="text-[#001254] font-semibold" style={{ fontSize: '0.95rem' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors">
            <X className="w-4 h-4 text-[#001254]/50" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, action: 'disable'|'enable' }
  const [actionLoading, setActionLoading] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => setUsers(res.data.users || []))
      .catch((err) => {
        if (err.response?.status === 403) setError('Access denied. Lab Admin role required.');
        else setError('Could not load user list.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleToggle = async () => {
    if (!confirmTarget) return;
    const { user: targetUser, action } = confirmTarget;
    const disabled = action === 'disable';

    setActionLoading(true);
    try {
      await axios.patch(
        `${API_URL}/admin/users/${targetUser.user_id}`,
        { disabled },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setConfirmTarget(null);
      flash(`Account ${disabled ? 'disabled' : 'enabled'} successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account.');
      setConfirmTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const displayName = user?.fullName || user?.username || 'Admin';

  return (
    <div className="min-h-screen bg-[#EFEFE9]">

      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(0,18,84,0.08)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin')} className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#001254]/50" />
              </button>
              <img src={logo} alt="FORGE" className="h-9 opacity-80" />
              <div className="hidden md:block h-5 w-px bg-[#001254]/20" />
              <div className="hidden md:flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B4EA2]/60" />
                <span className="text-[#001254]/50 tracking-widest uppercase" style={{ fontSize: '0.6rem' }}>
                  User Management
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[#001254]/90" style={{ fontSize: '0.8rem' }}>{displayName}</p>
                <p className="text-[#0B4EA2]/60" style={{ fontSize: '0.65rem' }}>LAB ADMIN</p>
              </div>
              <button
                onClick={() => { signOut(); navigate('/signin'); }}
                className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-[#001254]/50" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* Page title */}
        <div>
          <h1 className="text-[#001254] text-xl font-semibold">User Management</h1>
          <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
            View and manage registered student accounts
          </p>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-[#001254]/15" />
              <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#001254]/8">
                    <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Name</th>
                    <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden md:table-cell" style={{ fontSize: '0.65rem' }}>Student ID</th>
                    <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden lg:table-cell" style={{ fontSize: '0.65rem' }}>Program</th>
                    <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Role</th>
                    <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Status</th>
                    <th className="text-right px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.user_id}
                      className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === users.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[#001254]" style={{ fontSize: '0.85rem' }}>{u.full_name}</p>
                        <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>{u.username}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#001254]/60 font-mono hidden md:table-cell" style={{ fontSize: '0.8rem' }}>
                        {u.student_id || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[#001254]/60 hidden lg:table-cell" style={{ fontSize: '0.82rem' }}>
                        {u.program || '—'}
                      </td>
                      <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                      <td className="px-5 py-3.5"><StatusBadge disabled={u.is_disabled} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end">
                          {u.is_disabled ? (
                            <button
                              onClick={() => setConfirmTarget({ user: u, action: 'enable' })}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Enable account"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmTarget({ user: u, action: 'disable' })}
                              disabled={u.role === 'LAB_ADMIN'}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                              title={u.role === 'LAB_ADMIN' ? 'Cannot disable admin accounts' : 'Disable account'}
                            >
                              <UserX className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Confirm disable/enable modal */}
      {confirmTarget && (
        <Modal
          title={confirmTarget.action === 'disable' ? 'Disable Account' : 'Enable Account'}
          onClose={() => setConfirmTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-[#001254]/70" style={{ fontSize: '0.88rem' }}>
              {confirmTarget.action === 'disable' ? (
                <>Disable <span className="font-semibold text-[#001254]">{confirmTarget.user.full_name}</span>'s account? They will not be able to sign in until re-enabled.</>
              ) : (
                <>Re-enable <span className="font-semibold text-[#001254]">{confirmTarget.user.full_name}</span>'s account? They will regain access to FORGE.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleToggle}
                disabled={actionLoading}
                className={`flex-1 text-white rounded-xl py-2.5 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                  confirmTarget.action === 'disable' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                style={{ fontSize: '0.85rem' }}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {confirmTarget.action === 'disable' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
