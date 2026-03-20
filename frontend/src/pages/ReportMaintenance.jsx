import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitMaintenanceReport } from '../services/maintenanceService.js';
import WebHeader from '../components/layout/WebHeader.jsx';
import { getStoredUser } from '../services/authService.js';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const ReportMaintenance = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [form, setForm] = useState({ equipmentId: '', severity: '', description: '' });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  // Simulate QR scan — in production this would use a QR library
  const simulateScan = () => {
    const mockId = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;
    setForm((f) => ({ ...f, equipmentId: mockId }));
  };

  const isEmpty = (k) => !form[k]?.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ equipmentId: true, severity: true, description: true });
    if (isEmpty('equipmentId') || isEmpty('severity') || isEmpty('description')) return;
    setError('');
    setSubmitting(true);
    try {
      await submitMaintenanceReport(form);
      setSuccess(form.equipmentId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#060b18] text-zinc-100 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Report Submitted</h2>
          <p className="text-sm text-zinc-400 mb-1">
            Equipment ID: <span className="text-orange-400 font-mono font-semibold">{success}</span>
          </p>
          <p className="text-xs text-zinc-500 mb-8">Your report has been sent to the Lab Admin.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />

      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <button onClick={() => navigate('/dashboard')} className="p-1.5 text-zinc-400 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold">Report Maintenance</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20">
        {/* QR scanner area */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-5 flex flex-col items-center gap-3">
          <QrCode size={40} className="text-zinc-600" />
          <p className="text-xs text-zinc-500 text-center">Scan the QR code on the equipment to auto-fill the Equipment ID.</p>
          <button
            onClick={simulateScan}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
          >
            Simulate QR Scan
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Equipment ID */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Equipment ID</label>
            <input
              type="text"
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
              onBlur={() => setTouched({ ...touched, equipmentId: true })}
              placeholder="Auto-filled from QR scan"
              className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 transition-colors ${
                touched.equipmentId && isEmpty('equipmentId')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
              }`}
            />
            {touched.equipmentId && isEmpty('equipmentId') && (
              <p className="text-red-400 text-xs mt-1">Equipment ID is required</p>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              onBlur={() => setTouched({ ...touched, severity: true })}
              className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 transition-colors ${
                touched.severity && isEmpty('severity')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
              }`}
            >
              <option value="">Select severity</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {touched.severity && isEmpty('severity') && (
              <p className="text-red-400 text-xs mt-1">Severity is required</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onBlur={() => setTouched({ ...touched, description: true })}
              placeholder="Describe the issue in detail..."
              rows={4}
              className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 transition-colors resize-none ${
                touched.description && isEmpty('description')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-700 focus:border-orange-500 focus:ring-orange-500'
              }`}
            />
            {touched.description && isEmpty('description') && (
              <p className="text-red-400 text-xs mt-1">Description is required</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2.5 rounded-lg">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default ReportMaintenance;
