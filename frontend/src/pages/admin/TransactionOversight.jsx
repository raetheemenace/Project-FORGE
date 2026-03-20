import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import Badge from '../../components/ui/Badge.jsx';
import WebHeader from '../../components/layout/WebHeader.jsx';
import { getStoredUser } from '../../services/authService.js';

const STATUSES = ['', 'ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED'];

const TransactionOversight = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', department: '', student: '' });
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status)     params.set('status', filter.status);
    if (filter.department) params.set('department', filter.department);
    if (filter.student)    params.set('student', filter.student);
    api.get(`/admin/transactions?${params}`).then((r) => setTxns(r.data.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const override = async (txnId, status) => {
    try {
      await api.patch(`/admin/transactions/${txnId}`, { status });
      load();
    } catch { alert('Override failed'); }
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <button onClick={() => navigate('/admin')} className="p-1.5 text-zinc-400 hover:text-white"><ArrowLeft size={18} /></button>
        <span className="text-sm font-semibold">Transaction Oversight</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <h2 className="hidden md:block text-xl font-bold text-white mb-6">Transaction Oversight</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
          <select value={filter.department} onChange={(e) => setFilter({ ...filter, department: e.target.value })}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500">
            <option value="">All Departments</option>
            {['Chemistry', 'Physics', 'Engineering'].map((d) => <option key={d}>{d}</option>)}
          </select>
          <input value={filter.student} onChange={(e) => setFilter({ ...filter, student: e.target.value })}
            placeholder="Search student..."
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-orange-500" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 text-sm">Loading...</div>
        ) : (
          <div className="space-y-2">
            {txns.map((txn) => (
              <div key={txn.txnId} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === txn.txnId ? null : txn.txnId)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                >
                  <div>
                    <p className="text-xs font-mono text-orange-400">{txn.txnId}</p>
                    <p className="text-sm font-semibold text-white">{txn.fullName} · {txn.department}</p>
                    <p className="text-xs text-zinc-500">{txn.date} · {txn.labRoom}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={txn.status} />
                    <ChevronRight size={13} className={`text-zinc-600 transition-transform ${expanded === txn.txnId ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {expanded === txn.txnId && (
                  <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                    <p className="text-xs text-zinc-400 mb-3">Course: {txn.course} · Adviser: {txn.adviser}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.filter(Boolean).map((s) => (
                        <button key={s} onClick={() => override(txn.txnId, s)}
                          disabled={txn.status === s}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            txn.status === s
                              ? 'bg-zinc-700 text-zinc-400 border-zinc-600 cursor-default'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-orange-500 hover:text-orange-400'
                          }`}>
                          → {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TransactionOversight;
