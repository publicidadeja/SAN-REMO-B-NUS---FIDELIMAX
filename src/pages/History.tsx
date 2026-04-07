import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { useState } from 'react';
import { NotificationModal } from '../components/NotificationModal';

export function History() {
  const { user, transactions, balance, isLoading, notifications } = useAppStore();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-primary-container border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[80vh] px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">error_outline</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Não foi possível carregar o histórico</h2>
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
    <div className="flex flex-col min-h-full bg-surface-container-lowest pt-safe">
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl pt-safe">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg text-on-surface truncate max-w-[180px]">{user?.name.split(' ')[0] || 'San Remo'}</h1>
          </div>
          <button 
            onClick={() => setIsNotificationModalOpen(true)}
            className="material-symbols-outlined text-primary hover:opacity-80 transition-opacity relative"
          >
            notifications
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>
        </div>
      </header>

      <NotificationModal 
        isOpen={isNotificationModalOpen} 
        onClose={() => setIsNotificationModalOpen(false)} 
      />

      <main className="pt-8 px-6 max-w-lg mx-auto w-full">
        {/* Header Section */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-secondary font-medium text-sm tracking-wide uppercase">Histórico de Atividades</span>
              <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Meu Histórico</h2>
            </motion.div>
            {/* Period Selector */}
            <motion.button 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full hover:bg-surface-container-high transition-colors group active-scale"
            >
              <span className="text-sm font-semibold text-on-surface-variant">Este Mês</span>
              <span className="material-symbols-outlined text-sm text-primary group-hover:rotate-180 transition-transform">expand_more</span>
            </motion.button>
          </div>

          {/* Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden bg-white rounded-xl shadow-premium p-8 border border-outline-variant/10"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col items-center">
              <p className="text-secondary font-medium mb-2">Saldo Acumulado</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-on-surface tracking-tighter">{balance.points.toLocaleString('pt-BR')}</span>
                <span className="text-xl font-bold text-primary">PTS</span>
              </div>
            </div>
            
            {/* Mini Stats Detail */}
            <div className="mt-6 pt-6 border-t border-surface-container-low flex justify-around">
              <div className="text-center">
                <span className="block text-xs text-secondary mb-1">Status da Conta</span>
                <span className="font-bold text-primary uppercase tracking-wider text-sm">Ativa</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Timeline List */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-secondary/60 ml-1">Atividades Recentes</h3>
          
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction, index) => {
              const isPositive = transaction.points > 0;
              const date = new Date(transaction.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={transaction.id}
                  className="group flex items-center gap-4 bg-white p-4 rounded-lg transition-all hover:translate-x-1 border border-outline-variant/5 shadow-sm"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`material-symbols-outlined font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{transaction.description}</h4>
                    <p className="text-xs text-secondary">{date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{transaction.points}
                    </p>
                    <p className="text-[10px] text-secondary font-bold uppercase">Pontos</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center py-12 opacity-20">
            <span className="material-symbols-outlined text-6xl">receipt_long</span>
            <p className="text-sm font-bold mt-2">Fim do histórico</p>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
