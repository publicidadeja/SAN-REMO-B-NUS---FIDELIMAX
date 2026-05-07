// src/models/types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  avatarUrl?: string;
  role?: 'user' | 'admin' | 'collaborator';
  permissions?: string;
}

export interface Story {
  id: string;
  title: string;
  url: string;
  type: 'image' | 'video';
  productId?: string;
  createdAt: string;
  expiresAt: number;
  viewed?: boolean;
  createdBy?: { name: string };
}

export interface Balance {
  points: number;
  cashback: number;
  nextLevelPoints: number;
  currentLevel: string;
  nextLevel: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  imageUrl: string;
  category: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  points: number;
  type: 'earned' | 'redeemed' | 'expired';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'points' | 'reward' | 'info' | 'system' | 'announcement';
  imageUrl?: string;
  actionUrl?: string;
  isRead: boolean;
}

export interface ActivationProduct {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  originalPrice: number;
  promotionalPrice: number;
  promotionType?: 'offer' | 'raffle';
  prizeDescription?: string;
  minPurchaseValue?: number;
  participationInstructions?: string;
  drawDate?: string;
  limitPerCpf: number;
  redeemWindowHours: number;
  expiresAt: string;
  isMonthly: boolean;
  isFree: boolean;
  activations?: ProductActivation[];
  createdBy?: { name: string };
}

export interface ProductActivation {
  id: string;
  productId: string;
  userCpf: string;
  activatedAt: string;
  validUntil: string;
  redeemedAt?: string;
  validationStatus?: 'pending' | 'approved' | 'rejected';
  purchaseAmount?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  couponNumber?: string;
  validatedAt?: string;
  isWinner?: boolean;
  drawnAt?: string;
  product?: ActivationProduct;
}
