import { useAppStore } from '../store/useAppStore';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Crown, Info } from 'lucide-react';

export function Card() {
  const { user, balance } = useAppStore();

  if (!user || !balance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[80vh] px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">error_outline</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Não foi possível carregar o cartão</h2>
        <p className="text-secondary mb-6">Verifique sua conexão ou tente novamente mais tarde.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold shadow-md hover:opacity-90 transition-opacity"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-6 pt-safe pb-safe">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-on-surface mb-8 text-center"
      >
        Cartão Digital
      </motion.h2>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-gold rounded-[2rem] p-8 flex flex-col items-center relative overflow-hidden shadow-2xl shadow-sanremo-gold/20"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-sanremo-gold/20 rounded-full blur-3xl" />
        
        <Crown size={32} className="text-sanremo-gold mb-4 relative z-10" />
        
        <h3 className="text-xl font-semibold text-white mb-1 relative z-10">{user.name}</h3>
        <p className="text-sanremo-gold-light text-sm font-medium mb-8 relative z-10">Cliente {balance.currentLevel}</p>

        <div className="bg-white p-4 rounded-2xl shadow-inner relative z-10 mb-6">
          <QRCodeSVG 
            value={user.cpf} 
            size={200}
            bgColor={"#ffffff"}
            fgColor={"#0A192F"}
            level={"Q"}
            includeMargin={false}
          />
        </div>

          <p className="text-white tracking-[0.3em] font-mono relative z-10 text-lg bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm border border-white/10">
            {user.cpf}
          </p>
        </motion.div>
  
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 flex items-start gap-3 shadow-sm"
        >
          <Info size={20} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
            Apresente este QR Code no caixa de qualquer loja San Remo para acumular pontos ou resgatar seus prêmios.
          </p>
        </motion.div>
      </div>
  );
}
