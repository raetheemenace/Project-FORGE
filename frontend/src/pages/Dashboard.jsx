import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Home, Box, Settings, 
  Clock, ArrowRight, Zap, FlaskConical, 
  ChevronRight, Activity, AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    navigate('/');
  };

  return (
    <div id="top" className="min-h-screen bg-[#F8FAFC] text-[#001254] font-sans selection:bg-[#22B8CF]/30">
      
      {/* 1. NAVIGATION */}
      <nav className="bg-white px-10 py-5 flex justify-between items-center shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center space-x-5">
          <div className="bg-[#22B8CF] p-2.5 rounded-xl shadow-lg shadow-[#22B8CF]/20">
            <FlaskConical size={26} className="text-white" />
          </div>
          <div className="border-l border-gray-200 pl-5">
            <h1 className="text-2xl font-black tracking-tighter leading-none text-[#001254]">FORGE</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#22B8CF] font-bold mt-1">Resource Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-10">
          <div className="hidden md:block text-right border-r border-gray-200 pr-10">
            <h2 className="text-sm font-bold tracking-wide text-black">Juan Dela Cruz</h2>
            <p className="text-[11px] text-gray-500 font-medium">BS Information Technology</p>
          </div>
          
          <div className="flex items-center space-x-6 text-sm font-bold uppercase tracking-widest">
            <button 
              onClick={scrollToTop}
              className="text-[#22B8CF] flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Home size={18} /> Home
            </button>

            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 border border-red-100 shadow-sm group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-2xl font-black mb-2">Wait a moment!</h3>
            <p className="text-gray-500 mb-8">Are you sure you want to logout? Any unsaved progress in your session might be lost.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors">Yes, Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-8 space-y-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 animate-in fade-in slide-in-from-top-6 duration-700">
          <div>
            <h1 className="text-5xl font-extralight tracking-tight text-black">
              Hello, <span className="font-black text-[#001254] border-b-4 border-[#22B8CF]/30">Juan</span>
            </h1>
            <p className="text-gray-500 font-medium mt-3 text-lg italic">"Forging the future, one resource at a time."</p>
          </div>
          <div className="bg-white px-8 py-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="bg-[#22B8CF]/10 p-2 rounded-full">
              <Clock className="text-[#22B8CF]" size={22} />
            </div>
            <span className="font-mono text-2xl font-black tracking-wider text-black">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* 3. QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ActionCard 
            title="Borrow an Item" 
            desc="AI-powered inventory scanning" 
            icon={<Box size={32} />}
            variant="primary" 
            onClick={() => navigate('/borrow-step-1')} // Correctly connected
          />
          <ActionCard 
            title="My Transactions" 
            desc="Track returns and history" 
            icon={<Activity size={32} />}
            badge="2"
            variant="pastel-yellow" 
          />
          <ActionCard 
            title="Maintenance" 
            desc="Report equipment issues" 
            icon={<Settings size={32} />}
            variant="pastel-pink" 
          />
        </div>

        {/* ACTIVE SESSION STRIP */}
        <div className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:border-[#22B8CF]/30 transition-all duration-500 cursor-pointer overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#22B8CF]"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="bg-[#001254] p-4 rounded-2xl text-[#22B8CF] shadow-lg">
                <Zap size={28} fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-3 text-black">
                  <h3 className="text-xl font-black">Active Session</h3>
                  <span className="animate-pulse bg-emerald-500 w-2 h-2 rounded-full"></span>
                </div>
                <p className="text-gray-400 font-medium text-sm mt-1">
                  Chemistry Lab | <span className="text-[#001254]">TXN-20260305-001</span> | Room A-101
                </p>
              </div>
            </div>
            <button className="bg-gray-50 group-hover:bg-[#22B8CF] group-hover:text-white p-4 rounded-full transition-all duration-300">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* LAB & EQUIPMENT MONITORS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3 text-black">
                <span className="w-3 h-3 rounded-full bg-[#22B8CF] shadow-[0_0_10px_#22B8CF]"></span>
                Laboratory Status
              </h3>
            </div>
            <div className="space-y-4">
              <LabRow lab="Lab A-101" type="Chemistry" status="Available" />
              <LabRow lab="Lab A-102" type="Physics" status="Busy" user="Dr. Santos" />
            </div>
          </section>

          <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-3 mb-8 text-black">
              <Activity className="text-[#22B8CF]" size={24} />
              Live Equipment Feed
            </h3>
            <div className="space-y-8">
              <EquipRow name="3D Printer #1" loc="B-201" usage={85} time="12m" />
              <EquipRow name="Laser Cutter" loc="B-201" usage={40} time="1h 20m" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// UPDATED ACTION CARD COMPONENT (NOW WITH ONCLICK ATTACHED)
const ActionCard = ({ title, desc, icon, variant, badge, onClick }) => {
  const styles = {
    'primary': 'bg-[#001254] text-white',
    'pastel-yellow': 'bg-[#FEF9C3] text-[#854D0E] border-transparent shadow-yellow-100',
    'pastel-pink': 'bg-[#FCE7F3] text-[#9D174D] border-transparent shadow-pink-100',
    'default': 'bg-white border-2 border-gray-50 text-[#001254]'
  };

  const iconStyles = {
    'primary': 'bg-[#22B8CF] text-white shadow-[#22B8CF]/40',
    'pastel-yellow': 'bg-white text-[#EAB308] shadow-sm',
    'pastel-pink': 'bg-white text-[#EC4899] shadow-sm',
    'default': 'bg-gray-50 text-[#22B8CF]'
  };

  return (
    <div 
      onClick={onClick} // This makes the card clickable
      className={`group relative p-10 rounded-[3rem] transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2 ${styles[variant] || styles['default']}`}
    >
      {badge && (
        <div className="absolute top-8 right-8 bg-[#22B8CF] text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-white">
          {badge}
        </div>
      )}
      <div className={`mb-6 w-16 h-16 flex items-center justify-center rounded-3xl transition-transform group-hover:scale-110 duration-500 ${iconStyles[variant] || iconStyles['default']}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-2 tracking-tight">{title}</h3>
      <p className={`text-sm font-medium leading-relaxed opacity-70`}>{desc}</p>
      
      {/* Visual arrow indicator for hover feedback */}
      <div className="absolute bottom-8 right-10 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
        <ArrowRight size={20} />
      </div>
    </div>
  );
};

const LabRow = ({ lab, type, status, user }) => (
  <div className="flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
    <div className="flex items-center gap-4">
      <div className={`w-1.5 h-10 rounded-full ${status === 'Available' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
      <div>
        <h4 className="font-black text-sm text-black">{lab}</h4>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter">{type} Lab</p>
      </div>
    </div>
    <div className="text-right">
      <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border-2 ${
        status === 'Available' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-rose-100 text-rose-600 bg-rose-50'
      }`}>
        {status.toUpperCase()}
      </span>
      {user && <p className="text-[10px] font-bold text-[#22B8CF] mt-2">{user}</p>}
    </div>
  </div>
);

const EquipRow = ({ name, loc, usage, time, status }) => (
  <div className="group">
    <div className="flex justify-between items-end mb-3 text-black">
      <div>
        <h4 className="font-black text-sm group-hover:text-[#22B8CF] transition-colors">{name}</h4>
        <p className="text-[10px] text-gray-400 font-bold uppercase">{loc}</p>
      </div>
      {status ? (
        <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-lg uppercase tracking-widest">{status}</span>
      ) : (
        <span className="text-[10px] font-black text-[#22B8CF] bg-cyan-50 px-3 py-1 rounded-lg uppercase tracking-widest">{time}</span>
      )}
    </div>
    {!status && (
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#22B8CF] to-[#001254] transition-all duration-1000" style={{ width: `${usage}%` }}></div>
      </div>
    )}
  </div>
);

export default Dashboard;