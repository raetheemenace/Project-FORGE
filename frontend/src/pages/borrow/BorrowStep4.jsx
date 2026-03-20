import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertCircle } from 'lucide-react';
import MobileHeader from '../../components/layout/MobileHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import { createTransaction } from '../../services/transactionService.js';

const BorrowStep4 = () => {
  const navigate = useNavigate();
  const tts = useTTS();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const details = JSON.parse(sessionStorage.getItem('borrow_details') || '{}');
  const items   = JSON.parse(sessionStorage.getItem('borrow_items')   || '[]');

  const readSummary = () => {
    const itemList = items.map((i) => `${i.name}, condition ${i.condition}`).join('. ');
    tts.speak(
      `Review Summary. Department: ${details.department}. Course: ${details.course}. ` +
      `Date: ${details.date}. Time: ${details.timeSlot}. Lab Room: ${details.labRoom}. ` +
      `Adviser: ${details.adviser}. Equipment: ${itemList}.`
    );
  };

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        department: details.department,
        course:     details.course,
        timeSlot:   details.timeSlot,
        date:       details.date,
        labRoom:    details.labRoom,
        adviser:    details.adviser,
        items:      items.map((i) => ({ equipmentId: i.equipmentId, condition: i.condition })),
      };
      const data = await createTransaction(payload);
      sessionStorage.setItem('borrow_txn', JSON.stringify(data));
      sessionStorage.removeItem('borrow_dept');
      sessionStorage.removeItem('borrow_details');
      sessionStorage.removeItem('borrow_items');
      navigate('/borrow/confirmed');
    } catch (err) {
      if (err.response?.status === 409) {
        setError('One or more items are already borrowed. Please go back and re-scan.');
      } else {
        setError(err.response?.data?.error || 'Failed to create transaction. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <MobileHeader
        title="Review Summary"
        back="/borrow/step3"
        step={4}
        totalSteps={4}
        tts={{ enabled: tts.enabled, speaking: tts.speaking, onToggle: tts.toggle }}
      />

      <main className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Session details */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Session Details</h3>
          <dl className="space-y-2">
            {[
              ['Department', details.department],
              ['Course',     details.course],
              ['Date',       details.date],
              ['Time Slot',  details.timeSlot],
              ['Lab Room',   details.labRoom],
              ['Adviser',    details.adviser],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-white font-medium text-right">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Equipment list */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Equipment ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 w-5">{i + 1}.</span>
                  <div>
                    <p className="text-sm text-white font-medium">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.equipmentId}</p>
                  </div>
                </div>
                <Badge status={item.condition?.toUpperCase()} label={item.condition} />
              </div>
            ))}
          </div>
        </section>

        {/* Multimodal notice */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 py-3 mb-4 text-xs text-zinc-500">
          TTS readback and STT dictation are supported on this screen.
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2.5 rounded-lg mb-4">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <button
            onClick={readSummary}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-medium hover:text-white transition-colors"
          >
            <BookOpen size={14} /> Read Summary
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 text-sm"
        >
          {submitting ? 'Logging transaction...' : 'Confirm and Log Borrowing'}
        </button>
      </main>
    </div>
  );
};

export default BorrowStep4;
