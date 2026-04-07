import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';
import { useAppStore } from '../store/useAppStore';
import { AnnouncementPopup } from './AnnouncementPopup';
import { useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function Layout() {
  const location = useLocation();
  const { notifications, markNotificationAsRead, fetchNotifications } = useAppStore();

  // Polling for notifications every 60s while the app is active
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadAnnouncement = notifications.find(n => n.type === 'announcement' && !n.isRead);

  // Play sound when a NEW announcement arrives
  useEffect(() => {
    if (unreadAnnouncement) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio autoplay blocked or failed:', e));
    }
  }, [unreadAnnouncement?.id]);

  const navItems = [
    { icon: 'home', label: 'Início', path: '/' },
    { icon: 'redeem', label: 'Produtos', path: '/rewards' },
    { icon: 'receipt_long', label: 'Extrato', path: '/history' },
    { icon: 'person', label: 'Perfil', path: '/profile' },
  ];

  return (
    <div className="h-[100dvh] bg-surface-container-lowest flex justify-center overflow-hidden">
      {/* Mobile App Container */}
      <div className="w-full max-w-md bg-surface-container-lowest h-full relative shadow-2xl overflow-hidden flex flex-col">
        
        {/* Main Content Area */}
        <main className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden pb-32 custom-scrollbar relative">
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

        {unreadAnnouncement && (
          <AnnouncementPopup 
            notification={unreadAnnouncement} 
            onRead={markNotificationAsRead} 
          />
        )}

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-center px-4 pb-8 pt-3 pb-safe bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-50 shadow-nav border-t border-outline-variant/10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300 relative py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl",
                  isActive 
                    ? "text-on-surface" 
                    : "text-stone-400 hover:text-primary"
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
