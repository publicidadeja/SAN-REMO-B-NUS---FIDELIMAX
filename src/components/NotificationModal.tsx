import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'points' | 'reward' | 'info' | 'system' | 'announcement';
  isRead: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { notifications, fetchNotifications, markNotificationAsRead } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      console.log('[NotificationModal] Opening, fetching notifications...');
      fetchNotifications().then(() => {
        // Mark the latest as "seen" so it doesn't auto-popup again
        const currentNotifications = useAppStore.getState().notifications;
        if (currentNotifications.length > 0) {
          localStorage.setItem('@SanRemo:lastSeenNotificationId', currentNotifications[0].id);
        }
      });
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  console.log('[NotificationModal] State notifications:', notifications);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-surface-container-lowest z-[101] shadow-2xl flex flex-col pt-safe"
          >
            <header className="px-6 h-20 flex items-center justify-between border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Bell size={20} />
                </div>
                <h2 className="text-xl font-bold text-on-surface">Notificações</h2>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button 
                    onClick={() => useAppStore.getState().clearNotifications()}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3 py-2 rounded-full transition-colors"
                  >
                    Limpar Tudo
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center text-secondary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {Array.isArray(notifications) && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      notification.isRead 
                        ? 'bg-white border-outline-variant/10 opacity-70' 
                        : 'bg-primary/5 border-primary/10 shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${
                        notification.type === 'points' ? 'bg-amber-100 text-amber-600' :
                        notification.type === 'reward' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notification.type === 'points' ? <TrendingUp size={20} /> :
                         notification.type === 'reward' ? <ShoppingBag size={20} /> :
                         <Bell size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-on-surface text-sm">{notification.title}</h3>
                          {!notification.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-secondary leading-relaxed mb-2">
                          {notification.message}
                        </p>
                        
                        {notification.imageUrl && (
                          <div className="mt-3 w-full bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-outline-variant/5 text-on-primary">
                            <img 
                              src={notification.imageUrl} 
                              alt="Notification attachment" 
                              className="max-w-full max-h-[250px] w-auto h-auto object-contain rounded-lg" 
                            />
                          </div>
                        )}
                        
                        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                  <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center text-stone-300 mb-4">
                    <Bell size={32} />
                  </div>
                  <h3 className="font-bold text-on-surface mb-1">Tudo limpo por aqui!</h3>
                  <p className="text-sm text-secondary">Você não tem novas notificações no momento.</p>
                </div>
              )}
            </div>

            <footer className="p-6 border-t border-outline-variant/10">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-surface-container-low text-secondary font-bold rounded-xl hover:bg-surface-container transition-colors"
              >
                Entendido
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
