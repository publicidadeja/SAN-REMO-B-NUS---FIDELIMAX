import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../../components/ConfirmModal';

export function AdminCollaborators() {
  const { collaborators, fetchCollaborators, addCollaborator, updateCollaborator, deleteCollaborator, user, isLoading } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'collaborator' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['stories']);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<string | null>(null);

  const PERMISSIONS_OPTIONS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'stories', label: 'Stories' },
    { id: 'activations', label: 'Cadastro de Ofertas (Ativações)' },
    { id: 'redeem_activations', label: 'Resgate de Ofertas (App)' },
    { id: 'points', label: 'Lançar Pontos (Fidelimax)' },
    { id: 'rewards', label: 'Resgate de Prêmios (Fidelimax)' },
    { id: 'team', label: 'Equipe' },
    { id: 'settings', label: 'Configurações' },
  ];

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCollaborator) {
        await updateCollaborator(editingCollaborator.id, { 
          ...formData, 
          permissions: selectedPermissions.join(',') 
        });
        setMessage({ type: 'success', text: 'Colaborador atualizado com sucesso!' });
      } else {
        await addCollaborator({ 
          ...formData, 
          permissions: selectedPermissions.join(',') 
        });
        setMessage({ type: 'success', text: 'Colaborador adicionado com sucesso!' });
      }
      setFormData({ name: '', email: '', password: '', role: 'collaborator' });
      setSelectedPermissions(['stories']);
      setEditingCollaborator(null);
      setShowAddForm(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao processar solicitação.' });
    }
  };

  const handleEdit = (collab: any) => {
    setEditingCollaborator(collab);
    setFormData({
      name: collab.name,
      email: collab.email,
      password: '', // Não mostrar senha atual por segurança
      role: collab.role
    });
    setSelectedPermissions(collab.permissions ? collab.permissions.split(',') : []);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCollaborator(id);
      setMessage({ type: 'success', text: 'Colaborador excluído com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir colaborador.' });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-10 text-center">
        <span className="material-symbols-outlined text-error text-5xl mb-4">gpp_maybe</span>
        <h2 className="text-xl font-bold text-on-surface">Acesso Negado</h2>
        <p className="text-secondary">Apenas administradores podem gerenciar acessos.</p>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Colaboradores</h2>
          <p className="text-secondary font-medium text-sm">Gerencie acessos e permissões da equipe</p>
        </div>
        <button 
          onClick={() => {
            setEditingCollaborator(null);
            setFormData({ name: '', email: '', password: '', role: 'collaborator' });
            setSelectedPermissions(['stories']);
            setShowAddForm(true);
          }}
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:rotate-90 transition-transform"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {message.text}
        </motion.div>
      )}

      <div className="space-y-4">
        {collaborators.map((collab) => (
          <div 
            key={collab.email}
            className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-on-surface truncate">{collab.name}</h3>
              <p className="text-xs text-secondary truncate">{collab.email}</p>
              {collab.role !== 'admin' && collab.permissions && (
                <div className="flex flex-wrap gap-1 mt-1.5 text-on-primary">
                  {collab.permissions.split(',').map((p: string) => (
                    <span key={p} className="text-[9px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter">
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {collab.role === 'admin' && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter">
                    Acesso Total
                  </span>
                </div>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              collab.role === 'admin' ? 'bg-primary text-on-primary' : 'bg-stone-100 text-stone-500'
            }`}>
              {collab.role === 'admin' ? 'Super Admin' : 'Colaborador'}
            </div>
            
            <div className="flex gap-1 ml-2">
              <button 
                onClick={() => handleEdit(collab)}
                className="p-2 text-primary/60 hover:text-primary active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
              </button>
              {collab.email !== 'admin@sanremobonus.com.br' && (
                <button 
                  onClick={() => setCollaboratorToDelete(collab.id)}
                  className="p-2 text-error/40 hover:text-error active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">person_remove</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {collaborators.length === 0 && !isLoading && (
          <div className="text-center py-10 text-stone-300">
            <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
            <p className="text-sm">Nenhum colaborador encontrado.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!collaboratorToDelete}
        onClose={() => setCollaboratorToDelete(null)}
        onConfirm={async () => {
          if (collaboratorToDelete) {
            await handleDelete(collaboratorToDelete);
            setCollaboratorToDelete(null);
          }
        }}
        title="Excluir Colaborador?"
        message="Tem certeza que deseja revogar o acesso deste colaborador? Esta ação não pode ser desfeita."
        type="danger"
        confirmText="Sim, Remover"
        isLoading={isLoading}
      />

      {/* Add Form Modal-like Overlay */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] p-8 z-[61] shadow-2xl max-w-md mx-auto right-0 overflow-y-auto max-h-[90vh]"
            >
              <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-black text-on-surface mb-6">
                {editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 px-1">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-3 px-4 text-sm font-bold focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 px-1">E-mail</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@sanremo.com.br"
                    className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-3 px-4 text-sm font-bold focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 px-1">
                    {editingCollaborator ? 'Nova Senha (opcional ao editar)' : 'Senha de Acesso'}
                  </label>
                  <input
                    required={!editingCollaborator}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-3 px-4 text-sm font-bold focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3 px-1">Permissões de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSIONS_OPTIONS.map(opt => (
                      <label 
                        key={opt.id} 
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedPermissions.includes(opt.id) 
                            ? 'border-primary bg-primary-container text-on-primary-container' 
                            : 'border-surface-container-high bg-surface-container-lowest text-secondary'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={selectedPermissions.includes(opt.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPermissions([...selectedPermissions, opt.id]);
                            else setSelectedPermissions(selectedPermissions.filter(id => id !== opt.id));
                          }}
                        />
                        <span className="material-symbols-outlined text-[18px]">
                          {selectedPermissions.includes(opt.id) ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span className="text-xs font-bold">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-on-primary font-black rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    {isLoading ? 'Salvando...' : editingCollaborator ? 'SALVAR ALTERAÇÕES' : 'CRIAR ACESSO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
