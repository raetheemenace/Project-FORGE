import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import Badge from '../../components/ui/Badge.jsx';
import WebHeader from '../../components/layout/WebHeader.jsx';
import { getStoredUser } from '../../services/authService.js';

const EMPTY = { name: '', department: 'Chemistry', status: 'AVAILABLE' };
const DEPTS = ['Chemistry', 'Physics', 'Engineering'];
const STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DISPOSED'];

const EquipmentManagement = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', data }
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/admin/equipment').then((r) => setItems(r.data.equipment || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal({ mode: 'create' }); };
  const openEdit = (eq) => { setForm({ name: eq.name, department: eq.department, status: eq.status }); setError(''); setModal({ mode: 'edit', id: eq.equipmentId }); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (modal.mode === 'create') {
        await api.post('/admin/equipment', form);
      } else {
        await api.put(`/admin/equipment/${modal.id}`, form);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Mark this equipment as disposed?')) return;
    try {
      await api.delete(`/admin/equipment/${id}`);
      load();
    } catch {
      alert('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 sticky top-0 bg-[#0a0f1e] z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-1.5 text-zinc-400 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-semibold">Equipment</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
          <Plus size={13} /> Add
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <div className="hidden md:flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Equipment Management</h2>
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            <Plus size={15} /> Add Equipment
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 text-sm">Loading...</div>
        ) : (
          <div className="space-y-2">
            {items.map((eq) => (
              <div key={eq.equipmentId} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{eq.name}</p>
                  <p className="text-xs text-zinc-500">{eq.equipmentId} · {eq.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={eq.status} />
                  <button onClick={() => openEdit(eq)} className="p-1.5 text-zinc-500 hover:text-white transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(eq.equipmentId)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">{modal.mode === 'create' ? 'Add Equipment' : 'Edit Equipment'}</h3>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500">
                  {DEPTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              {error && <div className="flex items-center gap-2 text-red-400 text-xs"><AlertCircle size={12} />{error}</div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentManagement;
