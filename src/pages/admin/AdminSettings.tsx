import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { motion } from 'motion/react';

export function AdminSettings() {
  const { apiKey, setApiKey, storyExpirationHours, setStoryExpirationHours, helpContact, setHelpContact, pamphletImages, uploadPamphletImage, deletePamphletImage } = useAppStore();
  const [localKey, setLocalKey] = useState(apiKey);
  const [localHours, setLocalHours] = useState(storyExpirationHours);
  const [localHelpContact, setLocalHelpContact] = useState(helpContact);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await Promise.all([
      setApiKey(localKey),
      setStoryExpirationHours(localHours),
      setHelpContact(localHelpContact)
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="">
      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mb-6">Configurações</h2>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 border border-outline-variant/10 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined">key</span>
          </div>
          <div>
            <h3 className="text-on-surface font-bold">Chave API Fidelimax</h3>
            <p className="text-secondary text-xs">Configure o token de acesso da API</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 px-1">Chave da API Fidelimax</label>
            <input 
              type="text" 
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-3 px-4 text-sm font-bold focus:border-primary outline-none transition-colors"
              placeholder="Digite sua chave aqui..."
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div>
                <h4 className="text-on-surface text-sm font-bold">Expiração de Stories</h4>
                <p className="text-secondary text-[10px]">Tempo de exibição antes da exclusão automática</p>
              </div>
            </div>
            
            <select 
              value={localHours}
              onChange={(e) => setLocalHours(parseInt(e.target.value))}
              className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-3 px-4 text-sm font-bold focus:border-primary outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value={24}>24 Horas (1 dia)</option>
              <option value={48}>48 Horas (2 dias)</option>
              <option value={72}>72 Horas (3 dias)</option>
              <option value={96}>96 Horas (4 dias)</option>
              <option value={120}>120 Horas (5 dias)</option>
              <option value={144}>144 Horas (6 dias)</option>
              <option value={168}>168 Horas (7 dias)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-outline-variant/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-[20px]">support_agent</span>
              </div>
              <div>
                <h4 className="text-on-surface text-sm font-bold">Central de Ajuda (Cliente)</h4>
                <p className="text-secondary text-[10px]">Define o contato exibido no perfil do usuário (WhatsApp ou Link)</p>
              </div>
            </div>
            
            <input 
              type="text" 
              value={localHelpContact}
              onChange={(e) => setLocalHelpContact(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-3 px-4 text-sm font-bold focus:border-primary outline-none transition-colors"
              placeholder="Ex: https://wa.me/5511999999999"
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined text-[20px]">link</span>
              </div>
              <div>
                <h4 className="text-on-surface text-sm font-bold">Link de Integração (Webhook)</h4>
                <p className="text-secondary text-[10px]">Cole este link no painel do Fidelimax para receber notificações</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly
                value={`${window.location.origin}/api/webhooks/fidelimax`}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-[10px] font-mono text-stone-500 outline-none"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/fidelimax`);
                  const btn = document.getElementById('copy-webhook-btn');
                  if (btn) {
                    const original = btn.innerHTML;
                    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span>';
                    setTimeout(() => btn.innerHTML = original, 2000);
                  }
                }}
                id="copy-webhook-btn"
                className="bg-surface-container-high text-on-surface px-4 rounded-xl flex items-center justify-center hover:bg-surface-container transition-colors active:scale-90"
                title="Copiar Link"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
            <p className="mt-3 text-[9px] text-stone-400 italic leading-relaxed">
              * Configure este link no menu <span className="font-bold">Integrações {'>'} Webhooks</span> do seu painel administrativo Fidelimax.
            </p>
          </div>

          <button
            onClick={handleSave}
            className={`w-full font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-md ${
              saved ? 'bg-green-500 text-white' : 'bg-primary text-on-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {saved ? 'check_circle' : 'save'}
            </span>
            {saved ? 'Configurações Salvas!' : 'Salvar Alterações'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
