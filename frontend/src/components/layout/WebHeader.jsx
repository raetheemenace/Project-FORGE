import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

/**
 * WebHeader — sticky desktop nav bar.
 *
 * Props:
 *   logo      {string}   — img src for the FORGE logo
 *   user      {object}   — { fullName, program }
 *   onLogout  {function} — called when the logout button is clicked
 *   navItems  {array}    — [{ label, path, icon: LucideComponent, badge }]
 */
export default function WebHeader({ logo, user, onLogout, navItems = [] }) {
  const navigate = useNavigate();

  const displayName = user?.fullName || '—';
  const displayProgram = user?.program || '—';

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="FORGE" className="h-9 opacity-80" />}
            {navItems.length > 0 && (
              <div className="hidden md:block h-5 w-[1px] bg-[#001254]/20" />
            )}
          </div>

          {/* Nav links */}
          {navItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#001254]/60 hover:text-[#001254]/90 hover:bg-[#001254]/6 transition-colors"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {item.label}
                    {item.badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#0B4EA2] text-white rounded-full flex items-center justify-center" style={{ fontSize: '0.55rem' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* User info + logout */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block mr-1">
              <p className="text-[#001254]/90" style={{ fontSize: '0.8rem' }}>{displayName}</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.65rem' }}>{displayProgram}</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4 text-[#001254]/60" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
