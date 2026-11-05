import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role, LoginRequestDto, RegisterRequestDto } from '../../types/api';
import { 
  ShieldCheck, 
  Store, 
  ShoppingCart, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  FileText, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  Sparkles 
} from 'lucide-react';

export const PortalLandingPage: React.FC = () => {
  const { user, isAuthenticated, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect which portal is requested by URL
  const getInitialRole = (): Role => {
    if (location.pathname.includes('/admin')) return 'ADMIN';
    if (location.pathname.includes('/seller')) return 'SELLER';
    return 'BUYER';
  };

  const [activeRole, setActiveRole] = useState<Role>(getInitialRole);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sync activeRole with URL changes
  useEffect(() => {
    if (location.pathname.includes('/admin')) {
      setActiveRole('ADMIN');
      setAuthMode('LOGIN'); // Admin doesn't have public registration
    } else if (location.pathname.includes('/seller')) {
      setActiveRole('SELLER');
    } else if (location.pathname.includes('/buyer')) {
      setActiveRole('BUYER');
    }
  }, [location.pathname]);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regGstin, setRegGstin] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regPincode, setRegPincode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Switch role tab
  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (role === 'ADMIN') {
      setAuthMode('LOGIN');
      navigate('/login/admin', { replace: true });
    } else if (role === 'SELLER') {
      navigate('/login/seller', { replace: true });
    } else {
      navigate('/login/buyer', { replace: true });
    }
  };

  const handleFillDemo = (role: Role) => {
    if (role === 'ADMIN') {
      setLoginEmail('admin@flowmart.com');
      setLoginPassword('admin123');
    } else if (role === 'SELLER') {
      setLoginEmail('seller@flowmart.com');
      setLoginPassword('seller123');
    } else {
      setLoginEmail('buyer@flowmart.com');
      setLoginPassword('buyer123');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: LoginRequestDto = {
      email: loginEmail.trim(),
      password: loginPassword,
    };

    const res = await login(payload, activeRole);
    setIsSubmitting(false);

    if (res.success) {
      if (activeRole === 'ADMIN') navigate('/admin');
      else if (activeRole === 'SELLER') navigate('/seller');
      else navigate('/buyer');
    } else {
      setErrorMessage(res.message || 'Login failed. Please verify your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: RegisterRequestDto = {
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: activeRole,
      phone: regPhone.trim(),
      businessName: regBusinessName.trim() || undefined,
      gstin: regGstin.trim().toUpperCase() || undefined,
      address: regAddress.trim() || undefined,
      city: regCity.trim() || undefined,
      state: regState.trim() || undefined,
      pincode: regPincode.trim() || undefined,
    };

    const res = await register(payload);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Registration completed successfully! Entering portal...');
      setTimeout(() => {
        if (activeRole === 'SELLER') navigate('/seller');
        else navigate('/buyer');
      }, 1000);
    } else {
      setErrorMessage(res.message || 'Registration failed. Please check the details.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">
              F
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">FlowMart</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase">
                B2B Cloud ERP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="text-xs text-right">
                  <div className="font-semibold text-white">{user.name}</div>
                  <div className="text-indigo-400 uppercase font-mono text-[10px]">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    if (user.role === 'ADMIN') navigate('/admin');
                    else if (user.role === 'SELLER') navigate('/seller');
                    else navigate('/buyer');
                  }}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg font-medium transition"
                >
                  Enter Portal
                </button>
                <button
                  onClick={logout}
                  className="text-xs text-slate-400 hover:text-rose-400 transition ml-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Spring Boot API @ :8080 Active
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left Column: B2B Platform Hero & Capabilities */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Unified Enterprise Wholesale Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Seamless B2B Commerce, <br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              Smart GST Ledgers & Orders
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
            Connecting Wholesalers, Manufacturers, and Retail Buyers in one unified portal. 
            Automated GST invoices, MOQ pack multipliers, real-time variant inventory, and credit ledgers.
          </p>

          {/* 3 Portal Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div 
              onClick={() => handleRoleChange('BUYER')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                activeRole === 'BUYER' 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 ring-2 ring-emerald-500/20' 
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <ShoppingCart className="w-6 h-6 mb-2 text-emerald-400" />
              <h3 className="font-semibold text-sm">Wholesale Buyer</h3>
              <p className="text-xs text-slate-400 mt-1">Multi-seller cart, MOQ pack pricing & instant checkout.</p>
            </div>

            <div 
              onClick={() => handleRoleChange('SELLER')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                activeRole === 'SELLER' 
                  ? 'bg-blue-950/40 border-blue-500/50 text-blue-200 ring-2 ring-blue-500/20' 
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <Store className="w-6 h-6 mb-2 text-blue-400" />
              <h3 className="font-semibold text-sm">Merchant Seller</h3>
              <p className="text-xs text-slate-400 mt-1">Catalog CRUD, order discounts, payments & return notes.</p>
            </div>

            <div 
              onClick={() => handleRoleChange('ADMIN')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                activeRole === 'ADMIN' 
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 ring-2 ring-indigo-500/20' 
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <ShieldCheck className="w-6 h-6 mb-2 text-indigo-400" />
              <h3 className="font-semibold text-sm">Admin Control</h3>
              <p className="text-xs text-slate-400 mt-1">Buyer-seller audit, user activation & executive ledgers.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> GST Tax Compliant</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pack Size Multiplier Logic</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real-time Double-Entry Ledgers</span>
          </div>
        </div>

        {/* Right Column: Dynamic Authentication Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl relative">
          
          {/* Portal Switcher Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => handleRoleChange('BUYER')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeRole === 'BUYER'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Buyer
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('SELLER')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeRole === 'SELLER'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Seller
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('ADMIN')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeRole === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin
            </button>
          </div>

          {/* Sub Header for current portal */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {activeRole === 'ADMIN' && 'Admin Executive Access'}
                {activeRole === 'SELLER' && (authMode === 'LOGIN' ? 'Merchant Login' : 'Register New Merchant')}
                {activeRole === 'BUYER' && (authMode === 'LOGIN' ? 'Wholesale Buyer Login' : 'Register Buyer Account')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeRole === 'ADMIN' && 'Authorized personnel only. Logs into /admin'}
                {activeRole === 'SELLER' && 'Manage catalog, wholesale orders, and ERP'}
                {activeRole === 'BUYER' && 'Browse catalogs, MOQ packs, and place orders'}
              </p>
            </div>

            {/* Fill demo credentials button */}
            {authMode === 'LOGIN' && (
              <button
                type="button"
                onClick={() => handleFillDemo(activeRole)}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800/80 px-2.5 py-1 rounded-lg transition"
                title="Fill sample demo credentials"
              >
                Auto-fill Demo
              </button>
            )}
          </div>

          {/* Toggle between Login and Register for Buyer/Seller */}
          {activeRole !== 'ADMIN' && (
            <div className="flex border-b border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('LOGIN'); setErrorMessage(null); setSuccessMessage(null); }}
                className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
                  authMode === 'LOGIN'
                    ? activeRole === 'SELLER' ? 'border-blue-500 text-blue-400' : 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('REGISTER'); setErrorMessage(null); setSuccessMessage(null); }}
                className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
                  authMode === 'REGISTER'
                    ? activeRole === 'SELLER' ? 'border-blue-500 text-blue-400' : 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authMode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Business Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={
                      activeRole === 'ADMIN' ? 'admin@flowmart.com' :
                      activeRole === 'SELLER' ? 'seller@flowmart.com' : 'buyer@flowmart.com'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                  activeRole === 'ADMIN'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    : activeRole === 'SELLER'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In to {activeRole} Portal <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTRATION FORM (BUYER & SELLER) */
            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Rajesh Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="rajesh@enterprise.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mobile / Phone *</label>
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    placeholder="Kumar Retailers Ltd"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  GSTIN {activeRole === 'SELLER' ? '(Required for Seller)' : '(Optional for Buyer)'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required={activeRole === 'SELLER'}
                    value={regGstin}
                    onChange={(e) => setRegGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    maxLength={15}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Billing & Delivery Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Plot 42, Market Road"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    placeholder="MH"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={regPincode}
                    onChange={(e) => setRegPincode(e.target.value)}
                    placeholder="400001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                  activeRole === 'SELLER'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Create {activeRole} Account</>
                )}
              </button>
            </form>
          )}

          {/* Quick Disclaimer / Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              FlowMart B2B Web connects to Spring Boot backend at{' '}
              <code className="text-slate-400 font-mono">http://localhost:8080/api/v1</code>
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FlowMart B2B Retail & Wholesale ERP System. All rights reserved.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="hover:text-white cursor-pointer transition">GST Compliance</span>
            <span className="hover:text-white cursor-pointer transition">API Docs</span>
            <span className="hover:text-white cursor-pointer transition">Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PortalLandingPage;

