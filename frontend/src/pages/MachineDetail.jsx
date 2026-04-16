import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import logo from '../assets/logo_landingpage.png';
import { getToken } from '../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function StatusBadge({ label, value }) {
  if (!value) return null;
  const colorMap = {
    AVAILABLE: 'bg-green-100 text-green-700 border-green-200',
    BORROWED: 'bg-blue-100 text-blue-700 border-blue-200',
    MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    UNAVAILABLE: 'bg-red-100 text-red-700 border-red-200',
    Excellent: 'bg-green-100 text-green-700 border-green-200',
    Good: 'bg-blue-100 text-blue-700 border-blue-200',
    Fair: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Poor: 'bg-red-100 text-red-700 border-red-200',
  };
  const cls = colorMap[value] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {label && <span className="mr-1 text-gray-500 font-normal">{label}:</span>}
      {value}
    </span>
  );
}

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    axios
      .get(`${API_URL}/equipment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setEquipment(res.data);
        setLoading(false);
      })
      .catch((err) => {
        const status = err.response?.status;
        setError(status === 404 ? 'Equipment not found.' : 'Failed to load equipment details.');
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="min-h-screen bg-[#EFEFE9]">
      {/* Header */}
      <header
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(0,18,84,0.08)',
        }}
        className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4"
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-[#001254]/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-[#001254]" />
        </button>
        <img src={logo} alt="FORGE" className="h-8 w-auto" />
        <span className="text-[#001254] font-semibold text-lg">Equipment Detail</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 size={36} className="animate-spin text-[#0B4EA2]" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-white p-6 flex items-start gap-4">
            <AlertTriangle size={24} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 text-sm text-[#0B4EA2] hover:underline"
              >
                Go back
              </button>
            </div>
          </div>
        )}

        {equipment && (
          <div className="rounded-2xl border border-[#001254]/10 bg-white p-6 space-y-5">
            {/* Name */}
            <div>
              <h1 className="text-2xl font-bold text-[#001254]">{equipment.name}</h1>
              <p className="mt-1 font-mono text-sm text-gray-500">{equipment.equipmentId}</p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {equipment.status && <StatusBadge label="Status" value={equipment.status} />}
              {equipment.condition && <StatusBadge label="Condition" value={equipment.condition} />}
            </div>

            {/* Location */}
            {equipment.location && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm text-gray-700">{equipment.location}</p>
              </div>
            )}

            {/* Description */}
            {equipment.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{equipment.description}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
