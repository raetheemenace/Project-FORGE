import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const LogUpdated = () => {
  const navigate = useNavigate();
  const txn = JSON.parse(sessionStorage.getItem('borrow_txn') || '{}');

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Log Updated!</h1>
        <p className="text-sm text-zinc-400 mb-1">
          Your borrowing record is now visible to the Lab Admin.
        </p>
        {txn.txnId && (
          <p className="text-xs text-zinc-500 mb-1">
            Transaction ID: <span className="text-orange-400 font-mono font-semibold">{txn.txnId}</span>
          </p>
        )}
        <p className="text-xs text-zinc-600 mb-8">
          A confirmation has been sent to your account.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default LogUpdated;
