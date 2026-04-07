import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FidelimaxApiService } from '../../api/fidelimax';
import { Reward } from '../../models/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StatusModal } from '../../components/StatusModal';

export function AdminPoints() {
  const { collaborators, fetchCollaborators, addCollaborator, updateCollaborator, deleteCollaborator, user, isLoading } = useAppStore();
  const [query, setQuery] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activationProducts, setActivationProducts] = useState<any[]>([]);
  const [rewardSearch, setRewardSearch] = useState('');
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  
  // Permissions Check
  const permissions = user?.permissions?.split(',') || [];
  const isAdmin = user?.role === 'admin';
  const canPoints = isAdmin || permissions.includes('points');
  const canRewards = isAdmin || permissions.includes('rewards');
  const canRedeemActivations = isAdmin || permissions.includes('redeem_activations');

  const [activeTab, setActiveTab] = useState<'credit' | 'redeem'>(canPoints ? 'credit' : 'redeem');
  
  // Point crediting state
  const [pointsAmount, setPointsAmount] = useState('');
  const [isCrediting, setIsCrediting] = useState(false);
  
  // Redemption state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [selectedActivationGroup, setSelectedActivationGroup] = useState<any | null>(null);
  const [redeemQty, setRedeemQty] = useState(1);
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  // Modals
  const [showConfirmRedeem, setShowConfirmRedeem] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean, type: 'success' | 'error', title: string, message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rewardsList, activationsList] = await Promise.all([
          FidelimaxApiService.getRewards(),
          FidelimaxApiService.getActivationProducts()
        ]);
        setRewards(rewardsList);
        setActivationProducts(activationsList);
      } catch (error) {
        console.error('Failed to fetch admin data', error);
      }
    };
    fetchData();
  }, []);

  const formatInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // CPF Mask: 000.000.000-00
    if (numbers.length <= 11 && (value.length <= 14 || !value.includes('('))) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    
    // Phone Mask: (00) 00000-0000
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInput(e.target.value);
    setQuery(formatted);
  };

  const filteredRewards = rewards.filter(r => 
    r.name.toLowerCase().includes(rewardSearch.toLowerCase())
  );

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!query) return;
    
    setIsLoadingCustomer(true);
    setCustomer(null);
    try {
      const data = await FidelimaxApiService.searchCustomer(query);
      if (data) {
        setCustomer(data);
      } else {
        setNotification({
          show: true,
          type: 'error',
          title: 'Não encontrado',
          message: 'Cliente não localizado no Fidelimax com os dados informados.'
        });
      }
    } catch (error) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Erro na busca',
        message: 'Ocorreu um erro ao consultar o cliente. Verifique sua conexão e chave API.'
      });
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  const handleCreditPoints = async () => {
    if (!customer || !pointsAmount) return;
    
    setIsCrediting(true);
    try {
      const success = await FidelimaxApiService.creditPoints(customer.cpf, parseFloat(pointsAmount));
      if (success) {
        setNotification({
          show: true,
          type: 'success',
          title: 'Pontuação Realizada',
          message: `R$ ${pointsAmount} em compras foram convertidos em pontos para ${customer.nome}.`
        });
        setPointsAmount('');
        // Refresh customer data
        handleSearch();
      }
    } catch (error) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Falha na Pontuação',
        message: 'Não foi possível creditar os pontos no momento.'
      });
    } finally {
      setIsCrediting(false);
    }
  };

  const handleRedeemReward = async () => {
    if (!customer || !selectedReward) return;
    
    setIsRedeeming(true);
    try {
      const voucher = await FidelimaxApiService.adminRedeemReward(customer.cpf, selectedReward.id);
      setNotification({
        show: true,
        type: 'success',
        title: 'Resgate Concluído',
        message: `O prêmio "${selectedReward.name}" foi resgatado. Código do Voucher: ${voucher}`
      });
      setShowConfirmRedeem(false);
      setSelectedReward(null);
      // Refresh customer data
      handleSearch();
    } catch (error: any) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Erro no Resgate',
        message: error.message || 'Saldo insuficiente ou erro na API Fidelimax.'
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleRedeemActivation = async () => {
    if (!customer || !selectedActivationGroup) return;
    
    setIsRedeeming(true);
    try {
      await FidelimaxApiService.redeemBulkActivation({
        productId: selectedActivationGroup.productId,
        userCpf: customer.cpf,
        quantity: redeemQty
      });
      
      setNotification({
        show: true,
        type: 'success',
        title: 'Ativação Resgatada',
        message: `${redeemQty} unidade(s) de "${selectedActivationGroup.productName}" foram marcadas como entregues.`
      });
      setSelectedActivationGroup(null);
      setRedeemQty(1);
      // Refresh customer data (this will also refresh activations)
      handleSearch();
    } catch (error: any) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Erro no Resgate',
        message: 'Não foi possível processar o resgate da ativação.'
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Gerenciar Pontos</h2>

      {/* Search Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">search</span>
            <input 
              type="text" 
              placeholder="CPF ou Telefone..."
              value={query}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border-2 border-surface-container-high rounded-xl text-sm font-bold focus:border-primary outline-none transition-all"
            />
          </div>
            <button 
              type="submit"
              disabled={isLoadingCustomer}
              className="bg-primary text-on-primary px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoadingCustomer ? '...' : 'Buscar'}
            </button>
        </form>
      </div>

      {/* Customer Info Card */}
      <AnimatePresence mode="wait">
        {customer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10"
          >
            <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div>
                <h3 className="font-black text-on-surface text-xl sm:text-2xl mb-1">{customer.nome}</h3>
                <p className="text-secondary text-sm font-black uppercase tracking-tight opacity-70">
                  {customer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")} • {customer.category}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black text-primary uppercase tracking-widest">Saldo Atual</span>
                <div className="text-2xl font-black text-primary leading-none">{customer.points} <span className="text-xs">pts</span></div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-outline-variant/10">
              {canPoints && (
                <button 
                  onClick={() => setActiveTab('credit')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'credit' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  Atribuir Pontos
                </button>
              )}
              {(canRewards || canRedeemActivations) && (
                <button 
                  onClick={() => setActiveTab('redeem')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'redeem' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  Resgates
                </button>
              )}
            </div>

            <div className="p-6">
              {activeTab === 'credit' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 px-1">Valor da Compra (R$)</label>
                    <input 
                      type="number" 
                      placeholder="0,00"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                      className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-4 px-4 text-xl font-black focus:border-primary outline-none transition-all"
                    />
                    <p className="mt-2 text-[10px] text-secondary/60 italic px-1">
                      O valor será convertido automaticamente em pontos seguindo as regras do Fidelimax.
                    </p>
                  </div>
                  <button 
                    onClick={handleCreditPoints}
                    disabled={isCrediting || !pointsAmount}
                    className="w-full bg-primary text-on-primary py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isCrediting ? 'Processando...' : 'Confirmar Pontuação'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* APP Activations Section */}
                  {canRedeemActivations && (
                    <div>
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 px-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        Ativações do App (Ofertas)
                      </h4>
                      <p className="text-[9px] text-stone-400 italic mb-3 px-1">
                        O cliente deve ativar a oferta no aplicativo antes do resgate ser liberado aqui.
                      </p>

                      <div className="space-y-2">
                        {activationProducts.map((product, idx) => {
                          const userActivations = (customer.activations || []).filter((a: any) => a.productId === product.id);
                          const count = userActivations.length;
                          const isActivated = count > 0;
                          const validUntil = isActivated ? userActivations[0].validUntil : null;

                          return (
                            <div 
                              key={product.id || `act-prod-${idx}`} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                isActivated 
                                  ? "bg-stone-900 text-white border-stone-800 shadow-lg shadow-stone-900/10" 
                                  : "bg-white text-stone-400 border-stone-100 opacity-60"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden",
                                  isActivated ? "bg-white/10" : "bg-stone-100"
                                )}>
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="material-symbols-outlined opacity-40 text-sm">local_offer</span>
                                  )}
                                </div>
                                <div>
                                  <h5 className={cn("text-xs font-bold truncate max-w-[120px]", isActivated ? "text-white" : "text-stone-600")}>
                                    {product.name}
                                  </h5>
                                  <div className="flex flex-col">
                                    {isActivated ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-primary text-on-primary px-1.5 rounded-md font-black">{count} disp.</span>
                                        <span className="text-[9px] opacity-40 tracking-tight">Válido: {new Date(validUntil!).toLocaleDateString()}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] font-black text-error uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">warning</span>
                                        PENDENTE: ATIVAR NO APP
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <button 
                                disabled={!isActivated}
                                onClick={() => {
                                  setSelectedActivationGroup({
                                    productId: product.id,
                                    productName: product.name,
                                    imageUrl: product.imageUrl,
                                    count: count
                                  });
                                  setRedeemQty(1);
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                  isActivated 
                                    ? "bg-primary text-on-primary hover:opacity-90 active:scale-95" 
                                    : "bg-stone-100 text-stone-300 cursor-not-allowed"
                                )}
                              >
                                Baixar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fidelimax Rewards Section */}
                  {canRewards && (
                    <div>
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">redeem</span>
                        Prêmios Fidelimax
                      </h4>
                      {/* Reward Filter */}
                      <div className="relative mb-3">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">filter_list</span>
                        <input 
                          type="text" 
                          placeholder="Filtrar prêmios..."
                          value={rewardSearch}
                          onChange={(e) => setRewardSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold focus:border-primary outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredRewards.length === 0 ? (
                          <p className="text-center py-8 text-stone-400 font-bold text-sm italic">
                            {rewardSearch ? 'Nenhum prêmio encontrado para esta busca.' : 'Nenhum prêmio disponível.'}
                          </p>
                        ) : (
                          filteredRewards.map((reward, idx) => (
                            <div key={reward.id || `reward-${idx}`} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-surface-container-high group transition-all hover:border-primary/30">
                              <div className="flex items-center gap-3">
                                <img src={reward.imageUrl} alt={reward.name} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                                <div>
                                  <h4 className="text-sm font-bold text-on-surface line-clamp-1">{reward.name}</h4>
                                  <span className="text-xs font-black text-primary">{reward.pointsRequired} pts</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedReward(reward);
                                  setShowConfirmRedeem(true);
                                }}
                                disabled={customer.points < reward.pointsRequired}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  customer.points >= reward.pointsRequired 
                                    ? 'bg-primary/10 text-primary hover:bg-primary hover:text-on-primary' 
                                    : 'bg-stone-100 text-stone-400 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                Resgatar
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!customer && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-40">
          <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-stone-400">person_search</span>
          </div>
          <p className="text-sm font-bold text-stone-500 uppercase tracking-widest">Aguardando busca de cliente</p>
          <p className="text-[10px] mt-2 max-w-[200px]">Informe o CPF ou Telefone no topo para carregar o perfil e realizar ações.</p>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showConfirmRedeem || !!selectedActivationGroup}
        onClose={() => {
          setShowConfirmRedeem(false);
          setSelectedActivationGroup(null);
          setRedeemQty(1);
        }}
        onConfirm={selectedActivationGroup ? handleRedeemActivation : handleRedeemReward}
        title={selectedActivationGroup ? "Confirmar Resgate de Ativação" : "Confirmar Resgate"}
        message={
          <div>
            {selectedActivationGroup ? (
              <>
                <p className="mb-4">Quantas unidades de <b>{selectedActivationGroup.productName}</b> serão resgatadas?</p>
                <div className="flex items-center justify-center gap-4 bg-stone-50 p-4 rounded-2xl border-2 border-stone-100">
                  <button 
                    onClick={() => setRedeemQty(Math.max(1, redeemQty - 1))}
                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-stone-200 flex items-center justify-center font-black active:scale-90 transition-all"
                  >
                    -
                  </button>
                  <span className="text-2xl font-black min-w-[40px]">{redeemQty}</span>
                  <button 
                    onClick={() => setRedeemQty(Math.min(selectedActivationGroup.count, redeemQty + 1))}
                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-stone-200 flex items-center justify-center font-black active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
                <p className="mt-3 text-[10px] text-stone-400 italic">Disponível para este cliente: {selectedActivationGroup.count} unidades</p>
              </>
            ) : (
              `Deseja realmente resgatar o prêmio "${selectedReward?.name}" para o cliente ${customer?.nome}? Isso consumirá ${selectedReward?.pointsRequired} pontos.`
            )}
          </div>
        }
        confirmText={selectedActivationGroup ? "Confirmar Entrega" : "Confirmar Resgate"}
        cancelText="Voltar"
        type={selectedActivationGroup ? "success" : "warning"}
        isLoading={isRedeeming}
      />

      <StatusModal
        isOpen={notification.show}
        onClose={() => setNotification({ ...notification, show: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}
