import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../assets/logo_landingpage.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#EFEFE9] overflow-auto">
      {/* Blueprint grid overlay */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#001254 1px, transparent 1px), linear-gradient(90deg, #001254 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 md:py-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Logo with blueprint corners */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <img src={logo} alt="FORGE Logo" className="h-32 md:h-40 w-auto" />
              {/* Blueprint corner markers */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#0B4EA2]" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#0B4EA2]" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#0B4EA2]" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#0B4EA2]" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="text-xl md:text-2xl text-[#0B4EA2] mb-6 font-medium">
              Student Lab & Resource Management System
            </p>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-base md:text-lg text-[#001254]/70 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Streamline equipment borrowing, track resources in real-time, and manage lab operations
            with our AI-powered multimodal platform designed for modern student laboratories.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center gap-3 bg-[#001254] text-white px-8 md:px-12 py-4 md:py-5 rounded-lg hover:bg-[#0B4EA2] transition-all duration-300 text-base md:text-lg font-medium shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Enter Lab Portal</span>
              <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/signin"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#0B4EA2]/30 text-[#001254] px-8 md:px-12 py-4 md:py-5 rounded-lg hover:border-[#0B4EA2] hover:bg-white/50 transition-all duration-300 text-base md:text-lg font-medium"
            >
              <span>Sign In</span>
            </Link>
          </motion.div>

          {/* Technical badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#0B4EA2]/30 rounded-full bg-white/50"
          >
            <svg className="w-4 h-4 text-[#0B4EA2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm text-[#001254]/80">HCI 2 Project • Multimodal Interaction Design</span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ 
            opacity: { delay: 1.2, duration: 0.6 },
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-[#0B4EA2]/50 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-[#0B4EA2] rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-[#001254] mb-4">Engineered for Efficiency</h2>
            <p className="text-base md:text-lg text-[#001254]/70 max-w-2xl mx-auto">
              A comprehensive suite of tools designed to transform how students interact with lab resources
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                ),
                title: "Live Resource Dashboard",
                description: "Real-time visibility of all lab equipment and resources across departments"
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: "AI-Powered Scanner",
                description: "Intelligent equipment recognition with AR bounding boxes for quick identification"
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
                title: "Transaction Management",
                description: "Track active borrows, initiate returns, and manage your equipment lifecycle"
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                ),
                title: "QR Maintenance Reports",
                description: "Scan equipment QR codes to instantly report issues and request maintenance"
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ),
                title: "Multimodal Interaction",
                description: "Voice commands and text-to-speech support throughout the borrowing workflow"
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Admin Clearance System",
                description: "Secure return process with lab admin verification and ID claim confirmation"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white/50 backdrop-blur-sm border border-[#0B4EA2]/20 rounded-lg p-6 md:p-8 hover:border-[#0B4EA2]/40 transition-all duration-300 hover:shadow-lg"
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0B4EA2] rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#0B4EA2] rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-[#001254] rounded-lg flex items-center justify-center group-hover:bg-[#0B4EA2] transition-colors">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-[#001254] mb-2">{feature.title}</h3>
                    <p className="text-sm md:text-base text-[#001254]/70 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="relative py-20 md:py-32 px-4 bg-[#F2F0DB]/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-[#001254] mb-4">Seamless Workflow</h2>
            <p className="text-base md:text-lg text-[#001254]/70 max-w-2xl mx-auto">
              From borrowing to return, every step is optimized for speed and accuracy
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Sign In", desc: "Quick authentication with student credentials" },
              { step: "02", title: "Browse & Select", desc: "View available resources in real-time" },
              { step: "03", title: "AI Scan", desc: "Scan equipment with AR verification" },
              { step: "04", title: "Track & Return", desc: "Manage active transactions seamlessly" }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                <div className="bg-white/70 backdrop-blur-sm border-2 border-[#0B4EA2]/30 rounded-lg p-6 h-full">
                  <div className="text-5xl font-bold text-[#0B4EA2]/20 mb-4">{item.step}</div>
                  <h3 className="text-xl font-bold text-[#001254] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#001254]/70">{item.desc}</p>
                </div>
                {/* Connector arrow for desktop */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <svg className="w-6 h-6 text-[#0B4EA2]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 md:py-32 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="bg-gradient-to-br from-[#001254] to-[#0B4EA2] rounded-2xl p-8 md:p-16 relative overflow-hidden">
            {/* Blueprint grid overlay on CTA */}
            <div 
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
                backgroundSize: '30px 30px'
              }}
            />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-base md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join students already using FORGE to manage their lab resources efficiently
              </p>
              <Link
                to="/signin"
                className="group inline-flex items-center gap-3 bg-white text-[#001254] px-8 md:px-12 py-4 md:py-5 rounded-lg hover:bg-[#EFEFE9] transition-all duration-300 text-base md:text-lg font-medium shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Launch Application</span>
                <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 border-t border-[#0B4EA2]/20">
        <div className="max-w-6xl mx-auto text-center text-sm text-[#001254]/60">
          <p>FORGE © 2026 • Student Lab & Resource Management System</p>
          <p className="mt-2">Developed for HCI 2 Course • Built with React & Multimodal Interaction</p>
        </div>
      </footer>
    </div>
  );
}
