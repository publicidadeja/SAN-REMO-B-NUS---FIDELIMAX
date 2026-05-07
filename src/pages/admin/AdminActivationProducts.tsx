import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { FidelimaxApiService } from '../../api/fidelimax';
import { cn } from '../../utils/cn';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StatusModal } from '../../components/StatusModal';

type PromotionType = 'offer' | 'raffle';
type ParticipantStatus = 'pending' | 'approved' | 'rejected';

const createEmptyFormData = () => ({
  promotionType: 'offer' as PromotionType,
  name: '',
  description: '',
  originalPrice: '',
  promotionalPrice: '',
  prizeDescription: '',
  minPurchaseValue: '',
  participationInstructions: '',
  drawDate: '',
  limitPerCpf: '1',
  redeemWindowHours: '24',
  expiresAt: '',
  isMonthly: false,
  isFree: false
});

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value?: string | null) => {
  if (!value) return 'A definir';
  return new Date(value).toLocaleDateString('pt-BR');
};

const formatCpf = (value?: string | null) => {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11) return value || 'CPF não informado';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatPhone = (value?: string | null) => {
  const phone = String(value || '').replace(/\D/g, '');
  if (phone.length === 11) return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (phone.length === 10) return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value || 'Telefone não informado';
};

const getPrizeCount = (product: any) => {
  const prizes = String(product?.prizeDescription || '')
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return Math.max(1, prizes.length || Number(product?.winnerCount || 0) || 1);
};

