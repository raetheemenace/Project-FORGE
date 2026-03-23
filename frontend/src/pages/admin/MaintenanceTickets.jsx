import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const STATUS_STYLES = {
  OPEN:        'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED:      'bg-gray-50 text-gray-500 border-gray-200',
};

const SEVERITY_STYLES = {
  Low:      'bg-green-50 text-green-700 border-green-200',
  Medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  High:     'bg-orange-50 text-orange-700 border-orange-200',
  Critical: 'bg-red-50 text-red-700 border-red-200',
};

// Valid forward transitions
const NEXT_STATUS = {
  OPEN:        'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED:    'CLOSED',
  CLOSED:      null,
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${SEVERITY_STYLES[severity] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {severity}
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

function ExpandedTicket({ ticket }) {
  return (
    <tr>
      <td colSpan={7} className="px-5 pb-4 pt-0 bg-[#001254]/2">
        <div className="rounded-xl border border-[#001254]/8 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ['Ticket ID',    ticket.ticket_id],
              ['Report ID',    ticket.report_id],
              ['Equipment',    ticket.equipment_name ? `${ticket.equipment_id} — ${ticket.equipment_name}` : ticket.equipment_id],
              ['Reporter',     ticket.reporter_name ? `${ticket.reporter_name} (@${ticket.reporter_username})` : '—'],
              ['Assignee',     ticket.assignee_name ? `${ticket.assignee_name} (@${ticket.assignee_username})` : 'Unassigned'],
              ['Created',      new Date(ticket.created_at).toLocaleString()],
              ['Resolved At',  ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : '—'],
              ['Priority',     ticket.priority || '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[#001254]/40 uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>{label}</p>
                <p className="text-[#001254]" style={{ fontSize: '0.82rem' }}>{val}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[#001254]/40 uppercase tracking-widest mb-1" style={{ fontSize: '0.6rem' }}>Report Description</p>
            <p className="text-[#001254]/70" style={{ fontSize: '0.82rem' }}>{ticket.report_description}</p>
          </div>
          {ticket.resolution && (
            <div>
              <p className="text-[#001254]/40 uppercase tracking-widest mb-1" style={{ fontSize: '0.6rem' }}>Resolution Notes</p>
              <p className="text-[#001254]/70" style={{ fontSize: '0.82rem' }}>{ticket.resolution}</p>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function MaintenanceTickets() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [expandedId, setExpandedId] = useState(null);

  // Create ticket modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ report_id: '', priority: '', assigned_to: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Update ticket modal
  const [updateModal, setUpdateModal] = useState(null); // ticket object
  const [updateForm, setUpdateForm] = useState({ status: '', assigned_to: '', resolution: '', priority: '' });
  const [updateLoading, setUpdateLoading] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/admin/tickets`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => setTickets(res.data.tickets || []))
      .catch((err) => {
        if (err.response?.status === 403) setError('Access denied. Lab Admin role required.');
        else setError('Could not load tickets.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // ── Create ticket ──────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.report_id.trim()) return;
    setCreateLoading(true);
    try {
      const payload = { report_id: Number(createForm.report_id) };
      if (createForm.priority) payload.priority = createForm.priority;
      if (createForm.assigned_to) payload.assigned_to = Number(createForm.assigned_to);
      await axios.post(`${API_URL}/admin/tickets`, payload, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowCreate(false);
      setCreateForm({ report_id: '', priority: '', assigned_to: '' });
      flash('Ticket created successfully.');
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ticket.');
      setShowCreate(false);
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Open update modal ──────────────────────────────────────────────────────
  const openUpdate = (ticket) => {
    setUpdateForm({
      status:      ticket.status,
      assigned_to: ticket.assigned_to || '',
      resolution:  ticket.resolution || '',
      priority:    ticket.priority || '',
    });
    setUpdateModal(ticket);
  };

  // ── Submit update ──────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!updateModal) return;
    setUpdateLoading(true);
    try {
      const payload = {};
      if (updateForm.status !== updateModal.status) payload.status = updateForm.status;
      if (updateForm.assigned_to !== String(updateModal.assigned_to || '')) {
        payload.assigned_to = updateForm.assigned_to ? Number(updateForm.assigned_to) : null;
      }
      if (updateForm.resolution !== (updateModal.resolution || '')) payload.resolution = updateForm.resolution;
      if (updateForm.priority !== (updateModal.priority || '')) payload.priority = updateForm.priority || null;

      await axios.patch(`${API_URL}/admin/tickets/${updateModal.ticket_id}`, payload, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setUpdateModal(null);
      flash(`Ticket #${updateModal.ticket_id} updated.`);
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update ticket.');
      setUpdateModal(null);
    } finally {
      setUpdateLoading(false);
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
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin')} className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#001254]/50" />
              </button>
              <img src={logo} alt="FORGE" className="h-6 opacity-80" />
              <div className="hidden md:block h-5 w-[1px] bg-[#001254]/20" />
              <div className="hidden md:flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B4EA2]/60" />
                <span className="text-[#001254]/50 tracking-widest uppercase" style={{ fontSize: '0.6rem' }}>
                  Maintenance Tickets
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#001254] text-xl font-semibold">Maintenance Tickets</h1>
            <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
              Track and resolve equipment maintenance reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTickets}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-[#001254]/10 rounded-lg hover:border-[#0B4EA2]/30 transition-colors disabled:opacity-50"
              style={{ fontSize: '0.8rem' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0B4EA2] ${loading ? 'animate-spin' : ''}`} />
              <span className="text-[#001254]/60 hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B4EA2] text-white rounded-xl hover:bg-[#0B4EA2]/90 transition-colors"
              style={{ fontSize: '0.82rem' }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Ticket</span>
            </button>
          </div>
        </div>

        {/* Banners */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tickets table */}
        <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wrench className="w-10 h-10 text-[#001254]/15" />
              <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No maintenance tickets found.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="text-[#0B4EA2] underline underline-offset-2"
                style={{ fontSize: '0.82rem' }}
              >
                Create the first ticket
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#001254]/8">
                    {['ID', 'Equipment', 'Severity', 'Reporter', 'Assignee', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest whitespace-nowrap" style={{ fontSize: '0.65rem' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, i) => {
                    const isExpanded = expandedId === ticket.ticket_id;
                    const isLast = i === tickets.length - 1;
                    const nextStatus = NEXT_STATUS[ticket.status];
                    return [
                      <tr
                        key={ticket.ticket_id}
                        className={`${!isLast || isExpanded ? 'border-b border-[#001254]/5' : ''} hover:bg-[#001254]/2 transition-colors cursor-pointer`}
                        onClick={() => setExpandedId(isExpanded ? null : ticket.ticket_id)}
                      >
                        <td className="px-5 py-3.5 font-mono text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.78rem' }}>#{ticket.ticket_id}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: '0.85rem' }}>
                          <p className="text-[#001254]">{ticket.equipment_name || '—'}</p>
                          <p className="text-[#001254]/40 font-mono" style={{ fontSize: '0.7rem' }}>{ticket.equipment_id}</p>
                        </td>
                        <td className="px-5 py-3.5"><SeverityBadge severity={ticket.severity} /></td>
                        <td className="px-5 py-3.5 text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.82rem' }}>
                          {ticket.reporter_name || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.82rem' }}>
                          {ticket.assignee_name || <span className="text-[#001254]/30 italic">Unassigned</span>}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={ticket.status} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openUpdate(ticket)}
                              className="px-2.5 py-1 text-[#0B4EA2] border border-[#0B4EA2]/20 rounded-lg hover:bg-[#0B4EA2]/8 transition-colors whitespace-nowrap"
                              style={{ fontSize: '0.75rem' }}
                            >
                              {nextStatus ? `→ ${nextStatus.replace('_', ' ')}` : 'Edit'}
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : ticket.ticket_id)}
                              className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors"
                            >
                              {isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-[#001254]/40" />
                                : <ChevronDown className="w-3.5 h-3.5 text-[#001254]/40" />}
                            </button>
                          </div>
                        </td>
                      </tr>,
                      isExpanded && <ExpandedTicket key={`${ticket.ticket_id}-expanded`} ticket={ticket} />,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && tickets.length > 0 && (
          <p className="text-[#001254]/30 text-right" style={{ fontSize: '0.75rem' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>

      {/* Create ticket modal */}
      {showCreate && (
        <Modal title="Create Maintenance Ticket" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Report ID *</label>
              <input
                required
                type="number"
                value={createForm.report_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, report_id: e.target.value }))}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
                placeholder="e.g. 42"
              />
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
              >
                <option value="">— Select priority —</option>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Assign To (User ID)</label>
              <input
                type="number"
                value={createForm.assigned_to}
                onChange={(e) => setCreateForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
                placeholder="Optional user ID"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 bg-[#0B4EA2] text-white rounded-xl py-2.5 hover:bg-[#0B4EA2]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontSize: '0.85rem' }}
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Ticket
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update ticket modal */}
      {updateModal && (
        <Modal title={`Update Ticket #${updateModal.ticket_id}`} onClose={() => setUpdateModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={updateModal.status} />
              {NEXT_STATUS[updateModal.status] && (
                <span className="text-[#001254]/40" style={{ fontSize: '0.78rem' }}>
                  → next: {NEXT_STATUS[updateModal.status].replace('_', ' ')}
                </span>
              )}
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Status</label>
              <select
                value={updateForm.status}
                onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Priority</label>
              <select
                value={updateForm.priority}
                onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
              >
                <option value="">— No priority —</option>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Assign To (User ID)</label>
              <input
                type="number"
                value={updateForm.assigned_to}
                onChange={(e) => setUpdateForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
                placeholder="Optional user ID"
              />
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Resolution Notes</label>
              <textarea
                value={updateForm.resolution}
                onChange={(e) => setUpdateForm((f) => ({ ...f, resolution: e.target.value }))}
                rows={3}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 resize-none"
                style={{ fontSize: '0.88rem' }}
                placeholder="Describe how the issue was resolved..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUpdateModal(null)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updateLoading}
                className="flex-1 bg-[#0B4EA2] text-white rounded-xl py-2.5 hover:bg-[#0B4EA2]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontSize: '0.85rem' }}
              >
                {updateLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
