import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { AppNotification } from '../models/types';
import { cn } from '../utils/cn';

interface AnnouncementPopupProps {
  notification: AppNotification;
  onRead: (id: string) => void;
}

export function AnnouncementPopup({ notification, onRead }: AnnouncementPopupProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-outline-variant/10"
        >
          {notification.imageUrl && (
            <div className="w-full bg-stone-100 overflow-hidden border-b border-outline-variant/5 flex items-center justify-center p-2">
              <img 
                src={notification.imageUrl} 
                alt="Announcement" 
                className="max-w-full max-h-[300px] w-auto h-auto object-contain rounded-xl" 
              />
            </div>
          )}
          
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <h3 className="text-on-surface font-black text-xl tracking-tight leading-none">
                {notification.title}
              </h3>
            </div>
            
            <p className="text-secondary text-sm leading-relaxed mb-8 font-medium">
              {notification.message}
            </p>
            
            <button
              onClick={() => onRead(notification.id)}
              className="w-full bg-primary text-on-primary font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
            >
              Marcar como Lido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
