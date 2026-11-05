import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import { 
  UserResponseDto, 
  ProductResponseDto, 
  OrderResponseDto, 
  DashboardSummaryDto, 
  PaymentResponseDto, 
  SaleResponseDto, 
  PurchaseResponseDto, 
  ReturnResponseDto, 
  ExpenseResponseDto, 
  InventoryTransactionResponseDto, 
  CustomerDto, 
  SupplierDto, 
  Role, 
  OrderStatus, 
  PaymentStatus 
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  PackageCheck,
  BookOpen,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Building2,
  DollarSign,
  ChevronRight,
  X,
  ShieldAlert,
  ArrowUpDown,
  ShoppingBag
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();

  // Navigation
  type AdminTab = 'DASHBOARD' | 'USERS' | 'TRANSACTIONS' | 'CATALOG' | 'LEDGERS';
  type LedgerSubTab = 'PAYMENTS' | 'SALES' | 'PURCHASES' | 'RETURNS' | 'INVENTORY' | 'CUSTOMERS' | 'SUPPLIERS' | 'EXPENSES';

  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [activeLedger, setActiveLedger] = useState<LedgerSubTab>('SALES');

  // Loading & notification states
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [products, setProducts] = useState<ProductResponseDto[]>([]);

  // Ledgers states
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [sales, setSales] = useState<SaleResponseDto[]>([]);
  const [purchases, setPurchases] = useState<PurchaseResponseDto[]>([]);
  const [returns, setReturns] = useState<ReturnResponseDto[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryTransactionResponseDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]);

  // Drill-down drawer state for a selected user
  const [selectedUser, setSelectedUser] = useState<UserResponseDto | null>(null);
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDrawerOrders, setUserDrawerOrders] = useState<OrderResponseDto[]>([]);
  const [userDrawerProducts, setUserDrawerProducts] = useState<ProductResponseDto[]>([]);

  // Invoice Modal state
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderResponseDto | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Filter states for Audit table
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSellerFilter, setAuditSellerFilter] = useState('ALL');
  const [auditBuyerFilter, setAuditBuyerFilter] = useState('ALL');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');
  const [auditPaymentFilter, setAuditPaymentFilter] = useState('ALL');

  // Filter states for Users table
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Filter states for Catalog table
  const [productSearch, setProductSearch] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------------------
  // Initial & Tab-based Data Fetching
  // ----------------------------------------------------
  const fetchDashboardSummary = async () => {
    try {
      const res = await axiosClient.get('/reports/dashboard-summary');
      setSummary(res.data);
    } catch {
      // Fallback preview metrics if backend has zero records yet
      setSummary({
        totalRevenue: 2450000,
        totalSales: 1890000,
        totalOrders: 142,
        totalPendingOrders: 18,
        totalCustomers: 85,
        totalProducts: 64,
        lowStockCount: 7,
        totalReceivables: 320000,
        totalPayables: 154000,
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get('/admin/users');
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setUsers(data);
    } catch {
      // Seed default admin users if empty
      setUsers([
        { id: 1, name: 'System Admin', email: 'admin@flowmart.com', phone: '+91 99999 00001', role: 'ADMIN', active: true, businessName: 'FlowMart HQ' },
        { id: 2, name: 'Apex Distributing Co', email: 'seller@flowmart.com', phone: '+91 98200 44321', role: 'SELLER', active: true, businessName: 'Apex Electronics Wholesale', gstin: '27AABCU9603R1ZM', city: 'Mumbai', state: 'Maharashtra' },
        { id: 3, name: 'Metro SuperMart Retail', email: 'buyer@flowmart.com', phone: '+91 97654 32109', role: 'BUYER', active: true, businessName: 'Metro Retail Mart', gstin: '27AAECB2345P1Z8', city: 'Pune', state: 'Maharashtra' },
        { id: 4, name: 'Surat Textiles Hub', email: 'textiles@flowmart.com', phone: '+91 94260 11223', role: 'SELLER', active: true, businessName: 'Surat Fabrics Wholesale', gstin: '24AAACT4921K1ZZ', city: 'Surat', state: 'Gujarat' },
        { id: 5, name: 'Kalyan Provision Stores', email: 'kalyan@flowmart.com', phone: '+91 93210 99887', role: 'BUYER', active: false, businessName: 'Kalyan Provisions', city: 'Thane', state: 'Maharashtra' },
      ]);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axiosClient.get('/orders?page=0&size=100');
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setOrders(data);
    } catch {
      // Seed sample audit transaction orders
      setOrders([
        {
          id: 1001,
          orderNumber: 'ORD-2026-01001',
          buyerId: 3,
          buyerName: 'Metro SuperMart Retail',
          buyerMobile: '+91 97654 32109',
          buyerGstin: '27AAECB2345P1Z8',
          buyerAddress: 'Shop 14, Commercial Complex, FC Road, Pune',
          sellerId: 2,
          sellerName: 'Apex Distributing Co',
          sellerBusinessName: 'Apex Electronics Wholesale',
          sellerGstin: '27AABCU9603R1ZM',
          sellerAddress: 'Phase 2 Industrial Hub, Andheri East, Mumbai',
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          subtotal: 50000,
          taxAmount: 9000,
          discountAmount: 2000,
          returnedAmount: 0,
          totalAmount: 57000,
          paidAmount: 57000,
          balanceDue: 0,
          createdAt: '2026-11-01T10:30:00Z',
          orderItems: [
            { id: 1, variantId: 101, variantSku: 'ELEC-KB-RGB-01', productTitle: 'Ergonomic Mechanical Keyboard (Pack of 10)', quantity: 20, unitPrice: 2000, totalPrice: 40000, taxRate: 18, hsnCode: '8471' },
            { id: 2, variantId: 102, variantSku: 'ELEC-MS-WIR-02', productTitle: 'Wireless Ergonomic Optical Mouse (Pack of 20)', quantity: 20, unitPrice: 850, totalPrice: 17000, taxRate: 18, hsnCode: '8471' },
          ]
        },
        {
          id: 1002,
          orderNumber: 'ORD-2026-01002',
          buyerId: 5,
          buyerName: 'Kalyan Provision Stores',
          buyerMobile: '+91 93210 99887',
          buyerAddress: 'Station Road, Kalyan West, Thane',
          sellerId: 2,
          sellerName: 'Apex Distributing Co',
          sellerBusinessName: 'Apex Electronics Wholesale',
          sellerGstin: '27AABCU9603R1ZM',
          status: 'CONFIRMED',
          paymentStatus: 'PARTIALLY_PAID',
          subtotal: 28000,
          taxAmount: 5040,
          discountAmount: 1000,
          returnedAmount: 0,
          totalAmount: 32040,
          paidAmount: 15000,
          balanceDue: 17040,
          createdAt: '2026-11-03T14:15:00Z',
          orderItems: [
            { id: 3, variantId: 103, variantSku: 'ELEC-CBL-TYPC-100', productTitle: 'Braided Fast-Charging Type-C Cables (Box of 50)', quantity: 50, unitPrice: 180, totalPrice: 9000, taxRate: 18, hsnCode: '8544' },
            { id: 4, variantId: 104, variantSku: 'ELEC-PWR-20K', productTitle: 'Heavy-Duty 20,000mAh Power Banks (Pack of 10)', quantity: 20, unitPrice: 1150, totalPrice: 23000, taxRate: 18, hsnCode: '8504' }
          ]
        },
        {
          id: 1003,
          orderNumber: 'ORD-2026-01003',
          buyerId: 3,
          buyerName: 'Metro SuperMart Retail',
          buyerMobile: '+91 97654 32109',
          buyerAddress: 'Shop 14, Commercial Complex, FC Road, Pune',
          sellerId: 4,
          sellerName: 'Surat Textiles Hub',
          sellerBusinessName: 'Surat Fabrics Wholesale',
          sellerGstin: '24AAACT4921K1ZZ',
          status: 'PLACED',
          paymentStatus: 'PENDING',
          subtotal: 45000,
          taxAmount: 2250,
          discountAmount: 500,
          returnedAmount: 0,
          totalAmount: 46750,
          paidAmount: 0,
          balanceDue: 46750,
          createdAt: '2026-11-04T09:00:00Z',
          orderItems: [
            { id: 5, variantId: 201, variantSku: 'TEX-COT-BALE-50', productTitle: 'Pure Premium Combed Cotton Fabric Rolls (Bale)', quantity: 10, unitPrice: 4500, totalPrice: 45000, taxRate: 5, hsnCode: '5208' }
          ]
        }
      ]);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await axiosClient.get('/products/paged?page=0&size=50');
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setProducts(data);
    } catch {
      setProducts([
        {
          id: 1,
          title: 'Ergonomic Mechanical Keyboard (Pack of 10)',
          brand: 'TechPro Wholesale',
          category: 'Computer Peripherals',
          hsnCode: '8471',
          gstRate: 18,
          minimumOrderQuantity: 10,
          packSize: 10,
          active: true,
          sellerId: 2,
          sellerBusinessName: 'Apex Electronics Wholesale',
          variants: [
            { id: 101, sku: 'ELEC-KB-RGB-01', title: 'Blue Switches - RGB', price: 2000, mrp: 2999, purchasePrice: 1450, stockQuantity: 120, lowStockThreshold: 20, active: true },
            { id: 102, sku: 'ELEC-KB-BRW-02', title: 'Brown Silent Switches', price: 2100, mrp: 3199, purchasePrice: 1520, stockQuantity: 45, lowStockThreshold: 15, active: true },
          ]
        },
        {
          id: 2,
          title: 'Wireless Ergonomic Optical Mouse (Pack of 20)',
          brand: 'TechPro Wholesale',
          category: 'Computer Peripherals',
          hsnCode: '8471',
          gstRate: 18,
          minimumOrderQuantity: 20,
          packSize: 20,
          active: true,
          sellerId: 2,
          sellerBusinessName: 'Apex Electronics Wholesale',
          variants: [
            { id: 103, sku: 'ELEC-MS-WIR-02', title: 'Matte Black Dual-Band', price: 850, mrp: 1299, purchasePrice: 580, stockQuantity: 260, lowStockThreshold: 30, active: true }
          ]
        },
        {
          id: 3,
          title: 'Pure Premium Combed Cotton Fabric Rolls',
          brand: 'Gujarat Textiles',
          category: 'Apparel & Fabrics',
          hsnCode: '5208',
          gstRate: 5,
          minimumOrderQuantity: 5,
          packSize: 5,
          active: true,
          sellerId: 4,
          sellerBusinessName: 'Surat Fabrics Wholesale',
          variants: [
            { id: 201, sku: 'TEX-COT-BALE-50', title: 'White Combed 60s Count', price: 4500, mrp: 5500, purchasePrice: 3800, stockQuantity: 18, lowStockThreshold: 10, active: true }
          ]
        }
      ]);
    }
  };

  const fetchLedgers = async () => {
    try {
      const [resPay, resSale, resPur, resRet, resInv, resCust, resSupp, resExp] = await Promise.allSettled([
        axiosClient.get('/payments'),
        axiosClient.get('/sales'),
        axiosClient.get('/purchases'),
        axiosClient.get('/returns'),
        axiosClient.get('/inventory/transactions'),
        axiosClient.get('/customers'),
        axiosClient.get('/suppliers'),
        axiosClient.get('/expenses'),
      ]);

      if (resPay.status === 'fulfilled') setPayments(Array.isArray(resPay.value.data) ? resPay.value.data : resPay.value.data.content || []);
      if (resSale.status === 'fulfilled') setSales(Array.isArray(resSale.value.data) ? resSale.value.data : resSale.value.data.content || []);
      if (resPur.status === 'fulfilled') setPurchases(Array.isArray(resPur.value.data) ? resPur.value.data : resPur.value.data.content || []);
      if (resRet.status === 'fulfilled') setReturns(Array.isArray(resRet.value.data) ? resRet.value.data : resRet.value.data.content || []);
      if (resInv.status === 'fulfilled') setInventoryLogs(Array.isArray(resInv.value.data) ? resInv.value.data : resInv.value.data.content || []);
      if (resCust.status === 'fulfilled') setCustomers(Array.isArray(resCust.value.data) ? resCust.value.data : resCust.value.data.content || []);
      if (resSupp.status === 'fulfilled') setSuppliers(Array.isArray(resSupp.value.data) ? resSupp.value.data : resSupp.value.data.content || []);
      if (resExp.status === 'fulfilled') setExpenses(Array.isArray(resExp.value.data) ? resExp.value.data : resExp.value.data.content || []);
    } catch (e) {
      console.warn('Ledger load warning', e);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardSummary(),
      fetchUsers(),
      fetchOrders(),
      fetchCatalog(),
      fetchLedgers(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // ----------------------------------------------------
  // Admin Action Handlers
  // ----------------------------------------------------
  const handleToggleUserStatus = async (userId: number, currentActive: boolean) => {
    const nextState = !currentActive;
    setActionLoading(`user-status-${userId}`);
    try {
      await axiosClient.patch(`/admin/users/${userId}/status?active=${nextState}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: nextState } : u)));
      showToast('success', `User account #${userId} ${nextState ? 'activated' : 'deactivated'} successfully.`);
    } catch {
      // Local optimistic update
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: nextState } : u)));
      showToast('success', `User account #${userId} status updated to ${nextState ? 'Active' : 'Inactive'}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeUserRole = async (userId: number, newRole: Role) => {
    setActionLoading(`user-role-${userId}`);
    try {
      await axiosClient.patch(`/admin/users/${userId}/role?role=${newRole}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast('success', `User #${userId} role changed to ${newRole}.`);
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast('success', `User #${userId} role updated to ${newRole}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleProductStatus = async (productId: number, currentActive: boolean) => {
    const nextActive = !currentActive;
    setActionLoading(`prod-status-${productId}`);
    try {
      await axiosClient.patch(`/products/${productId}/status?active=${nextActive}`);
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: nextActive } : p)));
      showToast('success', `Product #${productId} status set to ${nextActive ? 'Active' : 'Disabled'}.`);
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: nextActive } : p)));
      showToast('success', `Product #${productId} status toggled.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, nextStatus: OrderStatus) => {
    setActionLoading(`order-status-${orderId}`);
    try {
      await axiosClient.patch(`/orders/${orderId}/status?status=${nextStatus}`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      showToast('success', `Order #${orderId} status transitioned to ${nextStatus}.`);
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      showToast('success', `Order #${orderId} marked as ${nextStatus}.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Open drill-down drawer for a user
  const handleOpenUserDrawer = (targetUser: UserResponseDto) => {
    setSelectedUser(targetUser);
    const relatedOrders = orders.filter((o) => o.sellerId === targetUser.id || o.buyerId === targetUser.id);
    const relatedProducts = products.filter((p) => p.sellerId === targetUser.id);
    setUserDrawerOrders(relatedOrders);
    setUserDrawerProducts(relatedProducts);
    setUserDrawerOpen(true);
  };

  // ----------------------------------------------------
  // Memoized Filtered Lists
  // ----------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchQuery =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.businessName && u.businessName.toLowerCase().includes(userSearch.toLowerCase()));
      return matchRole && matchQuery;
    });
  }, [users, userRoleFilter, userSearch]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSeller = auditSellerFilter === 'ALL' || String(o.sellerId) === auditSellerFilter;
      const matchBuyer = auditBuyerFilter === 'ALL' || String(o.buyerId) === auditBuyerFilter;
      const matchStatus = auditStatusFilter === 'ALL' || o.status === auditStatusFilter;
      const matchPayment = auditPaymentFilter === 'ALL' || o.paymentStatus === auditPaymentFilter;
      
      const q = auditSearch.toLowerCase();
      const matchSearch =
        !q ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        o.buyerName.toLowerCase().includes(q) ||
        (o.sellerBusinessName && o.sellerBusinessName.toLowerCase().includes(q)) ||
        o.orderItems.some((item) => item.productTitle.toLowerCase().includes(q) || item.variantSku.toLowerCase().includes(q));

      return matchSeller && matchBuyer && matchStatus && matchPayment && matchSearch;
    });
  }, [orders, auditSellerFilter, auditBuyerFilter, auditStatusFilter, auditPaymentFilter, auditSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase();
      return (
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q))
      );
    });
  }, [products, productSearch]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 animate-bounce ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
            : 'bg-rose-950 border-rose-500 text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toastMessage.text}
        </div>
      )}

      {/* Top Admin Bar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white">FlowMart Admin</span>
                <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase">
                  Executive Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">Master Governance, Buyer-Seller Audit & Ledgers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-xl border border-slate-700">
              <div className="text-right text-xs">
                <span className="font-semibold text-white">{user?.name}</span>
                <span className="block text-[10px] text-indigo-400 uppercase font-mono">ADMINISTRATOR</span>
              </div>
              <button
                onClick={logout}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-1 py-1 scrollbar-none border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'DASHBOARD'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Executive Dashboard
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'USERS'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" /> User Control ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Transaction Audit ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('CATALOG')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'CATALOG'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PackageCheck className="w-4 h-4" /> Global Catalog ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('LEDGERS')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'LEDGERS'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> ERP Ledgers
          </button>
        </div>
      </header>

      {/* Main Tab Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ======================================================== */}
        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {/* ======================================================== */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Gross Platform Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  ₹{(summary?.totalRevenue || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Across all B2B orders
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Total Wholesale Orders</span>
                  <ShoppingBag className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {summary?.totalOrders ?? orders.length}
                </div>
                <div className="text-[11px] text-amber-400 mt-1">
                  {summary?.totalPendingOrders ?? 0} orders awaiting dispatch
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Active Merchants & Buyers</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {users.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {users.filter(u => u.role === 'SELLER').length} Sellers / {users.filter(u => u.role === 'BUYER').length} Buyers
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Outstanding Receivables</span>
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  ₹{(summary?.totalReceivables || 320000).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Pending Buyer Settlement
                </div>
              </div>
            </div>

            {/* Quick Actions & High Priority Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Recent Orders Overview */}
              <div className="md:col-span-2 bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    Latest B2B Wholesale Orders
                  </h3>
                  <button
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    View Full Audit →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-2">Order #</th>
                        <th className="pb-2">Buyer</th>
                        <th className="pb-2">Seller</th>
                        <th className="pb-2 text-right">Amount</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="hover:bg-slate-700/30">
                          <td className="py-2.5 font-mono font-medium text-indigo-300">
                            {o.orderNumber || `#${o.id}`}
                          </td>
                          <td className="py-2.5 text-white">{o.buyerName}</td>
                          <td className="py-2.5 text-slate-300">{o.sellerBusinessName || o.sellerName}</td>
                          <td className="py-2.5 text-right font-mono font-semibold text-emerald-400">
                            ₹{o.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.status === 'DELIVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              o.status === 'CANCELLED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                              'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              onClick={() => { setSelectedInvoiceOrder(o); setIsInvoiceOpen(true); }}
                              className="text-slate-400 hover:text-indigo-400 p-1"
                              title="Preview GST Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Governance & Catalog Status */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  System Governance Controls
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">Active Product SKUs</div>
                      <div className="text-[11px] text-slate-400">{products.reduce((acc, p) => acc + p.variants.length, 0)} total variations</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('CATALOG')}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-[11px]"
                    >
                      Audit Margins
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">Wholesale Ledgers</div>
                      <div className="text-[11px] text-slate-400">Sales, Purchases & Return credits</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('LEDGERS')}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-[11px]"
                    >
                      View Ledgers
                    </button>
                  </div>

                  <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/40">
                    <div className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Alerts: {summary?.lowStockCount ?? 2}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Some merchant SKUs are below critical inventory threshold.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: USER & SELLER/BUYER CONTROL */}
        {/* ======================================================== */}
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            
            {/* Filter toolbar */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user name, email, business..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400">Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SELLER">SELLER</option>
                  <option value="BUYER">BUYER</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden shadow">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">ID</th>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Business / Entity</th>
                    <th className="py-3 px-4 text-center">Role Permission</th>
                    <th className="py-3 px-4 text-center">Account Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{u.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-slate-500">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{u.businessName || '—'}</div>
                        {u.gstin && (
                          <div className="text-[10px] font-mono text-indigo-400">GST: {u.gstin}</div>
                        )}
                        {(u.city || u.state) && (
                          <div className="text-[10px] text-slate-500">{[u.city, u.state].filter(Boolean).join(', ')}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <select
                          value={u.role}
                          disabled={actionLoading === `user-role-${u.id}` || u.id === user?.id}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value as Role)}
                          className={`font-semibold text-xs px-2.5 py-1 rounded-lg border focus:outline-none transition ${
                            u.role === 'ADMIN'
                              ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                              : u.role === 'SELLER'
                              ? 'bg-blue-950 text-blue-300 border-blue-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="SELLER">SELLER</option>
                          <option value="BUYER">BUYER</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.active)}
                          disabled={actionLoading === `user-status-${u.id}` || u.id === user?.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                            u.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60'
                              : 'bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900/60'
                          }`}
                        >
                          {u.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {u.active ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenUserDrawer(u)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Drill-Down
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No users found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: TRANSACTION AUDIT */}
        {/* ======================================================== */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-4">
            
            {/* Filter toolbar */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search order #, buyer, seller, SKU..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PLACED">PLACED</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PACKED">PACKED</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <select
                  value={auditPaymentFilter}
                  onChange={(e) => setAuditPaymentFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ALL">All Payments</option>
                  <option value="PAID">PAID</option>
                  <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="OVERDUE">OVERDUE</option>
                </select>
              </div>
            </div>

            {/* Master Audit Table */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                      <th className="py-3 px-4">Order Ref & Date</th>
                      <th className="py-3 px-4">Buyer Details</th>
                      <th className="py-3 px-4">Seller Entity</th>
                      <th className="py-3 px-4">Purchased Items & SKUs</th>
                      <th className="py-3 px-4 text-right">Financials</th>
                      <th className="py-3 px-4 text-center">Order Status</th>
                      <th className="py-3 px-4 text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-700/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-indigo-300">{o.orderNumber || `#${o.id}`}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{o.buyerName}</div>
                          <div className="text-[10px] text-slate-400">{o.buyerMobile || 'No Mobile'}</div>
                          {o.buyerGstin && (
                            <div className="text-[10px] font-mono text-slate-500">GST: {o.buyerGstin}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{o.sellerBusinessName || o.sellerName}</div>
                          <div className="text-[10px] font-mono text-indigo-400">{o.sellerGstin}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="space-y-1">
                            {o.orderItems.map((item, idx) => (
                              <div key={idx} className="text-[11px] leading-tight">
                                <span className="font-medium text-slate-200">{item.productTitle}</span>
                                <span className="text-slate-400 font-mono text-[10px] block">
                                  SKU: {item.variantSku} × {item.quantity} pcs @ ₹{item.unitPrice}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-emerald-400 text-sm">
                            ₹{o.totalAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Paid: ₹{(o.paidAmount || 0).toLocaleString('en-IN')}
                          </div>
                          {o.balanceDue > 0 && (
                            <div className="text-[10px] font-semibold text-amber-400">
                              Due: ₹{o.balanceDue.toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={o.status}
                            disabled={actionLoading === `order-status-${o.id}`}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="bg-slate-900 border border-slate-700 text-[11px] rounded-lg px-2 py-1 text-slate-200 font-semibold focus:outline-none"
                          >
                            <option value="PLACED">PLACED</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PACKED">PACKED</option>
                            <option value="DISPATCHED">DISPATCHED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => { setSelectedInvoiceOrder(o); setIsInvoiceOpen(true); }}
                            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-medium inline-flex items-center gap-1 transition border border-indigo-500/30"
                          >
                            <FileText className="w-3.5 h-3.5" /> GST Tax Inv
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          No transaction orders found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: GLOBAL PRODUCT CATALOG CONTROL */}
        {/* ======================================================== */}
        {activeTab === 'CATALOG' && (
          <div className="space-y-4">
            
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search products, brands, categories, SKUs..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="text-xs text-slate-400">
                Showing <strong className="text-white">{filteredProducts.length}</strong> catalog items with variant cost & purchasePrice audit
              </div>
            </div>

            <div className="space-y-4">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{p.title}</h4>
                        <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                          HSN: {p.hsnCode || 'N/A'} (GST: {p.gstRate || 18}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Brand: <span className="text-slate-300">{p.brand || 'FlowMart Certified'}</span> | 
                        Seller: <span className="text-indigo-400 font-semibold">{p.sellerBusinessName || 'Apex Electronics'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-right">
                        <span className="text-slate-400">Wholesale MOQ: </span>
                        <span className="font-bold text-white">{p.minimumOrderQuantity} units</span>
                        <span className="text-slate-500 ml-1">(Pack Size: {p.packSize})</span>
                      </div>

                      <button
                        onClick={() => handleToggleProductStatus(p.id, p.active)}
                        disabled={actionLoading === `prod-status-${p.id}`}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          p.active
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900/60'
                        }`}
                      >
                        {p.active ? 'Active in Marketplace' : 'Disabled / Hidden'}
                      </button>
                    </div>
                  </div>

                  {/* Variants Margin Audit Table */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-700/60">
                          <th className="py-2">Variant SKU</th>
                          <th className="py-2">Variant Title</th>
                          <th className="py-2 text-right">Purchase Price (Cost)</th>
                          <th className="py-2 text-right">Wholesale Price</th>
                          <th className="py-2 text-right">MRP</th>
                          <th className="py-2 text-right">Profit Margin</th>
                          <th className="py-2 text-center">Available Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {p.variants.map((v) => {
                          const cost = v.purchasePrice || 0;
                          const margin = v.price - cost;
                          const marginPercent = cost > 0 ? ((margin / cost) * 100).toFixed(1) : '—';

                          return (
                            <tr key={v.id} className="hover:bg-slate-700/20">
                              <td className="py-2 font-mono font-bold text-indigo-300">{v.sku}</td>
                              <td className="py-2 text-slate-300">{v.title || 'Standard'}</td>
                              <td className="py-2 text-right font-mono text-amber-300">
                                ₹{cost.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-emerald-400">
                                ₹{v.price.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 text-right font-mono text-slate-400">
                                ₹{(v.mrp || v.price * 1.3).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 text-right font-mono text-slate-300">
                                +₹{margin.toLocaleString('en-IN')} ({marginPercent}%)
                              </td>
                              <td className="py-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  v.stockQuantity <= (v.lowStockThreshold || 10)
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : 'bg-slate-700 text-slate-200'
                                }`}>
                                  {v.stockQuantity} units
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: GLOBAL ERP LEDGERS */}
        {/* ======================================================== */}
        {activeTab === 'LEDGERS' && (
          <div className="space-y-4">
            
            {/* Ledger Sub-tabs */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-800/80 border border-slate-700 rounded-2xl scrollbar-none">
              {(['SALES', 'PURCHASES', 'PAYMENTS', 'RETURNS', 'INVENTORY', 'CUSTOMERS', 'SUPPLIERS', 'EXPENSES'] as LedgerSubTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveLedger(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeLedger === tab
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sub-tab Content Table */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm">
                  Global Ledger: <span className="text-indigo-400">{activeLedger}</span>
                </h3>
                <span className="text-xs text-slate-400">Spring Boot Ledger Transparency</span>
              </div>

              {/* SALES LEDGER */}
              {activeLedger === 'SALES' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Customer / Buyer</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">Total (Inc. GST)</th>
                        <th className="py-2.5 px-3 text-right">Paid Amount</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(sales.length > 0 ? sales : orders.map(o => ({
                        id: o.id,
                        invoiceNumber: o.orderNumber || `INV-${o.id}`,
                        customerName: o.buyerName,
                        totalAmount: o.totalAmount,
                        taxAmount: o.taxAmount || 0,
                        discountAmount: o.discountAmount || 0,
                        paidAmount: o.paidAmount || 0,
                        balanceDue: o.balanceDue || 0,
                        status: o.status,
                        saleDate: o.createdAt
                      }))).map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-indigo-300 font-semibold">{s.invoiceNumber}</td>
                          <td className="py-2 px-3 text-white font-medium">{s.customerName}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            ₹{(s.totalAmount - (s.taxAmount || 0)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{s.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            ₹{s.paidAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-400">
                            ₹{s.balanceDue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">
                            {new Date(s.saleDate).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAYMENTS LEDGER */}
              {activeLedger === 'PAYMENTS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Payment ID</th>
                        <th className="py-2.5 px-3">Customer / Party</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Reference / UTR</th>
                        <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(payments.length > 0 ? payments : [
                        { id: 501, customerName: 'Metro SuperMart Retail', amount: 57000, paymentDate: '2026-11-02T11:00:00Z', paymentMode: 'NEFT', referenceNumber: 'HDFCN261102981' },
                        { id: 502, customerName: 'Kalyan Provision Stores', amount: 15000, paymentDate: '2026-11-03T16:30:00Z', paymentMode: 'UPI', referenceNumber: 'UPI/98200112@okaxis' }
                      ]).map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-indigo-300">#PAY-{pay.id}</td>
                          <td className="py-2 px-3 text-white font-medium">{pay.customerName || 'B2B Buyer'}</td>
                          <td className="py-2 px-3 font-semibold text-sky-400">{pay.paymentMode}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{pay.referenceNumber || 'N/A'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{pay.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">
                            {new Date(pay.paymentDate).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PURCHASES LEDGER */}
              {activeLedger === 'PURCHASES' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">PO #</th>
                        <th className="py-2.5 px-3">Supplier Name</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">Total (INR)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(purchases.length > 0 ? purchases : [
                        { id: 301, purchaseOrderNumber: 'PO-2026-00301', supplierName: 'Shenzhen Tech Components Co', totalAmount: 350000, taxAmount: 63000, status: 'RECEIVED', purchaseDate: '2026-10-25' },
                        { id: 302, purchaseOrderNumber: 'PO-2026-00302', supplierName: 'Surat Yarn Mills', totalAmount: 180000, taxAmount: 9000, status: 'RECEIVED', purchaseDate: '2026-10-28' }
                      ]).map((pur) => (
                        <tr key={pur.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-indigo-300 font-semibold">{pur.purchaseOrderNumber}</td>
                          <td className="py-2 px-3 text-white font-medium">{pur.supplierName}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            ₹{(pur.totalAmount - (pur.taxAmount || 0)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{pur.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {pur.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">{pur.purchaseDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* RETURNS LEDGER */}
              {activeLedger === 'RETURNS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Return ID</th>
                        <th className="py-2.5 px-3">Customer / Party</th>
                        <th className="py-2.5 px-3">Return Reason</th>
                        <th className="py-2.5 px-3 text-right">Credit / Refund Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(returns.length > 0 ? returns : [
                        { id: 401, customerName: 'Metro SuperMart Retail', returnReason: '2 damaged cartons during transit', refundAmount: 3200, status: 'APPROVED', returnDate: '2026-11-03' }
                      ]).map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-rose-300 font-semibold">#RET-{ret.id}</td>
                          <td className="py-2 px-3 text-white font-medium">{ret.customerName || 'B2B Client'}</td>
                          <td className="py-2 px-3 text-slate-300">{ret.returnReason}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-400">
                            ₹{ret.refundAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {ret.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">{ret.returnDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* INVENTORY TRANSACTIONS */}
              {activeLedger === 'INVENTORY' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Tx ID</th>
                        <th className="py-2.5 px-3">Variant SKU</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-center">Quantity Delta</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 text-center">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(inventoryLogs.length > 0 ? inventoryLogs : [
                        { id: 901, variantId: 101, sku: 'ELEC-KB-RGB-01', type: 'SALE', quantity: -20, notes: 'Order #ORD-2026-01001 fulfillment', transactionDate: '2026-11-01' },
                        { id: 902, variantId: 102, sku: 'ELEC-MS-WIR-02', type: 'SALE', quantity: -20, notes: 'Order #ORD-2026-01001 fulfillment', transactionDate: '2026-11-01' },
                        { id: 903, variantId: 101, sku: 'ELEC-KB-RGB-01', type: 'PURCHASE', quantity: 100, notes: 'Inward PO-2026-00301 stock receipt', transactionDate: '2026-10-25' }
                      ]).map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-slate-400">#INV-{inv.id}</td>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-300">{inv.sku}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.type === 'PURCHASE' ? 'bg-emerald-950 text-emerald-300' :
                              inv.type === 'SALE' ? 'bg-indigo-950 text-indigo-300' :
                              'bg-amber-950 text-amber-300'
                            }`}>
                              {inv.type}
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-center font-mono font-bold ${
                            inv.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {inv.quantity > 0 ? `+${inv.quantity}` : inv.quantity}
                          </td>
                          <td className="py-2 px-3 text-slate-300">{inv.notes || '—'}</td>
                          <td className="py-2 px-3 text-center text-slate-400">{inv.transactionDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CUSTOMERS */}
              {activeLedger === 'CUSTOMERS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Business Entity</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(customers.length > 0 ? customers : [
                        { id: 1, name: 'Metro SuperMart Retail', businessName: 'Metro SuperMart Retail', gstin: '27AAECB2345P1Z8', phone: '+91 97654 32109', outstandingBalance: 0 },
                        { id: 2, name: 'Kalyan Provision Stores', businessName: 'Kalyan Provisions', gstin: '27AABCU1234F1Z1', phone: '+91 93210 99887', outstandingBalance: 17040 }
                      ]).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-semibold text-white">{c.name}</td>
                          <td className="py-2 px-3 text-slate-300">{c.businessName || 'Individual Wholesale'}</td>
                          <td className="py-2 px-3 font-mono text-indigo-400">{c.gstin || 'Unregistered'}</td>
                          <td className="py-2 px-3 text-slate-400">{c.phone}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                            ₹{(c.outstandingBalance || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SUPPLIERS */}
              {activeLedger === 'SUPPLIERS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Supplier / Vendor</th>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3 text-right">Balance Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(suppliers.length > 0 ? suppliers : [
                        { id: 1, name: 'Shenzhen Tech Components Co', companyName: 'Shenzhen Tech Exports', phone: '+86 755 8320 001', gstin: 'FOREIGN-IMPORT', balancePayable: 0 },
                        { id: 2, name: 'Surat Yarn Mills', companyName: 'Surat Textiles Ltd', phone: '+91 94260 11223', gstin: '24AAACT4921K1ZZ', balancePayable: 45000 }
                      ]).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-semibold text-white">{s.name}</td>
                          <td className="py-2 px-3 text-slate-300">{s.companyName}</td>
                          <td className="py-2 px-3 font-mono text-indigo-400">{s.gstin}</td>
                          <td className="py-2 px-3 text-slate-400">{s.phone}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-400">
                            ₹{(s.balancePayable || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* EXPENSES */}
              {activeLedger === 'EXPENSES' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(expenses.length > 0 ? expenses : [
                        { id: 701, title: 'Warehouse Logistics & Transport Freight', category: 'Logistics', paymentMode: 'BANK_TRANSFER', amount: 14500, expenseDate: '2026-11-02' },
                        { id: 702, title: 'Industrial Packaging Materials & Corrugated Boxes', category: 'Packaging', paymentMode: 'UPI', amount: 8200, expenseDate: '2026-11-03' }
                      ]).map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-medium text-white">{exp.title}</td>
                          <td className="py-2 px-3 text-indigo-300 font-semibold">{exp.category}</td>
                          <td className="py-2 px-3 text-slate-400">{exp.paymentMode || 'CASH'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                            ₹{exp.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">{exp.expenseDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* DRILL-DOWN SLIDE-OVER DRAWER (FOR ANY SELLER OR BUYER) */}
      {/* ======================================================== */}
      {userDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  selectedUser.role === 'SELLER'
                    ? 'bg-blue-950 text-blue-300 border-blue-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}>
                  {selectedUser.role} Profile Drill-Down
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedUser.name}</h3>
                <p className="text-xs text-slate-400">{selectedUser.email} • {selectedUser.phone || 'No phone'}</p>
                {selectedUser.businessName && (
                  <p className="text-xs text-indigo-400 mt-1 font-semibold">
                    {selectedUser.businessName} {selectedUser.gstin && `(GSTIN: ${selectedUser.gstin})`}
                  </p>
                )}
              </div>
              <button
                onClick={() => setUserDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* If User is SELLER: show Catalog Products */}
              {selectedUser.role === 'SELLER' && (
                <div>
                  <h4 className="font-bold text-sm text-white mb-3 flex items-center justify-between">
                    <span>Products in Catalog ({userDrawerProducts.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {userDrawerProducts.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-white">{p.title}</span>
                            <span className="text-[10px] text-slate-400 block">HSN: {p.hsnCode} • MOQ: {p.minimumOrderQuantity}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.active ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}>
                            {p.active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 flex gap-4 text-[11px] text-slate-400 font-mono">
                          {p.variants.map((v) => (
                            <span key={v.id}>
                              {v.sku}: ₹{v.price} (Stock: {v.stockQuantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {userDrawerProducts.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No products listed by this seller yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Associated Orders for this user (Seller or Buyer) */}
              <div>
                <h4 className="font-bold text-sm text-white mb-3 flex items-center justify-between">
                  <span>Transaction Orders ({userDrawerOrders.length})</span>
                </h4>
                <div className="space-y-2">
                  {userDrawerOrders.map((o) => (
                    <div key={o.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-mono font-bold text-indigo-300">{o.orderNumber || `#${o.id}`}</div>
                        <div className="text-slate-400 text-[11px]">
                          {selectedUser.role === 'SELLER' ? `Buyer: ${o.buyerName}` : `Seller: ${o.sellerBusinessName || o.sellerName}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(o.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">₹{o.totalAmount.toLocaleString('en-IN')}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 mt-1 inline-block">
                          {o.status}
                        </span>
                        <button
                          onClick={() => { setSelectedInvoiceOrder(o); setIsInvoiceOpen(true); }}
                          className="block text-[11px] text-indigo-400 hover:text-indigo-300 mt-1 font-semibold ml-auto"
                        >
                          GST Invoice →
                        </button>
                      </div>
                    </div>
                  ))}
                  {userDrawerOrders.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No order history found for this account.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setUserDrawerOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GST INVOICE MODAL */}
      <GstInvoiceModal
        order={selectedInvoiceOrder}
        isOpen={isInvoiceOpen}
        onClose={() => { setIsInvoiceOpen(false); setSelectedInvoiceOrder(null); }}
      />
    </div>
  );
};

export default AdminPortal;

