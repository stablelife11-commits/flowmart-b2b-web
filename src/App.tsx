import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PortalLandingPage from './pages/auth/PortalLandingPage';
import AdminPortal from './pages/admin/AdminPortal';
import SellerPortal from './pages/seller/SellerPortal';
import BuyerPortal from './pages/buyer/BuyerPortal';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing & Authentication Portals */}
          <Route path="/" element={<PortalLandingPage />} />
          <Route path="/login" element={<Navigate to="/login/buyer" replace />} />
          <Route path="/login/admin" element={<PortalLandingPage />} />
          <Route path="/login/seller" element={<PortalLandingPage />} />
          <Route path="/login/buyer" element={<PortalLandingPage />} />

          {/* Admin Executive Portal (Protected: ADMIN only) */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />

          {/* Seller Merchant Portal (Protected: SELLER or ADMIN) */}
          <Route
            path="/seller/*"
            element={
              <ProtectedRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerPortal />
              </ProtectedRoute>
            }
          />

          {/* Buyer Wholesale Marketplace & Orders (Protected: BUYER only) */}
          <Route
            path="/buyer/*"
            element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <BuyerPortal />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
