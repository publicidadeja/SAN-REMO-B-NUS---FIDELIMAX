import type { User } from '../models/types';

export type AdminPermission =
  | 'dashboard'
  | 'stories'
  | 'activations'
  | 'redeem_activations'
  | 'points'
  | 'rewards'
  | 'team'
  | 'settings'
  | 'notifications'
  | 'pamphlets';

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: 'Dashboard',
  stories: 'Stories',
  activations: 'Ofertas e Sorteios',
  redeem_activations: 'Resgate de Ofertas',
  points: 'Lançar Pontos',
  rewards: 'Resgate de Prêmios',
  team: 'Equipe',
  settings: 'Configurações',
  notifications: 'Notificações',
  pamphlets: 'Encarte',
};

export const ADMIN_HOME_ROUTES: Array<{ path: string; permissions: AdminPermission[] }> = [
  { path: '/admin', permissions: ['dashboard'] },
  { path: '/admin/points', permissions: ['points', 'rewards', 'redeem_activations'] },
  { path: '/admin/stories', permissions: ['stories'] },
  { path: '/admin/activations', permissions: ['activations'] },
  { path: '/admin/notifications', permissions: ['notifications'] },
  { path: '/admin/pamphlets', permissions: ['pamphlets'] },
  { path: '/admin/settings', permissions: ['settings'] },
  { path: '/admin/collaborators', permissions: ['team'] },
];

export function parsePermissionList(permissions?: string | null): AdminPermission[] {
  return String(permissions || '')
    .split(',')
    .map((permission) => permission.trim())
    .filter((permission): permission is AdminPermission => permission in PERMISSION_LABELS);
}

export function userHasPermission(user: User | null | undefined, permission: AdminPermission): boolean {
  if (user?.role === 'admin') return true;
  if (user?.role !== 'collaborator') return false;
  return parsePermissionList(user.permissions).includes(permission);
}

export function userHasAnyPermission(
  user: User | null | undefined,
  permissions: AdminPermission | AdminPermission[]
): boolean {
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];
  return permissionList.some((permission) => userHasPermission(user, permission));
}

export function getFirstAccessibleAdminPath(user: User | null | undefined): string | null {
  if (user?.role === 'admin') return '/admin';
  if (user?.role !== 'collaborator') return null;
  return ADMIN_HOME_ROUTES.find((route) => userHasAnyPermission(user, route.permissions))?.path || null;
}

export function hasAnyAdminAccess(user: User | null | undefined): boolean {
  return Boolean(getFirstAccessibleAdminPath(user));
}
