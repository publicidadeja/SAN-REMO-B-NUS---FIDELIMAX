import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/useAppStore';
import { type AdminPermission, userHasAnyPermission } from '../../utils/permissions';

export function AdminLayout() {
  const location = useLocation();
  const { logout, user } = useAppStore();
  const canUseDashboard = userHasAnyPermission(user, 'dashboard');

  const navItems = ([
    { icon: 'dashboard', label: 'Início', path: '/admin', permissions: ['dashboard'] },
    { icon: 'payments', label: 'Pontos', path: '/admin/points', permissions: ['points', 'rewards', 'redeem_activations'] },
    { icon: 'amp_stories', label: 'Stories', path: '/admin/stories', permissions: ['stories'] },
    { icon: 'add_circle', label: 'Promoções', path: '/admin/activations', permissions: ['activations'] },
    ...(!canUseDashboard ? [{ icon: 'menu_book', label: 'Encarte', path: '/admin/pamphlets', permissions: ['pamphlets'] }] : []),
    { icon: 'group', label: 'Equipe', path: '/admin/collaborators', permissions: ['team'] },
  ] as Array<{ icon: string; label: string; path: string; permissions: AdminPermission[] }>)
    .filter((item) => userHasAnyPermission(user, item.permissions));

  return (
    <div className="h-[100dvh] bg-surface-container-lowest flex justify-center overflow-hidden">
      {/* Mobile App Container */}
      <div className="w-full max-w-md bg-surface-container-lowest h-full relative shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 pt-safe">
          <div className="flex justify-between items-center px-6 h-16">
            <h1 className="font-bold text-lg text-on-surface">Painel Admin</h1>
            <div className="flex items-center gap-4">
              {userHasAnyPermission(user, 'notifications') && (
                <Link to="/admin/notifications" className="material-symbols-outlined text-secondary hover:text-primary transition-colors">
                  notifications
                </Link>
              )}
              {userHasAnyPermission(user, 'settings') && (
                <Link to="/admin/settings" className="material-symbols-outlined text-secondary hover:text-primary transition-colors">
                  settings
                </Link>
              )}
              <button onClick={logout} className="material-symbols-outlined text-error hover:opacity-80 transition-opacity">
                logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden pb-32 custom-scrollbar relative px-6">
          <Outlet />

          {/* Development Signature */}
          <div className="py-12 flex flex-col items-center gap-2 opacity-30 select-none">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-stone-400">Personalizado por</p>
            <a 
              href="https://publicidadeja.com.br/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 group transition-all"
            >
              <span className="text-[11px] font-black tracking-tighter text-on-surface group-hover:text-primary transition-colors">PUBLICIDADE JÁ</span>
              <span className="material-symbols-outlined text-[12px] text-primary group-hover:translate-x-0.5 transition-transform">north_east</span>
            </a>
          </div>
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-center px-4 pb-8 pt-3 pb-safe bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-50 shadow-nav border-t border-outline-variant/10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300 flex-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl",
                  isActive ? "text-on-surface" : "text-stone-400 hover:text-primary"
                )}
              >
                <div className={cn(
                  "flex flex-col items-center justify-center transition-all duration-500",
                  isActive && "scale-110"
                )}>
                  <div className={cn(
                    "w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300 mb-1",
                    isActive ? "bg-primary shadow-lg shadow-primary/20" : "bg-transparent"
                  )}>
                    <span className={cn("material-symbols-outlined !text-[22px]", isActive && "filled text-on-primary")}>
                      {item.icon}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.15em] transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-60"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
