import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api.js';
import WebHeader from '../../components/layout/WebHeader.jsx';
import { getStoredUser } from '../../services/authService.js';

const SystemReports = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [analytics, setAnalytics] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [tab, setTab] = useState('analytics');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/analytics').then((r) => r.data),
      api.get('/admin/audit-log').then((r) => r.data),
    ]).then(([a, l]) => {
      setAnalytics(a.analytics || []);
      setAuditLog(l.actions || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <button onClick={() => navigate('/admin')} className="p-1.5 text-zinc-400 hover:text-white"><ArrowLeft size={18} /></button>
        <span className="text-sm font-semibold">System Reports</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <h2 className="hidden md:block text-xl font-bold text-white mb-6">System Reports</h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 w-fit">
          {['analytics', 'audit'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                tab === t ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'
              }`}>
              {t === 'analytics' ? 'Daily Analytics' : 'Audit Log'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 text-sm">Loading...</div>
        ) : tab === 'analytics' ? (
          <div className="space-y-2">
            {analytics.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm">No analytics data yet</div>
            ) : analytics.map((row, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-white">{row.department}</p>
                  <p className="text-xs text-zinc-500">{row.reportDate}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Transactions',  row.totalTransactions],
                    ['Equipment',     row.totalEquipmentBorrowed],
                    ['Maintenance',   row.totalMaintenanceReports],
                    ['Avg Duration',  row.avgSessionDuration ? `${row.avgSessionDuration}m` : '—'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-lg font-bold text-orange-400">{v ?? '—'}</p>
                      <p className="text-[10px] text-zinc-600">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm">No audit entries yet</div>
            ) : auditLog.map((entry) => (
              <div key={entry.actionId} className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-orange-400">{entry.actionType}</span>
                  <span className="text-[10px] text-zinc-600">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-white">{entry.adminName} → {entry.targetType} {entry.targetId}</p>
                {entry.details && <p className="text-xs text-zinc-500 mt-0.5 truncate">{entry.details}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SystemReports;
