import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import api from '../../services/api.js';
import Badge from '../../components/ui/Badge.jsx';
import WebHeader from '../../components/layout/WebHeader.jsx';
import { getStoredUser } from '../../services/authService.js';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const MaintenanceTickets = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ status: '', resolution: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/tickets').then((r) => setTickets(r.data.tickets || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openModal = (ticket) => {
    setForm({ status: ticket.status, resolution: ticket.resolution || '' });
    setModal(ticket);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/tickets/${modal.ticketId}`, form);
      setModal(null);
      load();
    } catch { alert('Update failed'); }
    finally { setSaving(false); }
  };

  const severityColor = { Low: 'text-zinc-400', Medium: 'text-amber-400', High: 'text-orange-400', Critical: 'text-red-400' };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <button onClick={() => navigate('/admin')} className="p-1.5 text-zinc-400 hover:text-white"><ArrowLeft size={18} /></button>
        <span className="text-sm font-semibold">Maintenance Tickets</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <h2 className="hidden md:block text-xl font-bold text-white mb-6">Maintenance Tickets</h2>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 text-sm">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">No tickets found</div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button key={t.ticketId} onClick={() => openModal(t)}
                className="w-full text-left bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">#{t.ticketId} · {t.equipmentId}</span>
                  <div className="flex items-center gap-2">
                    <Badge status={t.status} />
                    <ChevronRight size={13} className="text-zinc-600" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-white">{t.equipmentName}</p>
                <p className="text-xs mt-0.5">
                  <span className={severityColor[t.severity] || 'text-zinc-400'}>{t.severity}</span>
                  <span className="text-zinc-600"> · {t.description?.slice(0, 60)}{t.description?.length > 60 ? '...' : ''}</span>
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Update Ticket #{modal.ticketId}</h3>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">{modal.equipmentName} · {modal.severity}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500">
                  {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Resolution Notes</label>
                <textarea value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                  rows={3} placeholder="Describe resolution..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTickets;
