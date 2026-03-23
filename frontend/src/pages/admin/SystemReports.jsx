import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  ChevronLeft,
  ShieldCheck,
  LogOut,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  ClipboardList,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEPARTMENTS = ['Chemistry', 'Physics', 'Engineering', 'Biology', 'Computer Science'];
const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(val, fallback = '—') {
  if (val === null || val === undefined) return fallback;
  return val;
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(val) {
  if (!val) return '—';
  return new Date(val).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
        active
          ? 'bg-[#001254] text-white'
          : 'text-[#001254]/50 hover:bg-[#001254]/8'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function FilterRow({ children }) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      {children}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[#001254]/50 uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'border border-[#001254]/15 focus:border-[#0B4EA2]/50 rounded-xl px-3 py-2 text-[#001254] outline-none bg-white transition-colors';

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function AnalyticsTab({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ department: '', dateFrom: '', dateTo: '' });

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filters.department) params.department = filters.department;
    if (filters.dateFrom)   params.dateFrom   = filters.dateFrom;
    if (filters.dateTo)     params.dateTo     = filters.dateTo;

    axios
      .get(`${API_URL}/admin/system-reports/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })
      .then(res => setRows(res.data.analytics || []))
      .catch(err => setError(err.response?.data?.error || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [filters, token]);

  useEffect(() => { fetch(); }, [fetch]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#001254]/10 p-4">
        <FilterRow>
          <FilterField label="Department">
            <select
              value={filters.department}
              onChange={e => set('department', e.target.value)}
              className={`${inputCls} pr-8`}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FilterField>
          <FilterField label="Date from">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => set('dateFrom', e.target.value)}
              className={inputCls}
              style={{ fontSize: '0.85rem' }}
            />
          </FilterField>
          <FilterField label="Date to">
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => set('dateTo', e.target.value)}
              className={inputCls}
              style={{ fontSize: '0.85rem' }}
            />
          </FilterField>
          <button
            onClick={fetch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#001254] text-white rounded-xl hover:bg-[#0B4EA2] transition-colors disabled:opacity-50 self-end"
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </FilterRow>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BarChart3 className="w-10 h-10 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No analytics data found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#001254]/8">
                  {['Date', 'Department', 'Transactions', 'Equipment Borrowed', 'Maintenance Reports', 'Avg Session (min)'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest whitespace-nowrap" style={{ fontSize: '0.65rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={`${row.report_date}-${row.department}`}
                    className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === rows.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-5 py-3.5 text-[#001254] whitespace-nowrap" style={{ fontSize: '0.85rem' }}>{fmtDate(row.report_date)}</td>
                    <td className="px-5 py-3.5 text-[#001254]" style={{ fontSize: '0.85rem' }}>{fmt(row.department)}</td>
                    <td className="px-5 py-3.5 text-[#001254] text-center" style={{ fontSize: '0.85rem' }}>{fmt(row.total_transactions, '0')}</td>
                    <td className="px-5 py-3.5 text-[#001254] text-center" style={{ fontSize: '0.85rem' }}>{fmt(row.total_equipment_borrowed, '0')}</td>
                    <td className="px-5 py-3.5 text-[#001254] text-center" style={{ fontSize: '0.85rem' }}>{fmt(row.total_maintenance_reports, '0')}</td>
                    <td className="px-5 py-3.5 text-[#001254]/60 text-center" style={{ fontSize: '0.85rem' }}>{fmt(row.avg_session_duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Log tab
// ---------------------------------------------------------------------------

const ACTION_TYPES = [
  'EQUIPMENT_CREATED', 'EQUIPMENT_UPDATED', 'EQUIPMENT_DISPOSED',
  'USER_DISABLED', 'USER_ENABLED',
  'TRANSACTION_OVERRIDDEN',
  'TICKET_CREATED', 'TICKET_UPDATED',
  'ROOM_CREATED', 'ROOM_UPDATED', 'ROOM_DEACTIVATED',
];

const TARGET_TYPES = ['EQUIPMENT', 'USER', 'TRANSACTION', 'TICKET', 'ROOM'];

function AuditLogTab({ token }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    actionType: '', targetType: '', dateFrom: '', dateTo: '',
  });

  const fetch = useCallback((off = 0) => {
    setLoading(true);
    setError(null);
    const params = { limit: PAGE_SIZE, offset: off };
    if (filters.actionType) params.actionType = filters.actionType;
    if (filters.targetType) params.targetType = filters.targetType;
    if (filters.dateFrom)   params.dateFrom   = filters.dateFrom;
    if (filters.dateTo)     params.dateTo     = filters.dateTo;

    axios
      .get(`${API_URL}/admin/system-reports/audit-log`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })
      .then(res => {
        setRows(res.data.auditLog || []);
        setTotal(res.data.total || 0);
        setOffset(off);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, [filters, token]);

  useEffect(() => { fetch(0); }, [fetch]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const actionTypeBadgeColor = (type) => {
    if (type?.includes('CREATED'))    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (type?.includes('UPDATED'))    return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type?.includes('DISABLED') || type?.includes('DISPOSED') || type?.includes('DEACTIVATED'))
      return 'bg-red-50 text-red-700 border-red-200';
    if (type?.includes('OVERRIDDEN')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#001254]/10 p-4">
        <FilterRow>
          <FilterField label="Action type">
            <select
              value={filters.actionType}
              onChange={e => set('actionType', e.target.value)}
              className={`${inputCls} pr-8`}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">All actions</option>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </FilterField>
          <FilterField label="Target type">
            <select
              value={filters.targetType}
              onChange={e => set('targetType', e.target.value)}
              className={`${inputCls} pr-8`}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">All targets</option>
              {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
          <FilterField label="Date from">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => set('dateFrom', e.target.value)}
              className={inputCls}
              style={{ fontSize: '0.85rem' }}
            />
          </FilterField>
          <FilterField label="Date to">
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => set('dateTo', e.target.value)}
              className={inputCls}
              style={{ fontSize: '0.85rem' }}
            />
          </FilterField>
          <button
            onClick={() => fetch(0)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#001254] text-white rounded-xl hover:bg-[#0B4EA2] transition-colors disabled:opacity-50 self-end"
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </FilterRow>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="w-10 h-10 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No audit log entries found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#001254]/8">
                    {['Timestamp', 'Admin', 'Action', 'Target', 'Target ID', 'Details'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest whitespace-nowrap" style={{ fontSize: '0.65rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.action_id}
                      className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === rows.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-[#001254]/60 whitespace-nowrap" style={{ fontSize: '0.8rem' }}>{fmtDateTime(row.created_at)}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: '0.82rem' }}>
                        <p className="text-[#001254]">{row.admin_full_name}</p>
                        <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>@{row.admin_username}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${actionTypeBadgeColor(row.action_type)}`}>
                          {row.action_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#001254]/60" style={{ fontSize: '0.82rem' }}>{fmt(row.target_type)}</td>
                      <td className="px-5 py-3.5 font-mono text-[#001254]" style={{ fontSize: '0.82rem' }}>{fmt(row.target_id)}</td>
                      <td className="px-5 py-3.5 text-[#001254]/50 max-w-xs truncate" style={{ fontSize: '0.78rem' }}>
                        {row.details
                          ? (typeof row.details === 'string' ? row.details : JSON.stringify(row.details))
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#001254]/8">
                <p className="text-[#001254]/40" style={{ fontSize: '0.78rem' }}>
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetch(offset - PAGE_SIZE)}
                    disabled={currentPage === 1 || loading}
                    className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <PrevIcon className="w-4 h-4 text-[#001254]/60" />
                  </button>
                  <span className="text-[#001254]/60" style={{ fontSize: '0.82rem' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => fetch(offset + PAGE_SIZE)}
                    disabled={currentPage === totalPages || loading}
                    className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <NextIcon className="w-4 h-4 text-[#001254]/60" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SystemReports() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState('analytics');

  const token = localStorage.getItem('token');
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
                  System Reports
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
          <h1 className="text-[#001254] text-xl font-semibold">System Reports</h1>
          <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
            Daily analytics per department and admin action audit trail
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton
            active={tab === 'analytics'}
            onClick={() => setTab('analytics')}
            icon={BarChart3}
            label="Analytics"
          />
          <TabButton
            active={tab === 'audit'}
            onClick={() => setTab('audit')}
            icon={ClipboardList}
            label="Audit Log"
          />
        </div>

        {/* Tab content */}
        {tab === 'analytics'
          ? <AnalyticsTab token={token} />
          : <AuditLogTab token={token} />
        }

      </main>
    </div>
  );
}
