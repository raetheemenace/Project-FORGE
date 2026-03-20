import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import MobileHeader from '../../components/layout/MobileHeader.jsx';
import { useTTS } from '../../hooks/useTTS.js';

const TIME_SLOTS = [
  '07:00-09:00', '09:00-11:00', '11:00-13:00',
  '13:00-15:00', '15:00-17:00', '17:00-19:00',
];

const today = () => new Date().toISOString().split('T')[0];

const BorrowStep2 = () => {
  const navigate = useNavigate();
  const tts = useTTS();
  const dept = sessionStorage.getItem('borrow_dept') || 'Chemistry';

  const [form, setForm] = useState({
    course: '', timeSlot: '', date: '', labRoom: '', adviser: '',
  });
  const [touched, setTouched] = useState({});
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    tts.speak(`Step 2 of 4. Borrowing Details for ${dept}. Fill in your course, time slot, date, lab room, and adviser.`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.enabled]);

  const isEmpty = (k) => !form[k]?.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    const fields = ['course', 'timeSlot', 'date', 'labRoom', 'adviser'];
    setTouched(Object.fromEntries(fields.map((k) => [k, true])));

    if (fields.some(isEmpty)) return;

    if (form.date < today()) {
      setDateError('Date cannot be in the past');
      return;
    }
    setDateError('');

    sessionStorage.setItem('borrow_details', JSON.stringify({ ...form, department: dept }));
    navigate('/borrow/step3');
  };

  const field = (key, label, type = 'text', extra = {}) => (
    <div key={key}>
      <label
        className="block text-xs font-medium text-zinc-400 mb-1.5"
        onFocus={() => tts.speak(label)}
      >
        {label}
      </label>
      {type === 'select' ? (
        <select
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          onBlur={() => setTouched({ ...touched, [key]: true })}
          className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 transition-colors ${
            touched[key] && isEmpty(key)
              ? 'border-red-500 focus:ring-red-500'
              : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
          }`}
        >
          <option value="">Select time slot</option>
          {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[key]}
          min={type === 'date' ? today() : undefined}
          onChange={(e) => {
            setForm({ ...form, [key]: e.target.value });
            if (key === 'date') setDateError('');
          }}
          onBlur={() => setTouched({ ...touched, [key]: true })}
          placeholder={extra.placeholder}
          className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 transition-colors ${
            (touched[key] && isEmpty(key)) || (key === 'date' && dateError)
              ? 'border-red-500 focus:ring-red-500'
              : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
          }`}
        />
      )}
      {touched[key] && isEmpty(key) && (
        <p className="text-red-400 text-xs mt-1">This field is required</p>
      )}
      {key === 'date' && dateError && (
        <p className="text-red-400 text-xs mt-1">{dateError}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <MobileHeader
        title="Borrowing Details"
        back="/borrow/step1"
        step={2}
        totalSteps={4}
        tts={{ enabled: tts.enabled, speaking: tts.speaking, onToggle: tts.toggle }}
      />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <p className="text-xs text-zinc-500">Department: <span className="text-orange-400 font-medium">{dept}</span></p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {field('course',   'Course',              'text',   { placeholder: 'e.g. CHM 001A' })}
          {field('timeSlot', 'Time Slot',           'select')}
          {field('date',     'Date',                'date')}
          {field('labRoom',  'Lab Room ID',         'text',   { placeholder: 'e.g. A-101' })}
          {field('adviser',  'Adviser / Instructor','text',   { placeholder: 'e.g. Engr. Garcia' })}

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm mt-4"
          >
            Next: Scan Equipment →
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
          <span className={tts.enabled ? 'text-orange-400' : ''}>
            {tts.enabled ? '● Voice Feedback Active' : '○ Voice Feedback Off'}
          </span>
        </div>
      </main>
    </div>
  );
};

export default BorrowStep2;
