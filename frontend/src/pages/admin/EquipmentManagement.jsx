import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import logo from '../../assets/logo_landingpage.png';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ImagePlus,
  CheckCircle2,
  QrCode,
  Download,
  Filter,
  Search,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEPARTMENTS = ['Chemistry', 'Physics', 'Engineering'];
const STATUSES = ['AVAILABLE', 'BORROWED', 'MAINTENANCE', 'DISPOSED'];

function StatusBadge({ status }) {
  const map = {
    AVAILABLE:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    BORROWED:    'bg-blue-50 text-blue-700 border-blue-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    DISPOSED:    'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

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

function EquipmentForm({ initial, onSubmit, loading, submitLabel }) {
  const [name, setName] = useState(initial?.name || '');
  const [department, setDepartment] = useState(initial?.department || DEPARTMENTS[0]);
  const [status, setStatus] = useState(initial?.status || 'AVAILABLE');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let imageBase64 = null;
    let imageFilename = null;
    if (imageFile && imagePreview) {
      // Strip the data URL prefix to get raw base64
      imageBase64 = imagePreview.split(',')[1];
      imageFilename = imageFile.name;
    }
    onSubmit({ name, department, status, imageBase64, imageFilename });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Equipment Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50"
          style={{ fontSize: '0.88rem' }}
          placeholder="e.g. Bunsen Burner"
        />
      </div>

      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Department *</label>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 bg-white"
          style={{ fontSize: '0.88rem' }}
        >
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] focus:outline-none focus:border-[#0B4EA2]/50 bg-white"
          style={{ fontSize: '0.88rem' }}
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[#001254]/60 mb-1" style={{ fontSize: '0.78rem' }}>Equipment Image</label>
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-[#001254]/15 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#0B4EA2]/40 transition-colors"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="h-24 object-contain rounded-lg" />
          ) : (
            <>
              <ImagePlus className="w-7 h-7 text-[#001254]/25" />
              <span className="text-[#001254]/40" style={{ fontSize: '0.78rem' }}>Click to upload image</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0B4EA2] text-white rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-[#0B4EA2]/90 transition-colors disabled:opacity-60"
        style={{ fontSize: '0.88rem' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {submitLabel}
      </button>
    </form>
  );
}

export default function EquipmentManagement() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);   // equipment object
  const [showDelete, setShowDelete] = useState(null); // equipment object
  const [showQRCode, setShowQRCode] = useState(null); // { equipmentId, equipmentName, qrCode }
  const [actionLoading, setActionLoading] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchEquipment = () => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/admin/equipment`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => setEquipment(res.data.equipment || []))
      .catch((err) => {
        if (err.response?.status === 403) setError('Access denied. Lab Admin role required.');
        else setError('Could not load equipment list.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEquipment(); }, []);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreate = async (data) => {
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/admin/equipment`, data, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowCreate(false);
      flash('Equipment created successfully.');
      fetchEquipment();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create equipment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_URL}/admin/equipment/${showEdit.equipment_id}`, data, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowEdit(null);
      flash('Equipment updated successfully.');
      fetchEquipment();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update equipment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/admin/equipment/${showDelete.equipment_id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowDelete(null);
      flash('Equipment marked as disposed.');
      fetchEquipment();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispose equipment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateQRCode = async (equipmentId, equipmentName) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/admin/qrcode/${equipmentId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setShowQRCode({
        equipmentId: response.data.equipmentId,
        equipmentName: response.data.equipmentName,
        qrCode: response.data.qrCode
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate QR code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadQRCode = () => {
    if (!showQRCode?.qrCode) return;
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = showQRCode.qrCode;
    link.download = `QR-${showQRCode.equipmentId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    flash('QR code downloaded successfully.');
  };

  const displayName = user?.fullName || user?.username || 'Admin';

  const hasActiveFilters = search || filterDept || filterStatus;

  const clearFilters = () => { setSearch(''); setFilterDept(''); setFilterStatus(''); };

  // Apply search + filters, then group by department
  const filteredGrouped = useMemo(() => {
    let list = [...equipment];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (eq) =>
          (eq.name || '').toLowerCase().includes(q) ||
          (eq.equipment_id || '').toLowerCase().includes(q)
      );
    }

    if (filterDept) {
      list = list.filter((eq) => (eq.department || '') === filterDept);
    }

    if (filterStatus) {
      list = list.filter((eq) => (eq.status || '') === filterStatus);
    }

    const groups = {};
    list.forEach((eq) => {
      const dept = eq.department || 'Uncategorized';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(eq);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [equipment, search, filterDept, filterStatus]);

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
                  Equipment Management
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

        {/* Page title + Add button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#001254] text-xl font-semibold">Equipment Inventory</h1>
            <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
              Manage lab equipment records and images
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B4EA2] text-white rounded-xl hover:bg-[#0B4EA2]/90 transition-colors"
            style={{ fontSize: '0.82rem' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Equipment</span>
          </button>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#001254]/30" />
            <input
              type="text"
              placeholder="Search by name or equipment ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-[#001254]/15 rounded-xl text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div className="bg-white rounded-xl border border-[#001254]/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-[#001254]/40" />
              <span className="text-[#001254]/50 uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                  style={{ fontSize: '0.75rem' }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-[#001254]/15 rounded-lg px-3 py-2 text-[#001254] bg-white focus:outline-none focus:border-[#0B4EA2]/50"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
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

        {/* Equipment grouped by department */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#001254]/10 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
          </div>
        ) : equipment.length === 0 && !hasActiveFilters ? (
          <div className="bg-white rounded-xl border border-[#001254]/10 flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-10 h-10 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>No equipment records found.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[#0B4EA2] underline underline-offset-2"
              style={{ fontSize: '0.82rem' }}
            >
              Add the first item
            </button>
          </div>
        ) : filteredGrouped.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#001254]/10 flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-10 h-10 text-[#001254]/15" />
            <p className="text-[#001254]/40" style={{ fontSize: '0.85rem' }}>
              {hasActiveFilters ? 'No equipment matches the current filters.' : 'No equipment records found.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[#0B4EA2] underline underline-offset-2" style={{ fontSize: '0.82rem' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredGrouped.map(([dept, items]) => (
              <div key={dept} className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-[#001254]/8 bg-[#001254]/2 flex items-center justify-between">
                  <h2 className="text-[#001254] font-semibold" style={{ fontSize: '0.85rem' }}>{dept}</h2>
                  <span className="text-[#001254]/40 text-xs">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#001254]/8">
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>ID</th>
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Name</th>
                        <th className="text-left px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Status</th>
                        <th className="text-right px-5 py-3 text-[#001254]/40 font-medium uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((eq, i) => (
                        <tr
                          key={eq.equipment_id}
                          className={`border-b border-[#001254]/5 hover:bg-[#001254]/2 transition-colors ${i === items.length - 1 ? 'border-b-0' : ''}`}
                        >
                          <td className="px-5 py-3.5 text-[#001254]/50 font-mono" style={{ fontSize: '0.8rem' }}>{eq.equipment_id}</td>
                          <td className="px-5 py-3.5 text-[#001254]" style={{ fontSize: '0.85rem' }}>{eq.name}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={eq.status} /></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleGenerateQRCode(eq.equipment_id, eq.name)}
                                className="p-1.5 hover:bg-[#0B4EA2]/8 rounded-lg transition-colors"
                                title="Generate QR Code"
                              >
                                <QrCode className="w-3.5 h-3.5 text-[#0B4EA2]" />
                              </button>
                              <button
                                onClick={() => setShowEdit(eq)}
                                className="p-1.5 hover:bg-[#0B4EA2]/8 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#0B4EA2]" />
                              </button>
                              <button
                                onClick={() => setShowDelete(eq)}
                                disabled={eq.status === 'DISPOSED'}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                title="Dispose"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Equipment" onClose={() => setShowCreate(false)}>
          <EquipmentForm
            onSubmit={handleCreate}
            loading={actionLoading}
            submitLabel="Create Equipment"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {showEdit && (
        <Modal title="Edit Equipment" onClose={() => setShowEdit(null)}>
          <EquipmentForm
            initial={showEdit}
            onSubmit={handleEdit}
            loading={actionLoading}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {showDelete && (
        <Modal title="Dispose Equipment" onClose={() => setShowDelete(null)}>
          <div className="space-y-4">
            <p className="text-[#001254]/70" style={{ fontSize: '0.88rem' }}>
              Mark <span className="font-semibold text-[#001254]">{showDelete.name}</span> ({showDelete.equipment_id}) as <span className="font-semibold text-red-600">DISPOSED</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(null)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ fontSize: '0.85rem' }}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Dispose
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Code modal */}
      {showQRCode && (
        <Modal title="Equipment QR Code" onClose={() => setShowQRCode(null)}>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-[#001254] font-semibold mb-1" style={{ fontSize: '0.9rem' }}>
                {showQRCode.equipmentName}
              </p>
              <p className="text-[#001254]/50 font-mono" style={{ fontSize: '0.75rem' }}>
                {showQRCode.equipmentId}
              </p>
            </div>
            
            <div className="flex justify-center bg-white p-4 rounded-xl border border-[#001254]/10">
              <img 
                src={showQRCode.qrCode} 
                alt={`QR Code for ${showQRCode.equipmentId}`}
                className="w-64 h-64"
              />
            </div>

            <div className="text-center text-[#001254]/50" style={{ fontSize: '0.75rem' }}>
              Scan this QR code to identify equipment or report maintenance issues
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowQRCode(null)}
                className="flex-1 border border-[#001254]/15 text-[#001254]/60 rounded-xl py-2.5 hover:bg-[#001254]/5 transition-colors"
                style={{ fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                onClick={handleDownloadQRCode}
                className="flex-1 bg-[#0B4EA2] text-white rounded-xl py-2.5 hover:bg-[#0B4EA2]/90 transition-colors flex items-center justify-center gap-2"
                style={{ fontSize: '0.85rem' }}
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
