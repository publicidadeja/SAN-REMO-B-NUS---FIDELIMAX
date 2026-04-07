import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { FidelimaxApiService } from '../api/fidelimax';
import { cn } from '../utils/cn';

export function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    nascimento: '',
    sexo: 'Masculino',
    endereco: {
      cep: '',
      rua: '',
      numero: '',
      bairro: '',
      complemento: ''
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [(parent as 'endereco')]: {
          ...(prev.endereco),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, telefone: formatPhone(e.target.value) }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, nascimento: formatDate(e.target.value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await FidelimaxApiService.register(formData);
      // Success! Redirect to login or even auto-login
      navigate('/login', { state: { message: 'Cadastro realizado com sucesso! Faça seu login.' } });
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-container/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-tertiary-container/20 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-outline-variant/10 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4">
            <img src="/icon.png" alt="San Remo Bônus" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Criar Nova Conta</h1>
          <p className="text-secondary text-sm font-medium">Junte-se ao programa de fidelidade San Remo</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={cn("w-12 h-1.5 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-surface-container-high")}></div>
          <div className={cn("w-12 h-1.5 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-surface-container-high")}></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Nome Completo</label>
                  <input
                    name="nome"
                    type="text"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="João Silva"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">CPF</label>
                  <input
                    name="cpf"
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Nascimento</label>
                  <input
                    name="nascimento"
                    type="text"
                    required
                    value={formData.nascimento}
                    onChange={handleDateChange}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">E-mail</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="joao@exemplo.com"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Telefone</label>
                  <input
                    name="telefone"
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.nome || !formData.cpf || !formData.email}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl mt-4 active-scale shadow-lg shadow-primary/20 flex items-center justify-center gap-2 "
              >
                Próximo Passo
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">CEP</label>
                  <input
                    name="endereco.cep"
                    type="text"
                    value={formData.endereco.cep}
                    onChange={handleChange}
                    placeholder="00000-000"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div className="md:col-span-3/4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Rua</label>
                  <input
                    name="endereco.rua"
                    type="text"
                    value={formData.endereco.rua}
                    onChange={handleChange}
                    placeholder="Rua Nome da Rua"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Número</label>
                  <input
                    name="endereco.numero"
                    type="text"
                    value={formData.endereco.numero}
                    onChange={handleChange}
                    placeholder="123"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Bairro</label>
                  <input
                    name="endereco.bairro"
                    type="text"
                    value={formData.endereco.bairro}
                    onChange={handleChange}
                    placeholder="Jardim"
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-secondary mb-1.5 ml-1">Sexo</label>
                  <select
                    name="sexo"
                    value={formData.sexo}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border-2 border-transparent rounded-xl py-3.5 px-4 text-on-surface font-medium focus:border-primary focus:bg-white transition-all outline-none appearance-none"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-error text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </p>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-surface-container-high text-on-surface font-bold py-4 rounded-xl active-scale"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-primary text-on-primary font-bold py-4 rounded-xl active-scale shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      Finalizar Cadastro
                      <span className="material-symbols-outlined text-filled">how_to_reg</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-secondary font-medium">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary font-black hover:underline transition-all">Fazer Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
