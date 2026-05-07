import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

type ActivationStatus = 'pending' | 'approved' | 'rejected';

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Data a definir';
  return new Date(value).toLocaleDateString('pt-BR');
};

const normalizeText = (value: any) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const splitReadableItems = (value?: string | null) => {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\.\s+(?=[A-ZÁÀÂÃÉÍÓÔÕÚÇ])/g, '.\n')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const isRafflePromotion = (product: any) => {
  const hintText = [
    product?.name,
    product?.description,
    product?.prizeDescription,
    product?.participationInstructions,
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const hasRaffleKeyword = [
    'sorteio',
    'sortear',
    'sortea',
    'sorteado',
    'sorteada',
    'premio',
    'premios',
    'experiencias incriveis',
    'cupom para participar',
    'cupons para participar',
    'ganha 01 cupom',
    'ganha 1 cupom',
  ].some((keyword) => hintText.includes(keyword));

  return product?.promotionType === 'raffle'
    || Boolean(product?.drawDate || product?.prizeDescription || Number(product?.minPurchaseValue || 0) > 0)
    || hasRaffleKeyword;
};

const getRaffleParticipationRule = (product: any) => {
  if (Number(product?.minPurchaseValue || 0) > 0) {
    return `Pontue compras acima de ${formatCurrency(product.minPurchaseValue)} no app para confirmar 1 cupom`;
  }

  return 'Clique em participar para gerar 1 cupom';
};

const getRaffleInstructionItems = (product: any) => {
  const items = splitReadableItems(product?.participationInstructions || product?.description);

  if (items.length > 0) {
    return items;
  }

  return ['Pontue a compra no app; o cupom será confirmado automaticamente quando o valor mínimo for atingido.'];
};

const getRaffleRules = (product: any) => {
  const participationRule = getRaffleParticipationRule(product);
  const instructionItems = getRaffleInstructionItems(product).filter((item) => {
    const itemText = normalizeText(item).replace(/\.$/, '');
    const ruleText = normalizeText(participationRule).replace(/\.$/, '');
    return itemText !== ruleText;
  });

  const rules = [
    participationRule,
    ...instructionItems,
    `Limite de ${product?.limitPerCpf || 1} cupom(ns) por CPF.`,
    product?.drawDate ? `Sorteio em ${formatDate(product.drawDate)}.` : 'Data do sorteio a definir.',
  ];

  return rules.filter(Boolean);
};

const getUsableActivations = (product: any) => {
  return (product.activations || []).filter((activation: any) => activation.validationStatus !== 'rejected');
};

const getStatusMeta = (status?: ActivationStatus, isWinner?: boolean) => {
  if (isWinner) return { label: 'Sorteado', icon: 'trophy', className: 'bg-green-100 text-green-700' };
  if (status === 'approved') return { label: 'Cupom confirmado', icon: 'confirmation_number', className: 'bg-primary/15 text-primary' };
  if (status === 'rejected') return { label: 'Não validado', icon: 'cancel', className: 'bg-error/10 text-error' };
  return { label: 'Aguardando pontuação', icon: 'hourglass_top', className: 'bg-amber-100 text-amber-700' };
};

export function ActivationList() {
  const { activationProducts, fetchActivationProducts, activateProduct, isLoading } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetchActivationProducts();
  }, [fetchActivationProducts]);

  const raffleProducts = activationProducts.filter(isRafflePromotion);
  const offerProducts = activationProducts.filter((product) => !isRafflePromotion(product));

  const handleActivate = async (productId: string) => {
    try {
      await activateProduct(productId);
      setSelectedProduct(null);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="px-1 py-2">
        <h3 className="text-secondary font-medium text-sm tracking-wide uppercase">Sorteios e Promoções</h3>
        <p className="text-xs text-secondary/60 leading-tight mt-1">
          Promoções de sorteio aparecem com tag própria, regras, valor mínimo e acompanhamento dos cupons.
        </p>
      </div>

      {raffleProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <h4 className="text-xl font-black text-on-surface tracking-tight">Sorteios</h4>
              <p className="text-xs text-secondary/60 font-medium">Participe, pontue sua compra no app e acompanhe seus cupons.</p>
            </div>
            <span className="material-symbols-outlined text-primary">local_activity</span>
          </div>

          <div className="space-y-4">
            {raffleProducts.map((product, index) => (
              <React.Fragment key={product.id || index}>
                <RafflePromotionCard
                  product={product}
                  index={index}
                  onSelect={setSelectedProduct}
                />
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {offerProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <h4 className="text-xl font-black text-on-surface tracking-tight">Ofertas do App</h4>
              <p className="text-xs text-secondary/60 font-medium">Garanta descontos e brindes por tempo limitado.</p>
            </div>
            <span className="material-symbols-outlined text-primary">bolt</span>
          </div>

          <div className="grid gap-4">
            {offerProducts.map((product, index) => (
              <React.Fragment key={product.id || index}>
                <OfferActivationCard
                  product={product}
                  index={index}
                  onSelect={setSelectedProduct}
                />
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {activationProducts.length === 0 && (
        <div className="text-center py-24 bg-surface-container-low/50 rounded-[3rem] border border-outline-variant/5">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="material-symbols-outlined text-4xl text-stone-200">local_offer</span>
          </div>
          <p className="font-bold text-sm text-stone-400 uppercase tracking-widest">Sem promoções no momento</p>
          <p className="text-xs text-stone-300 mt-1 px-10">Fique de olho! Novas ofertas e sorteios aparecem por aqui.</p>
        </div>
      )}

      <AnimatePresence>
        {selectedProduct && (
          <ActivationDetails
            product={selectedProduct}
            isLoading={isLoading}
            onClose={() => setSelectedProduct(null)}
            onActivate={handleActivate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RafflePromotionCard({ product, index, onSelect }: {
  product: any;
  index: number;
  onSelect: (product: any) => void;
}) {
  const activations = getUsableActivations(product);
  const activeCount = activations.length;
  const approvedCount = activations.filter((activation: any) => activation.validationStatus === 'approved').length;
  const pendingCount = activations.filter((activation: any) => activation.validationStatus === 'pending').length;
  const primaryActivation = activations[0];
  const statusMeta = getStatusMeta(primaryActivation?.validationStatus, primaryActivation?.isWinner);
  const participationRule = getRaffleParticipationRule(product);
  const instructionPreview = getRaffleInstructionItems(product).slice(0, 2).join('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={() => onSelect(product)}
      className="bg-white rounded-[2rem] p-4 shadow-sm border border-outline-variant/10 cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-2xl bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant/5">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
              <span className="material-symbols-outlined">local_activity</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[8px] font-black uppercase tracking-widest">
              <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
              Sorteio
            </span>
            <span className="rounded-full bg-surface-container-low text-secondary px-2.5 py-1 text-[8px] font-black uppercase tracking-widest">
              {formatDate(product.drawDate)}
            </span>
          </div>

          <h4 className="text-lg font-black text-on-surface tracking-tight leading-tight truncate">{product.name}</h4>
          <p className="mt-1 text-xs text-secondary/70 font-bold leading-snug line-clamp-2 whitespace-pre-line">
            {product.prizeDescription || product.description}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 p-3">
        <p className="text-[8px] font-black uppercase tracking-widest text-secondary/40">Para participar</p>
        <p className="mt-1 text-xs font-black text-on-surface leading-snug">{participationRule}</p>
      </div>

      <div className="mt-3 rounded-2xl bg-primary/[0.06] border border-primary/15 p-3">
        <p className="text-[8px] font-black uppercase tracking-widest text-primary">Regras</p>
        <p className="mt-1 text-xs font-bold text-secondary/75 leading-snug line-clamp-3 whitespace-pre-line">
          {instructionPreview || `Toque em Participar da Promoção e cumpra a regra: ${participationRule}.`}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-outline-variant/20 flex items-center justify-between gap-3">
          {activeCount > 0 ? (
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest", statusMeta.className)}>
              <span className="material-symbols-outlined text-[14px]">{statusMeta.icon}</span>
              {approvedCount > 0 ? `${approvedCount} cupom(ns)` : pendingCount > 0 ? 'Aguardando pontuação' : statusMeta.label}
            </div>
          ) : (
            <span className="text-[10px] font-bold text-secondary/45">Até {product.limitPerCpf} cupom(ns) por CPF</span>
          )}

          <button
            onClick={(event) => {
              event.stopPropagation();
              onSelect(product);
            }}
            className="bg-primary text-on-primary px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
          >
            Participar
          </button>
      </div>
    </motion.div>
  );
}

function OfferActivationCard({ product, index, onSelect }: {
  product: any;
  index: number;
  onSelect: (product: any) => void;
}) {
  const activations = getUsableActivations(product);
  const activeCount = activations.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={() => onSelect(product)}
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
          <div className="flex justify-between items-start gap-2 mb-1">
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
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {product.isFree ? (
                <span className="font-black text-lg text-primary uppercase tracking-widest">
                  Grátis
                </span>
              ) : (
                <>
                  <span className="font-black text-xl text-on-surface">
                    {formatCurrency(product.promotionalPrice)}
                  </span>
                  <span className="text-xs text-secondary/40 line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                </>
              )}
            </div>

            {activeCount === 0 ? (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(product);
                }}
                className="bg-primary text-on-primary text-[10px] font-black px-4 py-2.5 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest"
              >
                Garantir
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 rounded-full text-stone-400">
                <span className="material-symbols-outlined text-base filled">check_circle</span>
                <span className="text-[9px] font-black uppercase tracking-widest">Garantido</span>
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
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest opacity-60">Oferta garantida ({activeCount} unid.):</span>
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
}

function ActivationDetails({ product, isLoading, onClose, onActivate }: {
  product: any;
  isLoading: boolean;
  onClose: () => void;
  onActivate: (productId: string) => Promise<void>;
}) {
  const isRaffle = isRafflePromotion(product);
  const activations = getUsableActivations(product);
  const activeCount = activations.length;
  const approvedCount = activations.filter((activation: any) => activation.validationStatus === 'approved').length;
  const pendingCount = activations.filter((activation: any) => activation.validationStatus === 'pending').length;
  const canActivateMore = activeCount < product.limitPerCpf;
  const raffleRules = isRaffle ? getRaffleRules(product) : [];
  const participationRule = getRaffleParticipationRule(product);
  const raffleInstructionItems = isRaffle ? getRaffleInstructionItems(product) : [];

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] flex flex-col pt-safe bg-white text-on-surface"
    >
      <header className="flex items-center justify-between px-6 h-20 shrink-0 z-50 fixed top-safe w-full">
        <button 
          onClick={onClose}
          className="w-12 h-12 flex items-center justify-center rounded-full shadow-xl active:scale-90 transition-all border bg-white text-primary border-outline-variant/10"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="relative h-[34vh] w-full bg-surface-container">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-200">
              <span className="material-symbols-outlined text-8xl">{isRaffle ? 'local_activity' : 'inventory_2'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-black/5" />
        </div>

        <div className="px-6 -mt-10 relative z-10 space-y-6 pb-12">
          <div className="rounded-[2.5rem] p-8 shadow-2xl border bg-white border-outline-variant/5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                {isRaffle ? 'Promoção de Sorteio' : 'Oferta Especial'}
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                {isRaffle ? `Sorteio ${formatDate(product.drawDate)}` : 'Tempo Limitado'}
              </span>
            </div>

            <h1 className="text-3xl font-black text-on-surface tracking-tight mb-6">
              {product.name}
            </h1>

            {isRaffle ? (
              <div className="p-5 bg-primary/[0.06] text-on-surface rounded-[2rem] border border-primary/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Prêmios</p>
                <p className="text-base font-black leading-snug whitespace-pre-line">
                  {product.prizeDescription || product.description}
                </p>
                <div className="mt-4 flex items-start gap-2 text-primary">
                  <span className="material-symbols-outlined">local_activity</span>
                  <span className="text-xs font-black leading-snug">
                    {participationRule}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-6 bg-surface-container-low rounded-[2rem] border border-outline-variant/10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
                    {product.isFree ? 'Oferta de Brinde' : 'Preço Especial'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    {product.isFree ? (
                      <span className="text-3xl font-black text-primary uppercase tracking-widest">Grátis</span>
                    ) : (
                      <>
                        <span className="text-3xl font-black text-primary">{formatCurrency(product.promotionalPrice)}</span>
                        <span className="text-sm text-secondary/40 line-through font-bold">{formatCurrency(product.originalPrice)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">{product.isFree ? 'card_giftcard' : 'local_offer'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 px-2 text-on-surface">
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-secondary/40">
                {isRaffle ? 'Como Participar' : 'Descrição da Oferta'}
              </h3>
              {isRaffle ? (
                <div className="space-y-2">
                  {raffleInstructionItems.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl bg-white border border-outline-variant/10 px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold leading-relaxed text-secondary/75 whitespace-pre-line">{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="leading-relaxed font-medium text-on-surface/70">
                  {product.description}
                </p>
              )}
            </div>

            {isRaffle && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary/40 italic">Regras da Promoção</h3>
                <div className="space-y-2">
                  {raffleRules.map((rule, index) => (
                    <div key={`${rule}-${index}`} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-outline-variant/10 shadow-sm">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-black">
                        {index + 1}
                      </span>
                      <p className="text-xs font-bold text-secondary/75 leading-relaxed whitespace-pre-line">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {isRaffle && (
                <div className="p-4 rounded-3xl border bg-surface-container-low border-outline-variant/5">
                  <span className="material-symbols-outlined text-primary mb-2">payments</span>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 text-secondary">Valor Mínimo</p>
                  <p className="text-xs font-bold">
                    {product.minPurchaseValue ? formatCurrency(product.minPurchaseValue) : 'Sem compra mínima'}
                  </p>
                </div>
              )}
              <div className="p-4 rounded-3xl border bg-surface-container-low border-outline-variant/5">
                <span className="material-symbols-outlined text-primary mb-2">{isRaffle ? 'event' : 'timer'}</span>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 text-secondary">
                  {isRaffle ? 'Data do Sorteio' : 'Prazo de Resgate'}
                </p>
                <p className="text-xs font-bold">{isRaffle ? formatDate(product.drawDate) : `${product.redeemWindowHours} Horas`}</p>
              </div>
              <div className="p-4 rounded-3xl border bg-surface-container-low border-outline-variant/5">
                <span className="material-symbols-outlined text-primary mb-2">{isRaffle ? 'confirmation_number' : 'person'}</span>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 text-secondary">Limite por CPF</p>
                <p className="text-xs font-bold">{product.limitPerCpf} {isRaffle ? 'cupom(ns)' : 'unidades'}</p>
              </div>
            </div>

            {isRaffle && activeCount > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary/40 italic">Sua Participação</h3>
                {activations.map((activation: any, index: number) => {
                  const statusMeta = getStatusMeta(activation.validationStatus, activation.isWinner);
                  return (
                    <div key={activation.id || index} className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-outline-variant/10 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-[10px] text-secondary/45 font-black uppercase tracking-widest">
                          Cupom {activation.couponNumber || 'aguardando pontuação'}
                        </p>
                        <p className="text-xs text-on-surface font-bold truncate">
                          Solicitado em {formatDate(activation.activatedAt)}
                        </p>
                      </div>
                      <span className={cn("shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest", statusMeta.className)}>
                        <span className="material-symbols-outlined text-[14px]">{statusMeta.icon}</span>
                        {statusMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={cn("p-5 rounded-3xl border flex items-start gap-4", isRaffle ? "bg-primary/[0.06] border-primary/15" : "bg-amber-50 border-amber-100")}>
              <div className={cn("w-8 h-8 shrink-0 rounded-full flex items-center justify-center", isRaffle ? "bg-primary text-on-primary" : "bg-amber-500 text-white")}>
                <span className="material-symbols-outlined text-lg filled">info</span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isRaffle ? "text-on-surface/70" : "text-amber-900/60")}>
                {isRaffle
                  ? product.minPurchaseValue
                    ? `Depois de clicar em participar, pontue no app uma compra acima de ${formatCurrency(product.minPurchaseValue)}. O cupom será confirmado automaticamente.`
                    : 'Ao participar, seu cupom entra automaticamente na lista de aprovados para o sorteio.'
                  : 'Ao garantir esta oferta, você reserva o desconto exclusivo. O resgate deve ser feito diretamente no San Remo dentro do prazo estipulado.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pb-12 border-t shrink-0 bg-white border-outline-variant/10">
        {!canActivateMore ? (
          <div className="w-full bg-stone-100 text-stone-400 font-black py-6 rounded-[2rem] text-lg tracking-widest flex items-center justify-center gap-3 uppercase cursor-not-allowed">
            <span className="material-symbols-outlined filled">check_circle</span>
            {isRaffle ? 'Limite Atingido' : 'Oferta Garantida'}
          </div>
        ) : (
          <button 
            disabled={isLoading}
            onClick={() => onActivate(product.id)}
            className="w-full bg-primary text-on-primary font-black py-6 rounded-[2rem] text-base tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase disabled:opacity-60"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined">{isRaffle ? 'how_to_reg' : 'bolt'}</span>
                {isRaffle
                  ? activeCount > 0 ? `Participar Novamente (${activeCount}/${product.limitPerCpf})` : 'Participar da Promoção'
                  : activeCount > 0 ? `Garantir Mais (${activeCount}/${product.limitPerCpf})` : 'Garantir Agora'}
              </>
            )}
          </button>
        )}

        {isRaffle && activeCount > 0 && (
          <p className="text-[10px] text-center text-secondary/45 font-bold uppercase tracking-widest mt-3">
            {approvedCount > 0 ? `${approvedCount} cupom(ns) confirmado(s)` : `${pendingCount} participação(ões) aguardando pontuação`}
          </p>
        )}
      </div>
    </motion.div>
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
