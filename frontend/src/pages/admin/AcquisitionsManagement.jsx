import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  ShoppingCart,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  CheckCircle2,
  Eye,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#001254]/10">
          <h2 className="text-[#001254] font-semibold" style={{ fontSize: '0.95rem' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#001254]/8 rounded-lg transition-colors">
            <X className="w-4 h-4 text-[#001254]/50" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{msg}</p>;
}

function NewAcquisitionForm({ onSubmit, loading }) {
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!supplier.trim()) e.supplier = 'Supplier name is required.';
    if (!date) e.date = 'Acquisition date is required.';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setErrors({});
    onSubmit({ supplier_name: supplier.trim(), acquisition_date: date, notes: notes.trim() || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Supplier Name *</label>
        <input
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 ${errors.supplier ? 'border-red-400' : 'border-[#001254]/15'}`}
          style={{ fontSize: '0.88rem' }}
          placeholder="e.g. Science Supply Co."
        />
        <FieldError msg={errors.supplier} />
      </div>

      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Acquisition Date *</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 ${errors.date ? 'border-red-400' : 'border-[#001254]/15'}`}
          style={{ fontSize: '0.88rem' }}
        />
        <FieldError msg={errors.date} />
      </div>

      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 resize-none"
          style={{ fontSize: '0.88rem' }}
          placeholder="Any additional notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0B4EA2] text-white rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-[#0B4EA2]/90 transition-colors disabled:opacity-60"
        style={{ fontSize: '0.88rem' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Create Acquisition
      </button>
    </form>
  );
}

function AddItemForm({ acquisitionId, onSuccess }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [condition, setCondition] = useState('Good');
  const [room, setRoom] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem('token');

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Equipment name is required.';
    if (!department.trim()) e.department = 'Department is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setErrors({});
    setLoading(true);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/admin/acquisitions/${acquisitionId}/items`,
        [{ name: name.trim(), department: department.trim(), initial_condition: condition, assigned_room: room.trim() || null }],
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setName('');
      setDepartment('');
      setCondition('Good');
      setRoom('');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2" style={{ fontSize: '0.82rem' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.75rem' }}>Equipment Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 ${errors.name ? 'border-red-400' : 'border-[#001254]/15'}`}
            style={{ fontSize: '0.85rem' }}
            placeholder="e.g. Bunsen Burner"
          />
          <FieldError msg={errors.name} />
        </div>

        <div>
          <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.75rem' }}>Department *</label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 ${errors.department ? 'border-red-400' : 'border-[#001254]/15'}`}
            style={{ fontSize: '0.85rem' }}
            placeholder="e.g. Chemistry"
          />
          <FieldError msg={errors.department} />
        </div>

        <div>
          <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.75rem' }}>Initial Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 bg-white"
            style={{ fontSize: '0.85rem' }}
          >
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.75rem' }}>Assigned Lab Room (optional)</label>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
            style={{ fontSize: '0.85rem' }}
            placeholder="e.g. A-101"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[#0B4EA2] text-white rounded-xl hover:bg-[#0B4EA2]/90 transition-colors disabled:opacity-60"
        style={{ fontSize: '0.82rem' }}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add Item
      </button>
    </form>
  );
}

function DetailView({ acquisitionId, onBack, onFlash, onError }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState(null);

  const token = () => localStorage.getItem('token');

  const fetchDetail = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/admin/acquisitions/${acquisitionId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      .then((res) => setDetail({ ...res.data.acquisition, items: res.data.items }))
      .catch((err) => {
        onError(err.response?.data?.error || 'Could not load acquisition details.');
        onBack();
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [acquisitionId]);

  const handleItemAdded = () => {
    const msg = 'Item added successfully.';
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
    fetchDetail();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-5">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#0B4EA2] hover:underline"
          style={{ fontSize: '0.82rem' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to List
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Acquisition metadata */}
      <div className="bg-white rounded-xl border border-[#001254]/10 p-5 space-y-3">
        <h2 className="text-[#001254] font-semibold" style={{ fontSize: '0.95rem' }}>Acquisition Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[#001254]/40 uppercase tracking-widest mb-0.5" style={{ fontSize: '0.6rem' }}>Supplier</p>
            <p className="text-[#001254]" style={{ fontSize: '0.85rem' }}>{detail.supplier_name}</p>
          </div>
          <div>
            <p className="text-[#001254]/40 uppercase tracking-widest mb-0.5" style={{ fontSize: '0.6rem' }}>Date</p>
            <p className="text-[#001254]" style={{ fontSize: '0.85rem' }}>
              {new Date(detail.acquisition_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-[#001254]/40 uppercase tracking-widest mb-0.5" style={{ fontSize: '0.6rem' }}>Created By</p>
            <p className="text-[#001254]" style={{ fontSize: '0.85rem' }}>{detail.created_by_name || '—'}</p>
          </div>
          <div>
            <p className="text-[#001254]/40 uppercase tracking-widest mb-0.5" style={{ fontSize: '0.6rem' }}>Notes</p>
            <p className="text-[#001254]/70" style={{ fontSize: '0.85rem' }}>{detail.notes || '—'}</p>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-[#001254]/8">
          <h3 className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>
            Items ({detail.items?.length ?? 0})
          </h3>
        </div>
        {!detail.items || detail.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <ShoppingCart className="w-8 h-8 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.82rem' }}>No items yet. Add the first item below.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#001254]/8">
                  <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Equipment ID</th>
                  <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Name</th>
                  <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden md:table-cell" style={{ fontSize: '0.65rem' }}>Department</th>
                  <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden md:table-cell" style={{ fontSize: '0.65rem' }}>Condition</th>
                  <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden lg:table-cell" style={{ fontSize: '0.65rem' }}>Room</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item, i) => (
                  <tr
                    key={item.equipment_id}
                    className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === detail.items.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-5 py-3.5 text-[#001254]/50 font-mono" style={{ fontSize: '0.8rem' }}>{item.equipment_id}</td>
                    <td className="px-5 py-3.5 text-[#001254]" style={{ fontSize: '0.85rem' }}>{item.name}</td>
                    <td className="px-5 py-3.5 text-[#001254]/60 hidden md:table-cell" style={{ fontSize: '0.82rem' }}>{item.department}</td>
                    <td className="px-5 py-3.5 text-[#001254]/60 hidden md:table-cell" style={{ fontSize: '0.82rem' }}>{item.initial_condition || '—'}</td>
                    <td className="px-5 py-3.5 text-[#001254]/60 hidden lg:table-cell" style={{ fontSize: '0.82rem' }}>{item.assigned_room || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item form */}
      <div className="bg-white rounded-xl border border-[#001254]/10 p-5 space-y-4">
        <h3 className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Add Item</h3>
        <AddItemForm acquisitionId={acquisitionId} onSuccess={handleItemAdded} />
      </div>
    </div>
  );
}

export default function AcquisitionsManagement() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [acquisitions, setAcquisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const token = () => localStorage.getItem('token');

  const fetchAcquisitions = () => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/admin/acquisitions`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => setAcquisitions(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        if (err.response?.status === 403) setError('Access denied. Lab Admin role required.');
        else setError('Could not load acquisitions list.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAcquisitions(); }, []);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreate = async (data) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/acquisitions`, data, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowCreate(false);
      flash('Acquisition created successfully.');
      fetchAcquisitions();
      setSelectedId(res.data.acquisitionId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create acquisition.');
    } finally {
      setActionLoading(false);
    }
  };

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
                  Acquisitions Management
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

        {selectedId ? (
          <DetailView
            acquisitionId={selectedId}
            onBack={() => { setSelectedId(null); fetchAcquisitions(); }}
            onFlash={flash}
            onError={setError}
          />
        ) : (
          <>
            {/* Page title + New Acquisition button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-[#001254] text-xl font-semibold">Acquisitions</h1>
                  <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
                    Manage inventory intake and procurement records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0B4EA2] text-white rounded-xl hover:bg-[#0B4EA2]/90 transition-colors"
                style={{ fontSize: '0.82rem' }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Acquisition</span>
              </button>
            </div>

            {/* Success banner */}
            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Acquisitions table */}
            <div className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
                </div>
              ) : acquisitions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ShoppingCart className="w-10 h-10 text-[#001254]/15" />
                  <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No acquisition records found.</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-[#0B4EA2] underline underline-offset-2"
                    style={{ fontSize: '0.82rem' }}
                  >
                    Create the first acquisition
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#001254]/8">
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Supplier</th>
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Date</th>
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden md:table-cell" style={{ fontSize: '0.65rem' }}>Items</th>
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest hidden md:table-cell" style={{ fontSize: '0.65rem' }}>Created By</th>
                        <th className="text-right px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acquisitions.map((acq, i) => (
                        <tr
                          key={acq.acquisition_id}
                          className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === acquisitions.length - 1 ? 'border-b-0' : ''}`}
                        >
                          <td className="px-5 py-3.5 text-[#001254]" style={{ fontSize: '0.85rem' }}>{acq.supplier_name}</td>
                          <td className="px-5 py-3.5 text-[#001254]/70" style={{ fontSize: '0.82rem' }}>
                            {new Date(acq.acquisition_date).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-[#001254]/60 hidden md:table-cell" style={{ fontSize: '0.82rem' }}>
                            {acq.item_count ?? 0}
                          </td>
                          <td className="px-5 py-3.5 text-[#001254]/60 hidden md:table-cell" style={{ fontSize: '0.82rem' }}>
                            {acq.created_by_name || '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => setSelectedId(acq.acquisition_id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B4EA2]/8 text-[#0B4EA2] rounded-lg hover:bg-[#0B4EA2]/15 transition-colors"
                                style={{ fontSize: '0.78rem' }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* New Acquisition modal */}
      {showCreate && (
        <Modal title="New Acquisition" onClose={() => setShowCreate(false)}>
          <NewAcquisitionForm onSubmit={handleCreate} loading={actionLoading} />
        </Modal>
      )}
    </div>
  );
}
