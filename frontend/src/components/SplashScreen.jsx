import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo_landingpage.png';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => onComplete(), 4500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#EFEFE9]">
      {/* Blueprint grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#001254 1px, transparent 1px), linear-gradient(90deg, #001254 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Scanning lines */}
      <AnimatePresence>
        {phase >= 1 && phase < 4 && (
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-[#0B4EA2]/30"
            initial={{ top: "0%" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo assembly */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.3, filter: "blur(20px)" }}
          animate={
            phase >= 2
              ? { opacity: 1, scale: 1, filter: "blur(0px)" }
              : { opacity: 0.3, scale: 0.6, filter: "blur(10px)" }
          }
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow effect behind logo */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: [0, 0.5, 0.2] } : { opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              background: "radial-gradient(ellipse at center, rgba(11,78,162,0.15) 0%, transparent 70%)",
              transform: "scale(1.5)",
            }}
          />
          <img
            src={logo}
            alt="FORGE Logo"
            className="w-[420px] md:w-[560px] relative z-10"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p 
            className="text-[#001254]/60 tracking-[0.3em] uppercase" 
            style={{ fontSize: '0.75rem' }}
          >
            Student Lab & Resource Management
          </p>
          <motion.div
            className="h-[1px] bg-[#001254]/20"
            initial={{ width: 0 }}
            animate={phase >= 3 ? { width: 200 } : { width: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          className="flex gap-1.5"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#0B4EA2]"
              animate={{ 
                opacity: [0.3, 1, 0.3], 
                scale: [0.8, 1.2, 0.8] 
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2 
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Fade out */}
      <motion.div
        className="absolute inset-0 bg-[#EFEFE9] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </div>
  );
}
