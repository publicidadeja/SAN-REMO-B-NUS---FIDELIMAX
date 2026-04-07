import { useAppStore } from '../../store/useAppStore';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { ConfirmModal } from '../../components/ConfirmModal';

export function AdminPamphlets() {
  const { pamphletImages, uploadPamphletImage, deletePamphletImage, fetchPamphletImages, isLoading } = useAppStore();
  const [saved, setSaved] = useState(false);
  const [imageIdToDelete, setImageIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPamphletImages();
  }, [fetchPamphletImages]);

  const handleDeleteConfirm = async () => {
    if (imageIdToDelete) {
      setIsDeleting(true);
      try {
        await deletePamphletImage(imageIdToDelete);
        setImageIdToDelete(null);
      } catch (err) {
        alert('Falha ao excluir imagem');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Gerenciar Encarte</h2>
          <p className="text-secondary font-medium text-sm">Visualize e atualize as ofertas da semana.</p>
        </div>
        {saved && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Atualizado com sucesso!
          </motion.div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-outline-variant/10 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <div>
            <h4 className="text-on-surface font-black text-base">Carrossel de Ofertas</h4>
            <p className="text-secondary text-xs">As imagens abaixo aparecem em sequência para os clientes.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pamphletImages.map((img) => (
            <div key={img.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-outline-variant/20 shadow-sm group bg-stone-100">
              <img src={img.url} alt="Página" className="w-full h-full object-contain" />
              <button 
                onClick={() => setImageIdToDelete(img.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-error text-white rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200 z-20"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-black text-center py-2 backdrop-blur-sm">
                Página {img.order}
              </div>
            </div>
          ))}
          
          <div className="relative aspect-[3/4] border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center bg-surface-container-lowest hover:border-primary/50 transition-colors group">
            <input 
              type="file" 
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    await uploadPamphletImage(file);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 3000);
                  } catch (err) {
                    alert('Falha ao subir imagem');
                  }
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-stone-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors mb-2">
              <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
            </div>
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Adicionar Página</span>
          </div>
        </div>

        {pamphletImages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-outline-variant/10 rounded-3xl">
            <span className="material-symbols-outlined text-4xl text-stone-200 mb-4 font-light">upcoming</span>
            <p className="text-stone-400 text-sm font-medium">Nenhuma imagem cadastrada no encarte.</p>
            <p className="text-stone-300 text-[10px] mt-1 uppercase tracking-widest font-black">Clique em "Adicionar" para começar</p>
          </div>
        )}
      </div>

      <div className="bg-surface-container-low rounded-2xl p-6 flex items-start gap-4 border border-outline-variant/10">
        <span className="material-symbols-outlined text-primary mt-0.5">info</span>
        <div>
          <h4 className="text-on-surface font-bold text-sm mb-1">Dica de Visualização</h4>
          <p className="text-on-surface-variant text-xs leading-relaxed">
            As imagens são exibidas em um carrossel na tela inicial dos clientes. Recomendamos o uso de imagens no formato vertical (tipo Story do Instagram) para melhor aproveitamento da tela.
          </p>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!imageIdToDelete}
        onClose={() => setImageIdToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Página"
        message="Tem certeza que deseja excluir esta página do encarte? Esta ação é permanente e removerá o arquivo do servidor."
        type="danger"
        confirmText="Excluir Agora"
        isLoading={isDeleting}
      />
    </div>
  );
}
