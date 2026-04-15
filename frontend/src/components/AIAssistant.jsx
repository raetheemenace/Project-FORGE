import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Zap, X, Send, Loader2, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AIAssistant({ ttsEnabled, speak }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showHint, setShowHint] = useState(
    () => sessionStorage.getItem('forge_hint_dismissed') !== 'true'
  );
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const handleAsk = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/ai/chat`,
        { question },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const answer = res.data.answer;
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
      if (ttsEnabled && speak) speak(answer);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', text: err.response?.data?.error || 'Failed to get an answer. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hint bubble - upper-left of button, disappears when opened */}
      {showHint && !open && (
        <div
          style={{
            position: 'fixed',
            bottom: '68px',
            right: '16px',
            zIndex: 51,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '14px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(0,18,84,0.15)',
              border: '1px solid rgba(255,255,255,0.6)',
              position: 'relative',
            }}
          >
            <Zap style={{ width: 13, height: 13, color: '#0B4EA2', flexShrink: 0 }} />
            <span style={{ color: '#001254', fontSize: '0.72rem', fontWeight: 500 }}>
              Hi! I'm FORGE Assistant
            </span>
            {/* downward-right arrow tail */}
            <span
              style={{
                position: 'absolute',
                bottom: -7,
                right: 18,
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '7px solid rgba(255,255,255,0.85)',
              }}
            />
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (showHint) {
            setShowHint(false);
            sessionStorage.setItem('forge_hint_dismissed', 'true');
          }
        }}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #001254 0%, #0B4EA2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,18,84,0.35)',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Zap className="w-6 h-6 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #001254 0%, #0B4EA2 100%)',
              boxShadow: '0 8px 40px rgba(0,18,84,0.35)',
              maxHeight: '520px',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold" style={{ fontSize: '0.9rem' }}>FORGE Assistant</p>
                <p className="text-white/40" style={{ fontSize: '0.62rem' }}>Ask about equipment, borrowing, or lab policies</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
              {messages.length === 0 && (
                <p className="text-white/30 text-center mt-8" style={{ fontSize: '0.8rem' }}>
                  Ask me anything about the lab or equipment.
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'error' ? (
                    <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2.5 max-w-[85%]">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-300 shrink-0 mt-0.5" />
                      <p className="text-red-200" style={{ fontSize: '0.8rem' }}>{msg.text}</p>
                    </div>
                  ) : msg.role === 'user' ? (
                    <div className="bg-white/15 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]">
                      <p className="text-white" style={{ fontSize: '0.85rem' }}>{msg.text}</p>
                    </div>
                  ) : (
                    <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center">
                          <Zap className="w-2 h-2 text-white" />
                        </div>
                        <span className="text-white/40 font-medium" style={{ fontSize: '0.6rem', letterSpacing: '0.08em' }}>FORGE</span>
                      </div>
                      <p className="text-white/90 whitespace-pre-wrap" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>{msg.text}</p>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-white/10 shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Ask a question..."
                  disabled={loading}
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 outline-none transition-all"
                  style={{
                    fontSize: '0.85rem',
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                  onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; e.target.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                  onBlur={(e) => { e.target.style.background = 'rgba(255,255,255,0.10)'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                />
                <button
                  onClick={handleAsk}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,1)' }}
                >
                  <Send className="w-4 h-4 text-[#001254]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
