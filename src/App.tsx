import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Rewards } from './pages/Rewards';
import { Card } from './pages/Card';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { PersonalData } from './pages/PersonalData';
import { Address } from './pages/Address';
import { Offers } from './pages/Offers';
import { Register } from './pages/Register';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminStories } from './pages/admin/AdminStories';
import { AdminCollaborators } from './pages/admin/AdminCollaborators';
import { AdminActivationProducts } from './pages/admin/AdminActivationProducts';
import { AdminPoints } from './pages/admin/AdminPoints';
import { AdminPamphlets } from './pages/admin/AdminPamphlets';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { useNativePush } from './hooks/useNativePush';
import { type AdminPermission, getFirstAccessibleAdminPath, userHasAnyPermission } from './utils/permissions';

function AdminAccessDenied() {
  return (
    <div className="p-10 text-center">
      <span className="material-symbols-outlined text-error text-5xl mb-4">gpp_maybe</span>
      <h2 className="text-xl font-bold text-on-surface">Acesso Negado</h2>
      <p className="text-secondary">Seu usuário não possui permissão para esta área.</p>
    </div>
  );
}

function AdminPermissionRoute({ permissions, children }: { permissions: AdminPermission | AdminPermission[]; children: ReactNode }) {
  const { user } = useAppStore();
  const fallbackPath = getFirstAccessibleAdminPath(user);

  if (userHasAnyPermission(user, permissions)) {
    return <>{children}</>;
  }

  return fallbackPath ? <Navigate to={fallbackPath} replace /> : <AdminAccessDenied />;
}

export default function App() {
  const { token, user, fetchDashboardData } = useAppStore();

  // Initialize Native Push Notifications
  useNativePush();

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, fetchDashboardData]);

  // Redirect logic based on role
  const getInitialRoute = () => {
    if (!token) return '/login';
    if (user?.role === 'admin' || user?.role === 'collaborator') {
      return getFirstAccessibleAdminPath(user) || '/admin/no-access';
    }
    return '/';
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to={getInitialRoute()} />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to={getInitialRoute()} />} />
        
        {/* User Routes - Only for non-admin/collaborator */}
        <Route element={token && user?.role === 'user' ? <Layout /> : <Navigate to={getInitialRoute()} />}>
          <Route path="/" element={<Home />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/card" element={<Card />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/data" element={<PersonalData />} />
          <Route path="/profile/address" element={<Address />} />
        </Route>

        {/* Admin Routes - For both admin and collaborator */}
        <Route element={token && (user?.role === 'admin' || user?.role === 'collaborator') ? <AdminLayout /> : <Navigate to={getInitialRoute()} />}>
          <Route path="/admin" element={<AdminPermissionRoute permissions="dashboard"><AdminDashboard /></AdminPermissionRoute>} />
          <Route path="/admin/pamphlets" element={<AdminPermissionRoute permissions="pamphlets"><AdminPamphlets /></AdminPermissionRoute>} />
          <Route path="/admin/points" element={<AdminPermissionRoute permissions={['points', 'rewards', 'redeem_activations']}><AdminPoints /></AdminPermissionRoute>} />
          <Route path="/admin/settings" element={<AdminPermissionRoute permissions="settings"><AdminSettings /></AdminPermissionRoute>} />
          <Route path="/admin/stories" element={<AdminPermissionRoute permissions="stories"><AdminStories /></AdminPermissionRoute>} />
          <Route path="/admin/collaborators" element={<AdminPermissionRoute permissions="team"><AdminCollaborators /></AdminPermissionRoute>} />
          <Route path="/admin/activations" element={<AdminPermissionRoute permissions="activations"><AdminActivationProducts /></AdminPermissionRoute>} />
          <Route path="/admin/notifications" element={<AdminPermissionRoute permissions="notifications"><AdminNotifications /></AdminPermissionRoute>} />
          <Route path="/admin/no-access" element={<AdminAccessDenied />} />
        </Route>
      </Routes>
    </Router>
  );
}
