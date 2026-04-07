import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { Reward } from '../models/types';
import { ShoppingBag, ChevronLeft, Star, Zap, ShoppingCart } from 'lucide-react';
import { ActivationList } from '../components/ActivationList';

export function Rewards() {
  const { user, rewards, balance, redeemReward, isLoading } = useAppStore();
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [voucher, setVoucher] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'catalog' | 'activations'>('catalog');
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'activations') {
      setActiveTab('activations');
    }
  }, []);

  const categories = ['Todos', 'Produtos', 'Descontos', 'Experiências'];

  const filteredRewards = selectedCategory === 'Todos' 
    ? rewards 
    : rewards.filter(r => r.category === selectedCategory);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here in a real app
  };

  const handleRedeem = async (reward: Reward) => {
    try {
      const code = await redeemReward(reward.id);
      setVoucher(code);
      setIsSuccess(true);
    } catch (err) {
      console.error('Redemption failed', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 px-6 min-h-[80vh] bg-surface-container-lowest">
        <div className="flex justify-between items-center h-16 mb-8 mt-2">
          <div className="h-6 bg-surface-container-low rounded w-32 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-surface-container-low animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm animate-pulse">
              <div className="aspect-square bg-surface-container-low" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-surface-container-low rounded w-3/4" />
                <div className="h-2 bg-surface-container-low rounded w-full" />
                <div className="h-4 bg-surface-container-low rounded w-1/2 mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[80vh] px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">error_outline</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Não foi possível carregar os prêmios</h2>
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
    <div className="flex flex-col min-h-full bg-surface-container-lowest">
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl pt-safe">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg text-on-surface truncate max-w-[180px]">{user?.name.split(' ')[0] || 'San Remo'}</h1>
          </div>
          <button className="material-symbols-outlined text-stone-400 hover:opacity-80 transition-opacity">
            filter_list
          </button>
        </div>
      </header>

      <main className="pt-8 px-6 max-w-lg mx-auto w-full pb-8">
        <section className="mb-8">
          <div className="flex bg-surface-container-low p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                activeTab === 'catalog' ? "bg-white text-primary shadow-sm" : "text-secondary"
              )}
            >
              <ShoppingCart size={14} />
              PRODUTOS
            </button>
            <button 
              onClick={() => setActiveTab('activations')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                activeTab === 'activations' ? "bg-white text-primary shadow-sm" : "text-secondary"
              )}
            >
              <Zap size={14} className={activeTab === 'activations' ? "fill-primary" : ""} />
              ATIVAÇÕES
            </button>
          </div>

          {activeTab === 'catalog' ? (
            <>
              <span className="text-secondary font-medium text-sm tracking-wide uppercase">Produtos e Prêmios</span>
              <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Resgate Agora</h2>
              
              <div className="mt-6 flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                {categories.map((category) => (
                  <button 
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all active-scale ${
                      selectedCategory === category 
                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                        : 'bg-surface-container-low text-secondary hover:bg-surface-container-high'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {activeTab === 'activations' ? (
            <ActivationList />
          ) : filteredRewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 shadow-sm">
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-stone-300">
                <span className="material-symbols-outlined text-4xl">inventory_2</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Nenhum prêmio encontrado</h3>
              <p className="text-sm text-secondary">Ainda não temos prêmios na categoria {selectedCategory}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredRewards.map((reward, index) => {
              const canRedeem = balance.points >= reward.pointsRequired;

                return (
                  <div 
                    key={reward.id || `reward-${index}`}
                    onClick={() => setSelectedReward(reward)}
                    className="bg-white rounded-3xl overflow-hidden border border-outline-variant/10 shadow-sm group hover:shadow-xl transition-all cursor-pointer active-scale"
                  >
                    <div className="aspect-square relative bg-surface-container">
                      <img 
                        src={reward.imageUrl || '/icon.png'} 
                        alt={reward.name} 
                        className={cn(
                          "w-full h-full transition-transform duration-500 group-hover:scale-110",
                          reward.imageUrl ? "object-cover" : "object-contain p-8 opacity-40"
                        )}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/icon.png';
                          (e.target as HTMLImageElement).className = "w-full h-full object-contain p-8 opacity-40";
                        }}
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">
                        <p className="text-[10px] font-black text-primary uppercase tracking-wider">{reward.category}</p>
                      </div>
                    </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-on-surface text-sm leading-tight mb-1 line-clamp-2">{reward.name}</h3>
                    <p className="text-xs text-secondary line-clamp-2 mb-4 flex-1">{reward.description}</p>
                    
                    <div className="mt-auto">
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="font-extrabold text-lg text-primary">{reward.pointsRequired.toLocaleString('pt-BR')}</span>
                        <span className="text-[10px] font-bold text-primary uppercase">PTS</span>
                      </div>
                      
                      <button 
                        disabled={!canRedeem}
                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                          canRedeem 
                            ? 'bg-primary text-on-primary hover:opacity-90 active-scale' 
                            : 'bg-surface-container-high text-secondary cursor-not-allowed'
                        }`}
                      >
                        {canRedeem ? (
                          <>
                            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                            Resgatar
                          </>
                        ) : (
                          'Pontos Insuficientes'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </motion.div>
      </main>

      {/* Reward Details Modal */}
      <AnimatePresence>
        {selectedReward && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe"
          >
            
            <header className="flex items-center justify-between px-6 h-20 shrink-0 z-50 fixed top-safe w-full">
              <button 
                onClick={() => {
                  setSelectedReward(null);
                  setIsSuccess(false);
                  setVoucher(null);
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-primary shadow-xl active:scale-90 transition-all border border-outline-variant/10"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="w-12" />
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
              <div className="relative h-[45vh] w-full">
                <motion.img 
                  layoutId={`reward-img-${selectedReward.id}`}
                  src={selectedReward.imageUrl} 
                  alt={selectedReward.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/5" />
              </div>

              <div className="px-6 -mt-12 relative z-10 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5 border border-outline-variant/5">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest">
                      {selectedReward.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-primary bg-primary/5 px-4 py-1.5 rounded-full">
                      <Star size={14} fill="currentColor" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Destaque</span>
                    </div>
                  </div>

                  <h1 className="text-4xl font-black text-on-surface tracking-tighter leading-[0.9] mb-6">
                    {selectedReward.name}
                  </h1>

                  <div className="flex items-center justify-between p-6 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary shadow-xl shadow-primary/20">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Investimento</p>
                      <p className="text-3xl font-black">{selectedReward.pointsRequired.toLocaleString('pt-BR')} <span className="text-sm opacity-80">PTS</span></p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                      <ShoppingBag size={28} />
                    </div>
                  </div>
                </div>

                <div className="px-2 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-secondary/40">O que você recebe</h3>
                    <p className="text-on-surface/70 leading-relaxed text-lg font-medium">
                      {selectedReward.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                      <span className="material-symbols-outlined text-primary mb-2">schedule</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Validade</p>
                      <p className="text-xs font-bold text-on-surface">30 dias para uso</p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                      <span className="material-symbols-outlined text-primary mb-2">store</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Onde Retirar</p>
                      <p className="text-xs font-bold text-on-surface">Qualquer Unidade</p>
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined filled text-xl">info</span>
                    </div>
                    <p className="text-xs text-amber-900/60 font-medium leading-relaxed">
                      Este resgate é pessoal e intransferível. O voucher gerado deve ser apresentado no caixa junto com um documento original com foto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pb-12 bg-surface-container-lowest/80 backdrop-blur-2xl border-t border-outline-variant/10 shrink-0">
              {isSuccess && voucher ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-green-500 p-8 rounded-[2.5rem] text-center text-white shadow-2xl shadow-green-500/30 overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-white rounded-full blur-2xl" />
                    <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white rounded-full blur-3xl" />
                  </div>
                  
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 rotate-12 shadow-lg">
                    <span className="material-symbols-outlined font-black text-4xl">check_circle</span>
                  </div>
                  <h4 className="font-black text-2xl mb-1 tracking-tight italic uppercase">Recompensa Garantida!</h4>
                  <p className="text-white/80 text-sm mb-6 font-bold uppercase tracking-widest">Apresente este código:</p>
                  
                  <div 
                    onClick={() => copyToClipboard(voucher)}
                    className="bg-white py-5 px-8 rounded-2xl shadow-inner mb-2 group active:scale-95 transition-all cursor-pointer hover:bg-white/95"
                  >
                    <span className="text-3xl font-black tracking-[0.3em] text-on-surface select-all">{voucher}</span>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Toque para copiar código</p>
                </motion.div>
              ) : (
                <button 
                  disabled={balance.points < selectedReward.pointsRequired || isLoading}
                  onClick={() => handleRedeem(selectedReward)}
                  className={`w-full py-6 rounded-[2rem] text-xl font-black tracking-tighter transition-all flex items-center justify-center gap-4 shadow-2xl ${
                    balance.points >= selectedReward.pointsRequired 
                      ? 'bg-primary text-on-primary shadow-primary/30 hover:opacity-90 active:scale-95' 
                      : 'bg-surface-container-high text-on-surface/30 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-8 h-8 border-4 border-on-primary/10 border-t-on-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingBag size={28} />
                      {balance.points >= selectedReward.pointsRequired ? 'Resgatar Agora' : 'Pontos Insuficientes'}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
