import React from 'react';

// Added props: onSignInClick and onSignUpClick
const WebHeader = ({ onSignInClick, onSignUpClick }) => {
  // Updated linkStyle to use the cyan color #22B8CF
  const linkStyle = "text-[#22B8CF] hover:text-[#1da1b5] transition-colors duration-200 cursor-pointer font-bold uppercase tracking-wide text-sm";

  return (
    // Background changed to white, text to the dark blue for the logo
    <header className="w-full bg-white text-[#001254] border-b border-gray-100 shadow-sm font-['Inter'] sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo remains the dark blue for contrast on white */}
        <a href="#" className="text-2xl font-black tracking-tighter italic">
          FORGE.
        </a>

        <div className="flex items-center gap-x-8">
          <div className="hidden md:flex items-center gap-x-8">
            <a href="#" className={linkStyle}>Home</a>
            <a href="#about" className={linkStyle}>About</a>
            <a href="#contact" className={linkStyle}>Contact</a>
          </div>
          
          <span className="h-4 w-px bg-gray-200" aria-hidden="true" />

          <div className="flex items-center gap-x-6">
            {/* Changed from NavLink to button to trigger modal state */}
            <button 
              onClick={onSignInClick} 
              className={linkStyle}
            >
              Sign In
            </button>
            
            <button 
              onClick={onSignUpClick} 
              className="bg-[#22B8CF] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#1da1b5] transition-all shadow-md active:scale-95 uppercase text-sm tracking-wide"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default WebHeader;