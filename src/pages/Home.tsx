import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { Stories } from '../components/Stories';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { NotificationModal } from '../components/NotificationModal';
import { UserAvatar } from '../components/UserAvatar';

export function Home() {
  const { user, balance, transactions, isLoading, pamphletImages, notifications, fetchNotifications } = useAppStore();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !balance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[80vh] px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">error_outline</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Não foi possível carregar os dados</h2>
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

  const progressPercentage = (balance.points / balance.nextLevelPoints) * 100;
  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="flex flex-col min-h-full bg-surface-container-lowest">
      {/* Header Section */}
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/5 pt-safe">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} url={user.avatarUrl} size="md" />
            <span className="text-xl font-bold tracking-tight text-on-surface truncate max-w-[180px]">Olá, {user.name.split(' ')[0]}</span>
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

      <div className="px-6 space-y-8 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Stories Section */}
          <Stories />
        </motion.div>

        {/* Weekly Pamphlet Banner */}
        {pamphletImages.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link 
              to="/offers"
              className="block group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-0.5 shadow-xl shadow-primary/20 active-scale"
            >
              <div className="bg-white/40 backdrop-blur-md rounded-[calc(1rem-0.5px)] p-5 flex items-center justify-between border border-white/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-on-primary/10 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-on-primary filled text-2xl">menu_book</span>
                  </div>
                  <div>
                    <h3 className="text-on-primary font-black text-[15px] uppercase tracking-tighter leading-none">Ofertas da Semana</h3>
                    <p className="text-on-primary/70 text-[10px] font-bold leading-tight mt-1 max-w-[200px]">Confira o nosso panfleto completo com preços imperdíveis!</p>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-on-primary/10 flex items-center justify-center group-hover:bg-on-primary group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-on-primary text-xl group-hover:translate-x-0.5 transition-transform group-hover:text-white">chevron_right</span>
                </div>
              </div>
            </Link>
          </motion.section>
        )}

        {/* Balance Highlight Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-primary-container/20 shadow-premium relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">Saldo Total de Pontos</p>
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-5xl font-extrabold tracking-tighter text-on-surface">{balance.points.toLocaleString('pt-BR')}</h2>
                <span className="text-xl font-bold text-primary">PTS</span>
              </div>
              <p className="text-secondary font-medium text-lg">≈ R$ {balance.cashback.toFixed(2).replace('.', ',')} <span className="text-sm font-normal text-stone-400">em cashback</span></p>
              
              <div className="mt-8 space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary filled">stars</span>
                    <span className="font-bold text-sm text-on-surface uppercase tracking-wider">{balance.currentLevel} Member</span>
                  </div>
                  <span className="text-xs font-bold text-primary">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full"
                  />
                </div>
                <p className="text-[10px] text-stone-400 font-medium">Faltam {balance.nextLevelPoints - balance.points} PTS para o nível {balance.nextLevel}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-4"
        >
          <Link to="/history" className="bg-primary-container text-on-primary font-bold py-5 px-6 rounded-full flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active-scale">
            <span className="material-symbols-outlined text-lg">redeem</span>
            <span className="text-sm uppercase tracking-wide">Meus Resgates</span>
          </Link>
          <Link to="/rewards" className="bg-primary-container text-on-primary font-bold py-5 px-6 rounded-full flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active-scale">
            <span className="material-symbols-outlined text-lg">trending_up</span>
            <span className="text-sm uppercase tracking-wide">Como Ganhar</span>
          </Link>
        </motion.section>

        {/* Transaction List */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6 pb-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-on-surface">Últimas Movimentações</h3>
            <Link to="/history" className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">Ver tudo</Link>
          </div>
          
          <div className="space-y-4">
            {recentTransactions.map((transaction, index) => {
              const isPositive = transaction.points > 0;
              const date = new Date(transaction.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg group hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                      <span className={`material-symbols-outlined ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? 'add_circle' : 'remove_circle'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">{transaction.description}</p>
                      <p className="text-xs text-stone-400">{date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''} {transaction.points} PTS
                    </p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-tighter">
                      {isPositive ? 'Acúmulo' : 'Resgate'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
