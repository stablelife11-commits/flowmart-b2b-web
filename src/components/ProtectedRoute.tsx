import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/api';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Verifying FlowMart credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Determine the most appropriate login portal based on current route
    let loginRoute = '/login/buyer';
    if (location.pathname.startsWith('/admin') || (allowedRoles && allowedRoles.includes('ADMIN') && !allowedRoles.includes('BUYER'))) {
      loginRoute = '/login/admin';
    } else if (location.pathname.startsWith('/seller') || (allowedRoles && allowedRoles.includes('SELLER') && !allowedRoles.includes('BUYER'))) {
      loginRoute = '/login/seller';
    }

    return <Navigate to={loginRoute} state={{ from: location }} replace />;
  }

  // Check role authorization if specific roles are required
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Special case: ADMIN can access SELLER portal if desired
    if (user.role === 'ADMIN' && allowedRoles.includes('SELLER')) {
      return <>{children}</>;
    }

    // Role mismatch UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-600 text-sm mb-6">
            You are logged in as <strong className="text-indigo-600 uppercase font-semibold">{user.role}</strong> ({user.email}). 
            This portal is restricted to accounts with <span className="font-semibold text-slate-800">{allowedRoles.join(' or ')}</span> authorization.
          </p>

          <div className="flex flex-col gap-3">
            {user.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-sm"
              >
                Go to Admin Executive Portal
              </Link>
            )}
            {user.role === 'SELLER' && (
              <Link
                to="/seller"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-sm"
              >
                Go to Seller Merchant Portal
              </Link>
            )}
            {user.role === 'BUYER' && (
              <Link
                to="/buyer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-sm"
              >
                Go to Buyer Wholesale Marketplace
              </Link>
            )}

            <button
              onClick={logout}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Switch Account
            </button>
            
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to FlowMart Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

