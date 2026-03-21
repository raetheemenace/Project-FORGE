import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, LogOut, FlaskConical, ChevronLeft, 
  Mic, Volume2, ArrowRight, AlertCircle 
} from 'lucide-react';

// We use ../../ because we are inside src/pages/borrow/
import chemGif from '../../assets/chem.gif';
import phyGif from '../../assets/phy.gif';
import engGif from '../../assets/eng.gif';

const BorrowStep1 = () => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#001254] font-sans relative overflow-hidden">
      
      {/* --- DYNAMIC BACKGROUND ELEMENTS --- */}
      
      {/* 1. Animated Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#22B8CF]/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#001254]/5 rounded-full blur-[100px] animate-bounce duration-[15s] pointer-events-none"></div>

      {/* 2. Technical Lab Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(#001254 1px, transparent 1px), linear-gradient(90deg, #001254 1px, transparent 1px)`,
             backgroundSize: '40px 40px' 
           }}>
      </div>
    
      
      {/* --- CONTENT LAYER --- */}
      <nav className="bg-white/80 backdrop-blur-md px-10 py-5 flex justify-between items-center shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center space-x-5">
          <div className="bg-[#22B8CF] p-2.5 rounded-xl shadow-lg shadow-[#22B8CF]/20">
            <FlaskConical size={26} className="text-white" />
          </div>
          <div className="border-l border-gray-200 pl-5">
            <h1 className="text-2xl font-black tracking-tighter leading-none text-[#001254]">FORGE</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#22B8CF] font-bold mt-1">Borrowing Process</p>
          </div>
        </div>

        <div className="flex items-center space-x-10">
          <div className="flex items-center space-x-6 text-sm font-bold uppercase tracking-widest">
            <button onClick={() => navigate('/dashboard')} className="text-[#22B8CF] flex items-center gap-2 hover:scale-105 transition-all">
              <Home size={18} /> Home
            </button>
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 flex items-center gap-2 hover:text-[#001254] transition-all">
              <ChevronLeft size={18} /> Back
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 border border-red-100">
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto p-12 text-center space-y-12 relative z-10">
        <div className="space-y-4">
          <div className="flex justify-center gap-2 mb-4">
              <div className="w-8 h-2 rounded-full bg-[#22B8CF] shadow-[0_0_10px_#22B8CF]"></div>
              <div className="w-8 h-2 rounded-full bg-gray-200"></div>
              <div className="w-8 h-2 rounded-full bg-gray-200"></div>
              <div className="w-8 h-2 rounded-full bg-gray-200"></div>
          </div>
          <h2 className="text-6xl font-black tracking-tight text-[#001254]">Select Department Stockroom</h2>
          <p className="text-gray-500 text-xl font-medium tracking-wide">Choose the department you'd like to borrow from.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <DepartmentCard 
            title="Chemistry" 
            desc="Glassware, reagents & lab supplies" 
            icon={<img src={chemGif} alt="Chem" className="w-20 h-20 object-contain text-black" />}
            variant="pastel-cyan"
            onClick={() => navigate('/borrow-step-2')}
          />
          <DepartmentCard 
            title="Physics" 
            desc="Instruments, sensors & tools" 
            icon={<img src={phyGif} alt="Phy" className="w-20 h-20 object-contain" />}
            variant="pastel-yellow"
            onClick={() => navigate('/borrow-step-2')}
          />
          <DepartmentCard 
            title="Engineering" 
            desc="Power tools, components & fabrication" 
            icon={<img src={engGif} alt="Eng" className="w-20 h-20 object-contain" />}
            variant="pastel-pink"
            onClick={() => navigate('/borrow-step-2')}
          />
        </div>

        <div className="flex justify-center items-center gap-6 mt-16">
          <div className="flex items-center gap-3 px-6 py-3 bg-white/50 backdrop-blur-sm text-emerald-700 border border-emerald-100 rounded-2xl font-bold text-sm shadow-sm">
            <Volume2 size={18} /> Voice Feedback Active
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-white/50 backdrop-blur-sm text-amber-700 border border-amber-100 rounded-2xl font-bold text-sm shadow-sm">
            <Mic size={18} /> Voice Input Available
          </div>
        </div>
      </main>

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-2xl font-black mb-2">Logout?</h3>
            <p className="text-gray-500 mb-8">Are you sure you want to end your borrowing session?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/')} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors">Yes, Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for the slow spin animation */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

const DepartmentCard = ({ title, desc, icon, variant, onClick }) => {
  const styles = {
    'pastel-cyan': 'bg-white hover:bg-white text-[#006064]',
    'pastel-yellow': 'bg-white hover:bg-white text-[#854D0E]',
    'pastel-pink': 'bg-white hover:bg-whitetext-[#9D174D]'
  };

  return (
    <div 
      onClick={onClick}
      className={`group p-10 backdrop-blur-md rounded-[3.5rem] transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-3 flex flex-col items-center text-center border border-white/50 ${styles[variant]}`}
    >
      <div className="mb-8 w-24 h-24 flex items-center justify-center transition-all duration-500 group-hover:scale-110">
        {icon}
      </div>
      
      <h3 className="text-3xl font-black mb-4 tracking-tight">{title}</h3>
      <p className="text-base font-medium opacity-70 leading-relaxed mb-6 px-4">{desc}</p>
      
      <div className="w-12 h-12 bg-gray-50/50 group-hover:bg-white rounded-full flex items-center justify-center transition-colors">
        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default BorrowStep1;