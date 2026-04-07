import { motion, AnimatePresence } from 'motion/react';
import { Info, CheckCircle2, XCircle } from 'lucide-react';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function StatusModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info' 
}: StatusModalProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={32} />;
      case 'error': return <XCircle className="text-error" size={32} />;
      default: return <Info className="text-primary" size={32} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success': return 'bg-green-500 text-white shadow-green-500/20';
      case 'error': return 'bg-error text-on-error shadow-error/20';
      default: return 'bg-primary text-on-primary shadow-primary/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
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
              type === 'success' ? 'bg-green-50' : 
              type === 'error' ? 'bg-error/10' : 
              'bg-primary/10'
            }`}>
              {getIcon()}
            </div>

            <h3 className="text-xl font-black text-on-surface mb-3 tracking-tight">
              {title}
            </h3>
            
            <p className="text-secondary text-sm leading-relaxed mb-8 px-2 font-medium">
              {message}
            </p>

            <button
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${getButtonClass()}`}
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
