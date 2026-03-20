import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Plus, Mic, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import MobileHeader from '../../components/layout/MobileHeader.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import { useSTT } from '../../hooks/useSTT.js';
import { identifyEquipment } from '../../services/scannerService.js';

const BorrowStep3 = () => {
  const navigate = useNavigate();
  const tts = useTTS();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [items, setItems] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  // Start camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      })
      .catch(() => setError('Camera access denied. Please allow camera permissions.'));

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    tts.speak('Step 3 of 4. AI Equipment Scanner. Point your camera at the equipment and tap Scan Equipment.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.enabled]);

  const captureAndScan = useCallback(async () => {
    if (!cameraReady || scanning) return;
    setError('');
    setResult(null);
    setScanning(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const data = await identifyEquipment(base64);
      setResult(data);
      tts.speak(`Identified: ${data.name}. Condition: ${data.condition}. Tap Add to Cart to include this item.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not identify equipment. Please try again.');
    } finally {
      setScanning(false);
    }
  }, [cameraReady, scanning, tts]);

  const stt = useSTT((text) => {
    if (/scan|identify|capture/i.test(text)) captureAndScan();
  });

  const addToCart = () => {
    if (!result) return;
    setItems((prev) => [...prev, result]);
    setResult(null);
    tts.speak(`${result.name} added to cart. ${items.length + 1} item${items.length + 1 !== 1 ? 's' : ''} in cart.`);
  };

  const handleReview = () => {
    if (!items.length) { setError('Add at least one item before reviewing.'); return; }
    sessionStorage.setItem('borrow_items', JSON.stringify(items));
    navigate('/borrow/step4');
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100 flex flex-col">
      <MobileHeader
        title="AI Scanner"
        back="/borrow/step2"
        step={3}
        totalSteps={4}
        tts={{ enabled: tts.enabled, speaking: tts.speaking, onToggle: tts.toggle }}
      />

      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4 pb-6">
        {/* Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 mb-4 aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-orange-500/60 rounded-xl relative">
              <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-orange-500 rounded-tl" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-orange-500 rounded-tr" />
              <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-orange-500 rounded-bl" />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-orange-500 rounded-br" />
            </div>
          </div>
          {scanning && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <ScanLine size={32} className="text-orange-400 animate-pulse" />
                <span className="text-xs text-orange-300">Identifying...</span>
              </div>
            </div>
          )}
        </div>

        {/* Result card */}
        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{result.name}</p>
                <p className="text-xs text-zinc-400">Condition: {result.condition} · {result.equipmentId}</p>
              </div>
            </div>
            <button
              onClick={addToCart}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> Add
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2.5 rounded-lg mb-3">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {/* Cart count */}
        {items.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 mb-3">
            <p className="text-xs text-zinc-400">
              <span className="text-orange-400 font-bold">{items.length}</span> item{items.length !== 1 ? 's' : ''} in cart:{' '}
              {items.map((i) => i.name).join(', ')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={captureAndScan}
            disabled={scanning || !cameraReady}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
          >
            <ScanLine size={16} />
            {scanning ? 'Scanning...' : 'Scan Equipment'}
          </button>
          <button
            onClick={stt.listening ? stt.stop : stt.start}
            aria-label="Voice scan"
            className={`p-3 rounded-xl border transition-all ${
              stt.listening
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            <Mic size={18} />
          </button>
          <button
            onClick={() => tts.speak('Point your camera at the equipment and tap Scan Equipment. After identification, tap Add to Cart. When done, tap Review and Confirm.')}
            aria-label="Read instructions"
            className="p-3 rounded-xl border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <BookOpen size={18} />
          </button>
        </div>

        {stt.listening && (
          <p className="text-center text-xs text-red-400 mt-2 animate-pulse">Speaking... (auto-stops in 5s)</p>
        )}

        <button
          onClick={handleReview}
          className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 text-sm"
        >
          Review and Confirm ({items.length}) →
        </button>

        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
          <span className={tts.enabled ? 'text-orange-400' : ''}>{tts.enabled ? '● Voice Feedback Active' : '○ Voice Feedback Off'}</span>
          <span className={stt.listening ? 'text-red-400' : ''}>○ Voice Input Available</span>
        </div>
      </main>
    </div>
  );
};

export default BorrowStep3;
