import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export function AdminDashboard() {
  const { 
    user, 
    stories, 
    collaborators, 
    apiKey,
    fetchStories, 
    fetchCollaborators, 
    fetchDashboardData,
    fetchActivationProducts,
    fetchAdminMetrics,
    activationProducts,
    adminMetrics,
    isLoading 
  } = useAppStore();

  useEffect(() => {
    fetchStories();
    fetchCollaborators();
    fetchActivationProducts();
    fetchAdminMetrics();
    fetchDashboardData().catch(() => {});
  }, [fetchStories, fetchCollaborators, fetchDashboardData, fetchActivationProducts, fetchAdminMetrics]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section: Typographic Brutalism */}
      <section className="relative pt-8 overflow-hidden">
        <h2 className="absolute -top-4 -left-4 text-[120px] font-black text-outline-variant/5 leading-none select-none tracking-tighter">
          PAINEL
        </h2>
        <div className="relative z-10 flex flex-col gap-1">
          <motion.h3 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-extrabold text-on-surface tracking-tight leading-none"
          >
            Olá, <span className="text-primary">{user?.name?.split(' ')[0]}</span>.
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-secondary font-medium text-sm flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema Operacional
          </motion.p>
        </div>
      </section>

      {/* Primary Metrics: Asymmetric Tension (70/30) */}
      <section className="grid grid-cols-10 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-10 sm:col-span-7 bg-on-surface text-surface p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl group active:scale-[0.98] transition-transform"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
            <span className="material-symbols-outlined text-[80px]">groups_3</span>
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-surface/50 mb-4 block leading-none">Clientes Fidelimax</span>
            <div className="flex items-baseline gap-2">
              <h4 className="text-6xl font-black tracking-tighter">{adminMetrics?.totalFidelimaxUsers || '--'}</h4>
              <span className="text-primary text-sm font-black uppercase">usuários</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-surface/10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-surface/70">
            <span>Rede Ativa</span>
            <span className="text-primary">+12% esta semana</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-10 sm:col-span-3 bg-primary p-6 rounded-[2.5rem] flex flex-col justify-between shadow-xl shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-on-primary text-3xl">verified</span>
          <div>
            <h4 className="text-3xl font-black text-on-primary leading-none mb-1">{adminMetrics?.totalActivations || '0'}</h4>
            <span className="text-[9px] font-black uppercase tracking-widest text-on-primary/60 block">Ativações</span>
          </div>
        </motion.div>
      </section>

      {/* Secondary Metrics Row */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ofertas', val: activationProducts.length, icon: 'local_offer' },
          { label: 'Stories', val: stories.length, icon: 'amp_stories' },
          { label: 'API', val: apiKey ? 'ATIVO' : 'AVISO', icon: apiKey ? 'check_circle' : 'warning', color: apiKey ? 'text-green-500' : 'text-error' }
        ].map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + (idx * 0.1) }}
            className="bg-white border border-outline-variant/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm"
          >
            <span className={cn("material-symbols-outlined text-[20px] mb-2", item.color || "text-stone-400")}>{item.icon}</span>
            <span className="text-[10px] font-black text-on-surface leading-none">{item.val}</span>
            <p className="text-[7px] font-bold text-stone-400 uppercase tracking-widest mt-1">{item.label}</p>
          </motion.div>
        ))}
      </section>

      {/* Quick Actions: High-Contrast Grid */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-secondary">Ações Rápidas</h4>
          <span className="w-12 h-0.5 bg-outline-variant/10 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/admin/points" className="col-span-2 bg-surface-container-low border border-outline-variant/5 rounded-3xl p-6 flex items-center justify-between group active:scale-[0.99] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                <span className="material-symbols-outlined text-[28px]">payments</span>
              </div>
              <div>
                <h5 className="font-black text-on-surface text-lg leading-tight uppercase tracking-tight">Gerenciar Pontos</h5>
                <p className="text-secondary text-[10px] font-medium uppercase tracking-widest">Atendimento Direto</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-stone-300 group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward_ios</span>
          </Link>

          <Link to="/admin/notifications" className="bg-surface-container-low border border-outline-variant/5 rounded-3xl p-6 flex flex-col gap-4 active:scale-[0.98] transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[80px]">campaign</span>
            </div>
            <span className="material-symbols-outlined text-secondary text-2xl group-hover:text-primary transition-colors">notifications</span>
            <div>
              <h5 className="font-black text-on-surface text-sm uppercase tracking-tighter leading-none mb-1">Notificar</h5>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Push & App</p>
            </div>
          </Link>

          <Link to="/admin/activations" className="bg-surface-container-low border border-outline-variant/5 rounded-3xl p-6 flex flex-col gap-4 active:scale-[0.98] transition-all group overflow-hidden relative">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[80px]">add_circle</span>
            </div>
            <span className="material-symbols-outlined text-secondary text-2xl group-hover:text-primary transition-colors">verified</span>
            <div>
              <h5 className="font-black text-on-surface text-sm uppercase tracking-tighter leading-none mb-1">Ofertas</h5>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Criar Ativação</p>
            </div>
          </Link>

          <Link to="/admin/pamphlets" className="col-span-2 bg-on-surface text-surface py-5 px-8 rounded-full flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl shadow-stone-900/10">
            <span className="material-symbols-outlined text-[20px] text-primary">menu_book</span>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Gerenciar Encarte Semanal</span>
          </Link>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="pt-8 border-t border-outline-variant/10 text-center space-y-4">
        <div className="flex justify-center gap-1.5">
           <span className="w-1 h-1 rounded-full bg-stone-300" />
           <span className="w-1 h-1 rounded-full bg-primary" />
           <span className="w-1 h-1 rounded-full bg-stone-300" />
        </div>
        <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.25em]">San Remo Bônus v2.0</p>
      </footer>
    </div>
  );
}
