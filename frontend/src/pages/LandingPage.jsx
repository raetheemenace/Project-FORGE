import { useNavigate } from 'react-router-dom';
import { ScanLine, BarChart3, QrCode, Mic, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: BarChart3,  title: 'Live Resource Dashboard',    desc: 'Real-time visibility into equipment availability and active sessions.' },
  { icon: ScanLine,   title: 'AI-Powered Scanner',         desc: 'Identify equipment instantly using AWS Bedrock Claude 3 image recognition.' },
  { icon: Zap,        title: 'Transaction Management',     desc: 'ACID-compliant ledger prevents concurrency conflicts across all borrows.' },
  { icon: QrCode,     title: 'QR Maintenance Reports',     desc: 'Scan any equipment QR code to file a maintenance report in seconds.' },
  { icon: Mic,        title: 'Multimodal Interaction',     desc: 'Voice commands and TTS readback for hands-free, glove-friendly operation.' },
  { icon: ShieldCheck,title: 'Admin Clearance System',     desc: 'Role-based portal for admins to oversee inventory, tickets, and users.' },
];

const STEPS = [
  { n: '01', label: 'Sign In',          desc: 'Authenticate with your student credentials.' },
  { n: '02', label: 'Browse & Select',  desc: 'Choose a department and fill in session details.' },
  { n: '03', label: 'AI Scan',          desc: 'Point your camera at equipment to identify it.' },
  { n: '04', label: 'Track & Return',   desc: 'Monitor your active borrows and return on time.' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <span className="text-2xl font-black tracking-tighter text-orange-500 uppercase italic">FORGE</span>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/signin')} className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="text-sm bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-3 py-1 rounded-full mb-6">
          <Zap size={11} /> TIP-Manila Lab Management Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic mb-4">
          <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">FORGE</span>
        </h1>
        <p className="text-zinc-400 max-w-xl text-base md:text-lg mb-8 leading-relaxed">
          Facility Operations and Resource Governance Engine — a multimodal lab equipment management system built for touch-inefficient environments.
        </p>
        <button
          onClick={() => navigate('/signin')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-3.5 rounded-xl transition-all active:scale-95 text-sm"
        >
          Enter Lab Portal <ArrowRight size={16} />
        </button>
      </section>

      {/* Features */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <h2 className="text-center text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-8">Platform Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                <Icon size={18} className="text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow steps */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <h2 className="text-center text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-8">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STEPS.map(({ n, label, desc }) => (
            <div key={n} className="flex flex-col items-center text-center p-4">
              <span className="text-3xl font-black text-orange-500/30 mb-2">{n}</span>
              <span className="text-sm font-semibold text-white mb-1">{label}</span>
              <span className="text-xs text-zinc-500 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800/50 py-6 text-center text-xs text-zinc-600">
        FORGE © 2026 · Technological Institute of the Philippines - Manila
      </footer>
    </div>
  );
};

export default LandingPage;