const getParticipantStatusMeta = (status?: ParticipantStatus, isWinner?: boolean) => {
  if (isWinner) return { label: 'Sorteado', icon: 'trophy', className: 'bg-green-100 text-green-700 border-green-200' };
  if (status === 'approved') return { label: 'Aprovado', icon: 'verified', className: 'bg-primary/15 text-primary border-primary/20' };
  if (status === 'rejected') return { label: 'Rejeitado', icon: 'cancel', className: 'bg-error/10 text-error border-error/20' };
  return { label: 'Pendente', icon: 'hourglass_top', className: 'bg-amber-100 text-amber-700 border-amber-200' };
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

export function AdminActivationProducts() {
  const { activationProducts, fetchActivationProducts, addActivationProduct, updateActivationProduct, deleteActivationProduct, isLoading } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState(createEmptyFormData());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [raffleProduct, setRaffleProduct] = useState<any | null>(null);
  const [raffleData, setRaffleData] = useState<any | null>(null);
  const [isLoadingRaffle, setIsLoadingRaffle] = useState(false);
  const [drawResult, setDrawResult] = useState<any | null>(null);
  const [statusModal, setStatusModal] = useState<{ show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchActivationProducts();
  }, [fetchActivationProducts]);

  const resetForm = () => {
    setFormData(createEmptyFormData());
    setSelectedFile(null);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const isRaffle = formData.promotionType === 'raffle';
    const payload = {
      ...formData,
      originalPrice: isRaffle || formData.isFree ? '0' : formData.originalPrice,
      promotionalPrice: isRaffle || formData.isFree ? '0' : formData.promotionalPrice,
      redeemWindowHours: isRaffle ? '24' : formData.redeemWindowHours,
      isMonthly: isRaffle ? false : formData.isMonthly,
      isFree: isRaffle ? true : formData.isFree
    };

    try {
      if (editingProduct) {
        await updateActivationProduct(editingProduct.id, payload, selectedFile || undefined);
      } else {
        await addActivationProduct(payload, selectedFile || undefined);
      }
      setIsAdding(false);
      resetForm();
    } catch (error) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Erro ao salvar',
        message: 'Não foi possível salvar esta promoção. Revise os dados e tente novamente.'
      });
    }
  };

  const handleEdit = (product: any) => {
    const isRaffle = isRafflePromotion(product);
    setEditingProduct(product);
    setFormData({
      promotionType: isRaffle ? 'raffle' : 'offer',
      name: product.name || '',
      description: product.description || '',
      originalPrice: String(product.originalPrice || ''),
      promotionalPrice: String(product.promotionalPrice || ''),
      prizeDescription: product.prizeDescription || '',
      minPurchaseValue: product.minPurchaseValue ? String(product.minPurchaseValue) : '',
      participationInstructions: product.participationInstructions || '',
      drawDate: product.drawDate ? product.drawDate.split('T')[0] : '',
      limitPerCpf: String(product.limitPerCpf || 1),
      redeemWindowHours: String(product.redeemWindowHours || 24),
      expiresAt: product.expiresAt ? product.expiresAt.split('T')[0] : '',
      isMonthly: product.isMonthly || false,
      isFree: product.isFree || false
    });
    setIsAdding(true);
  };

  const loadRaffleArea = async (product: any) => {
    setRaffleProduct(product);
    setDrawResult(null);
    setIsLoadingRaffle(true);
    try {
      const data = await FidelimaxApiService.getRaffleParticipants(product.id);
      setRaffleData(data);
    } catch (error) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Erro no sorteio',
        message: 'Não foi possível carregar os participantes deste sorteio.'
      });
    } finally {
      setIsLoadingRaffle(false);
    }
  };

  const refreshRaffleArea = async () => {
    if (!raffleProduct) return;
    const data = await FidelimaxApiService.getRaffleParticipants(raffleProduct.id);
    setRaffleData(data);
    await fetchActivationProducts();
  };

  const handleDrawWinner = async (winnerCount: number, redraw = false) => {
    if (!raffleProduct) return;
    setIsLoadingRaffle(true);
    try {
      const result = await FidelimaxApiService.drawRaffleWinner(raffleProduct.id, { winnerCount, redraw });
      setDrawResult(result);
      await refreshRaffleArea();
      setStatusModal({
        show: true,
        type: 'success',
        title: redraw ? 'Sorteio refeito' : 'Sorteio realizado',
        message: `${result.winners?.length || 0} ganhador(es) sorteado(s). Confira os dados e use o cartão para print.`
      });
    } catch (error: any) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Sorteio indisponível',
        message: error.response?.data?.error || 'Não há participantes aprovados para sortear.'
      });
    } finally {
      setIsLoadingRaffle(false);
    }
  };

  const handleConfirmWinners = async () => {
    if (!raffleProduct) return;
    setIsLoadingRaffle(true);
    try {
      const result = await FidelimaxApiService.confirmRaffleWinners(raffleProduct.id);
      setStatusModal({
        show: true,
        type: 'success',
        title: 'Ganhadores validados',
        message: result.notifiedCount > 0
          ? `${result.notifiedCount} ganhador(es) foram avisados pelo app.`
          : 'Resultado já estava validado e sem novas notificações.'
      });
      await refreshRaffleArea();
    } catch (error: any) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Não foi possível validar',
        message: error.response?.data?.error || 'Realize o sorteio antes de validar os ganhadores.'
      });
    } finally {
      setIsLoadingRaffle(false);
    }
  };

  const raffleProducts = activationProducts.filter(isRafflePromotion);
  const offerProducts = activationProducts.filter((product) => !isRafflePromotion(product));

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Promoções</h2>
          <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Sorteios e ofertas separados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setFormData({ ...createEmptyFormData(), promotionType: 'raffle', isFree: true });
              setIsAdding(true);
            }}
            className="h-10 rounded-full bg-stone-900 text-white px-3 flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">local_activity</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Sorteio</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            title="Criar oferta do app"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {raffleProducts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Produtos de Sorteio</h3>
                <p className="text-[10px] text-stone-400 font-bold">Acompanhe cupons confirmados automaticamente pela pontuação do app.</p>
              </div>
              <span className="material-symbols-outlined text-primary">local_activity</span>
            </div>

            <div className="space-y-4">
              {raffleProducts.map((product, index) => (
                <motion.div
                  key={product.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <AdminRaffleCard
                    product={product}
                    onOpenArea={loadRaffleArea}
                    onEdit={handleEdit}
                    onDelete={(id) => setProductToDelete(id)}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {offerProducts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Ofertas do App</h3>
                <p className="text-[10px] text-stone-400 font-bold">Ofertas, descontos e brindes garantidos pelo cliente.</p>
              </div>
              <span className="material-symbols-outlined text-primary">bolt</span>
            </div>

            <div className="space-y-4">
              {offerProducts.map((product, index) => (
                <motion.div
                  key={product.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <AdminOfferCard
                    product={product}
                    onEdit={handleEdit}
                    onDelete={(id) => setProductToDelete(id)}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {activationProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-stone-200 mb-2">inventory_2</span>
            <p className="text-stone-400 text-sm">Nenhuma promoção ativa</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={async () => {
          if (productToDelete) {
            await deleteActivationProduct(productToDelete);
            setProductToDelete(null);
          }
        }}
        title="Excluir Promoção?"
        message="Tem certeza que deseja excluir esta oferta ou sorteio? Esta ação não pode ser desfeita."
        type="danger"
        confirmText="Sim, Excluir"
        isLoading={isLoading}
      />

      <PromotionFormModal
        isOpen={isAdding}
        editingProduct={editingProduct}
        formData={formData}
        isLoading={isLoading}
        onClose={() => {
          setIsAdding(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        onChange={setFormData}
        onFileChange={setSelectedFile}
      />

      <RaffleAreaModal
        product={raffleProduct}
        data={raffleData}
        isLoading={isLoadingRaffle}
        drawResult={drawResult}
        onClose={() => {
          setRaffleProduct(null);
          setRaffleData(null);
          setDrawResult(null);
        }}
        onDrawWinner={handleDrawWinner}
        onConfirmWinners={handleConfirmWinners}
      />

      <StatusModal
        isOpen={statusModal.show}
        onClose={() => setStatusModal({ ...statusModal, show: false })}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
}

function AdminRaffleCard({
  product,
  onOpenArea,
  onEdit,
  onDelete
}: {
  product: any;
  onOpenArea: (product: any) => void;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-stone-950 text-white shadow-xl shadow-stone-900/10 border border-white/10">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="absolute inset-0 h-full w-full object-cover opacity-20" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-red-950/90 to-stone-900" />
      <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-surface-container-lowest" />
      <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-surface-container-lowest" />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-on-primary">
              <span className="material-symbols-outlined text-[13px]">local_activity</span>
              Produto de Sorteio
            </span>
            <h3 className="mt-3 text-xl font-black leading-tight tracking-tight truncate">{product.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs font-bold leading-relaxed text-white/70">
              {product.prizeDescription || product.description}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-white/10 p-3 text-primary">
            <span className="material-symbols-outlined">trophy</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Aprovados</p>
            <p className="mt-1 text-lg font-black text-primary">{product.approvedParticipantCount || 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Pendentes</p>
            <p className="mt-1 text-lg font-black text-amber-300">{product.pendingParticipantCount || 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Sorteio</p>
            <p className="mt-1 text-[10px] font-black text-white">{formatDate(product.drawDate)}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onOpenArea(product)}
            className="flex-1 rounded-2xl bg-primary py-3 text-[10px] font-black uppercase tracking-widest text-on-primary shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            Área do Sorteio
          </button>
          <button
            onClick={() => onEdit(product)}
            className="h-11 w-11 rounded-2xl bg-white/10 text-white border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
            title="Editar sorteio"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="h-11 w-11 rounded-2xl bg-white/10 text-error border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
            title="Excluir sorteio"
          >
            <span className="material-symbols-outlined text-[20px]">delete_outline</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminOfferCard({
  product,
  onEdit,
  onDelete
}: {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-outline-variant/10 flex gap-4 items-center min-w-0">
      <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <span className="material-symbols-outlined text-3xl">image</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-stone-800 truncate">{product.name}</h3>
          <span className="shrink-0 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-stone-100 text-stone-500">
            Oferta
          </span>
        </div>
        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-tighter">Por: {product.createdBy?.name || 'Sistema'}</p>
        <p className="text-xs text-stone-500 line-clamp-1">{product.description}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {product.isFree ? (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              Grátis
            </span>
          ) : (
            <>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                {formatCurrency(product.promotionalPrice)}
              </span>
              <span className="text-[10px] text-stone-400 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            </>
          )}
          {product.isMonthly && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              Mensal
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(product)}
          className="text-primary/70 hover:text-primary p-2 active:scale-95 transition-transform"
          title="Editar oferta"
        >
          <span className="material-symbols-outlined">edit</span>
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="text-error/50 hover:text-error p-2 active:scale-95 transition-transform"
          title="Excluir oferta"
        >
          <span className="material-symbols-outlined">delete_outline</span>
        </button>
      </div>
    </div>
  );
}

function PromotionFormModal({
  isOpen,
  editingProduct,
  formData,
  isLoading,
  onClose,
  onSubmit,
  onChange,
  onFileChange
}: {
  isOpen: boolean;
  editingProduct: any | null;
  formData: ReturnType<typeof createEmptyFormData>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onChange: (data: ReturnType<typeof createEmptyFormData>) => void;
  onFileChange: (file: File | null) => void;
}) {
  const isRaffle = formData.promotionType === 'raffle';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-xl font-bold text-stone-800 mb-6 font-primary">
              {editingProduct
                ? isRaffle ? 'Editar Sorteio' : 'Editar Oferta'
                : isRaffle ? 'Novo Sorteio' : 'Nova Oferta do App'}
            </h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl">
                {(['offer', 'raffle'] as PromotionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange({
                      ...formData,
                      promotionType: type,
                      isFree: type === 'raffle' ? true : formData.isFree,
                      isMonthly: type === 'raffle' ? false : formData.isMonthly
                    })}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.promotionType === type ? "bg-white text-primary shadow-sm" : "text-stone-400"
                    )}
                  >
                    {type === 'offer' ? 'Oferta' : 'Sorteio'}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase ml-4">{isRaffle ? 'Nome da Promoção' : 'Nome do Produto'}</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => onChange({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase ml-4">Descrição</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => onChange({ ...formData, description: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50 resize-none h-20"
                />
              </div>

              {isRaffle ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-4">Prêmios do Sorteio</label>
                    <textarea
                      required
                      value={formData.prizeDescription}
                      onChange={(e) => onChange({ ...formData, prizeDescription: e.target.value })}
                      placeholder="Ex: Prêmio 1: Tanque cheio + cesta especial"
                      className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50 resize-none h-24"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-4">Instruções para participar</label>
                    <textarea
                      value={formData.participationInstructions}
                      onChange={(e) => onChange({ ...formData, participationInstructions: e.target.value })}
                      placeholder="Ex: Clique em participar e pontue no app uma compra acima do valor mínimo. O cupom será confirmado automaticamente."
                      className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50 resize-none h-20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-400 uppercase ml-2">Compra mínima</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.minPurchaseValue}
                        onChange={(e) => onChange({ ...formData, minPurchaseValue: e.target.value })}
                        placeholder="0,00"
                        className="w-full bg-stone-100 rounded-2xl px-5 py-3 outline-none focus:ring-2 ring-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-400 uppercase ml-2">Data Sorteio</label>
                      <input
                        type="date"
                        value={formData.drawDate}
                        onChange={(e) => onChange({ ...formData, drawDate: e.target.value })}
                        className="w-full bg-stone-100 rounded-2xl px-5 py-3 outline-none focus:ring-2 ring-primary/50"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-400 uppercase ml-4">Preço De</label>
                      <input
                        required={!formData.isFree}
                        disabled={formData.isFree}
                        type="number"
                        step="0.01"
                        value={formData.isFree ? '0' : formData.originalPrice}
                        onChange={(e) => onChange({ ...formData, originalPrice: e.target.value })}
                        className={cn(
                          "w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50",
                          formData.isFree && "opacity-50 cursor-not-allowed"
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-400 uppercase ml-4">Preço Por</label>
                      <input
                        required={!formData.isFree}
                        disabled={formData.isFree}
                        type="number"
                        step="0.01"
                        value={formData.isFree ? '0' : formData.promotionalPrice}
                        onChange={(e) => onChange({ ...formData, promotionalPrice: e.target.value })}
                        className={cn(
                          "w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50",
                          formData.isFree && "opacity-50 cursor-not-allowed"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 px-2 py-2">
                    <label className="flex-1 flex items-center gap-3 p-4 bg-stone-100 rounded-2xl cursor-pointer active:scale-95 transition-transform border-2 border-transparent has-[:checked]:border-primary/20">
                      <input
                        type="checkbox"
                        checked={formData.isMonthly}
                        onChange={(e) => onChange({ ...formData, isMonthly: e.target.checked })}
                        className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-stone-800 uppercase tracking-tighter">Produto Mensal</span>
                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">Renova todo mês</span>
                      </div>
                    </label>

                    <label className="flex-1 flex items-center gap-3 p-4 bg-stone-100 rounded-2xl cursor-pointer active:scale-95 transition-transform border-2 border-transparent has-[:checked]:border-primary/20">
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => onChange({ ...formData, isFree: e.target.checked })}
                        className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-stone-800 uppercase tracking-tighter">Sem Valor</span>
                        <span className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">Ação de Brinde</span>
                      </div>
                    </label>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-2">{isRaffle ? 'Cupons p/ CPF' : 'Limite p/ CPF'}</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.limitPerCpf}
                    onChange={(e) => onChange({ ...formData, limitPerCpf: e.target.value })}
                    className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-2">{isRaffle ? 'Participar até' : 'Janela Resgate (h)'}</label>
                  {isRaffle ? (
                    <input
                      required
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => onChange({ ...formData, expiresAt: e.target.value })}
                      className="w-full bg-stone-100 rounded-2xl px-5 py-3 outline-none focus:ring-2 ring-primary/50"
                    />
                  ) : (
                    <input
                      type="number"
                      value={formData.redeemWindowHours}
                      onChange={(e) => onChange({ ...formData, redeemWindowHours: e.target.value })}
                      className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                    />
                  )}
                </div>
              </div>

              {!isRaffle && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-4">Expira em</label>
                  <input
                    required
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => onChange({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase ml-4">Imagem (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-stone-100 text-stone-600 font-bold py-4 rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-primary text-on-primary font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading
                    ? 'Salvando...'
                    : editingProduct
                      ? isRaffle ? 'Atualizar Sorteio' : 'Atualizar Oferta'
                      : isRaffle ? 'Criar Sorteio' : 'Criar Oferta'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function RaffleAreaModal({
  product,
  data,
  isLoading,
  drawResult,
  onClose,
  onDrawWinner,
  onConfirmWinners
}: {
  product: any | null;
  data: any | null;
  isLoading: boolean;
  drawResult: any | null;
  onClose: () => void;
  onDrawWinner: (winnerCount: number, redraw?: boolean) => Promise<void>;
  onConfirmWinners: () => Promise<void>;
}) {
  const participants = data?.participants || [];
  const stats = data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0, winners: 0 };
  const remainingApproved = Math.max(0, (stats.approved || 0) - (stats.winners || 0));
  const currentWinners = participants.filter((participant: any) => participant.isWinner);
  const resultWinners = drawResult?.winners?.length ? drawResult.winners : currentWinners;
  const approvedCount = stats.approved || 0;
  const maxWinnerCount = Math.max(1, approvedCount);
  const defaultWinnerCount = Math.min(getPrizeCount(product), maxWinnerCount);
  const drawDate = product?.drawDate ? new Date(product.drawDate) : null;
  const canDrawToday = !drawDate || drawDate.getTime() <= Date.now();
  const [winnerCount, setWinnerCount] = useState(defaultWinnerCount);

  useEffect(() => {
    if (product) {
      setWinnerCount(defaultWinnerCount);
    }
  }, [product?.id, defaultWinnerCount]);

  const updateWinnerCount = (value: string) => {
    const parsed = parseInt(value || '1');
    const nextValue = Number.isFinite(parsed) ? parsed : 1;
    setWinnerCount(Math.max(1, Math.min(nextValue, maxWinnerCount)));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRedraw = () => {
    const confirmed = window.confirm('Refazer o sorteio vai remover os ganhadores atuais desta promoção e gerar um novo resultado. Deseja continuar?');
    if (confirmed) {
      onDrawWinner(winnerCount, true);
    }
  };

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #raffle-print-area,
              #raffle-print-area * {
                visibility: visible !important;
              }
              #raffle-print-area {
                position: absolute !important;
                inset: 0 auto auto 0 !important;
                width: 100% !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }
            }
          `}</style>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative bg-surface-container-lowest w-full max-w-md h-[92vh] rounded-t-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
          >
            <header className="bg-white px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Área do Sorteio</p>
                <h3 className="text-xl font-black text-on-surface truncate">{product.name}</h3>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center active:scale-95 transition-transform">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['Total', stats.total || 0],
                  ['Pend.', stats.pending || 0],
                  ['Aprov.', stats.approved || 0],
                  ['Venc.', stats.winners || 0]
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-white rounded-2xl p-3 text-center border border-outline-variant/10">
                    <p className="text-lg font-black text-on-surface leading-none">{value}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-stone-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl p-5 border border-outline-variant/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Regra</p>
                    <p className="text-sm font-bold text-on-surface leading-snug">
                      {product.minPurchaseValue
                        ? `Cupom confirmado automaticamente quando o cliente pontuar no app uma compra de pelo menos ${formatCurrency(product.minPurchaseValue)}.`
                        : 'Clique no app já confirma o cupom.'}
                    </p>
                    <p className="text-[10px] text-stone-400 font-bold mt-2">Sorteio: {formatDate(product.drawDate)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50 p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-stone-400">Ganhadores</label>
                      <input
                        type="number"
                        min={1}
                        max={maxWinnerCount}
                        value={winnerCount}
                        onChange={(event) => updateWinnerCount(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-lg font-black text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={() => onDrawWinner(winnerCount, false)}
                      disabled={isLoading || !canDrawToday || remainingApproved < winnerCount}
                      className="shrink-0 bg-green-500 text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-40"
                    >
                      Sortear
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] font-bold text-stone-400 leading-relaxed">
                    {!canDrawToday
                      ? `Disponível apenas na data do sorteio: ${formatDate(product.drawDate)}.`
                      : remainingApproved < winnerCount
                        ? `Há ${remainingApproved} participante(s) aprovado(s) ainda não sorteado(s).`
                        : `${approvedCount} participante(s) aprovado(s) podem entrar no sorteio.`}
                  </p>
                </div>
              </div>

              {resultWinners.length > 0 && (
                <div className="space-y-4">
                  <div
                    id="raffle-print-area"
                    className="rounded-[2rem] bg-stone-950 text-white p-6 shadow-2xl shadow-stone-900/20 border border-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Resultado Oficial</p>
                        <h4 className="mt-2 text-2xl font-black leading-none">{product.name}</h4>
                        <p className="mt-2 text-xs font-bold text-white/55">Sorteio realizado em {formatDate(resultWinners[0]?.drawnAt || drawResult?.drawnAt || new Date().toISOString())}</p>
                      </div>
                      <span className="material-symbols-outlined text-primary text-4xl">emoji_events</span>
                    </div>

                    <div className="mt-6 space-y-3">
                      {resultWinners.map((winner: any, index: number) => (
                        <div key={winner.id} className="rounded-2xl bg-white/10 border border-white/10 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">{index + 1}º ganhador</p>
                          <h5 className="mt-1 text-lg font-black leading-tight">{winner.customerName || 'Cliente San Remo'}</h5>
                          <p className="mt-1 text-xs font-bold text-white/60">
                            CPF {formatCpf(winner.userCpf)} • Cupom {winner.couponNumber || winner.id}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-widest text-white/45">
                      San Remo Bônus • Participantes confirmados por pontuação do app
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handlePrint}
                      className="rounded-2xl bg-primary text-on-primary px-3 py-3 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Print
                    </button>
                    <button
                      onClick={onConfirmWinners}
                      disabled={isLoading}
                      className="rounded-2xl bg-green-500 text-white px-3 py-3 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-40"
                    >
                      Validar
                    </button>
                    <button
                      onClick={handleRedraw}
                      disabled={isLoading || !canDrawToday || approvedCount < winnerCount}
                      className="rounded-2xl bg-stone-900 text-white px-3 py-3 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-40"
                    >
                      Refazer
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-1">Dados dos ganhadores</h4>
                    {resultWinners.map((winner: any, index: number) => (
                      <div key={`details-${winner.id}`} className="rounded-3xl bg-white p-4 border border-outline-variant/10 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">{index + 1}º ganhador</p>
                            <h5 className="font-black text-on-surface truncate">{winner.customerName || 'Cliente San Remo'}</h5>
                          </div>
                          <span className="rounded-full bg-green-100 text-green-700 px-3 py-2 text-[9px] font-black uppercase tracking-widest">
                            Sorteado
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-stone-600">
                          <p className="rounded-xl bg-stone-50 p-3">CPF<br /><span className="text-on-surface">{formatCpf(winner.userCpf)}</span></p>
                          <p className="rounded-xl bg-stone-50 p-3">Telefone<br /><span className="text-on-surface">{formatPhone(winner.customerPhone)}</span></p>
                          <p className="rounded-xl bg-stone-50 p-3">Cupom<br /><span className="text-on-surface">{winner.couponNumber || winner.id}</span></p>
                          <p className="rounded-xl bg-stone-50 p-3">Compra<br /><span className="text-on-surface">{winner.purchaseAmount ? formatCurrency(winner.purchaseAmount) : 'Confirmada'}</span></p>
                        </div>
                        <p className="mt-2 rounded-xl bg-stone-50 p-3 text-xs font-bold text-stone-600">
                          E-mail<br /><span className="text-on-surface break-words">{winner.customerEmail || 'E-mail não informado'}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && !data ? (
                <div className="py-16 text-center text-stone-400 font-bold text-sm">Carregando participantes...</div>
              ) : participants.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-outline-variant/10">
                  <span className="material-symbols-outlined text-4xl text-stone-200">person_add</span>
                  <p className="text-sm text-stone-400 font-bold mt-2">Nenhum participante ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant: any) => {
                    const statusMeta = getParticipantStatusMeta(participant.validationStatus, participant.isWinner);
                    return (
                      <div key={participant.id} className="bg-white rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-black text-on-surface truncate">{participant.customerName || 'Cliente San Remo'}</h4>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{formatCpf(participant.userCpf)}</p>
                            <p className="text-[10px] text-stone-400 font-bold mt-1">
                              {participant.couponNumber ? `Cupom ${participant.couponNumber}` : 'Cupom pendente'}
                            </p>
                          </div>
                          <span className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest", statusMeta.className)}>
                            <span className="material-symbols-outlined text-[14px]">{statusMeta.icon}</span>
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="mt-4 rounded-2xl bg-stone-50 border border-stone-100 p-4 flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                            {participant.validationStatus === 'approved' ? 'verified' : 'sync'}
                          </span>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Validação</p>
                            <p className="text-xs font-bold text-stone-700 leading-relaxed">
                              {participant.validationStatus === 'approved'
                                ? participant.purchaseAmount
                                  ? `Confirmado automaticamente por compra pontuada de ${formatCurrency(participant.purchaseAmount)}.`
                                  : 'Cupom confirmado automaticamente.'
                                : participant.validationStatus === 'rejected'
                                  ? 'Participação não validada.'
                                  : `Aguardando pontuação de pelo menos ${formatCurrency(product.minPurchaseValue)}.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
