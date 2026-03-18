import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // This calls the backend health check we set up earlier
    axios.get('/api/health')
      .then(res => setDbStatus(res.data.database || 'Connected'))
      .catch(() => setDbStatus('Connection Failed'));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent uppercase italic">
          Project Forge
        </h1>
        <p className="text-zinc-500 mt-2 tracking-widest uppercase text-xs">Full-Stack Development Environment</p>
      </div>

      {/* Connection Card */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-zinc-400">System Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${dbStatus === 'Connection Failed' ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-mono">{dbStatus}</span>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            className="w-full py-4 bg-zinc-100 text-zinc-950 font-bold rounded-xl hover:bg-orange-500 hover:text-white transition-all duration-300 active:scale-95 cursor-pointer"
            onClick={() => alert('Initiating AWS Bedrock Forge...')}
          >
            START FORGING
          </button>
          
          <p className="text-[10px] text-center text-zinc-600 uppercase tracking-tighter">
            Connected to Oracle 19c & AWS Bedrock SDK v3
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-12 opacity-20 hover:opacity-100 transition-opacity">
        <p className="text-xs font-mono">DEBUGGIN SHENANIGANS // 2026</p>
      </footer>
    </div>
  );
}

export default App;