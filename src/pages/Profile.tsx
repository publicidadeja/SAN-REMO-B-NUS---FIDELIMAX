import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { UserAvatar } from '../components/UserAvatar';
import { cn } from '../utils/cn';
import { useState } from 'react';

export function Profile() {
  const { user, balance, logout, helpContact } = useAppStore();
  const navigate = useNavigate();
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleHelpPress = () => {
    if (helpContact) {
      window.open(helpContact.startsWith('http') ? helpContact : `https://wa.me/${helpContact.replace(/\D/g, '')}`, '_blank');
    } else {
      alert('Central de ajuda temporariamente indisponível. Tente novamente mais tarde.');
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[80vh] px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">account_circle</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Perfil não encontrado</h2>
        <p className="text-secondary mb-6">Faça login novamente para acessar seu perfil.</p>
        <button 
          onClick={handleLogout}
          className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold shadow-md hover:opacity-90 transition-opacity"
        >
          Ir para Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-container-lowest pb-safe">
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/5 pt-safe">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <h1 className="font-bold text-lg text-on-surface">Meu Perfil</h1>
          <button className="material-symbols-outlined text-stone-400 hover:opacity-80 transition-opacity p-2 active-scale">
            settings
          </button>
        </div>
      </header>

      <main className="px-6 max-w-lg mx-auto w-full pt-8 pb-32">
        {/* User Info Header */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center text-center mb-10"
        >
          <div className="relative mb-5 group cursor-pointer active-scale">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all"></div>
            <UserAvatar 
              name={user.name} 
              url={user.avatarUrl} 
              size="xl" 
              className="relative border-4 border-white shadow-xl"
            />
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">{user.name}</h2>
          <p className="text-secondary font-medium text-sm">Cliente {balance?.currentLevel || 'Platinum'} Member</p>
          
          <div className="mt-4 inline-flex items-center gap-2 bg-primary-container/10 text-primary px-4 py-1.5 rounded-full border border-primary/10">
            <span className="material-symbols-outlined text-sm filled">verified</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Conta Verificada</span>
          </div>
        </motion.section>

        {/* Profile Menu Sections */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60 mb-3 ml-1">Minha Conta</h3>
            <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-premium overflow-hidden">
              <Link to="/profile/data" className="flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group active-scale border-b border-outline-variant/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">person_outline</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">Dados Pessoais</p>
                    <p className="text-[10px] text-secondary font-medium">CPF, E-mail, Telefone</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-stone-300 group-hover:text-primary transition-all group-hover:translate-x-0.5">chevron_right</span>
              </Link>
              
              <Link to="/card" className="flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group active-scale">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-filled">qr_code_2</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">Meu Cartão Digital</p>
                    <p className="text-[10px] text-secondary font-medium">Apresente no caixa</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-stone-300 group-hover:text-primary transition-all group-hover:translate-x-0.5">chevron_right</span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60 mb-3 ml-1">Suporte & Privacidade</h3>
            <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-premium overflow-hidden">
              <div 
                onClick={handleHelpPress}
                className="flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group active-scale border-b border-outline-variant/5 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">help</span>
                  </div>
                  <span className="font-bold text-on-surface text-sm">Central de Ajuda</span>
                </div>
                <span className="material-symbols-outlined text-stone-300 group-hover:text-primary transition-all group-hover:translate-x-0.5">chevron_right</span>
              </div>
              <div 
                onClick={() => setShowPrivacy(true)}
                className="flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group active-scale cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">shield</span>
                  </div>
                  <span className="font-bold text-on-surface text-sm">Termos e Privacidade</span>
                </div>
                <span className="material-symbols-outlined text-stone-300 group-hover:text-primary transition-all group-hover:translate-x-0.5">chevron_right</span>
              </div>
            </div>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={logout}
            className="w-full bg-error-container/10 border border-error/10 text-error font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl hover:bg-error-container/20 transition-all flex items-center justify-center gap-2 active-scale"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sair da Conta
          </motion.button>
        </div>
      </main>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacy(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="h-1.5 w-12 bg-stone-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
              
              <div className="px-8 pt-6 pb-4 flex justify-between items-center border-b border-outline-variant/5">
                <h3 className="text-xl font-bold text-on-surface">Termos e Privacidade</h3>
                <button onClick={() => setShowPrivacy(false)} className="material-symbols-outlined text-secondary hover:text-primary transition-colors p-2">
                  close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar text-sm leading-relaxed text-secondary font-medium">
                <section>
                  <h4 className="text-on-surface font-black uppercase tracking-widest text-[10px] mb-2">1. Coleta de Dados</h4>
                  <p>Coletamos seu nome, CPF, e-mail e telefone para identificação no programa de fidelidade San Remo Bônus e para o resgate de prêmios.</p>
                </section>

                <section>
                  <h4 className="text-on-surface font-black uppercase tracking-widest text-[10px] mb-2">2. Uso das Informações</h4>
                  <p>Seus dados são utilizados exclusivamente para gerenciar seu saldo de pontos, oferecer ofertas personalizadas através do sistema Fidelimax e garantir a segurança das suas transações.</p>
                </section>

                <section>
                  <h4 className="text-on-surface font-black uppercase tracking-widest text-[10px] mb-2">3. Segurança (LGPD)</h4>
                  <p>Seguimos rigorosamente a Lei Geral de Proteção de Dados (LGPD). Seus dados são criptografados e nunca compartilhados com terceiros sem seu consentimento explícito, exceto para o processamento técnico necessário ao programa.</p>
                </section>

                <section>
                  <h4 className="text-on-surface font-black uppercase tracking-widest text-[10px] mb-2">4. Seus Direitos</h4>
                  <p>Você pode solicitar a correção, exportação ou exclusão definitiva dos seus dados a qualquer momento através do nosso suporte ou diretamente nas configurações da conta.</p>
                </section>

                <div className="pt-6 border-t border-outline-variant/5 text-center italic text-[11px] opacity-60">
                  Última atualização: Março de 2025
                </div>
              </div>

              <div className="p-8 bg-surface-container-lowest">
                <button 
                  onClick={() => setShowPrivacy(false)}
                  className="w-full bg-primary text-on-primary font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                >
                  Entendi e Aceito
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

