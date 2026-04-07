import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { motion } from 'motion/react';
import { ConfirmModal } from '../../components/ConfirmModal';

export function AdminStories() {
  const { stories, addStory, deleteStory, fetchStories, fetchActivationProducts, activationProducts, isLoading } = useAppStore();
  const [title, setTitle] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
    fetchActivationProducts();
  }, [fetchStories, fetchActivationProducts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      
      // Validate Video Duration (max 1 minute)
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          if (video.duration > 61) { // 1m tolerance
            setError('O vídeo deve ter no máximo 1 minuto.');
            setMediaFile(null);
            setPreviewUrl(null);
          } else {
            setMediaFile(file);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));
          }
        };
        video.src = URL.createObjectURL(file);
      } else {
        setMediaFile(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title && mediaFile) {
      await addStory({ 
        title, 
        file: mediaFile, 
        productId: selectedProductId || undefined 
      });
      setTitle('');
      setSelectedProductId('');
      setMediaFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const isVideo = mediaFile?.type.startsWith('video/');

  return (
    <div className="">
      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-6">Gerenciar Stories</h2>

      {/* Add Story Form */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 mb-8 border border-outline-variant/10 shadow-sm"
      >
        <h3 className="text-on-surface font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">add_circle</span>
          Novo Story
        </h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Título do Story</label>
            <input
              type="text"
              placeholder="Ex: Promoção do Dia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-stone-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Vincular Produto (Opcional)</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
            >
              <option value="">Nenhum produto vinculado</option>
              {activationProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - R$ {product.promotionalPrice.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-error-container/20 border border-error/20 p-3 rounded-xl flex items-center gap-2 text-error text-xs font-bold"
            >
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-outline-variant/30 rounded-2xl cursor-pointer hover:bg-surface-container-low transition-colors group">
              <span className="material-symbols-outlined text-stone-400 group-hover:text-primary mb-1">upload</span>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Upload</span>
              <p className="text-[8px] text-stone-400 font-bold">Máx 1 min</p>
              <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
            </label>
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-outline-variant/30 rounded-2xl cursor-pointer hover:bg-surface-container-low transition-colors group">
              <span className="material-symbols-outlined text-stone-400 group-hover:text-primary mb-1">videocam</span>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest font-black">Gravar</span>
              <p className="text-[8px] text-stone-400 font-bold">1 min</p>
              <input type="file" className="hidden" accept="video/*" capture="environment" onChange={handleFileChange} />
            </label>
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-outline-variant/30 rounded-2xl cursor-pointer hover:bg-surface-container-low transition-colors group">
              <span className="material-symbols-outlined text-stone-400 group-hover:text-primary mb-1">photo_camera</span>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest font-black">Foto</span>
              <p className="text-[8px] text-stone-400 font-bold">Direto</p>
              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
            </label>
          </div>

          {/* Media Preview */}
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-outline-variant/20 relative shadow-inner bg-black aspect-[9/16] max-h-60 mx-auto">
              {isVideo ? (
                <video src={previewUrl} className="w-full h-full object-contain" autoPlay loop muted playsInline />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              )}
              <button 
                type="button"
                onClick={() => {
                  setMediaFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !title || !mediaFile}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-sm shadow-lg shadow-primary/20 mt-4"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-on-tertiary/30 border-t-on-tertiary rounded-full animate-spin" /> : 'PUBLICAR AGORA'}
          </button>
        </form>
      </motion.div>

      {/* Stories List */}
      <h3 className="text-on-surface font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">amp_stories</span>
        Stories Ativos ({stories.length})
      </h3>
      
      <div className="space-y-3">
        {stories.map((story, index) => {
          const expiresDate = new Date(story.expiresAt);
          const isExpiringSoon = (story.expiresAt - Date.now()) < (2 * 60 * 60 * 1000); // 2 hours

          return (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-3 flex items-center justify-between border border-outline-variant/10 shadow-sm group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-primary-container relative bg-black">
                  {story.type === 'video' ? (
                    <video src={story.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={story.url} alt={story.title} className="w-full h-full object-cover" />
                  )}
                  {story.type === 'video' && (
                    <span className="absolute bottom-1 right-1 material-symbols-outlined text-[12px] text-white bg-black/50 rounded-full p-0.5">videocam</span>
                  )}
                </div>
                <div>
                  <p className="text-on-surface font-bold text-sm tracking-tight">{story.title}</p>
                  <p className="text-[9px] text-primary/70 font-bold uppercase tracking-tighter">Por: {story.createdBy?.name || 'Sistema'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isExpiringSoon ? 'bg-error animate-pulse' : 'bg-green-500'}`} />
                    <p className="text-secondary text-[10px] font-bold uppercase tracking-wider">
                      Expira em {expiresDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {story.productId && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[12px] text-primary">link</span>
                      <p className="text-primary text-[10px] font-bold truncate max-w-[150px]">
                        Link: {activationProducts.find(p => p.id === story.productId)?.name || 'Produto vinculado'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setStoryToDelete(story.id)}
                disabled={isLoading}
                className="p-2 text-stone-300 hover:text-error hover:bg-error-container rounded-full transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </motion.div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={!!storyToDelete}
        onClose={() => setStoryToDelete(null)}
        onConfirm={async () => {
          if (storyToDelete) {
            await deleteStory(storyToDelete);
            setStoryToDelete(null);
          }
        }}
        title="Excluir Story?"
        message="Tem certeza que deseja remover este story? Ele deixará de ser exibido para os usuários imediatamente."
        type="danger"
        confirmText="Sim, Remover"
        isLoading={isLoading}
      />
    </div>
  );
}
