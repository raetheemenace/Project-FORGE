import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, QrCode, CheckCircle2, AlertTriangle, LayoutDashboard, Camera, X, Mic, MicOff, RefreshCw } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo_landingpage.png';
import { useQRScanner } from '../hooks/useQRScanner';
import { useSTT } from '../hooks/useSTT';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const SEVERITY_COLORS = {
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Critical: 'bg-red-100 text-red-700 border-red-200',
};

export default function ReportMaintenance() {
  const navigate = useNavigate();

  // Camera refs (mirror BorrowStep3 pattern)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Camera state
  // cameraActive = true means we're in camera mode (video element is mounted)
  // cameraReady  = true means the stream is flowing and capture is safe
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Form state
  const [equipmentId, setEquipmentId] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  // QR scanning state (req 10.1, 10.2, 10.7, 10.8)
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const scanTimeoutRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // useQRScanner captures callbacks via refs internally — no circular dep issue
  const { startScanner, stopScanner } = useQRScanner(
    useCallback((scannedId) => {
      // Auto-close scanner
      stopScanner();
      setScanning(false);
      setScanError('');
      setEquipmentId(scannedId);
      setErrors((prev) => ({ ...prev, equipmentId: '' }));
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      // Fetch equipment name
      const token = localStorage.getItem('token');
      axios.get(`${API_URL}/equipment/${scannedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => setEquipmentName(res.data.name || scannedId))
        .catch(() => setEquipmentName(scannedId));
    }, []),
    useCallback((error) => {
      setScanError(error);
      setScanning(false);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }, [])
  );

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [stopScanner]);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Wire the stream to the <video> element once cameraActive=true mounts it
  useEffect(() => {
    if (!cameraActive) return;
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.onloadedmetadata = () => {
      video.play()
        .then(() => setCameraReady(true))
        .catch((err) => setCameraError('Failed to start camera preview: ' + err.message));
    };
    video.onerror = () => setCameraError('Error loading camera feed.');
  }, [cameraActive]);

  // Open camera — request stream first, then flip cameraActive to mount the video element
  async function startCamera() {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true); // mounts <video> — useEffect above will assign srcObject
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access and try again.' :
        err.name === 'NotFoundError' ? 'No camera found on this device.' :
        err.name === 'NotReadableError' ? 'Camera is in use by another app. Please close it and retry.' :
        err.message || 'Camera unavailable.';
      setCameraError(msg);
    }
  }

  // Close camera and release stream
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraReady(false);
    setCameraError(null);
  }

  // Capture a still frame from the live video
  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState < 2) {
      setCameraError('Camera not ready yet — please wait a moment.');
      return;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }

  // Start QR scanner — give the DOM 200ms to paint #qr-reader before init
  const handleStartScan = () => {
    setScanError('');
    setScanning(true);
    setTimeout(() => startScanner('qr-reader'), 200);

    // 30-second safety timeout — gives the user enough time to actually scan
    scanTimeoutRef.current = setTimeout(() => {
      setScanError('Scan timed out. Please try again or enter the Equipment ID manually.');
      setScanning(false);
      stopScanner();
      scanTimeoutRef.current = null;
    }, 30000);
  };

  // Stop scanning
  const handleStopScan = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    stopScanner();
    setScanning(false);
    setScanError('');
  };

  // STT for description field
  const { sttActive, listen, stop: stopSTT, error: sttError } = useSTT();

  const handleMicClick = () => {
    if (sttActive) {
      stopSTT();
      return;
    }
    listen((text) => {
      setDescription((prev) => prev ? `${prev} ${text}` : text);
      if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
    });
  };

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedEquipmentId, setSubmittedEquipmentId] = useState('');

  const validate = () => {
    const next = {};
    if (!severity) next.severity = 'Severity is required.';
    if (!description.trim()) next.description = 'Description is required.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const errs = validate(); // req 10.4
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const body = { equipmentId: equipmentId || undefined, severity, description: description.trim() };
      if (capturedImage) body.photoBase64 = capturedImage;
      await axios.post(
        '/api/maintenance',
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmittedEquipmentId(equipmentId || '—');
      setSubmitted(true); // req 10.5, 10.6
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Failed to submit report. Please retry.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-[#001254] bg-white transition-colors outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 ${
      errors[field]
        ? 'border-red-400 focus:border-red-400'
        : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'
    }`;

  // ── Success screen (req 10.5, 10.6) ──────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
        <header
          className="sticky top-0 z-40"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(0,18,84,0.08)',
          }}
        >
          <div className="max-w-2xl mx-auto px-4 h-[72px] flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
            </button>
            <img src={logo} alt="FORGE" className="h-8 opacity-70" />
            <span className="text-[#001254]/70 font-semibold text-lg">Report Maintenance</span>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-center gap-6">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold text-[#001254]">Report Submitted!</h1>
            <p className="text-[#001254]/55 text-sm max-w-xs">
              Your maintenance report has been sent to the Lab Admin.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="w-full bg-white rounded-2xl border border-[#001254]/10 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide">
                Equipment ID
              </span>
              <span className="text-sm font-mono font-semibold text-[#0B4EA2]">
                {submittedEquipmentId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide">
                Severity
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SEVERITY_COLORS[severity]}`}
              >
                {severity}
              </span>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to Dashboard
          </motion.button>
        </main>
      </div>
    );
  }

  // ── Report form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
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
        <div className="max-w-2xl mx-auto px-4 h-[72px] flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
          </button>
          <img src={logo} alt="FORGE" className="h-8 opacity-70" />
          <span className="text-[#001254]/70 font-semibold text-lg">Report Maintenance</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-semibold text-[#001254]">Report Maintenance</h1>
          <p className="text-[#001254]/50 text-sm mt-1">
            Scan the equipment QR code and describe the issue.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* QR Scanner section (req 10.1, 10.2, 10.7) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-[#001254]/10 p-6 space-y-4"
          >
            <p className="text-xs font-medium text-[#001254]/60 uppercase tracking-wide">
              Equipment ID
            </p>

            {/* QR scan area */}
            <div className="flex flex-col items-center gap-3 py-4 rounded-xl border-2 border-dashed border-[#001254]/15 bg-[#EFEFE9]/60 relative">
              {scanning ? (
                <div className="w-full">
                  {/* QR scanner container */}
                  <div id="qr-reader" className="w-full min-h-[300px]" />
                  <div className="flex justify-center mt-3">
                    <button
                      type="button"
                      onClick={handleStopScan}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-all active:scale-[0.97]"
                    >
                      <X className="w-4 h-4" />
                      Cancel Scan
                    </button>
                  </div>
                </div>
              ) : cameraActive ? (
                /* Camera viewfinder */
                <div className="w-full space-y-3 px-2">
                  {/* Video element is always rendered while cameraActive=true */}
                  <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      aria-label="Camera viewfinder"
                    />
                    <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                    {/* Loading overlay while stream isn't flowing yet */}
                    {!cameraReady && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Starting camera…</span>
                        </div>
                      </div>
                    )}
                    {/* Corner guides when ready */}
                    {cameraReady && (
                      <>
                        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-white/70 rounded-tl" />
                        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-white/70 rounded-tr" />
                        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-white/70 rounded-bl" />
                        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-white/70 rounded-br" />
                      </>
                    )}
                  </div>
                  {/* Camera error shown below the viewfinder */}
                  {cameraError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {cameraError}
                    </div>
                  )}
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={!cameraReady}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B4EA2] text-white text-xs font-semibold hover:bg-[#0a3f8a] transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4" />
                      {cameraReady ? 'Capture Photo' : 'Starting…'}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-all active:scale-[0.97]"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : capturedImage ? (
                /* Captured image preview */
                <div className="w-full space-y-3 px-2">
                  <div className="relative w-full rounded-xl overflow-hidden bg-[#001254]/10" style={{ aspectRatio: '4/3' }}>
                    <img
                      src={capturedImage}
                      alt="Captured photo"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Photo saved
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => { setCapturedImage(null); startCamera(); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#001254]/10 text-[#001254]/70 text-xs font-semibold hover:bg-[#001254]/15 transition-all active:scale-[0.97]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retake Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full px-2 py-2 space-y-3">
                  {/* Icon + prompt */}
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#001254]/6">
                      <QrCode className="w-8 h-8 text-[#001254]/40" />
                    </div>
                    <p className="text-sm font-medium text-[#001254]/60 text-center">
                      Identify equipment to report
                    </p>
                    <p className="text-xs text-[#001254]/35 text-center max-w-[220px]">
                      Scan the QR code on the equipment or take a photo
                    </p>
                  </div>

                  {/* Scan error */}
                  {scanError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {scanError}
                    </div>
                  )}

                  {/* Action cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleStartScan}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-[#0B4EA2] text-white hover:bg-[#0a3f8a] active:scale-[0.97] transition-all shadow-md shadow-[#0B4EA2]/20"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold">Scan QR Code</p>
                        <p className="text-white/60 mt-0.5" style={{ fontSize: '0.65rem' }}>Point at equipment tag</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-white border-2 border-[#001254]/10 text-[#001254] hover:border-[#0B4EA2]/30 hover:bg-[#F2F0DB]/30 active:scale-[0.97] transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#001254]/6 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-[#001254]/60" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-[#001254]/80">Take Photo</p>
                        <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.65rem' }}>Capture equipment</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment ID field — auto-filled from scan (req 10.2, 10.3) */}
            <div>
              <label
                htmlFor="equipmentId"
                className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide"
              >
                Equipment ID <span className="text-[#001254]/30 font-normal normal-case">(auto-filled from scan)</span>
              </label>
              <input
                id="equipmentId"
                type="text"
                placeholder="e.g. EQ-7167"
                value={equipmentId}
                onChange={(e) => { setEquipmentId(e.target.value); setEquipmentName(''); }}
                className="w-full px-4 py-3 rounded-xl border border-[#001254]/15 text-sm text-[#001254] bg-white outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2]/50 transition-colors"
              />
              {equipmentName && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <p className="text-emerald-700 text-xs font-medium">{equipmentName}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Severity + Description (req 10.3, 10.4) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-[#001254]/10 p-6 space-y-5"
          >
            {/* Severity dropdown */}
            <div>
              <label
                htmlFor="severity"
                className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide"
              >
                Severity <span className="text-red-400">*</span>
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  if (errors.severity) setErrors((prev) => ({ ...prev, severity: '' }));
                }}
                className={fieldClass('severity')}
                aria-invalid={!!errors.severity}
                aria-describedby={errors.severity ? 'severity-error' : undefined}
              >
                <option value="">Select severity level</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.severity && (
                <p id="severity-error" className="mt-1 text-xs text-red-500">{errors.severity}</p>
              )}
            </div>

            {/* Description textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="description"
                  className="block text-xs font-medium text-[#001254]/60 uppercase tracking-wide"
                >
                  Description <span className="text-red-400">*</span>
                </label>
                {!sttActive ? (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#001254]/6 text-[#001254]/60 hover:bg-[#001254]/10 transition-all"
                    aria-label="Start voice input"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Speak
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-all"
                    aria-label="Done speaking"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    Done Speaking
                  </button>
                )}
              </div>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe the issue in detail… or tap Speak"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                className={`${fieldClass('description')} resize-none`}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {sttError && (
                <p className="mt-1 text-xs text-amber-600">{sttError}</p>
              )}
              {errors.description && (
                <p id="description-error" className="mt-1 text-xs text-red-500">{errors.description}</p>
              )}
            </div>
          </motion.div>

          {/* Submit error banner */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                role="alert"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {submitError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </motion.button>
        </form>
      </main>
    </div>
  );
}
