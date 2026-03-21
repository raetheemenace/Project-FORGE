import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SignIn = ({ isOpen, onClose, onSwitch }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', studentId: '' });
  const [error, setError] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSwitch = () => {
    setIsExiting(true);
    setTimeout(() => {
      onSwitch();
      setIsExiting(false);
    }, 300);
  };

  if (!isOpen) return null;

  const handleSignIn = () => {
    if (!formData.name.trim() || !formData.studentId.trim()) {
      setError("Please fill in all fields to sign in.");
      return;
    }
    if (!/^\d+$/.test(formData.studentId)) {
      setError("Student ID must be numeric.");
      return;
    }
    setError('');
    navigate('/dashboard');
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 transform 
        ${isExiting ? 'opacity-0 scale-95 translate-y-4' : 'animate-in fade-in slide-in-from-bottom-10 duration-500'}`}>
        
        {/* HEADER: Updated to White background with Navy text */}
        <div className="bg-white py-10 text-center relative border-b border-gray-100">
          <button onClick={onClose} className="absolute top-4 right-6 text-gray-300 hover:text-[#001254] text-2xl transition-colors">&times;</button>
          <h1 className="text-4xl font-black text-[#001254] tracking-widest">FORGE</h1>
          <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">Lab & Resource Management</p>
        </div>

        <div className="flex border-b">
          <button className="flex-1 py-4 text-[#22B8CF] font-bold border-b-4 border-[#22B8CF] bg-cyan-50/30">Sign In</button>
          <button onClick={handleSwitch} className="flex-1 py-4 text-gray-400 font-medium hover:text-[#22B8CF] transition-colors">Sign Up</button>
        </div>

        <div className="p-10 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 animate-in fade-in zoom-in duration-300">
                {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 fill-mode-both">
              <label className="block text-[#001254] text-sm font-bold mb-2 ml-1">Full Name</label>
              <input 
                type="text" 
                placeholder="Juan Dela Cruz" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#22B8CF] outline-none transition-all placeholder:opacity-30" 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200 fill-mode-both">
              <label className="block text-[#001254] text-sm font-bold mb-2 ml-1">Student ID</label>
              <input 
                type="text" 
                placeholder="20265543" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#22B8CF] outline-none transition-all placeholder:opacity-30" 
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              />
            </div>
          </div>

          <button onClick={handleSignIn} className="w-full py-4 bg-white text-[#22B8CF] border-2 border-[#22B8CF] font-bold rounded-2xl 
               hover:bg-[#22B8CF] hover:text-white hover:shadow-[#22B8CF]/30 
               transition-all duration-300 shadow-sm active:scale-[0.95] mt-2 group animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-both"
          >
            <span className="group-hover:tracking-widest transition-all duration-300">Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;