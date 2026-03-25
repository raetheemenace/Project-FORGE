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

  // Camera state (req 2.4)
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Form state
  const [equipmentId, setEquipmentId] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  // QR scanning state (req 10.1, 10.2, 10.7, 10.8)
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const scanTimeoutRef = useRef(null);

  // QR scanner hook with success/error callbacks (memoized to keep startScanner stable)
  const handleScanSuccess = useCallback((scannedId) => {
    setEquipmentId(scannedId);
    setScanning(false);
    setScanError('');
    stopScanner();
    setErrors((prev) => ({ ...prev, equipmentId: '' }));
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanError = useCallback((error) => {
    setScanError(error);
    setScanning(false);
    stopScanner();
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { startScanner, stopScanner } = useQRScanner(handleScanSuccess, handleScanError);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [stopScanner]);

  // Stop camera stream on unmount (req 2.4)
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Start camera (req 2.4)
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
      setCameraOpen(true);
    } catch (err) {
      setCameraError(err.message || 'Camera access denied or unavailable.');
    }
  }

  // Stop camera (req 2.4)
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  }

  // Capture still frame from video (req 2.4)
  function capturePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }

  // Start QR scanner with 5-second timeout (req 10.8)
  const handleStartScan = () => {
    setScanError('');
    setScanning(true);

    // Delay scanner init by 100ms to ensure #qr-reader is painted (mirror BorrowStep3 pattern)
    setTimeout(() => startScanner('qr-reader'), 100);

    // Set 5-second timeout for failed scans (req 10.8)
    scanTimeoutRef.current = setTimeout(() => {
      setScanError('QR scan timeout. Please try again or enter Equipment ID manually.');
      setScanning(false);
      stopScanner();
    }, 5000);
  };

  // Stop scanning
  const handleStopScan = () => {
    setScanning(false);
    setScanError('');
    stopScanner();
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
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
            <div className="flex flex-col items-center gap-3 py-4 rounded-xl border-2 border-dashed border-[#001254]/15 bg-[#EFEFE9]/60 relative overflow-hidden">
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
              ) : cameraOpen ? (
                /* Camera viewfinder (req 2.4) */
                <div className="w-full space-y-3">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#001254]/10">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      aria-label="Camera viewfinder"
                    />
                    <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                    {cameraError && (
                      <div className="absolute inset-0 bg-[#001254]/80 flex items-center justify-center p-4">
                        <div className="text-center text-white space-y-2">
                          <AlertTriangle className="w-8 h-8 mx-auto text-red-300" />
                          <p className="text-xs">{cameraError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={!cameraReady}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B4EA2] text-white text-xs font-semibold hover:bg-[#0a3f8a] transition-all active:scale-[0.97] disabled:opacity-40"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
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
                /* Captured image preview (req 2.4) */
                <div className="w-full space-y-3">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#001254]/10">
                    <img
                      src={capturedImage}
                      alt="Captured photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => { setCapturedImage(null); startCamera(); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#001254]/10 text-[#001254]/70 text-xs font-semibold hover:bg-[#001254]/15 transition-all active:scale-[0.97]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retake
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-[72px] rounded-xl flex items-center justify-center bg-[#001254]/6">
                    <QrCode className="w-8 h-8 text-[#001254]/40" />
                  </div>
                  <p className="text-xs text-[#001254]/45 text-center max-w-[200px]">
                    Point camera at equipment QR code
                  </p>
                  
                  {/* Scan error message (req 10.8) */}
                  {scanError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {scanError}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleStartScan}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B4EA2] text-white text-xs font-semibold hover:bg-[#0a3f8a] transition-all active:scale-[0.97]"
                    >
                      <QrCode className="w-4 h-4" />
                      Scan QR Code
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#001254]/10 text-[#001254]/70 text-xs font-semibold hover:bg-[#001254]/15 transition-all active:scale-[0.97]"
                      aria-label="Take photo"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                  </div>
                </>
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
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#001254]/15 text-sm text-[#001254] bg-white outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2]/50 transition-colors"
              />
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
