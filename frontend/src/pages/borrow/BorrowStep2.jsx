import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, LogOut, FlaskConical, ChevronLeft, 
  Calendar, Clock, BookOpen, MapPin, User,
  ArrowRight, AlertCircle 
} from 'lucide-react';

const BorrowStep2 = () => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    course: '', timeSlot: '', date: '', labRoom: '', instructor: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#001254] font-sans relative overflow-hidden">
      
      {/* --- DYNAMIC BACKGROUND ELEMENTS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#22B8CF]/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#001254]/5 rounded-full blur-[100px] animate-bounce duration-[15s] pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(#001254 1px, transparent 1px), linear-gradient(90deg, #001254 1px, transparent 1px)`,
             backgroundSize: '40px 40px' 
           }}>
      </div>
      {/* --- NAVIGATION --- */}
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
            <button onClick={() => navigate('/borrow-step-1')} className="text-gray-400 flex items-center gap-2 hover:text-[#001254] transition-all">
              <ChevronLeft size={18} /> Back
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 transition-all border border-red-100">
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-12 space-y-10 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 mb-8">
             <div className="w-10 h-1.5 rounded-full bg-[#22B8CF]/20"></div>
             <div className="w-10 h-1.5 rounded-full bg-[#22B8CF] shadow-[0_0_10px_#22B8CF]"></div>
             <div className="w-10 h-1.5 rounded-full bg-gray-200"></div>
             <div className="w-10 h-1.5 rounded-full bg-gray-200"></div>
          </div>
          <h2 className="text-6xl font-black tracking-tight text-[#001254]">Borrowing Details</h2>
          <p className="text-gray-500 text-xl font-medium tracking-wide">Fill in the logistics for your borrowing session</p>
        </div>

        {/* --- FORM CARD --- */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-[3.5rem] p-16 shadow-[0_32px_64px_-15px_rgba(0,18,84,0.12)] border border-white/50">
          <form className="space-y-12" onSubmit={(e) => { e.preventDefault(); navigate('/borrow-step-3'); }}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
              
              {/* Course Code - Sky Blue */}
              <FormField 
                label="Course Code" 
                icon={<BookOpen size={18}/>} 
                name="course" 
                placeholder="e.g. CHM 001A" 
                onChange={handleInputChange}
                color="text-[#0EA5E9]"
              />

              {/* Time Slot - Amber */}
              <div className="group space-y-4">
                <label className="flex items-center gap-3 text-xs font-black text-[#F59E0B] uppercase tracking-[0.2em] ml-2">
                  <Clock size={18} /> Time Slot
                </label>
                <select 
                  name="timeSlot"
                  onChange={handleInputChange}
                  className="w-full px-0 py-4 bg-transparent border-b-2 border-gray-100 focus:border-[#F59E0B] outline-none transition-all text-xl font-bold text-[#001254] cursor-pointer appearance-none"
                  required
                >
                  <option value="">Select Time</option>
                  <option>07:00 AM - 09:00 AM</option>
                  <option>09:00 AM - 11:00 AM</option>
                  <option>01:00 PM - 03:00 PM</option>
                </select>
              </div>

              {/* Date - Violet */}
              <FormField 
                label="Date" 
                icon={<Calendar size={18}/>} 
                name="date" 
                type="date" 
                onChange={handleInputChange} 
                color="text-[#A78BFA]"
              />

              {/* Lab Room - Emerald */}
              <FormField 
                label="Lab Room ID" 
                icon={<MapPin size={18}/>} 
                name="labRoom" 
                placeholder="e.g. C112" 
                onChange={handleInputChange} 
                color="text-[#10B981]"
              />
            </div>

            {/* Adviser - Rose */}
            <div className="pt-4">
              <FormField 
                label="Adviser / Instructor" 
                icon={<User size={18}/>} 
                name="instructor" 
                placeholder="e.g. Engr. Raffy Garcia" 
                onChange={handleInputChange} 
                color="text-[#F43F5E]"
              />
            </div>

            <button 
              type="submit"
              className="w-full mt-8 bg-[#001254] text-white py-6 rounded-3xl font-black text-2xl flex items-center justify-center gap-4 hover:bg-[#22B8CF] hover:scale-[1.01] active:scale-[0.99] transition-all duration-500 shadow-2xl shadow-[#001254]/20 group"
            >
              Continue to the Scanner
              <ArrowRight className="group-hover:translate-x-3 transition-transform duration-500" />
            </button>
          </form>
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
            <p className="text-gray-500 mb-8">Exit borrowing session?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/')} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors">Yes, Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}</style>
    </div>
  );
};

// HELPER COMPONENT
const FormField = ({ label, icon, name, placeholder, type = "text", onChange, color }) => (
  <div className="group space-y-4">
    <label className={`flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] ml-2 transition-colors ${color}`}>
      {icon} {label}
    </label>
    <input 
      type={type}
      name={name}
      placeholder={placeholder}
      onChange={onChange}
      className="w-full px-0 py-4 bg-transparent border-b-2 border-gray-100 focus:border-current outline-none transition-all text-xl font-bold text-[#001254] placeholder:text-gray-300 placeholder:font-normal"
      required
    />
  </div>
);

export default BorrowStep2;