import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  DoorOpen,
  ChevronLeft,
  ShieldCheck,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  PowerOff,
  X,
  Filter,
  Search,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEPARTMENTS = ['Chemistry', 'Physics', 'Engineering', 'Biology', 'Computer Science'];
const STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'];

function StatusBadge({ status }) {
  const map = {
    ACTIVE:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE:    'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
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

function RoomForm({ initial, onSubmit, onCancel, loading, submitLabel }) {
  const [form, setForm] = useState({
    roomId:     initial?.room_id     || '',
    roomName:   initial?.room_name   || '',
    department: initial?.department  || '',
    capacity:   initial?.capacity    || '',
    status:     initial?.status      || 'ACTIVE',
  });
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.roomId.trim())   e.roomId   = 'Room ID is required.';
    if (!form.roomName.trim()) e.roomName = 'Room name is required.';
    if (!form.department)      e.department = 'Department is required.';
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit(form);
  };

  const isEdit = !!initial;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Room ID — read-only on edit */}
      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Room ID</label>
        <input
          value={form.roomId}
          onChange={e => set('roomId', e.target.value)}
          disabled={isEdit}
          placeholder="e.g. A-101"
          className={`w-full border rounded-xl px-3 py-2.5 text-[#001254] outline-none transition-colors disabled:bg-[#001254]/5 disabled:cursor-not-allowed ${errors.roomId ? 'border-red-400 bg-red-50' : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'}`}
          style={{ fontSize: '0.88rem' }}
        />
        {errors.roomId && <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{errors.roomId}</p>}
      </div>

      {/* Room Name */}
      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Room Name</label>
        <input
          value={form.roomName}
          onChange={e => set('roomName', e.target.value)}
          placeholder="e.g. Chemistry Laboratory 1"
          className={`w-full border rounded-xl px-3 py-2.5 text-[#001254] outline-none transition-colors ${errors.roomName ? 'border-red-400 bg-red-50' : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'}`}
          style={{ fontSize: '0.88rem' }}
        />
        {errors.roomName && <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{errors.roomName}</p>}
      </div>

      {/* Department */}
      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Department</label>
        <select
          value={form.department}
          onChange={e => set('department', e.target.value)}
          className={`w-full border rounded-xl px-3 py-2.5 text-[#001254] outline-none transition-colors bg-white ${errors.department ? 'border-red-400 bg-red-50' : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'}`}
          style={{ fontSize: '0.88rem' }}
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {errors.department && <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{errors.department}</p>}
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Capacity <span className="text-[#001254]/30">(optional)</span></label>
        <input
          type="number"
          min="1"
          value={form.capacity}
          onChange={e => set('capacity', e.target.value)}
          placeholder="e.g. 30"
          className="w-full border border-[#001254]/15 focus:border-[#0B4EA2]/50 rounded-xl px-3 py-2.5 text-[#001254] outline-none transition-colors"
          style={{ fontSize: '0.88rem' }}
        />
      </div>

      {/* Status — only shown on edit */}
      {isEdit && (
        <div>
          <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Status</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="w-full border border-[#001254]/15 focus:border-[#0B4EA2]/50 rounded-xl px-3 py-2.5 text-[#001254] outline-none transition-colors bg-white"
            style={{ fontSize: '0.88rem' }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
          style={{ fontSize: '0.85rem' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#001254] text-white rounded-xl py-2.5 hover:bg-[#0B4EA2] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ fontSize: '0.85rem' }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function LabRoomManagement() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const token = () => localStorage.getItem('token');

  const fetchRooms = () => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/admin/rooms`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => setRooms(res.data.rooms || []))
      .catch(err => {
        if (err.response?.status === 403) setError('Access denied. Lab Admin role required.');
        else setError('Could not load lab rooms.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRooms(); }, []);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreate = async (form) => {
    setActionLoading(true);
    try {
      await axios.post(
        `${API_URL}/admin/rooms`,
        { roomId: form.roomId, roomName: form.roomName, department: form.department, capacity: form.capacity || null, status: form.status },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setShowCreate(false);
      flash('Lab room created successfully.');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lab room.');
      setShowCreate(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/admin/rooms/${editTarget.room_id}`,
        { roomName: form.roomName, department: form.department, capacity: form.capacity || null, status: form.status },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setEditTarget(null);
      flash('Lab room updated successfully.');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update lab room.');
      setEditTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await axios.delete(
        `${API_URL}/admin/rooms/${deactivateTarget.room_id}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setDeactivateTarget(null);
      flash('Lab room deactivated.');
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deactivate lab room.');
      setDeactivateTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const displayName = user?.fullName || user?.username || 'Admin';

  const hasActiveFilters = search || filterDept || filterStatus;

  const clearFilters = () => { setSearch(''); setFilterDept(''); setFilterStatus(''); };

  // Apply search + filters, then group by department
  const filteredGrouped = useMemo(() => {
    let list = [...rooms];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.room_id || '').toLowerCase().includes(q) ||
          (r.room_name || '').toLowerCase().includes(q)
      );
    }

    if (filterDept) {
      list = list.filter((r) => r.department === filterDept);
    }

    if (filterStatus) {
      list = list.filter((r) => r.status === filterStatus);
    }

    const groups = {};
    list.forEach((r) => {
      const dept = r.department || 'Uncategorized';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [rooms, search, filterDept, filterStatus]);

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
                  Lab Room Management
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

        {/* Page title + create button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#001254] text-xl font-semibold">Lab Room Management</h1>
            <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
              Create, update, and deactivate laboratory rooms
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#001254] text-white rounded-xl hover:bg-[#0B4EA2] transition-colors"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Room</span>
          </button>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#001254]/30" />
            <input
              type="text"
              placeholder="Search by room ID or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-[#001254]/15 rounded-xl text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div className="bg-white rounded-xl border border-[#001254]/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-[#001254]/40" />
              <span className="text-[#001254]/50 uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                  style={{ fontSize: '0.75rem' }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
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
            <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Rooms grouped by department */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#001254]/10 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
          </div>
        ) : rooms.length === 0 && !hasActiveFilters ? (
          <div className="bg-white rounded-xl border border-[#001254]/10 flex flex-col items-center justify-center py-16 gap-3">
            <DoorOpen className="w-10 h-10 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No lab rooms found.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[#0B4EA2] hover:underline"
              style={{ fontSize: '0.82rem' }}
            >
              Add the first room
            </button>
          </div>
        ) : filteredGrouped.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#001254]/10 flex flex-col items-center justify-center py-16 gap-3">
            <DoorOpen className="w-10 h-10 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>
              {hasActiveFilters ? 'No rooms match the current filters.' : 'No lab rooms found.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[#0B4EA2] underline underline-offset-2" style={{ fontSize: '0.82rem' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredGrouped.map(([dept, deptRooms]) => (
            <div key={dept} className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#001254]/8 bg-[#001254]/2 flex items-center justify-between">
                <h2 className="text-[#001254] font-semibold" style={{ fontSize: '0.85rem' }}>{dept}</h2>
                <span className="text-[#001254]/40 text-xs">{deptRooms.length} room{deptRooms.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#001254]/8">
                      <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Room ID</th>
                      <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Name</th>
                      <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden lg:table-cell" style={{ fontSize: '0.65rem' }}>Capacity</th>
                      <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Status</th>
                      <th className="text-right px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptRooms.map((room, i) => (
                      <tr
                        key={room.room_id}
                        className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === deptRooms.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <td className="px-5 py-3.5 font-mono text-[#001254]" style={{ fontSize: '0.85rem' }}>{room.room_id}</td>
                        <td className="px-5 py-3.5 text-[#001254]" style={{ fontSize: '0.85rem' }}>{room.room_name}</td>
                        <td className="px-5 py-3.5 text-[#001254]/60 hidden lg:table-cell" style={{ fontSize: '0.82rem' }}>
                          {room.capacity ?? '—'}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={room.status} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditTarget(room)}
                              className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors"
                              title="Edit room"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#0B4EA2]" />
                            </button>
                            <button
                              onClick={() => setDeactivateTarget(room)}
                              disabled={room.status === 'INACTIVE'}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                              title={room.status === 'INACTIVE' ? 'Already inactive' : 'Deactivate room'}
                            >
                              <PowerOff className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Lab Room" onClose={() => setShowCreate(false)}>
          <RoomForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            loading={actionLoading}
            submitLabel="Create Room"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="Edit Lab Room" onClose={() => setEditTarget(null)}>
          <RoomForm
            initial={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={actionLoading}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {/* Deactivate confirm modal */}
      {deactivateTarget && (
        <Modal title="Deactivate Room" onClose={() => setDeactivateTarget(null)}>
          <div className="space-y-4">
            <p className="text-[#001254]/70" style={{ fontSize: '0.88rem' }}>
              Deactivate <span className="font-semibold text-[#001254]">{deactivateTarget.room_id} — {deactivateTarget.room_name}</span>?
              The room will be marked as INACTIVE and hidden from active sessions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeactivateTarget(null)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ fontSize: '0.85rem' }}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Deactivate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
