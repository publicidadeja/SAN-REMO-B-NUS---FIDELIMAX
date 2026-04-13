import { create } from 'zustand';
import { User, Balance, Reward, Transaction, Story, AppNotification } from '../models/types';
import { FidelimaxApiService } from '../api/fidelimax';

interface AppState {
  user: User | null;
  token: string | null;
  balance: Balance | null;
  rewards: Reward[];
  transactions: Transaction[];
  stories: Story[];
  apiKey: string;
  storyExpirationHours: number;
  helpContact: string;
  notifications: AppNotification[];
  adminMetrics: any | null;
  pamphletImages: { id: number; url: string; order: number }[];
  isLoading: boolean;
  error: string | null;
  
  login: (cpf: string) => Promise<void>;
  logout: () => void;
  fetchDashboardData: () => Promise<void>;
  fetchStories: () => Promise<void>;
  fetchFullProfile: () => Promise<any>;
  fetchNotifications: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  updateUser: (data: { nome: string, email?: string, telefone?: string, sexo?: string, data_nascimento?: string }) => Promise<void>;
  addStory: (data: { title: string, file: File, productId?: string }) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<string>;
  setApiKey: (key: string) => Promise<void>;
  setStoryExpirationHours: (hours: number) => Promise<void>;
  setHelpContact: (contact: string) => Promise<void>;
  initSettings: () => Promise<void>;
  // Activation Products
  activationProducts: any[];
  myActivations: any[];
  fetchActivationProducts: () => Promise<void>;
  activateProduct: (productId: string) => Promise<void>;
  fetchMyActivations: () => Promise<void>;
  addActivationProduct: (data: any, file?: File) => Promise<void>;
  updateActivationProduct: (id: string, data: any, file?: File) => Promise<void>;
  deleteActivationProduct: (id: string) => Promise<void>;
  redeemActivation: (activationId: string) => Promise<void>;
  redeemBulkActivation: (productId: string, userCpf: string, quantity: number) => Promise<void>;
  // Admin & Collaborators
  collaborators: any[];
  adminLogin: (data: { email: string, password: string }) => Promise<void>;
  fetchCollaborators: () => Promise<void>;
  addCollaborator: (data: any) => Promise<void>;
  updateCollaborator: (id: string, data: any) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  fetchAdminMetrics: () => Promise<void>;
  uploadPamphletImage: (file: File) => Promise<void>;
  deletePamphletImage: (id: number) => Promise<void>;
  fetchPamphletImages: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  fetchAdminNotifications: () => Promise<any[]>;
  deleteNotification: (id: string) => Promise<void>;
  fcmToken: string | null;
  setFcmToken: (token: string | null) => void;
}

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('@SanRemo:user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  user: getStoredUser(),
  token: localStorage.getItem('@SanRemo:token'),
  balance: null,
  rewards: [],
  transactions: [],
  stories: [],
  apiKey: localStorage.getItem('@SanRemo:apiKey') || '',
  storyExpirationHours: parseInt(localStorage.getItem('@SanRemo:storyExpirationHours') || '24'),
  helpContact: localStorage.getItem('@SanRemo:helpContact') || '',
  notifications: [],
  isLoading: false,
  error: null,
  collaborators: [],
  activationProducts: [],
  myActivations: [],
  adminMetrics: null,
  pamphletImages: [],
  fcmToken: null,

  setFcmToken: (token) => set({ fcmToken: token }),

  login: async (cpf: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await FidelimaxApiService.login(cpf);
      localStorage.setItem('@SanRemo:token', token);
      localStorage.setItem('@SanRemo:user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ error: 'Falha ao fazer login', isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('@SanRemo:token');
    localStorage.removeItem('@SanRemo:user');
    set({ user: null, token: null, balance: null, rewards: [], transactions: [], stories: [], notifications: [] });
  },

  initSettings: async () => {
    try {
      const [key, hours, contact] = await Promise.all([
        FidelimaxApiService.getGlobalSetting('fidelimax_api_key'),
        FidelimaxApiService.getGlobalSetting('story_expiration_hours'),
        FidelimaxApiService.getGlobalSetting('help_center_contact')
      ]);

      if (key) {
        localStorage.setItem('@SanRemo:apiKey', key);
        set({ apiKey: key });
      }
      if (hours) {
        localStorage.setItem('@SanRemo:storyExpirationHours', hours);
        set({ storyExpirationHours: parseInt(hours) });
      }
      if (contact) {
        localStorage.setItem('@SanRemo:helpContact', contact);
        set({ helpContact: contact });
      }
      
      const images = await FidelimaxApiService.getPamphletImages();
      set({ pamphletImages: images });
    } catch (error) {
      console.error('Failed to init settings', error);
    }
  },

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    const { user, apiKey, storyExpirationHours } = get();
    const isConsumer = user?.role === 'user';
    
    try {
      // Optimization: Only load settings if they are missing
      if (!apiKey || !storyExpirationHours) {
        await get().initSettings();
      }
      
      const [balance, rewards, transactions, stories, notifications, pamphletImages] = await Promise.all([
        isConsumer ? FidelimaxApiService.getBalance(user?.cpf).catch(e => {
          console.error('[AppStore] Balance fetch failed:', e);
          return null;
        }) : Promise.resolve(null),
        
        FidelimaxApiService.getRewards().catch(e => {
          console.error('[AppStore] Rewards fetch failed:', e);
          return [];
        }),
        
        isConsumer ? FidelimaxApiService.getTransactions(user?.cpf).catch(e => {
          console.error('[AppStore] Transactions fetch failed:', e);
          return [];
        }) : Promise.resolve([]),
        
        FidelimaxApiService.getStories().catch(e => {
          console.error('[AppStore] Stories fetch failed:', e);
          return [];
        }),
        
        isConsumer ? FidelimaxApiService.getNotifications(user?.cpf || '').catch(e => {
          console.error('[AppStore] Notifications fetch failed:', e);
          return [];
        }) : Promise.resolve([]),

        FidelimaxApiService.getPamphletImages().catch(e => {
          console.error('[AppStore] Pamphlet fetch failed:', e);
          return [];
        })
      ]);

      set({ balance, rewards, transactions, stories, notifications, pamphletImages, isLoading: false });
    } catch (error: any) {
      console.error('[AppStore] Critical error fetching dashboard data:', error);
      
      if (error.response?.status === 401) {
        get().logout();
        set({ error: 'Sessão expirada. Por favor, entre novamente.', isLoading: false });
      } else {
        set({ error: 'Erro ao carregar dados do painel', isLoading: false });
      }
    }
  },

  fetchStories: async () => {
    try {
      const stories = await FidelimaxApiService.getStories();
      set({ stories: Array.isArray(stories) ? stories : [] });
    } catch (error) {
      console.error('Failed to fetch stories', error);
    }
  },

  updateUser: async (data: { nome: string, email?: string, telefone?: string, sexo?: string, data_nascimento?: string }) => {
    set({ isLoading: true, error: null });
    const { user } = get();
    if (!user) {
      set({ isLoading: false, error: 'Usuário não autenticado' });
      return;
    }

    try {
      const updatedUser = await FidelimaxApiService.updateProfile({ 
        ...data, 
        cpf: user.cpf 
      });
      localStorage.setItem('@SanRemo:user', JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Erro ao atualizar perfil', isLoading: false });
      throw error;
    }
  },

  fetchFullProfile: async () => {
    set({ isLoading: true, error: null });
    const { user } = get();
    if (!user) return null;
    try {
      const profile = await FidelimaxApiService.getFullProfile(user.cpf);
      set({ isLoading: false });
      return profile;
    } catch (error: any) {
      set({ error: error.message || 'Erro ao carregar perfil', isLoading: false });
      return null;
    }
  },

  fetchNotifications: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const notifications = await FidelimaxApiService.getNotifications(user.cpf);
      set({ notifications: Array.isArray(notifications) ? notifications : [] });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  },

  clearNotifications: async () => {
    const { user } = get();
    if (!user) return;
    try {
      await FidelimaxApiService.clearNotifications(user.cpf);
      set({ notifications: [] });
    } catch (error) {
      console.error('Failed to clear notifications', error);
    }
  },

  addStory: async (data: { title: string, file: File, productId?: string }) => {
    set({ isLoading: true, error: null });
    const { user } = get();
    try {
      // @ts-ignore
      await FidelimaxApiService.addStory({ ...data, userId: user?.id });
      await get().fetchStories();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Erro ao adicionar story', isLoading: false });
    }
  },

  deleteStory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await FidelimaxApiService.deleteStory(id);
      await get().fetchStories();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Erro ao deletar story', isLoading: false });
    }
  },

  redeemReward: async (rewardId: string) => {
    set({ isLoading: true, error: null });
    const { user } = get();
    try {
      const result = await FidelimaxApiService.redeemReward(rewardId, user?.cpf);
      if (result.success) {
        // Refresh balance after redemption
        const balance = await FidelimaxApiService.getBalance(user?.cpf);
        set({ balance, isLoading: false });
        return result.voucherCode;
      }
      throw new Error('Falha no resgate');
    } catch (error) {
      set({ error: 'Erro ao resgatar prêmio', isLoading: false });
      throw error;
    }
  },

  setApiKey: async (key: string) => {
    try {
      await FidelimaxApiService.updateGlobalSetting('fidelimax_api_key', key);
      localStorage.setItem('@SanRemo:apiKey', key);
      set({ apiKey: key });
    } catch (error) {
      console.error('Failed to save API Key to server', error);
      // Fallback to local storage only if server fails
      localStorage.setItem('@SanRemo:apiKey', key);
      set({ apiKey: key });
    }
  },

  setStoryExpirationHours: async (hours: number) => {
    try {
      await FidelimaxApiService.updateGlobalSetting('story_expiration_hours', String(hours));
      localStorage.setItem('@SanRemo:storyExpirationHours', String(hours));
      set({ storyExpirationHours: hours });
    } catch (error) {
      console.error('Failed to save story expiration to server', error);
      localStorage.setItem('@SanRemo:storyExpirationHours', String(hours));
      set({ storyExpirationHours: hours });
    }
  },

  setHelpContact: async (contact: string) => {
    try {
      await FidelimaxApiService.updateGlobalSetting('help_center_contact', contact);
      localStorage.setItem('@SanRemo:helpContact', contact);
      set({ helpContact: contact });
    } catch (error) {
      console.error('Failed to save help contact to server', error);
      localStorage.setItem('@SanRemo:helpContact', contact);
      set({ helpContact: contact });
    }
  },

  adminLogin: async (data: { email: string, password: string }) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await FidelimaxApiService.adminLogin(data);
      localStorage.setItem('@SanRemo:token', token);
      localStorage.setItem('@SanRemo:user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (error: any) {
      set({ error: 'Credenciais administrativas inválidas', isLoading: false });
      throw error;
    }
  },

  fetchCollaborators: async () => {
    try {
      const list = await FidelimaxApiService.getCollaborators();
      set({ collaborators: list });
    } catch (error) {
      console.error('Error fetching collaborators', error);
    }
  },

  addCollaborator: async (data: any) => {
    try {
      await FidelimaxApiService.createCollaborator(data);
      await get().fetchCollaborators();
    } catch (error) {
      console.error('Error adding collaborator', error);
      throw error;
    }
  },

  updateCollaborator: async (id: string, data: any) => {
    try {
      await FidelimaxApiService.updateCollaborator(id, data);
      await get().fetchCollaborators();
    } catch (error) {
      console.error('Error updating collaborator', error);
      throw error;
    }
  },

  deleteCollaborator: async (id: string) => {
    try {
      await FidelimaxApiService.deleteCollaborator(id);
      await get().fetchCollaborators();
    } catch (error) {
      console.error('Error deleting collaborator', error);
      throw error;
    }
  },

  fetchActivationProducts: async () => {
    const { user } = get();
    try {
      const list = await FidelimaxApiService.getActivationProducts(user?.cpf);
      set({ activationProducts: list });
    } catch (error) {
      console.error('Error fetching activation products', error);
    }
  },

  fetchMyActivations: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const list = await FidelimaxApiService.getMyActivations(user.cpf);
      set({ myActivations: list });
    } catch (error) {
      console.error('Error fetching my activations', error);
    }
  },

  activateProduct: async (productId: string) => {
    set({ isLoading: true, error: null });
    const { user } = get();
    if (!user) {
      set({ isLoading: false, error: 'Usuário não autenticado' });
      return;
    }
    try {
      await FidelimaxApiService.activateProduct(productId, user.cpf);
      await Promise.all([
        get().fetchActivationProducts(),
        get().fetchMyActivations(),
        get().fetchNotifications()
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao ativar oferta', isLoading: false });
      throw error;
    }
  },

  addActivationProduct: async (data, file) => {
    set({ isLoading: true, error: null });
    const { user } = get();
    try {
      await FidelimaxApiService.createActivationProduct({ ...data, userId: user?.id }, file);
      await get().fetchActivationProducts();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Erro ao criar produto promocional', isLoading: false });
      throw error;
    }
  },

  updateActivationProduct: async (id, data, file) => {
    set({ isLoading: true, error: null });
    try {
      await FidelimaxApiService.updateActivationProduct(id, data, file);
      await get().fetchActivationProducts();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Erro ao atualizar produto promocional', isLoading: false });
      throw error;
    }
  },

  deleteActivationProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await FidelimaxApiService.deleteActivationProduct(id);
      await get().fetchActivationProducts();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Erro ao deletar produto promocional', isLoading: false });
    }
  },

  redeemActivation: async (activationId: string) => {
    set({ isLoading: true, error: null });
    try {
      await FidelimaxApiService.redeemActivation(activationId);
      await Promise.all([
        get().fetchActivationProducts(),
        get().fetchMyActivations(),
        get().fetchNotifications()
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao resgatar oferta', isLoading: false });
      throw error;
    }
  },

  redeemBulkActivation: async (productId: string, userCpf: string, quantity: number) => {
    set({ isLoading: true, error: null });
    try {
      await FidelimaxApiService.redeemBulkActivation({ productId, userCpf, quantity });
      await Promise.all([
        get().fetchActivationProducts(),
        get().fetchMyActivations(),
        get().fetchNotifications()
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Erro ao processar resgate em massa', isLoading: false });
      throw error;
    }
  },

  fetchAdminMetrics: async () => {
    set({ isLoading: true });
    try {
      const response = await FidelimaxApiService.getAdminMetrics();
      set({ adminMetrics: response, isLoading: false });
    } catch (error) {
      console.error('Error fetching admin metrics', error);
      set({ isLoading: false });
    }
  },

  uploadPamphletImage: async (file: File) => {
    set({ isLoading: true });
    try {
      const newImage = await FidelimaxApiService.uploadPamphletImage(file);
      set(state => ({ 
        pamphletImages: [...state.pamphletImages, newImage].sort((a, b) => a.order - b.order),
        isLoading: false 
      }));
    } catch (error) {
      set({ error: 'Erro ao fazer upload do panfleto', isLoading: false });
      throw error;
    }
  },

  deletePamphletImage: async (id: number) => {
    set({ isLoading: true });
    try {
      await FidelimaxApiService.deletePamphletImage(id);
      set(state => ({
        pamphletImages: state.pamphletImages.filter(img => img.id !== id),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Erro ao excluir imagem', isLoading: false });
      throw error;
    }
  },

  fetchPamphletImages: async () => {
    try {
      const images = await FidelimaxApiService.getPamphletImages();
      set({ pamphletImages: images });
    } catch (error) {
      console.error('Error fetching pamphlets', error);
    }
  },

  markNotificationAsRead: async (id: string) => {
    try {
      await FidelimaxApiService.markNotificationAsRead(id);
      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      }));
    } catch (error) {
      console.error('Error marking notification as read', error);
    }
  },

  fetchAdminNotifications: async () => {
    try {
      return await FidelimaxApiService.getAdminNotifications();
    } catch (error) {
      console.error('Error fetching admin notifications', error);
      return [];
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await FidelimaxApiService.deleteNotification(id);
    } catch (error) {
      console.error('Error deleting notification', error);
      throw error;
    }
  },
}));
