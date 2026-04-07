import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export function PersonalData() {
  const { user, updateUser, fetchFullProfile, isLoading, error } = useAppStore();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: user?.name || '',
    email: user?.email || '',
    telefone: '',
    sexo: '',
    data_nascimento: '',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await fetchFullProfile();
      if (profile) {
        const data = profile.consumidor || profile;
        const birthDate = data.nascimento || data.data_nascimento || '';
        setFormData({
          nome: data.nome || user?.name || '',
          email: data.email || user?.email || '',
          telefone: data.telefone || '',
          sexo: data.sexo || '',
          data_nascimento: birthDate.split('T')[0],
        });
      }
    };
    loadProfile();
  }, [fetchFullProfile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-surface-container-lowest">
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 pt-safe">
        <div className="flex items-center px-6 h-16 w-full gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="material-symbols-outlined text-on-surface hover:bg-surface-container-low p-2 rounded-full transition-colors"
          >
            arrow_back
          </button>
          <h1 className="font-bold text-lg text-on-surface">Dados Pessoais</h1>
        </div>
      </header>

      <main className="pt-8 px-6 max-w-lg mx-auto w-full pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-container text-error p-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="bg-green-100 text-green-700 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Perfil atualizado com sucesso!
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Nome Completo</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full bg-white border border-outline-variant/20 rounded-xl px-4 py-3 focus-ring text-on-surface"
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2 opacity-60">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">CPF (Inalterável)</label>
            <input
              type="text"
              disabled
              value={user?.cpf || ''}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-4 py-3 text-secondary cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white border border-outline-variant/20 rounded-xl px-4 py-3 focus-ring text-on-surface"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Telefone / WhatsApp</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="w-full bg-white border border-outline-variant/20 rounded-xl px-4 py-3 focus-ring text-on-surface"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Gênero</label>
              <select
                value={formData.sexo}
                onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                className="w-full bg-white border border-outline-variant/20 rounded-xl px-4 py-3 focus-ring text-on-surface appearance-none"
              >
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Nascimento</label>
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="w-full bg-white border border-outline-variant/20 rounded-xl px-4 py-3 focus-ring text-on-surface"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Salvar Alterações
              </>
            )}
          </button>
        </form>

        <section className="mt-12 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10">
          <h4 className="font-bold text-on-surface text-sm mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">info</span>
            Por que não posso alterar meu CPF?
          </h4>
          <p className="text-xs text-secondary leading-relaxed">
            O CPF é o seu identificador único no programa San Remo Bônus. Para alterações cadastrais críticas, entre em contato com nosso suporte em uma de nossas lojas físicas.
          </p>
        </section>
      </main>
    </div>
  );
}
