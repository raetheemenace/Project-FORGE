import { WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/logo_landingpage.png';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#EFEFE9] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-sm w-full text-center"
      >
        {/* Logo */}
        <img src={logo} alt="FORGE" className="h-8 opacity-60" />

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[#001254]/8 flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-[#001254]/40" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#001254]">You're Offline</h1>
          <p className="text-[#001254]/50 text-sm leading-relaxed">
            No internet connection detected. Check your network and try again.
          </p>
        </div>

        {/* Try Again button */}
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] transition-all"
        >
          Try Again
        </button>

        <p className="text-[#001254]/25 text-xs">FORGE — Lab Resource Management</p>
      </motion.div>
    </div>
  );
}
