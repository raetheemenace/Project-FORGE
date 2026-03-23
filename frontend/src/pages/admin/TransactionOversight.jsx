import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEPARTMENTS = ['', 'Chemistry', 'Physics', 'Engineering'];
const STATUSES    = ['', 'ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED'];

const STATUS_STYLES = {
  ACTIVE:         'bg-blue-50 text-blue-700 border-blue-200',
  PENDING_RETURN: 'bg-amber-50 text-amber-700 border-amber-200',
  CLAIM_ID:       'bg-purple-50 text-purple-700 border-purple-200',
  RETURNED:       'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace('_', ' ')}
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

function ExpandedRow({ txn }) {
  return (
    <tr>
      <td colSpan={7} className="px-5 pb-4 pt-0 bg-[#001254]/2">
        <div className="rounded-xl border border-[#001254]/8 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ['Course',    txn.course],
              ['Time Slot', txn.time_slot],
              ['Lab Room',  txn.lab_room],
              ['Adviser',   txn.adviser],
              ['Student ID', txn.student_id || '—'],
              ['Created',   new Date(txn.created_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[#001254]/40 uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>{label}</p>
                <p className="text-[#001254]" style={{ fontSize: '0.82rem' }}>{val}</p>
              </div>
            ))}
          </div>
          {txn.items?.length > 0 && (
            <div>
              <p className="text-[#001254]/40 uppercase tracking-widest mb-1.5" style={{ fontSize: '0.6rem' }}>Equipment</p>
              <div className="flex flex-wrap gap-2">
                {txn.items.map((item) => (
                  <span key={item.item_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#001254]/5 rounded-lg text-[#001254]/70" style={{ fontSize: '0.78rem' }}>
                    <span className="font-mono text-[#001254]/40" style={{ fontSize: '0.7rem' }}>{item.equipment_id}</span>
                    {item.name}
                    <span className="text-[#001254]/30">·</span>
                    {item.condition}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function TransactionOversight() {
  const navigate  = useNavigate();
  const { user, signOut } = useAuth();

  // Filters
  const [filters, setFilters] = useState({ status: '', department: '', student: '', dateFrom: '', dateTo: '' });
  const [applied, setApplied]  = useState({});

  // Data
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);

  // UI state
  const [expandedId, setExpandedId]   = useState(null);
  const [overrideModal, setOverrideModal] = useState(null); // txn object
  const [newStatus, setNewStatus]     = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchTransactions = useCallback((activeFilters = applied) => {
    setLoading(true);
    setError(null);
    const params = {};
    if (activeFilters.status)     params.status     = activeFilters.status;
    if (activeFilters.department) params.department = activeFilters.department;
    if (activeFilters.student)    params.student    = activeFilters.student;
    if (activeFilters.dateFrom)   params.dateFrom   = activeFilters.dateFrom;
    if (activeFilters.dateTo)     params.dateTo     = activeFilters.dateTo;

    axios
      .get(`${API_URL}/admin/transactions`, {
        headers: { Authorization: `Bearer ${token()}` },
        params,
      })
      .then((res) => setTransactions(res.data.transactions || []))
      .catch((err) => {
        if (err.response?.status === 403) setError('Access denied. Lab Admin role required.');
        else setError('Could not load transactions.');
      })
      .finally(() => setLoading(false));
  }, [applied]);

  useEffect(() => { fetchTransactions({}); }, []);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleApplyFilters = () => {
    setApplied({ ...filters });
    fetchTransactions(filters);
  };

  const handleClearFilters = () => {
    const empty = { status: '', department: '', student: '', dateFrom: '', dateTo: '' };
    setFilters(empty);
    setApplied(empty);
    fetchTransactions(empty);
  };

  const hasActiveFilters = Object.values(applied).some(Boolean);

  const openOverride = (txn) => {
    setNewStatus(txn.status);
    setOverrideModal(txn);
  };

  const handleOverride = async () => {
    if (!newStatus || newStatus === overrideModal.status) {
      setOverrideModal(null);
      return;
    }
    setOverrideLoading(true);
    try {
      await axios.patch(
        `${API_URL}/admin/transactions/${overrideModal.txn_id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setOverrideModal(null);
      flash(`Transaction ${overrideModal.txn_id} updated to ${newStatus}.`);
      fetchTransactions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update transaction status.');
      setOverrideModal(null);
    } finally {
      setOverrideLoading(false);
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
                  Transaction Oversight
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
            <h1 className="text-[#001254] text-xl font-semibold">Transaction Oversight</h1>
            <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
              View and manage all student transactions
            </p>
          </div>
          <button
            onClick={() => fetchTransactions()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#001254]/10 rounded-lg hover:border-[#0B4EA2]/30 transition-colors disabled:opacity-50"
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0B4EA2] ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[#001254]/60 hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#001254]/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-[#001254]/40" />
            <span className="text-[#001254]/50 uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Filters</span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                style={{ fontSize: '0.75rem' }}
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
              style={{ fontSize: '0.82rem' }}
            >
              <option value="">All Statuses</option>
              {STATUSES.filter(Boolean).map((s) => <option key={s}>{s.replace('_', ' ')}</option>)}
            </select>

            <select
              value={filters.department}
              onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
              className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
              style={{ fontSize: '0.82rem' }}
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.filter(Boolean).map((d) => <option key={d}>{d}</option>)}
            </select>

            <input
              type="text"
              placeholder="Student name or username"
              value={filters.student}
              onChange={(e) => setFilters((f) => ({ ...f, student: e.target.value }))}
              className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 col-span-2 md:col-span-1"
              style={{ fontSize: '0.82rem' }}
            />

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
              style={{ fontSize: '0.82rem' }}
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-[#0B4EA2] text-white rounded-lg hover:bg-[#0B4EA2]/90 transition-colors"
              style={{ fontSize: '0.82rem' }}
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Banners */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity className="w-10 h-10 text-[#001254]/15" />
              <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>
                {hasActiveFilters ? 'No transactions match the current filters.' : 'No transactions found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#001254]/8">
                    {['Txn ID', 'Student', 'Department', 'Date', 'Items', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest whitespace-nowrap" style={{ fontSize: '0.65rem' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, i) => {
                    const isExpanded = expandedId === txn.txn_id;
                    const isLast = i === transactions.length - 1;
                    return [
                      <tr
                        key={txn.txn_id}
                        className={`${!isLast || isExpanded ? 'border-b border-[#001254]/5' : ''} hover:bg-[#001254]/2 transition-colors cursor-pointer`}
                        onClick={() => setExpandedId(isExpanded ? null : txn.txn_id)}
                      >
                        <td className="px-5 py-3.5 font-mono text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.78rem' }}>{txn.txn_id}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: '0.85rem' }}>
                          <p className="text-[#001254]">{txn.full_name}</p>
                          <p className="text-[#001254]/40" style={{ fontSize: '0.72rem' }}>@{txn.username}</p>
                        </td>
                        <td className="px-5 py-3.5 text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.82rem' }}>{txn.department}</td>
                        <td className="px-5 py-3.5 text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.82rem' }}>
                          {new Date(txn.txn_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-[#001254]/60 text-center" style={{ fontSize: '0.82rem' }}>
                          {txn.items?.length ?? 0}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={txn.status} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openOverride(txn)}
                              className="px-2.5 py-1 text-[#0B4EA2] border border-[#0B4EA2]/20 rounded-lg hover:bg-[#0B4EA2]/8 transition-colors whitespace-nowrap"
                              style={{ fontSize: '0.75rem' }}
                            >
                              Override
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : txn.txn_id)}
                              className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors"
                            >
                              {isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-[#001254]/40" />
                                : <ChevronDown className="w-3.5 h-3.5 text-[#001254]/40" />}
                            </button>
                          </div>
                        </td>
                      </tr>,
                      isExpanded && <ExpandedRow key={`${txn.txn_id}-expanded`} txn={txn} />,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row count */}
        {!loading && transactions.length > 0 && (
          <p className="text-[#001254]/30 text-right" style={{ fontSize: '0.75rem' }}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>

      {/* Override modal */}
      {overrideModal && (
        <Modal title="Override Transaction Status" onClose={() => setOverrideModal(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-[#001254]/50 mb-1" style={{ fontSize: '0.78rem' }}>Transaction</p>
              <p className="text-[#001254] font-mono" style={{ fontSize: '0.88rem' }}>{overrideModal.txn_id}</p>
              <p className="text-[#001254]/50" style={{ fontSize: '0.78rem' }}>{overrideModal.full_name}</p>
            </div>
            <div>
              <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.88rem' }}
              >
                {STATUSES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOverrideModal(null)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={overrideLoading || newStatus === overrideModal.status}
                className="flex-1 bg-[#0B4EA2] text-white rounded-xl py-2.5 hover:bg-[#0B4EA2]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontSize: '0.85rem' }}
              >
                {overrideLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Override
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
