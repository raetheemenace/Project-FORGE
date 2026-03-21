import React, { useState, useEffect } from 'react';

const SignUp = ({ isOpen, onClose, onSwitch }) => {
  const [formData, setFormData] = useState({ name: '', studentId: '', program: 'Information Technology' });
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

  const handleSignUp = () => {
    const { name, studentId } = formData;
    if (!name.trim() || !studentId.trim()) {
      setError("Please fill in all fields to join the FORGE.");
      return;
    }
    if (!/^\d+$/.test(studentId)) {
      setError("Student ID must contain only numbers.");
      return;
    }
    setError('');
    handleSwitch();
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
          <button onClick={handleSwitch} className="flex-1 py-4 text-gray-400 font-medium hover:text-[#22B8CF] transition-colors">Sign In</button>
          <button className="flex-1 py-4 text-[#22B8CF] font-bold border-b-4 border-[#22B8CF] bg-cyan-50/30">Sign Up</button>
        </div>

        <div className="p-10 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 animate-in fade-in zoom-in duration-300">
                {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 fill-mode-both">
              <label className="block text-[#001254] text-sm font-bold mb-2 ml-1">Full Name</label>
              <input type="text" placeholder="Juan Dela Cruz" className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#22B8CF] outline-none transition-all placeholder:opacity-30" onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200 fill-mode-both">
              <label className="block text-[#001254] text-sm font-bold mb-2 ml-1">Student ID</label>
              <input type="text" placeholder="20265543" className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#22B8CF] outline-none transition-all placeholder:opacity-30" onChange={(e) => setFormData({...formData, studentId: e.target.value})} />
            </div>

            <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-both">
              <label className="block text-[#001254] text-sm font-bold mb-2 ml-1">Program</label>
              <select className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#22B8CF] outline-none transition-all appearance-none text-gray-500 cursor-pointer" onChange={(e) => setFormData({...formData, program: e.target.value})}>
                <option>Information Technology</option>
                <option>Computer Science</option>
                <option>Civil Engineering</option>
                <option>Architecture</option>
                <option>Information Systems</option>
                <option>Data Science and Analytics</option>
                <option>Mechanical Engineering</option>
                <option>Electrical Engineering</option>
                <option>Electronic Engineering</option>
                <option>Industrial Engineering</option>
                <option>Accountancy</option>
                <option>Computer Engineering</option>
                <option>Business Administration</option>
                <option>Chemical Engineering</option>
              </select>
              <div className="absolute right-5 bottom-5 pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <button onClick={handleSignUp} className="w-full py-4 bg-white text-[#22B8CF] border-2 border-[#22B8CF] font-bold rounded-2xl hover:bg-[#22B8CF] hover:text-white transition-all duration-300 shadow-sm active:scale-[0.95] mt-2 group animate-in fade-in slide-in-from-bottom-2 duration-700 delay-[400ms] fill-mode-both">
            <span className="group-hover:tracking-widest transition-all duration-300">Join the FORGE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;