import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, Camera, Plus, ChevronRight,
  AlertCircle, RefreshCw, BookOpen, Trash2, Mic, QrCode
} from 'lucide-react';
import axios from 'axios';
import logo from '../../assets/logo_landingpage.png';
import { useTTS } from '../../hooks/useTTS';
import { useSTT } from '../../hooks/useSTT';
import { useQRScanner } from '../../hooks/useQRScanner';
import StepIndicator from '../../components/ui/StepIndicator';
import TTSToggle from '../../components/ui/TTSToggle';

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CONDITION_COLORS = {
  Excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Good: 'bg-blue-100 text-blue-700 border-blue-200',
  Fair: 'bg-amber-100 text-amber-700 border-amber-200',
  Poor: 'bg-red-100 text-red-700 border-red-200',
};

export default function BorrowStep3() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionData = location.state ?? {};
  const ttsFromPrev = sessionData.ttsEnabled ?? false;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { ttsEnabled, toggleTTS, speak, stop } = useTTS(ttsFromPrev);
  const { sttActive, listen } = useSTT();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [qrMode, setQrMode] = useState(false);
  const [qrLookupError, setQrLookupError] = useState(null);

  const speak_ref = useRef(speak);
  speak_ref.current = speak;

  // QR scan success: fetch equipment details and auto-add to cart
  // speak_ref.current always has the latest speak — no need to list speak as dep
  const handleQRSuccess = useCallback(async (equipmentId) => {
    setQrLookupError(null);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/api/equipment/${equipmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const item = {
        equipmentId: data.equipmentId,
        name: data.name,
        condition: 'Good', // default condition; no per-item condition stored on equipment
      };
      setCartItems((prev) => {
        const next = [...prev, item];
        speak_ref.current(`${data.name} added to cart via QR. ${next.length} item${next.length !== 1 ? 's' : ''} in cart.`);
        return next;
      });
    } catch (err) {
      const msg = err.response?.status === 404
        ? `Equipment "${equipmentId}" not found in the system.`
        : 'Could not look up equipment. Please retry.';
      setQrLookupError(msg);
      speak_ref.current('QR error. ' + msg);
    }
  }, []); // stable — uses speak_ref

  const handleQRError = useCallback((msg) => {
    setQrLookupError(msg);
  }, []);

  const { startScanner, stopScanner } = useQRScanner(handleQRSuccess, handleQRError);

  // Toggle QR mode on/off
  async function toggleQrMode() {
    if (qrMode) {
      stopScanner();
      setQrMode(false);
      setQrLookupError(null);
      startCamera();
    } else {
      stopCamera();
      await new Promise(resolve => setTimeout(resolve, 400));
      setQrMode(true);
      setQrLookupError(null);
    }
  }

  // Start QR scanner once the container div is mounted and has non-zero height.
  // On mobile, layout may not be complete immediately — poll until offsetHeight > 0
  // (max 20 retries × 50ms = 1s) before calling startScanner to avoid silent failures.
  useEffect(() => {
    if (!qrMode) return;

    let timeoutId;
    let retries = 0;
    const MAX_RETRIES = 20;
    const POLL_INTERVAL = 50;

    function pollForContainer() {
      const el = document.getElementById('qr-scanner-container');
      if (el && el.offsetHeight > 0) {
        startScanner('qr-scanner-container');
      } else if (retries < MAX_RETRIES) {
        retries += 1;
        timeoutId = setTimeout(pollForContainer, POLL_INTERVAL);
      }
      // If max retries exceeded, give up silently (avoids infinite loop)
    }

    timeoutId = setTimeout(pollForContainer, POLL_INTERVAL);

    return () => {
      clearTimeout(timeoutId);
      stopScanner();
    };
  }, [qrMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read instructions aloud when TTS enabled (req 6.8)
  useEffect(() => {
    if (ttsEnabled) {
      speak('AI Equipment Scanner. Step 3 of 4. Point your camera at the equipment and tap Scan Equipment to identify it.');
    } else {
      stop();
    }
    
    // Cleanup: stop TTS when navigating away
    return () => {
      stop();
    };
  }, [ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start camera on mount (req 6.1)
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable. Please allow camera permissions and retry.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  // Capture frame and send to backend (req 6.2, 6.3)
  async function handleScan() {
    if (!cameraReady || scanning) return;
    setScanResult(null);
    setScanError(null);
    setScanning(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_BASE}/api/scanner/identify`,
        { imageBase64, mediaType: 'image/jpeg' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setScanResult(data);
      // Announce result via TTS (req 6.8)
      speak(`Identified: ${data.name}. Condition: ${data.condition}. Tap Add to Cart to include this item.`);
    } catch (err) {
      const msg =
        err.response?.data?.error ?? 'Could not identify equipment. Please retry.';
      setScanError(msg); // req 6.6
      speak('Scanner error. ' + msg);
    } finally {
      setScanning(false);
    }
  }

  // Add identified item to cart (req 6.4)
  function handleAddToCart() {
    if (!scanResult) return;
    setCartItems((prev) => {
      const next = [...prev, { name: scanResult.name, condition: scanResult.condition, equipmentId: scanResult.equipmentId }];
      speak(`${scanResult.name} added to cart. ${next.length} item${next.length !== 1 ? 's' : ''} in cart.`);
      return next;
    });
    setScanResult(null);
    setScanError(null);
  }

  function handleRemoveItem(index) {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Read instructions aloud (req 6.7)
  function handleReadInstructions() {
    speak(
      'Instructions: Point your camera at the lab equipment. Tap Scan Equipment to identify it using AI. ' +
      'If identified correctly, tap Add to Cart. Repeat for each item. When done, tap Review and Confirm.'
    );
  }

  // STT trigger (req 11.3) — uses useSTT hook (Transcribe backend + Web Speech fallback)
  function handleSTT() {
    listen((transcript) => {
      const t = transcript.toLowerCase();
      if (t.includes('scan') || t.includes('identify')) handleScan();
      else if (t.includes('add') || t.includes('cart')) handleAddToCart();
    });
  }

  // Navigate to step 4 (req 6.5)
  function handleReviewAndConfirm() {
    navigate('/borrow/step4', {
      state: { ...sessionData, cartItems, ttsEnabled },
    });
  }

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
        <div className="max-w-2xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/borrow/step2', { state: sessionData })}
              className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
              aria-label="Back to borrowing details"
            >
              <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
            </button>
            <img src={logo} alt="FORGE" className="h-8 opacity-70" />
            <span className="text-[#001254]/70 font-semibold text-lg">Borrow an Item</span>
          </div>
          <div className="flex items-center gap-3">
            <StepIndicator current={CURRENT_STEP} total={TOTAL_STEPS} />
            <TTSToggle enabled={ttsEnabled} onToggle={toggleTTS} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Step label */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[#0B4EA2] text-xs font-medium tracking-widest uppercase mb-1">
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[#001254]">AI Equipment Scanner</h1>
            {/* Cart badge */}
            {cartItems.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B4EA2] text-white text-xs font-semibold">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </motion.div>

        {/* Camera viewfinder (req 6.1) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#001254]/10 border border-[#001254]/10"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            aria-label="Camera viewfinder"
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          {/* Scanning overlay */}
          {scanning && (
            <div className="absolute inset-0 bg-[#001254]/40 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Identifying equipment…</span>
              </div>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 bg-[#001254]/80 flex items-center justify-center p-6">
              <div className="text-center text-white space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-red-300" />
                <p className="text-sm">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Retry Camera
                </button>
              </div>
            </div>
          )}

          {/* Corner guides */}
          {cameraReady && !scanning && (
            <>
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-sm" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-sm" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-sm" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-sm" />
            </>
          )}
        </motion.div>

        {/* Scan result card */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl border border-[#001254]/10 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#001254]/40 uppercase tracking-wide mb-0.5">Identified</p>
                <p className="font-semibold text-[#001254] truncate">{scanResult.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      CONDITION_COLORS[scanResult.condition] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {scanResult.condition}
                  </span>
                  {scanResult.confidence > 0 && (
                    <span className="text-xs text-[#001254]/40">{scanResult.confidence}% confidence</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B4EA2] text-white text-sm font-semibold hover:bg-[#0a3f8a] active:scale-95 transition-all shrink-0"
                aria-label={`Add ${scanResult.name} to cart`}
              >
                <Plus className="w-4 h-4" /> Add to Cart
              </button>
            </motion.div>
          )}

          {/* Scan error (req 6.6) */}
          {scanError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700">{scanError}</p>
              </div>
              <button
                onClick={handleScan}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition-colors shrink-0"
                aria-label="Retry scan"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR scanner panel */}
        <AnimatePresence>
          {qrMode && (
            <motion.div
              key="qr-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl border border-[#001254]/10 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#001254]/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#0B4EA2]" />
                  <p className="text-xs font-semibold text-[#001254]/60 uppercase tracking-wide">
                    QR Code Scanner
                  </p>
                </div>
                <p className="text-xs text-[#001254]/40">Point at equipment QR code to auto-add</p>
              </div>
              <div id="qr-scanner-container" className="w-full min-h-[300px]" />
              {qrLookupError && (
                <div className="px-4 py-3 border-t border-[#001254]/8 flex items-center gap-2 bg-red-50">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{qrLookupError}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Scan button (req 6.2) */}
          <button
            onClick={handleScan}
            disabled={!cameraReady || scanning || qrMode}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Scan equipment"
          >
            <Camera className="w-4 h-4" />
            {scanning ? 'Scanning…' : 'Scan Equipment'}
          </button>

          {/* QR scanner toggle */}
          <button
            onClick={toggleQrMode}
            className={`p-3.5 rounded-xl border transition-all ${
              qrMode
                ? 'bg-[#0B4EA2] border-[#0B4EA2] text-white'
                : 'bg-white border-[#001254]/15 text-[#001254]/60 hover:border-[#0B4EA2]/30'
            }`}
            aria-label={qrMode ? 'Close QR scanner' : 'Scan QR code'}
            aria-pressed={qrMode}
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* STT button (req 11.3) */}
          <button
            onClick={handleSTT}
            className={`p-3.5 rounded-xl border transition-all ${
              sttActive
                ? 'bg-[#0B4EA2] border-[#0B4EA2] text-white'
                : 'bg-white border-[#001254]/15 text-[#001254]/60 hover:border-[#0B4EA2]/30'
            }`}
            aria-label={sttActive ? 'Listening…' : 'Voice input'}
            aria-pressed={sttActive}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Read instructions (req 6.7) */}
          <button
            onClick={handleReadInstructions}
            className="p-3.5 rounded-xl border bg-white border-[#001254]/15 text-[#001254]/60 hover:border-[#0B4EA2]/30 transition-all"
            aria-label="Read instructions aloud"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>

        {/* STT indicator (req 11.4) */}
        <AnimatePresence>
          {sttActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-[#0B4EA2] text-xs font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-[#0B4EA2] animate-pulse" />
              Speaking…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart items list */}
        <AnimatePresence>
          {cartItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[#001254]/10 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#001254]/8 flex items-center justify-between">
                <p className="text-xs font-semibold text-[#001254]/60 uppercase tracking-wide">
                  Scanned Items
                </p>
                <span className="text-xs font-bold text-[#0B4EA2]">{cartItems.length}</span>
              </div>
              <ul className="divide-y divide-[#001254]/6">
                {cartItems.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#0B4EA2]/10 text-[#0B4EA2] text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#001254] truncate">{item.name}</p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
                          CONDITION_COLORS[item.condition] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {item.condition}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#001254]/30 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review and Confirm (req 6.5) */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleReviewAndConfirm}
          disabled={cartItems.length === 0}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Review and Confirm
          <ChevronRight className="w-4 h-4" />
        </motion.button>

        {/* Accessibility status indicators (req 11.5) */}
        <div className="flex items-center justify-center gap-4 text-xs text-[#001254]/40">
          {ttsEnabled && (
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Voice Feedback Active
            </span>
          )}
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3" /> Voice Input Available
          </span>
        </div>
      </main>
    </div>
  );
}
