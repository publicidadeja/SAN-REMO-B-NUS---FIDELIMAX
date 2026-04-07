import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

export function ActivationList() {
  const { activationProducts, fetchActivationProducts, activateProduct, isLoading } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetchActivationProducts();
  }, [fetchActivationProducts]);

  const handleActivate = async (productId: string) => {
    try {
      await activateProduct(productId);
      setSelectedProduct(null);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="px-1 py-2">
        <h3 className="text-secondary font-medium text-sm tracking-wide uppercase">Ofertas Exclusivas</h3>
        <p className="text-xs text-secondary/60 leading-tight mt-1">Ative para garantir seu desconto especial no San Remo.</p>
      </div>

      <div className="grid gap-4">
        {activationProducts.map((product, index) => {
          const activations = product.activations || [];
          const activeCount = activations.length;
          const canActivateMore = activeCount < product.limitPerCpf;
          
          return (
            <motion.div
              key={product.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedProduct(product)}
              className={cn(
                "bg-white rounded-[2rem] p-5 shadow-sm border border-outline-variant/10 relative overflow-hidden group transition-all cursor-pointer active:scale-[0.98]",
                activeCount > 0 && "border-primary/30 bg-primary/[0.02]"
              )}
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant/5">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <span className="material-symbols-outlined text-4xl">inventory_2</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-on-surface leading-tight truncate">{product.name}</h4>
                    {activeCount >= product.limitPerCpf && (
                      <span className="flex-shrink-0">
                        <span className="material-symbols-outlined text-stone-300 text-lg filled">check_circle</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary line-clamp-2 leading-relaxed mb-3">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {product.isFree ? (
                          <span className="font-black text-lg text-primary uppercase tracking-widest">
                            Grátis
                          </span>
                        ) : (
                          <>
                            <span className="font-black text-xl text-on-surface">
                              R$ {parseFloat(product.promotionalPrice).toFixed(2)}
                            </span>
                            <span className="text-xs text-secondary/40 line-through">
                              R$ {parseFloat(product.originalPrice).toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {activeCount === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}
                        className="bg-primary text-on-primary text-[10px] font-black px-5 py-2.5 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest"
                      >
                        ATIVAR
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 rounded-full">
                        <span className="material-symbols-outlined text-stone-400 text-base filled">check_circle</span>
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">ATIVADO</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {activeCount > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-outline-variant/20 flex justify-between items-center bg-primary/[0.03] -mx-5 -mb-5 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-widest opacity-60">Oferta ativada ({activeCount} unid.):</span>
                      <CountdownTimer targetDate={activations[0].validUntil} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-stone-400">Limite: {product.limitPerCpf} por CPF</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {activationProducts.length === 0 && (
          <div className="text-center py-24 bg-surface-container-low/50 rounded-[3rem] border border-outline-variant/5">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="material-symbols-outlined text-4xl text-stone-200">local_offer</span>
            </div>
            <p className="font-bold text-sm text-stone-400 uppercase tracking-widest">Sem ofertas no momento</p>
            <p className="text-xs text-stone-300 mt-1 px-10">Fique de olho! Novas promoções de ativação surgem a qualquer momento.</p>
          </div>
        )}
      </div>

      {/* Activation Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe"
          >
            <header className="flex items-center justify-between px-6 h-20 shrink-0 z-50 fixed top-safe w-full">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-primary shadow-xl active:scale-90 transition-all border border-outline-variant/10"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
              <div className="relative h-[40vh] w-full bg-surface-container">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200">
                    <span className="material-symbols-outlined text-8xl">inventory_2</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/5" />
              </div>

              <div className="px-6 -mt-10 relative z-10 space-y-6 pb-12">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-outline-variant/5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                      Oferta Especial
                    </span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Tempo Limitado
                    </span>
                  </div>

                  <h1 className="text-3xl font-black text-on-surface tracking-tight mb-6">
                    {selectedProduct.name}
                  </h1>

                  <div className="flex items-center justify-between p-6 bg-surface-container-low rounded-[2rem] border border-outline-variant/10">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
                        {selectedProduct.isFree ? 'Oferta de Brinde' : 'Preço Especial'}
                      </p>
                      <div className="flex items-baseline gap-2">
                        {selectedProduct.isFree ? (
                          <span className="text-3xl font-black text-primary uppercase tracking-widest">Grátis</span>
                        ) : (
                          <>
                            <span className="text-3xl font-black text-primary">R$ {parseFloat(selectedProduct.promotionalPrice).toFixed(2)}</span>
                            <span className="text-sm text-secondary/40 line-through font-bold">R$ {parseFloat(selectedProduct.originalPrice).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">{selectedProduct.isFree ? 'card_giftcard' : 'local_offer'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-2">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary/40 italic">Descrição da Oferta</h3>
                    <p className="text-on-surface/70 leading-relaxed font-medium">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-3xl border border-outline-variant/5">
                      <span className="material-symbols-outlined text-primary mb-2">timer</span>
                      <p className="text-[9px] font-black uppercase tracking-widest text-secondary opacity-60">Prazo de Resgate</p>
                      <p className="text-xs font-bold text-on-surface">{selectedProduct.redeemWindowHours} Horas</p>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-3xl border border-outline-variant/5">
                      <span className="material-symbols-outlined text-primary mb-2">person</span>
                      <p className="text-[9px] font-black uppercase tracking-widest text-secondary opacity-60">Limite por CPF</p>
                      <p className="text-xs font-bold text-on-surface">{selectedProduct.limitPerCpf} unidades</p>
                    </div>
                  </div>

                  <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-lg filled">info</span>
                    </div>
                    <p className="text-[11px] text-amber-900/60 font-medium leading-relaxed">
                      Ao ativar esta oferta, você garante o desconto exclusivo. O resgate deve ser feito diretamente no San Remo dentro do prazo estipulado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pb-12 bg-white border-t border-outline-variant/10">
              {(() => {
                const activations = selectedProduct.activations || [];
                const activeCount = activations.length;
                const isAlreadyActivated = activeCount >= selectedProduct.limitPerCpf;

                if (isAlreadyActivated) {
                  return (
                    <div className="w-full bg-stone-100 text-stone-400 font-black py-6 rounded-[2rem] text-lg tracking-widest flex items-center justify-center gap-3 uppercase cursor-not-allowed">
                      <span className="material-symbols-outlined filled">check_circle</span>
                      Oferta Ativada
                    </div>
                  );
                }

                return (
                  <button 
                    disabled={isLoading}
                    onClick={() => handleActivate(selectedProduct.id)}
                    className="w-full bg-primary text-on-primary font-black py-6 rounded-[2rem] text-lg tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-3 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined">bolt</span>
                        {activeCount > 0 ? `Ativar Mais (${activeCount}/${selectedProduct.limitPerCpf})` : 'Ativar Agora'}
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="text-primary font-black text-xs tracking-widest">{timeLeft}</span>;
}
