import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export function Address() {
  const { fetchFullProfile, isLoading, error } = useAppStore();
  const navigate = useNavigate();
  const [address, setAddress] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await fetchFullProfile();
      if (profile && profile.endereco) {
        setAddress(profile.endereco);
      }
    };
    loadProfile();
  }, [fetchFullProfile]);

  return (
    <div className="flex flex-col min-h-full bg-surface-container-lowest pb-safe">
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 pt-safe">
        <div className="flex items-center px-6 h-16 w-full gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="material-symbols-outlined text-on-surface hover:bg-surface-container-low p-2 rounded-full transition-colors active-scale"
          >
            arrow_back
          </button>
          <h1 className="font-bold text-lg text-on-surface">Endereços</h1>
        </div>
      </header>

      <main className="pt-8 px-6 max-w-lg mx-auto w-full pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-error-container text-error p-4 rounded-xl text-sm mb-6">
            {error}
          </div>
        ) : address ? (
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-premium"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">home</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">Endereço Principal</h3>
                      <p className="text-xs text-secondary">Cadastrado no Fidelimax</p>
                    </div>
                  </div>
                  <button className="text-primary text-sm font-bold active-scale">Editar</button>
                </div>
  
                <div className="space-y-1 text-sm text-on-surface/80">
                  <p className="font-medium">{address.rua}, {address.numero}</p>
                  {address.complemento && <p>{address.complemento}</p>}
                  <p>{address.bairro}</p>
                  <p>{address.cidade} - {address.estado}</p>
                  <p className="text-secondary mt-2">CEP: {address.cep}</p>
                </div>
              </motion.div>
  
              <motion.button 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full py-4 border-2 border-dashed border-outline-variant/30 rounded-2xl text-secondary font-bold flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors active-scale"
              >
                <span className="material-symbols-outlined">add</span>
                Novo Endereço
              </motion.button>
              <p className="text-[10px] text-center text-secondary/60">
                * Para alterar seu endereço principal permanentemente, utilize o portal Fidelimax ou solicite em uma de nossas lojas.
              </p>
            </div>
        ) : (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-stone-300 mb-4">location_off</span>
            <p className="text-secondary">Nenhum endereço cadastrado.</p>
            <button className="mt-4 text-primary font-bold">Adicionar Endereço</button>
          </div>
        )}
      </main>
    </div>
  );
}
