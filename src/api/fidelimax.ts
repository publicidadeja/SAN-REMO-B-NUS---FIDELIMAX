import axios from 'axios';
import { User, Balance, Reward, Transaction, Story } from '../models/types';

// Use local proxy in development to avoid CORS issues
const API_BASE_URL = window.location.origin + '/api/fidelimax-proxy';

// Create Axios instance for ALL local API calls
const api = axios.create({
  baseURL: window.location.origin,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT Auth and Fidelimax API Key
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@SanRemo:token');
  const apiKey = localStorage.getItem('@SanRemo:apiKey');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // If calling the proxy, also add the Fidelimax API Key if present
  if (config.url?.includes('/api/fidelimax-proxy') && apiKey) {
    config.headers['AuthToken'] = apiKey;
  }

  return config;
});

// ---------------------------------------------------------------------------
// Fidelimax Raw API Functions (Conformidade com a documentação)
// https://docs.fidelimax.com.br/
// ---------------------------------------------------------------------------
export const FidelimaxAPI = {
  cadastrarConsumidor: async (data: { nome: string, cpf: string, sexo?: string, nascimento?: string, telefone?: string, email?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/CadastrarConsumidor', data);
    return response.data;
  },
  atualizarConsumidor: async (data: { nome: string, cpf: string, sexo?: string, nascimento?: string, telefone?: string, email?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/AtualizarConsumidor', data);
    return response.data;
  },
  consultarConsumidor: async (data: { cpf?: string, telefone?: string, categoria?: boolean }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/ConsultaConsumidor', data);
    return response.data;
  },
  deletarConsumidor: async (data: { cpf?: string, telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/DeletarConsumidor', data);
    return response.data;
  },
  pontuarConsumidor: async (data: { cpf?: string, pontuacao_reais: number, telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/PontuaConsumidor', data);
    return response.data;
  },
  resgatarPremio: async (data: { cpf?: string, premio_identificador: string, telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/ResgataPremio', data);
    return response.data;
  },
  cadastrarPremio: async (data: { nome: string, pontos?: number, descricao?: string, identificador?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/CadastrarPremio', data);
    return response.data;
  },
  listarPremios: async () => {
    const response = await api.get('/api/fidelimax-proxy/Integracao/ListaProdutos');
    return response.data;
  },
  resgatarCashback: async (data: { cashback: number, cpf?: string, telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/Cashback', data);
    return response.data;
  },
  verificarCashback: async (data: { cpf?: string, cartao?: string, telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/VerificarCashback', data);
    return response.data;
  },
  cadastrarVoucherPremios: async (data: { codigo_externo: string, voucher: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/CadastrarVoucherPremios', data);
    return response.data;
  },
  consultarVoucher: async (voucher: string) => {
    const response = await api.get(`/api/fidelimax-proxy/Integracao/StatusVoucher/${voucher}`);
    return response.data;
  },
  resgatarVoucher: async (data: { voucher: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/ResgatarVoucher', data);
    return response.data;
  },
  atualizarCategoriaConsumidor: async (data: { cpf?: string, telefone?: string, categoria: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/AtualizarCategoriaConsumidor', data);
    return response.data;
  },
  deletarCategoriaConsumidor: async (data: { cpf?: string, telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/DeletarCategoriaConsumidor', data);
    return response.data;
  },
  indicarAmigo: async (data: { cpf?: string, telefone?: string, amigo_nome: string, amigo_email?: string, amigo_telefone?: string }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/IndicacaoAmigos', data);
    return response.data;
  },
  consultarExtrato: async (data: { cpf?: string, telefone?: string, dias_filtro?: number, skip?: number, take?: number }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/ExtratoConsumidor', data);
    return response.data;
  },
  retornaDadosCliente: async (data: { cpf?: string, telefone?: string, endereco?: boolean, tag?: boolean }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/RetornaDadosCliente', data);
    return response.data;
  },
  listarConsumidores: async (data: { novos?: boolean, skip?: number, take?: number }) => {
    const response = await api.post('/api/fidelimax-proxy/Integracao/ListarConsumidores', data);
    return response.data;
  }
};

// ---------------------------------------------------------------------------
// Local Features (Not in Fidelimax API)
// ---------------------------------------------------------------------------
// No local mock admin for security.

// Stories are now managed by the server with persistence and 24h expiration.

// ---------------------------------------------------------------------------
// App Service Adapter
// ---------------------------------------------------------------------------
export const FidelimaxApiService = {
  login: async (cpf: string): Promise<{ user: User; token: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    console.log('[FidelimaxAPI] Secure login attempt for CPF:', cleanCpf);
    
    // Call our NEW backend login route instead of hitting the proxy directly
    const response = await api.post('/api/auth/login-consumer', { cpf: cleanCpf });
    return response.data;
  },

  register: async (data: { 
    nome: string, 
    cpf: string, 
    email: string, 
    telefone: string, 
    nascimento: string, 
    sexo: string,
    endereco?: {
      cep: string,
      rua: string,
      numero: string,
      bairro: string,
      complemento?: string
    }
  }) => {
    const cleanCpf = data.cpf.replace(/\D/g, '');
    const response = await api.post('/api/auth/register-consumer', {
      ...data,
      cpf: cleanCpf
    });
    const result = response.data;

    if (result && result.CodigoResposta === 100) {
      return result;
    }

    throw new Error(result?.MensagemErro || result?.Mensagem || 'Falha ao realizar cadastro');
  },

  getStories: async (): Promise<Story[]> => {
    const response = await api.get(`/api/stories`);
    return response.data;
  },

  addStory: async (data: { title: string, file: File, userId?: number, productId?: string }): Promise<void> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('title', data.title);
    if (data.userId) formData.append('userId', String(data.userId));
    if (data.productId) formData.append('productId', data.productId);
    await api.post(`/api/stories`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  deleteStory: async (id: string): Promise<boolean> => {
    await api.delete(`/api/stories/${id}`);
    return true;
  },

  getBalance: async (cpf?: string): Promise<Balance> => {
    if (!cpf) throw new Error('CPF não fornecido');
    
    const cleanCpf = cpf.replace(/\D/g, '');
    const response = await FidelimaxAPI.consultarConsumidor({ cpf: cleanCpf, categoria: true });
    
    if (response && response.CodigoResposta === 100) {
      return {
        points: response.saldo || response.consumidor?.saldo || 0,
        cashback: response.cashback || response.consumidor?.cashback || 0,
        nextLevelPoints: 5000,
        currentLevel: response.categoria || response.consumidor?.categoria || 'Standard',
        nextLevel: 'Platinum',
      };
    }
    
    throw new Error(response?.Mensagem || 'Não foi possível consultar o saldo');
  },

  getRewards: async (): Promise<Reward[]> => {
    const response = await FidelimaxAPI.listarPremios();
    if (response && response.produtos && Array.isArray(response.produtos)) {
      return response.produtos.map((p: any) => {
        const name = p.nome.toLowerCase();
        const desc = (p.descricao || '').toLowerCase();
        
        // Intelligent categorization based on keywords
        let category = 'Produtos';
        if (name.includes('desconto') || name.includes('%') || name.includes('off') || desc.includes('desconto')) {
          category = 'Descontos';
        } else if (name.includes('experiência') || name.includes('voucher') || name.includes('ingresso') || name.includes('tour')) {
          category = 'Experiências';
        }

        return {
          id: p.identificador,
          name: p.nome,
          description: p.descricao,
          pointsRequired: p.pontos,
          imageUrl: p.foto || '/icon.png',
          category
        };
      });
    }
    return [];
  },

  getTransactions: async (cpf?: string): Promise<Transaction[]> => {
    if (!cpf) return [];
    
    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      const response = await FidelimaxAPI.consultarExtrato({ 
        cpf: cleanCpf,
        dias_filtro: 365, // Get last year by default
        take: 50 
      });
      
      if (response && response.extrato && Array.isArray(response.extrato)) {
        console.log(`[FidelimaxAPI] Found ${response.extrato.length} transactions for CPF ${cleanCpf}`);
        return response.extrato.map((t: any) => ({
          id: t.verificador || Math.random().toString(36).substr(2, 9),
          date: t.data_pontuacao || new Date().toISOString(),
          description: t.premio_nome || t.loja || 'Transação Fidelimax',
          points: t.credito > 0 ? t.credito : -t.debito,
          type: t.debito > 0 ? 'redeemed' : 'earned'
        })).reverse(); // Reverse to show latest first
      }
    } catch (e) {
      console.warn('[FidelimaxAPI] Could not fetch transactions, returning empty list');
    }
    return [];
  },
  
  redeemReward: async (rewardId: string, cpf?: string): Promise<{ success: boolean; voucherCode: string }> => {
    if (!cpf) throw new Error('CPF necessário para resgate');
    
    const cleanCpf = cpf.replace(/\D/g, '');
    const response = await FidelimaxAPI.resgatarPremio({ cpf: cleanCpf, premio_identificador: rewardId });
    
    if (response && response.CodigoResposta === 100) {
      return { 
        success: true, 
        voucherCode: response.voucher || `REF-${Date.now()}` 
      };
    }
    
    throw new Error(response?.Mensagem || 'Falha ao resgatar prêmio');
  },

  updateProfile: async (data: { nome: string, cpf: string, email?: string, telefone?: string, sexo?: string, data_nascimento?: string }): Promise<User> => {
    const cleanCpf = data.cpf.replace(/\D/g, '');
    const response = await FidelimaxAPI.atualizarConsumidor({ 
      ...data, 
      cpf: cleanCpf,
      nascimento: data.data_nascimento 
    });
    
    if (response && response.CodigoResposta === 100) {
      return {
        id: cleanCpf,
        name: data.nome,
        email: data.email || '',
        cpf: cleanCpf,
        role: 'user'
      };
    }
    
    throw new Error(response?.Mensagem || 'Falha ao atualizar perfil');
  },

  getFullProfile: async (cpf: string): Promise<any> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const response = await FidelimaxAPI.retornaDadosCliente({ cpf: cleanCpf, endereco: true, tag: true });
    if (response && response.CodigoResposta === 100) {
      return response;
    }
    throw new Error(response?.Mensagem || 'Falha ao carregar perfil completo');
  },

  getNotifications: async (cpf: string): Promise<any[]> => {
    if (!cpf) return [];
    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      if (!cleanCpf) return [];
      const response = await api.get(`/api/notifications/${cleanCpf}`);
      console.log('[FidelimaxAPI] Notifications response:', response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error('[FidelimaxAPI] Failed to fetch server notifications', e);
      return [];
    }
  },

  adminLogin: async (data: { email: string, password: string }): Promise<{ user: User; token: string }> => {
    const response = await api.post(`/api/admin/login`, data);
    return response.data;
  },

  getCollaborators: async (): Promise<any[]> => {
    const response = await api.get(`/api/admin/collaborators`);
    return response.data;
  },

  createCollaborator: async (data: any): Promise<boolean> => {
    const response = await api.post(`/api/admin/collaborators`, data);
    return response.data.success;
  },

  updateCollaborator: async (id: string, data: any): Promise<boolean> => {
    const response = await api.put(`/api/admin/collaborators/${id}`, data);
    return response.data.success;
  },

  deleteCollaborator: async (id: string): Promise<boolean> => {
    const response = await api.delete(`/api/admin/collaborators/${id}`);
    return response.data.success;
  },
  
  getGlobalSetting: async (key: string): Promise<string> => {
    const response = await api.get(`/api/admin/settings/${key}`);
    return response.data?.value || '';
  },

  updateGlobalSetting: async (key: string, value: string): Promise<boolean> => {
    const response = await api.post(`/api/admin/settings`, { key, value });
    return response.data?.success;
  },

  // --- Activation Products ---
  getActivationProducts: async (cpf?: string): Promise<any[]> => {
    const response = await api.get(`/api/activation-products`, {
      params: { cpf }
    });
    return response.data;
  },

  createActivationProduct: async (data: any, file?: File): Promise<any> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    if (file) formData.append('file', file);

    const response = await api.post(`/api/admin/activation-products`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateActivationProduct: async (id: string, data: any, file?: File): Promise<any> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    if (file) formData.append('file', file);

    const response = await api.put(`/api/admin/activation-products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteActivationProduct: async (id: string): Promise<boolean> => {
    await api.delete(`/api/admin/activation-products/${id}`);
    return true;
  },

  activateProduct: async (productId: string, userCpf: string, customer?: { name?: string; email?: string; phone?: string }): Promise<any> => {
    const response = await api.post(`/api/activations`, {
      productId,
      userCpf,
      customerName: customer?.name,
      customerEmail: customer?.email,
      customerPhone: customer?.phone
    });
    return response.data;
  },

  getMyActivations: async (cpf: string): Promise<any[]> => {
    const response = await api.get(`/api/my-activations/${cpf}`);
    return response.data;
  },

  getAdminMetrics: async (): Promise<any> => {
    try {
      // 1. Get ListarConsumidores total from Fidelimax
      const fidelimaxRes = await FidelimaxAPI.listarConsumidores({ novos: true, skip: 0, take: 1 });
      const totalFidelimaxUsers = fidelimaxRes?.total || 0;

      // 2. Get Local Stats from our server
      const localStatsRes = await api.get(`/api/admin/system-stats`);
      const localStats = localStatsRes.data;

      return {
        totalFidelimaxUsers,
        ...localStats
      };
    } catch (error) {
      console.error('[FidelimaxAPI] Error fetching admin metrics:', error);
      throw error;
    }
  },

  clearNotifications: async (cpf: string): Promise<void> => {
    await api.delete(`/api/notifications/${cpf}`);
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    await api.patch(`/api/notifications/${id}/read`);
  },

  getAdminNotifications: async (): Promise<any[]> => {
    const response = await api.get(`/api/admin/notifications`);
    return response.data;
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/notifications/${id}`);
  },

  registerPushToken: async (cpf: string, token: string, device?: string): Promise<void> => {
    await api.post('/api/push/register', { cpf, token, device });
  },

  // --- Admin Points & Rewards Management ---
  searchCustomer: async (query: string): Promise<any> => {
    const cleanQuery = query.replace(/\D/g, '');
    const isCpf = cleanQuery.length === 11;
    const response = await FidelimaxAPI.consultarConsumidor(
      isCpf ? { cpf: cleanQuery, categoria: true } : { telefone: cleanQuery, categoria: true }
    );
    
    if (response && response.consumidor_existente) {
      const customerData = response.consumidor || response;
      const customerCpf = customerData.cpf?.replace(/\D/g, '') || cleanQuery;

      // Fetch activations for this specific customer
      let activations = [];
      try {
        activations = await FidelimaxApiService.getMyActivations(customerCpf);
      } catch (e) {
        console.warn('[FidelimaxAPI] Could not fetch activations for searched customer');
      }
      
      return {
        ...customerData,
        nome: customerData.nome || response.nome || 'Cliente sem Nome',
        cpf: customerCpf,
        points: response.saldo || customerData.saldo || 0,
        cashback: response.cashback || customerData.cashback || 0,
        category: response.categoria || customerData.categoria || 'Standard',
        activations: activations
      };
    }
    return null;
  },

  creditPoints: async (cpf: string, amount: number): Promise<{ success: boolean; autoApprovedRaffleEntries: any[] }> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const response = await FidelimaxAPI.pontuarConsumidor({ cpf: cleanCpf, pontuacao_reais: amount });
    return {
      success: Boolean(response && response.CodigoResposta === 100),
      autoApprovedRaffleEntries: response?.autoApprovedRaffleEntries || []
    };
  },

  adminRedeemReward: async (cpf: string, rewardId: string): Promise<string> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const response = await FidelimaxAPI.resgatarPremio({ cpf: cleanCpf, premio_identificador: rewardId });
    if (response && response.CodigoResposta === 100) {
      return response.voucher || `REF-${Date.now()}`;
    }
    throw new Error(response?.Mensagem || 'Falha ao resgatar prêmio via Admin');
  },

  redeemActivation: async (id: string): Promise<void> => {
    await api.post(`/api/activations/${id}/redeem`);
  },

  redeemBulkActivation: async (data: { productId: string, userCpf: string, quantity: number }): Promise<void> => {
    await api.post(`/api/activations/redeem-bulk`, data);
  },

  getRaffleParticipants: async (productId: string): Promise<any> => {
    const response = await api.get(`/api/admin/activation-products/${productId}/participants`);
    return response.data;
  },

  validateRaffleParticipant: async (id: string, data: { validationStatus: 'pending' | 'approved' | 'rejected'; purchaseAmount?: number | string }): Promise<any> => {
    const response = await api.patch(`/api/admin/raffle-participants/${id}`, data);
    return response.data;
  },

  drawRaffleWinner: async (productId: string, data?: { winnerCount?: number; redraw?: boolean }): Promise<any> => {
    const response = await api.post(`/api/admin/activation-products/${productId}/draw`, data || {});
    return response.data;
  },

  confirmRaffleWinners: async (productId: string): Promise<any> => {
    const response = await api.post(`/api/admin/activation-products/${productId}/draw/confirm`);
    return response.data;
  },

  // --- Pamphlet / Marketing Carousel ---
  getPamphletImages: async (): Promise<any[]> => {
    const response = await api.get(`/api/pamphlet`);
    return response.data;
  },

  uploadPamphletImage: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/api/admin/pamphlet-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deletePamphletImage: async (id: number): Promise<boolean> => {
    await api.delete(`/api/admin/pamphlet/${id}`);
    return true;
  }
};
