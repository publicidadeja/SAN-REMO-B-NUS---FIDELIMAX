import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

export function Login() {
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const { login, adminLogin, isLoading, error } = useAppStore();

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminLogin) {
      if (email && password) {
        await adminLogin({ email, password });
      }
    } else {
      const cleanCpf = cpf.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        await login(cleanCpf);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-container/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-tertiary-container/20 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-outline-variant/10 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center p-2">
            <img src="/icon.png" alt="San Remo Bônus" className="w-full h-full object-contain rotate-3 hover:scale-105 transition-transform" />
          </div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">San Remo Bônus</h1>
          <p className="text-secondary font-medium">Seu programa de fidelidade premium</p>
        </div>

        <div className="flex bg-surface-container-high p-1 rounded-xl mb-8">
          <button 
            onClick={() => setIsAdminLogin(false)}
            className={cn(
              "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
              !isAdminLogin ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600"
            )}
          >
            Cliente
          </button>
          <button 
            onClick={() => setIsAdminLogin(true)}
            className={cn(
              "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
              isAdminLogin ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600"
            )}
          >
            Colaborador
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {!isAdminLogin ? (
            <div>
              <label htmlFor="cpf" className="block text-sm font-bold text-on-surface mb-2 uppercase tracking-wide">
                Digite seu CPF
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  badge
                </span>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-4 pl-12 pr-4 text-on-surface font-medium focus-ring placeholder:text-stone-300"
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-on-surface mb-2 uppercase tracking-wide">
                  E-mail
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    alternate_email
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-4 pl-12 pr-4 text-on-surface font-medium focus-ring placeholder:text-stone-300"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pass" className="block text-sm font-bold text-on-surface mb-2 uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    lock
                  </span>
                  <input
                    id="pass"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl py-4 pl-12 pr-4 text-on-surface font-medium focus-ring placeholder:text-stone-300"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-error text-sm mt-2 flex items-center gap-1 font-medium"
            >
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading || (!isAdminLogin && cpf.length < 11) || (isAdminLogin && (!email || !password))}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                {isAdminLogin ? 'Entrar no Painel' : 'Acessar Minha Conta'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-secondary font-medium">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-primary font-black hover:underline transition-all">Cadastre-se grátis</Link>
          </p>
          <p className="text-xs text-secondary font-medium">
            Ao entrar, você concorda com nossos <br/>
            <Link to="#" className="text-primary hover:underline font-bold">Termos de Uso</Link> e <Link to="#" className="text-primary hover:underline font-bold">Política de Privacidade</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
