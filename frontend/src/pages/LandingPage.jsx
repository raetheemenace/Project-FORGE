import React, { useState } from 'react';
import WebHeader from '../components/layout/WebHeader'; 
import labVideo from '../assets/lab.mp4';
import contactVideo from '../assets/contact.mp4'; 
import raeImg from '../assets/rae.jpg';
import kateImg from '../assets/kate.jpg';
import zoeImg from '../assets/zoe.jpg';
import SignIn from './SignIn';
import SignUp from './SignUp';

const LandingPage = () => {
  // --- STATE FOR MODALS ---
  const [authMode, setAuthMode] = useState(null); // 'signin', 'signup', or null

  // Common style for the feature cards
  const cardStyle = "bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-200 cursor-default text-left";

  return (
    <div className={`min-h-screen bg-[#F8F9FA] font-['Inter'] scroll-smooth ${authMode ? 'overflow-hidden' : ''}`}>
      
      {/* Passing state setters to Header if it has Sign In/Up buttons */}
      <WebHeader 
        onSignInClick={() => setAuthMode('signin')} 
        onSignUpClick={() => setAuthMode('signup')} 
      /> 

      {/* --- HERO SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 flex flex-col md:flex-row items-center gap-12">     
        <div className="flex-1 text-left order-2 md:order-1">
          <h1 className="text-5xl md:text-6xl font-black text-[#001254] leading-tight mb-6">
            Student Lab & <span className="text-[#22b8cf]">Resource Management</span> System
          </h1>
          <p className="max-w-xl text-lg text-gray-500 mb-10 font-medium leading-relaxed">
            Streamline equipment borrowing, track resources in real-time, and manage lab operations with our AI-powered platform.
          </p>

          <button 
            onClick={() => setAuthMode('signin')}
            className="bg-[#22b8cf] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#1da1b5] transition-all shadow-lg active:scale-95 flex items-center gap-2 uppercase"
          >
            Enter Lab Portal
          </button>
        </div>

        {/* RIGHT SIDE: Video */}
        <div className="flex-[1.5] w-full order-1 md:order-2">
          <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-auto block object-cover"
            >
              <source src={labVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </main>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-[#001254] mb-4 tracking-tighter">
              Engineered for Efficiency
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-medium text-lg">
              A comprehensive suite of tools designed to transform how students interact with lab resources
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={cardStyle}>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-200">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-[#001254] mb-3">Live Resource Dashboard</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Real-time visibility of all lab equipment and resources across departments.</p>
            </div>

            <div className={cardStyle}>
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-purple-200">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-[#001254] mb-3">AI-Powered Scanner</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Intelligent equipment recognition with AR bounding boxes for quick identification.</p>
            </div>

            <div className={cardStyle}>
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-rose-200">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-bold text-[#001254] mb-3">Transaction Management</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Track active borrows, initiate returns, and manage your equipment lifecycle.</p>
            </div>

            <div className={cardStyle}>
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-amber-200">
                <span className="text-3xl">🛠️</span>
              </div>
              <h3 className="text-xl font-bold text-[#001254] mb-3">QR Maintenance Reports</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Scan equipment QR codes to instantly report issues and request maintenance.</p>
            </div>

            <div className={cardStyle}>
              <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-teal-200">
                <span className="text-3xl">🎙️</span>
              </div>
              <h3 className="text-xl font-bold text-[#001254] mb-3">Multimodal Interaction</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Voice commands and text-to-speech support throughout the borrowing workflow.</p>
            </div>

            <div className={cardStyle}>
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-[#001254] mb-3">Admin Clearance System</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Secure return process with lab admin verification and ID claim confirmation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- WORKFLOW SECTION --- */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black text-[#001254] mb-4 tracking-tighter">Seamless Workflow</h2>
          <p className="text-gray-500 mb-16 font-medium">From borrowing to return, every step is optimized for speed and accuracy</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="group flex flex-col items-center">
              <div className="bg-[#EBF5FF] w-full aspect-square rounded-3xl flex flex-col justify-center items-start p-8 border-2 border-[#D1E9FF] transition-all duration-300 hover:-translate-y-3 hover:shadow-xl hover:bg-white cursor-default">
                <span className="text-5xl font-black text-blue-200 mb-4 group-hover:text-blue-400 transition-colors">01</span>
                <h4 className="text-xl font-bold text-[#001254] mb-2">Sign In</h4>
                <p className="text-gray-600 text-sm text-left leading-relaxed">Quick authentication with student credentials</p>
              </div>
            </div>

            <div className="group flex flex-col items-center">
              <div className="bg-[#F3F0FF] w-full aspect-square rounded-3xl flex flex-col justify-center items-start p-8 border-2 border-[#E5DEFF] transition-all duration-300 hover:-translate-y-3 hover:shadow-xl hover:bg-white cursor-default">
                <span className="text-5xl font-black text-purple-200 mb-4 group-hover:text-purple-400 transition-colors">02</span>
                <h4 className="text-xl font-bold text-[#001254] mb-2">Browse & Select</h4>
                <p className="text-gray-600 text-sm text-left leading-relaxed">View available resources in real-time</p>
              </div>
            </div>

            <div className="group flex flex-col items-center">
              <div className="bg-[#FFF0F6] w-full aspect-square rounded-3xl flex flex-col justify-center items-start p-8 border-2 border-[#FFDEEB] transition-all duration-300 hover:-translate-y-3 hover:shadow-xl hover:bg-white cursor-default">
                <span className="text-5xl font-black text-rose-200 mb-4 group-hover:text-rose-400 transition-colors">03</span>
                <h4 className="text-xl font-bold text-[#001254] mb-2">AI Scan</h4>
                <p className="text-gray-600 text-sm text-left leading-relaxed">Scan equipment with AR verification</p>
              </div>
            </div>

            <div className="group flex flex-col items-center">
              <div className="bg-[#E6FFFA] w-full aspect-square rounded-3xl flex flex-col justify-center items-start p-8 border-2 border-[#B2F5EA] transition-all duration-300 hover:-translate-y-3 hover:shadow-xl hover:bg-white cursor-default">
                <span className="text-5xl font-black text-teal-200 mb-4 group-hover:text-teal-400 transition-colors">04</span>
                <h4 className="text-xl font-bold text-[#001254] mb-2">Track & Return</h4>
                <p className="text-gray-600 text-sm text-left leading-relaxed">Manage active transactions seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION: READY TO GET STARTED --- */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-7">
          <div className="bg-gradient-to-r from-[#00278A] to-[#22B8CF] rounded-3xl p-10 md:p-14 text-center shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">
              Ready to Get Started?
            </h2>
            <p className="text-blue-50 text-base md:text-lg mb-8 max-w-xl mx-auto relative z-10 opacity-90">
              Join students already using FORGE to manage their lab resources efficiently.
            </p>
            <div className="relative z-10">
              <button 
                onClick={() => setAuthMode('signup')}
                className="bg-white text-[#00278A] px-7 py-3 rounded-xl font-bold text-base hover:bg-gray-50 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                Launch Application <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      

      {/* --- TEAM SECTION --- */}
      <section className="py-24 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-[#001254] mb-2 tracking-tight">Who is Behind the Magic?</h2>
          <p className="text-gray-500 mb-16 font-medium">Our team</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <div className="aspect-[4/5] bg-gray-200">
                <img src={raeImg} alt="John Raven" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <div className="p-6 text-left">
                <h4 className="text-xl font-bold text-[#001254]">John Raven S. Unera</h4>
                <p className="text-gray-500 font-medium">Full Stack Developer</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <div className="aspect-[4/5] bg-blue-50 flex items-center justify-center">
                  <img src={kateImg} alt="Kate Adonis" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <div className="p-6 text-left">
                <h4 className="text-xl font-bold text-[#001254]">Kate Russel E. Adonis</h4>
                <p className="text-gray-500 font-medium">Back End Developer</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <div className="aspect-[4/5] bg-gray-200">
                <img src={zoeImg} alt="Zoe Felicia" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <div className="p-6 text-left">
                <h4 className="text-xl font-bold text-[#001254]">Zoe Felicia L. Valdez</h4>
                <p className="text-gray-500 font-medium">Front-End Developer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg viewBox="0 0 1440 320" className="absolute bottom-0 w-full">
            <path fill="#22b8cf" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-[#001254] mb-4">Have Some Questions?</h2>
            <div className="flex items-center justify-center gap-4 text-gray-500 font-medium text-sm">
              <span className="flex items-center gap-1">🌐 PHILIPPINES</span>
              <span className="text-gray-300">|</span>
              <span className="text-[#22b8cf]">FORGE </span>
              <span> : </span> <span> Student Lab & Resource Management System</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 flex justify-center">
              {/* VIDEO CONTAINER: Borders removed, shadow and rounding kept clean */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[2rem] overflow-hidden shadow-2xl bg-gray-50">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                >
                  <source src={contactVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Subtle soft glow instead of a hard border */}
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_0_40px_rgba(0,0,0,0.1)] pointer-events-none"></div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" className="p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22b8cf] transition-all" />
                <input type="text" placeholder="Last Name" className="p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22b8cf] transition-all" />
              </div>
              <input type="email" placeholder="Email" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22b8cf] transition-all" />
              <textarea placeholder="Your questions..." rows="4" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22b8cf] transition-all resize-none"></textarea>
              
              <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-[#22b8cf] text-white font-bold rounded-xl shadow-lg hover:shadow-[#22b8cf]/20 hover:-translate-y-1 transition-all uppercase tracking-widest active:scale-95">
                Send Message
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- AUTH MODALS --- */}
      <SignIn
        isOpen={authMode === 'signin'} 
        onClose={() => setAuthMode(null)} 
        onSwitch={() => setAuthMode('signup')} 
      />
      <SignUp
        isOpen={authMode === 'signup'} 
        onClose={() => setAuthMode(null)} 
        onSwitch={() => setAuthMode('signin')} 
      />
    </div>
  );
};

export default LandingPage;