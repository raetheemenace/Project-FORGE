import { WifiOff } from 'lucide-react';

const OfflinePage = () => (
  <div className="min-h-screen bg-[#060b18] text-zinc-100 flex flex-col items-center justify-center px-4">
    <WifiOff size={48} className="text-zinc-600 mb-4" />
    <h1 className="text-xl font-bold text-white mb-2">You're Offline</h1>
    <p className="text-sm text-zinc-500 text-center max-w-xs">
      No internet connection detected. Please check your network and try again.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="mt-6 bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all active:scale-95"
    >
      Retry
    </button>
  </div>
);

export default OfflinePage;
