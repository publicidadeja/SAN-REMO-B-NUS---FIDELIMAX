import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import axios from 'axios';
import { ConfirmModal } from '../../components/ConfirmModal';

export function AdminNotifications() {
  const { token, fetchAdminNotifications, deleteNotification } = useAppStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'GLOBAL' | 'SPECIFIC'>('GLOBAL');
  const [userCpf, setUserCpf] = useState('');
  const [broadcastType, setBroadcastType] = useState<'both' | 'push' | 'internal'>('both');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadHistory = async () => {
    setIsRefreshing(true);
    const data = await fetchAdminNotifications();
    setHistory(data);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('message', message);
      formData.append('userCpf', targetType === 'SPECIFIC' ? userCpf.replace(/\D/g, '') : '__GLOBAL__');
      formData.append('broadcastType', broadcastType);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await axios.post('/api/admin/notifications', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setStatus({ type: 'success', text: 'Notificação enviada com sucesso!' });
        setTitle('');
        setMessage('');
        setUserCpf('');
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        loadHistory();
      } else {
        throw new Error(response.data.error || 'Erro ao enviar');
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ 
        type: 'error', 
        text: err.response?.data?.error || err.message || 'Falha na conexão com o servidor' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteNotification(id);
      setNotificationToDelete(null);
      loadHistory();
    } catch (error) {
      alert('Erro ao excluir notificação');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pb-8">
      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-6">Central de Avisos</h2>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 mb-8 border border-outline-variant/10 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[28px]">campaign</span>
          </div>
          <div>
            <h3 className="text-on-surface font-black text-lg leading-none">Criar Nova Mensagem</h3>
            <p className="text-secondary text-xs font-medium mt-1">Envie alertas para todos ou clientes específicos</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          {/* Status Message */}
          {status && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border",
                status.type === 'success' 
                  ? "bg-green-50 border-green-200 text-green-700" 
                  : "bg-error-container/20 border-error/20 text-error"
              )}
            >
              <span className="material-symbols-outlined text-[20px]">
                {status.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {status.text}
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-2 px-1">Enviar para:</label>
              <div className="flex gap-2 p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setTargetType('GLOBAL')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    targetType === 'GLOBAL' ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-secondary"
                  )}
                >
                  Todos os Clientes
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('SPECIFIC')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    targetType === 'SPECIFIC' ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-secondary"
                  )}
                >
                  CPF Específico
                </button>
              </div>
            </div>

            {targetType === 'SPECIFIC' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="col-span-2"
              >
                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-2 px-1">CPF do Cliente</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={userCpf}
                  onChange={(e) => setUserCpf(e.target.value)}
                  className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-5 py-4 text-sm text-on-surface placeholder:text-stone-300 focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-bold"
                  required={targetType === 'SPECIFIC'}
                />
              </motion.div>
            )}

            <div className="col-span-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-2 px-1">Tipo de Envio</label>
              <div className="grid grid-cols-3 gap-2">
                {(['both', 'push', 'internal'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBroadcastType(type)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                      broadcastType === type 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-outline-variant/10 bg-surface-container-low text-stone-400 opacity-60 grayscale"
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {type === 'both' ? 'send_and_archive' : type === 'push' ? 'notifications_active' : 'info'}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">
                      {type === 'both' ? 'Ambos' : type === 'push' ? 'Push (Celular)' : 'App (Interno)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-2 px-1">Título do Alerta</label>
              <input
                type="text"
                placeholder="Ex: Novo Encarte Disponível!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-5 py-4 text-sm text-on-surface placeholder:text-stone-300 focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-black"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-2 px-1">Mensagem</label>
              <textarea
                placeholder="Descreva o que o cliente verá ao abrir a notificação..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-5 py-4 text-sm text-on-surface placeholder:text-stone-300 focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-medium resize-none"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-2 px-1">Imagem Anexa (Opcional)</label>
              <div className="flex gap-4 items-center">
                <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant/30 rounded-2xl cursor-pointer hover:bg-surface-container-low transition-colors group bg-surface-container-low/50">
                  <span className="material-symbols-outlined text-stone-400 group-hover:text-primary mb-1">add_photo_alternate</span>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Selecionar Imagem</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
                
                {imagePreview && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/20 relative shrink-0 shadow-sm bg-stone-100">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full hover:bg-black transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !title || !message || (targetType === 'SPECIFIC' && !userCpf)}
            className="w-full bg-primary text-on-primary font-black py-5 rounded-[1.5rem] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-3 text-sm shadow-xl shadow-primary/30 mt-4 uppercase tracking-[0.1em]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">send</span>
                Disparar Notificação
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Preview Section */}
      <div className="px-2">
        <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] block mb-4 px-1">Pré-visualização (App)</h4>
        <div className="bg-white rounded-[2rem] p-5 border border-outline-variant/10 shadow-sm relative grayscale-[0.5] opacity-80 scale-[0.98]">
           <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <span className="material-symbols-outlined">
                  {broadcastType === 'push' ? 'notifications_active' : 'campaign'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h5 className="font-black text-sm text-on-surface leading-tight pr-4">
                    {title || 'Título da Mensagem'}
                  </h5>
                  <span className="text-[9px] font-bold text-stone-300 uppercase shrink-0">Agora</span>
                </div>
                <p className="text-secondary text-xs leading-relaxed line-clamp-2">
                  {message || 'O conteúdo da sua mensagem aparecerá aqui para o cliente.'}
                </p>

                {imagePreview && (
                  <div className="mt-3 w-full aspect-video rounded-xl overflow-hidden border border-outline-variant/10 bg-stone-100">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* History Section */}
      <div className="mt-12 bg-white rounded-[2.5rem] p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[28px]">history</span>
            </div>
            <div>
              <h3 className="text-on-surface font-black text-lg leading-none">Histórico de Envios</h3>
              <p className="text-secondary text-xs font-medium mt-1">Gerencie as notificações enviadas anteriormente</p>
            </div>
          </div>
          <button 
            onClick={loadHistory} 
            disabled={isRefreshing}
            className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            <span className={cn("material-symbols-outlined text-[20px]", isRefreshing && "animate-spin")}>sync</span>
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {history.length === 0 ? (
              <div className="text-center py-12 text-stone-400 font-medium italic">Nenhuma notificação enviada ainda.</div>
            ) : (
              history.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-4 p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm shrink-0">
                    <span className="material-symbols-outlined">
                      {item.type === 'announcement' ? 'campaign' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-sm text-on-surface truncate pr-2">{item.title}</h4>
                      <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-secondary truncate">{item.message}</p>
                    <div className="flex gap-2 mt-2">
                       <span className={cn(
                         "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
                         item.userCpf === '__GLOBAL__' ? "bg-indigo-50 text-indigo-600" : "bg-primary/10 text-primary"
                       )}>
                         {item.userCpf === '__GLOBAL__' ? 'Global' : `CPF: ${item.userCpf}`}
                       </span>
                       <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-green-50 text-green-600 flex items-center gap-1">
                         <span className="material-symbols-outlined text-[10px]">visibility</span>
                         {item.readCount || 0} {item.readCount === 1 ? 'Visualização' : 'Visualizações'}
                       </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotificationToDelete(item.id)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-error hover:bg-error/10 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!notificationToDelete}
        onClose={() => setNotificationToDelete(null)}
        onConfirm={() => notificationToDelete && handleDelete(notificationToDelete)}
        title="Excluir Notificação?"
        message="Tem certeza que deseja apagar este aviso? Esta ação removerá a mensagem do feed de todos os clientes e excluirá a imagem do servidor."
        type="danger"
        confirmText="Sim, Excluir"
        isLoading={isDeleting}
      />
    </div>
  );
}
