import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { ConfirmModal } from '../../components/ConfirmModal';

export function AdminActivationProducts() {
  const { activationProducts, fetchActivationProducts, addActivationProduct, updateActivationProduct, deleteActivationProduct, isLoading } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    originalPrice: '',
    promotionalPrice: '',
    limitPerCpf: '1',
    redeemWindowHours: '24',
    expiresAt: '',
    isMonthly: false,
    isFree: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchActivationProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateActivationProduct(editingProduct.id, formData, selectedFile || undefined);
      } else {
        await addActivationProduct(formData, selectedFile || undefined);
      }
      setIsAdding(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        originalPrice: '',
        promotionalPrice: '',
        limitPerCpf: '1',
        redeemWindowHours: '24',
        expiresAt: '',
        isMonthly: false,
        isFree: false
      });
      setSelectedFile(null);
    } catch (error) {
      alert('Erro ao salvar produto');
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice.toString(),
      promotionalPrice: product.promotionalPrice.toString(),
      limitPerCpf: product.limitPerCpf.toString(),
      redeemWindowHours: product.redeemWindowHours.toString(),
      expiresAt: product.expiresAt.split('T')[0],
      isMonthly: product.isMonthly || false,
      isFree: product.isFree || false
    });
    setIsAdding(true);
  };

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-800">Ofertas de Ativação</h2>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: '',
              description: '',
              originalPrice: '',
              promotionalPrice: '',
              limitPerCpf: '1',
              redeemWindowHours: '24',
              expiresAt: ''
            });
            setIsAdding(true);
          }}
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      <div className="grid gap-4">
        {activationProducts.map((product, index) => (
          <motion.div
            key={product.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-4 shadow-sm border border-outline-variant/10 flex gap-4 items-center min-w-0"
          >
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
              <h3 className="font-bold text-stone-800 truncate">{product.name}</h3>
              <p className="text-[10px] text-primary/70 font-bold uppercase tracking-tighter">Por: {product.createdBy?.name || 'Sistema'}</p>
              <p className="text-xs text-stone-500 line-clamp-1">{product.description}</p>
              <div className="flex items-center gap-2 mt-1">
                {product.isFree ? (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                    Grátis
                  </span>
                ) : (
                  <>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      R$ {parseFloat(product.promotionalPrice).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-stone-400 line-through">
                      R$ {parseFloat(product.originalPrice).toFixed(2)}
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
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleEdit(product)}
                className="text-primary/70 hover:text-primary p-2 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                onClick={() => setProductToDelete(product.id)}
                className="text-error/50 hover:text-error p-2 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined">delete_outline</span>
              </button>
            </div>
          </motion.div>
        ))}
        {activationProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-stone-200 mb-2">inventory_2</span>
            <p className="text-stone-400 text-sm">Nenhuma oferta ativa</p>
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
        title="Excluir Oferta?"
        message="Tem certeza que deseja excluir esta oferta promocional? Esta ação não pode ser desfeita."
        type="danger"
        confirmText="Sim, Excluir"
        isLoading={isLoading}
      />

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-xl font-bold text-stone-800 mb-6 font-primary">
                {editingProduct ? 'Editar Oferta' : 'Nova Oferta'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-4">Nome do Produto</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-4">Descrição</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50 resize-none h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-4">Preço De</label>
                    <input
                      required={!formData.isFree}
                      disabled={formData.isFree}
                      type="number"
                      step="0.01"
                      value={formData.isFree ? '0' : formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, promotionalPrice: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, isMonthly: e.target.checked })}
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
                      onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                      className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-stone-800 uppercase tracking-tighter">Sem Valor</span>
                      <span className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">Ação de Brinde</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-2">Limite p/ CPF</label>
                    <input
                      type="number"
                      value={formData.limitPerCpf}
                      onChange={(e) => setFormData({ ...formData, limitPerCpf: e.target.value })}
                      className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-2">Janela Resgate (h)</label>
                    <input
                      type="number"
                      value={formData.redeemWindowHours}
                      onChange={(e) => setFormData({ ...formData, redeemWindowHours: e.target.value })}
                      className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-4">Expira em</label>
                  <input
                    required
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-stone-100 rounded-2xl px-6 py-3 outline-none focus:ring-2 ring-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-4">Imagem (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 bg-stone-100 text-stone-600 font-bold py-4 rounded-2xl active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] bg-primary text-on-primary font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Salvando...' : editingProduct ? 'Atualizar Oferta' : 'Criar Oferta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
