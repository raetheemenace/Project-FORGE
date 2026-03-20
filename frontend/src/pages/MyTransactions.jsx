import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';
import { getTransactions } from '../services/transactionService.js';
import Badge from '../components/ui/Badge.jsx';
import WebHeader from '../components/layout/WebHeader.jsx';
import { getStoredUser } from '../services/authService.js';

const STATUSES = ['ACTIVE', 'PENDING_RETURN', 'CLAIM_ID'];

const MyTransactions = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getTransactions()
      .then((data) => setTxns(data.transactions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = txns.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />

      {/* Mobile header */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <button onClick={() => navigate('/dashboard')} className="p-1.5 text-zinc-400 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold">My Transactions</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Summary counters */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Active',         key: 'ACTIVE',         color: 'emerald' },
            { label: 'Pending Return', key: 'PENDING_RETURN', color: 'amber' },
            { label: 'Claim ID',       key: 'CLAIM_ID',       color: 'blue' },
          ].map(({ label, key, color }) => (
            <div key={key} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black text-${color}-400`}>{counts[key]}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="text-center py-12 text-zinc-600 text-sm">Loading...</div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-zinc-600">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No transactions yet</p>
            <button onClick={() => navigate('/borrow/step1')} className="mt-4 text-orange-400 text-xs hover:underline">
              Borrow your first item →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((txn) => (
              <button
                key={txn.txnId}
                onClick={() => setSelected(selected?.txnId === txn.txnId ? null : txn)}
                className="w-full text-left bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-orange-400">{txn.txnId}</span>
                  <div className="flex items-center gap-2">
                    <Badge status={txn.status} />
                    <ChevronRight size={13} className={`text-zinc-600 transition-transform ${selected?.txnId === txn.txnId ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                <p className="text-sm font-semibold text-white">{txn.department} · {txn.labRoom}</p>
                <p className="text-xs text-zinc-500">{txn.date} · {txn.timeSlot} · {txn.itemCount} item{txn.itemCount !== 1 ? 's' : ''}</p>

                {/* Expanded detail */}
                {selected?.txnId === txn.txnId && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1.5">
                    <p className="text-xs text-zinc-400">Course: <span className="text-white">{txn.course}</span></p>
                    <p className="text-xs text-zinc-400">Adviser: <span className="text-white">{txn.adviser}</span></p>
                    {txn.items?.map((item, i) => (
                      <p key={i} className="text-xs text-zinc-400">
                        {i + 1}. <span className="text-white">{item.name}</span>
                        <span className="text-zinc-600"> · {item.condition}</span>
                      </p>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyTransactions;
