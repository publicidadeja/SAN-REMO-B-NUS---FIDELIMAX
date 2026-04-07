import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false
}: ConfirmModalProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertTriangle className="text-error" size={32} />;
      case 'success': return <CheckCircle2 className="text-green-500" size={32} />;
      default: return <Info className="text-primary" size={32} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger': return 'bg-error text-on-error shadow-error/20';
      case 'success': return 'bg-green-500 text-white shadow-green-500/20';
      default: return 'bg-primary text-on-primary shadow-primary/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl overflow-hidden text-center"
          >
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              type === 'danger' ? 'bg-error/10' : 
              type === 'success' ? 'bg-green-50' : 
              'bg-primary/10'
            }`}>
              {getIcon()}
            </div>

            <h3 className="text-xl font-black text-on-surface mb-3 tracking-tight">
              {title}
            </h3>
            
            <div className="text-secondary text-sm leading-relaxed mb-8 px-2 font-medium">
              {message}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  onConfirm();
                }}
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 ${getButtonClass()}`}
              >
                {isLoading ? 'Aguarde...' : confirmText}
              </button>
              
              <button
                onClick={onClose}
                disabled={isLoading}
                className="w-full py-4 bg-surface-container-low text-secondary font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
