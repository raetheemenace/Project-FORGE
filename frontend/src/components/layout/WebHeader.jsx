import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { signOut } from '../../services/authService.js';

const WebHeader = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/signin');
  };

  return (
    <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#0a0f1e] border-b border-zinc-800">
      <button
        onClick={() => navigate('/dashboard')}
        className="text-xl font-black tracking-tighter text-orange-500 uppercase italic"
      >
        FORGE
      </button>
      <nav className="flex items-center gap-6 text-sm text-zinc-400">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 hover:text-white transition-colors">
          <LayoutDashboard size={15} /> Dashboard
        </button>
        <button onClick={() => navigate('/transactions')} className="hover:text-white transition-colors">
          My Transactions
        </button>
        <button onClick={() => navigate('/maintenance')} className="hover:text-white transition-colors">
          Report Issue
        </button>
        {user?.role === 'LAB_ADMIN' && (
          <button onClick={() => navigate('/admin')} className="text-orange-400 hover:text-orange-300 transition-colors font-medium">
            Admin Portal
          </button>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">{user?.fullName}</span>
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default WebHeader;
