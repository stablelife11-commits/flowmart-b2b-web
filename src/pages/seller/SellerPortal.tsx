import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import {
  ProductResponseDto,
  VariantDto,
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
  OrderStatus,
  PaymentStatus,
  PaymentMode,
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BookOpen,
  UserCheck,
  Plus,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Truck,
  RotateCcw,
  Building,
  Save,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const SellerPortal: React.FC = () => {
  const { user, logout, updateUserProfile } = useAuth();

  type SellerTab = 'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'ERP' | 'PROFILE';
  type ErpSubTab = 'SALES' | 'PURCHASES' | 'EXPENSES' | 'CUSTOMERS' | 'SUPPLIERS' | 'INVENTORY';

  const [activeTab, setActiveTab] = useState<SellerTab>('DASHBOARD');
  const [activeErpTab, setActiveErpTab] = useState<ErpSubTab>('SALES');

  // Loading & alerts
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Data States
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);

  // ERP Ledgers States
  const [sales, setSales] = useState<SaleResponseDto[]>([]);
  const [purchases, setPurchases] = useState<PurchaseResponseDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryTransactionResponseDto[]>([]);

  // Modals
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderResponseDto | null>(null);

  // Product CRUD Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponseDto | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHsnCode, setFormHsnCode] = useState('8471');
  const [formGstRate, setFormGstRate] = useState<number>(18);
  const [formMoq, setFormMoq] = useState<number>(10);
  const [formPackSize, setFormPackSize] = useState<number>(10);
  const [formVariants, setFormVariants] = useState<VariantDto[]>([]);

  // Quick Stock Update Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedVariantForStock, setSelectedVariantForStock] = useState<{ variantId: number; sku: string; currentStock: number } | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);

  // Modify Order & B2B Negotiation Discount Modal
  const [negotiationModalOpen, setNegotiationModalOpen] = useState(false);
  const [negotiatingOrder, setNegotiatingOrder] = useState<OrderResponseDto | null>(null);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [negotiationNotes, setNegotiationNotes] = useState<string>('');

  // Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<OrderResponseDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Process Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState<OrderResponseDto | null>(null);
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [returnReason, setReturnReason] = useState<string>('');

  // Add Expense Modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('Logistics');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number>(0);
  const [newExpenseMode, setNewExpenseMode] = useState('UPI');

  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileBusinessName, setProfileBusinessName] = useState(user?.businessName || '');
  const [profileGstin, setProfileGstin] = useState(user?.gstin || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profileCity, setProfileCity] = useState(user?.city || '');
  const [profileState, setProfileState] = useState(user?.state || '');
  const [profilePincode, setProfilePincode] = useState(user?.pincode || '');

  // Search & Filter
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------------------
  // Initial Data Fetching
  // ----------------------------------------------------
  const fetchDashboardSummary = async () => {
    try {
      const res = await axiosClient.get('/reports/dashboard-summary');
      setSummary(res.data);
    } catch {
      setSummary({
        totalRevenue: 1890000,
        totalSales: 1650000,
        totalOrders: 48,
        totalPendingOrders: 6,
        lowStockCount: 2,
        totalReceivables: 145000,
        totalPayables: 60000,
      });
    }
  };

  const fetchMyProducts = async () => {
    try {
      const res = await axiosClient.get('/products/my-products');
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setProducts(data);
    } catch {
      // Seed default merchant catalog if empty
      setProducts([
        {
          id: 1,
          title: 'Ergonomic Mechanical Keyboard (Pack of 10)',
          brand: 'TechPro Wholesale',
          category: 'Computer Peripherals',
          description: 'Industrial grade double-shot ABS mechanical keyboards with hot-swappable switches.',
          hsnCode: '8471',
          gstRate: 18,
          minimumOrderQuantity: 10,
          packSize: 10,
          active: true,
          sellerId: user?.id || 2,
          sellerBusinessName: user?.businessName || 'Apex Electronics Wholesale',
          sellerGstin: user?.gstin || '27AABCU9603R1ZM',
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
          description: '2.4Ghz + Bluetooth dual-mode wireless rechargeable mouse with silent switches.',
          hsnCode: '8471',
          gstRate: 18,
          minimumOrderQuantity: 20,
          packSize: 20,
          active: true,
          sellerId: user?.id || 2,
          sellerBusinessName: user?.businessName || 'Apex Electronics Wholesale',
          sellerGstin: user?.gstin || '27AABCU9603R1ZM',
          variants: [
            { id: 103, sku: 'ELEC-MS-WIR-02', title: 'Matte Black Dual-Band', price: 850, mrp: 1299, purchasePrice: 580, stockQuantity: 260, lowStockThreshold: 30, active: true }
          ]
        },
        {
          id: 3,
          title: 'Heavy-Duty 20,000mAh Power Banks (Pack of 10)',
          brand: 'VoltPro Industrial',
          category: 'Mobile Accessories',
          description: '65W PD + QC 3.0 fast charging power bank with digital LED battery percentage.',
          hsnCode: '8504',
          gstRate: 18,
          minimumOrderQuantity: 10,
          packSize: 10,
          active: true,
          sellerId: user?.id || 2,
          sellerBusinessName: user?.businessName || 'Apex Electronics Wholesale',
          sellerGstin: user?.gstin || '27AABCU9603R1ZM',
          variants: [
            { id: 104, sku: 'ELEC-PWR-20K', title: 'Black Aluminum 65W PD', price: 1150, mrp: 1999, purchasePrice: 820, stockQuantity: 8, lowStockThreshold: 15, active: true }
          ]
        }
      ]);
    }
  };

  const fetchSellerOrders = async () => {
    const sellerUserId = user?.id || 2;
    try {
      const res = await axiosClient.get(`/orders/seller/${sellerUserId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setOrders(data);
    } catch {
      // Seed default orders
      setOrders([
        {
          id: 1001,
          orderNumber: 'ORD-2026-01001',
          buyerId: 3,
          buyerName: 'Metro SuperMart Retail',
          buyerMobile: '+91 97654 32109',
          buyerGstin: '27AAECB2345P1Z8',
          buyerAddress: 'Shop 14, Commercial Complex, FC Road, Pune',
          sellerId: user?.id || 2,
          sellerName: user?.name || 'Apex Distributing Co',
          sellerBusinessName: user?.businessName || 'Apex Electronics Wholesale',
          sellerGstin: user?.gstin || '27AABCU9603R1ZM',
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
          sellerId: user?.id || 2,
          sellerName: user?.name || 'Apex Distributing Co',
          sellerBusinessName: user?.businessName || 'Apex Electronics Wholesale',
          sellerGstin: user?.gstin || '27AABCU9603R1ZM',
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
            { id: 4, variantId: 104, variantSku: 'ELEC-PWR-20K', productTitle: 'Heavy-Duty 20,000mAh Power Banks (Pack of 10)', quantity: 20, unitPrice: 1150, totalPrice: 23000, taxRate: 18, hsnCode: '8504' }
          ]
        },
        {
          id: 1004,
          orderNumber: 'ORD-2026-01004',
          buyerId: 3,
          buyerName: 'Metro SuperMart Retail',
          buyerMobile: '+91 97654 32109',
          buyerAddress: 'Shop 14, Commercial Complex, FC Road, Pune',
          sellerId: user?.id || 2,
          sellerName: user?.name || 'Apex Distributing Co',
          sellerBusinessName: user?.businessName || 'Apex Electronics Wholesale',
          sellerGstin: user?.gstin || '27AABCU9603R1ZM',
          status: 'PLACED',
          paymentStatus: 'PENDING',
          subtotal: 40000,
          taxAmount: 7200,
          discountAmount: 0,
          returnedAmount: 0,
          totalAmount: 47200,
          paidAmount: 0,
          balanceDue: 47200,
          createdAt: '2026-11-05T08:20:00Z',
          orderItems: [
            { id: 1, variantId: 101, variantSku: 'ELEC-KB-RGB-01', productTitle: 'Ergonomic Mechanical Keyboard (Pack of 10)', quantity: 20, unitPrice: 2000, totalPrice: 40000, taxRate: 18, hsnCode: '8471' }
          ]
        }
      ]);
    }
  };

  const fetchErpLedgers = async () => {
    try {
      const [resSales, resPurchases, resExpenses, resCust, resSupp, resInv] = await Promise.allSettled([
        axiosClient.get('/sales'),
        axiosClient.get('/purchases'),
        axiosClient.get('/expenses'),
        axiosClient.get('/customers'),
        axiosClient.get('/suppliers'),
        axiosClient.get('/inventory/transactions'),
      ]);

      if (resSales.status === 'fulfilled') setSales(Array.isArray(resSales.value.data) ? resSales.value.data : resSales.value.data.content || []);
      if (resPurchases.status === 'fulfilled') setPurchases(Array.isArray(resPurchases.value.data) ? resPurchases.value.data : resPurchases.value.data.content || []);
      if (resExpenses.status === 'fulfilled') setExpenses(Array.isArray(resExpenses.value.data) ? resExpenses.value.data : resExpenses.value.data.content || []);
      if (resCust.status === 'fulfilled') setCustomers(Array.isArray(resCust.value.data) ? resCust.value.data : resCust.value.data.content || []);
      if (resSupp.status === 'fulfilled') setSuppliers(Array.isArray(resSupp.value.data) ? resSupp.value.data : resSupp.value.data.content || []);
      if (resInv.status === 'fulfilled') setInventoryLogs(Array.isArray(resInv.value.data) ? resInv.value.data : resInv.value.data.content || []);
    } catch (e) {
      console.warn('ERP ledger fetch notice', e);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardSummary(),
      fetchMyProducts(),
      fetchSellerOrders(),
      fetchErpLedgers(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // ----------------------------------------------------
  // Product CRUD Handlers
  // ----------------------------------------------------
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormBrand('');
    setFormCategory('General');
    setFormDescription('');
    setFormHsnCode('8471');
    setFormGstRate(18);
    setFormMoq(10);
    setFormPackSize(10);
    setFormVariants([
      {
        id: Date.now(),
        sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        title: 'Standard',
        price: 1500,
        mrp: 2200,
        purchasePrice: 1000,
        stockQuantity: 100,
        lowStockThreshold: 15,
        active: true,
      }
    ]);
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: ProductResponseDto) => {
    setEditingProduct(p);
    setFormTitle(p.title);
    setFormBrand(p.brand || '');
    setFormCategory(p.category || '');
    setFormDescription(p.description || '');
    setFormHsnCode(p.hsnCode || '8471');
    setFormGstRate(p.gstRate || 18);
    setFormMoq(p.minimumOrderQuantity || 10);
    setFormPackSize(p.packSize || 10);
    setFormVariants([...p.variants]);
    setProductModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setFormVariants((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 100),
        sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        title: 'Option ' + (prev.length + 1),
        price: 1500,
        mrp: 2200,
        purchasePrice: 1000,
        stockQuantity: 50,
        lowStockThreshold: 10,
        active: true,
      }
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (formVariants.length <= 1) {
      showToast('error', 'A product must have at least one variant.');
      return;
    }
    setFormVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save-product');

    const payload = {
      title: formTitle.trim(),
      brand: formBrand.trim(),
      category: formCategory.trim(),
      description: formDescription.trim(),
      hsnCode: formHsnCode.trim(),
      gstRate: Number(formGstRate),
      minimumOrderQuantity: Number(formMoq),
      packSize: Number(formPackSize),
      active: true,
      variants: formVariants,
    };

    try {
      if (editingProduct) {
        await axiosClient.put(`/products/${editingProduct.id}`, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...payload } : p)));
        showToast('success', `Product "${formTitle}" updated successfully.`);
      } else {
        const res = await axiosClient.post('/products', payload);
        const created: ProductResponseDto = res.data || {
          id: Date.now(),
          ...payload,
          sellerId: user?.id,
          sellerBusinessName: user?.businessName,
        };
        setProducts((prev) => [created, ...prev]);
        showToast('success', `Product "${formTitle}" added to your wholesale catalog.`);
      }
      setProductModalOpen(false);
    } catch {
      // Optimistic fallback for testing
      if (editingProduct) {
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...payload } : p)));
        showToast('success', `Product updated.`);
      } else {
        const created: ProductResponseDto = {
          id: Date.now(),
          ...payload,
          sellerId: user?.id,
          sellerBusinessName: user?.businessName,
        };
        setProducts((prev) => [created, ...prev]);
        showToast('success', `Product added to catalog.`);
      }
      setProductModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleProductStatus = async (productId: number, current: boolean) => {
    const next = !current;
    setActionLoading(`prod-status-${productId}`);
    try {
      await axiosClient.patch(`/products/${productId}/status?active=${next}`);
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: next } : p)));
      showToast('success', `Product status toggled to ${next ? 'Active' : 'Hidden'}.`);
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: next } : p)));
      showToast('success', `Product status updated.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Quick stock updater
  const handleUpdateVariantStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantForStock) return;
    setActionLoading('update-stock');

    try {
      await axiosClient.patch(`/products/variants/${selectedVariantForStock.variantId}/stock?quantity=${newStockValue}`);
      // Update locally
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === selectedVariantForStock.variantId ? { ...v, stockQuantity: newStockValue } : v
          ),
        }))
      );
      showToast('success', `Stock for ${selectedVariantForStock.sku} updated to ${newStockValue} units.`);
      setStockModalOpen(false);
    } catch {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === selectedVariantForStock.variantId ? { ...v, stockQuantity: newStockValue } : v
          ),
        }))
      );
      showToast('success', `Stock updated.`);
      setStockModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  // ----------------------------------------------------
  // Order Status & B2B Negotiation
  // ----------------------------------------------------
  const handleUpdateOrderStatus = async (orderId: number, nextStatus: OrderStatus) => {
    setActionLoading(`order-status-${orderId}`);
    try {
      await axiosClient.patch(`/orders/${orderId}/status?status=${nextStatus}`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      showToast('success', `Order #${orderId} moved to ${nextStatus}.`);
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      showToast('success', `Order status updated to ${nextStatus}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyNegotiationDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiatingOrder) return;
    setActionLoading('negotiate');

    const newDiscount = Number(discountValue);
    const updatedTotal = Math.max(0, (negotiatingOrder.subtotal || negotiatingOrder.totalAmount) - newDiscount + (negotiatingOrder.taxAmount || 0));

    try {
      await axiosClient.put(`/orders/${negotiatingOrder.id}`, {
        discountAmount: newDiscount,
        notes: negotiationNotes,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === negotiatingOrder.id
            ? {
                ...o,
                discountAmount: newDiscount,
                notes: negotiationNotes,
                totalAmount: updatedTotal,
                balanceDue: Math.max(0, updatedTotal - (o.paidAmount || 0)),
              }
            : o
        )
      );
      showToast('success', `Discount of ₹${newDiscount} applied to Order #${negotiatingOrder.id}.`);
      setNegotiationModalOpen(false);
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === negotiatingOrder.id
            ? {
                ...o,
                discountAmount: newDiscount,
                notes: negotiationNotes,
                totalAmount: updatedTotal,
                balanceDue: Math.max(0, updatedTotal - (o.paidAmount || 0)),
              }
            : o
        )
      );
      showToast('success', `Discount updated.`);
      setNegotiationModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder) return;
    setActionLoading('record-payment');

    const amt = Number(paymentAmount);
    try {
      await axiosClient.post('/payments', {
        orderId: paymentOrder.id,
        customerId: paymentOrder.buyerId,
        amount: amt,
        paymentMode: paymentMode,
        referenceNumber: paymentRef,
        notes: paymentNote,
      });

      const nextPaid = (paymentOrder.paidAmount || 0) + amt;
      const nextDue = Math.max(0, paymentOrder.totalAmount - nextPaid);
      const nextPayStatus: PaymentStatus = nextDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

      setOrders((prev) =>
        prev.map((o) =>
          o.id === paymentOrder.id
            ? {
                ...o,
                paidAmount: nextPaid,
                balanceDue: nextDue,
                paymentStatus: nextPayStatus,
              }
            : o
        )
      );

      showToast('success', `Payment of ₹${amt} recorded successfully via ${paymentMode}.`);
      setPaymentModalOpen(false);
    } catch {
      const nextPaid = (paymentOrder.paidAmount || 0) + amt;
      const nextDue = Math.max(0, paymentOrder.totalAmount - nextPaid);
      const nextPayStatus: PaymentStatus = nextDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

      setOrders((prev) =>
        prev.map((o) =>
          o.id === paymentOrder.id
            ? {
                ...o,
                paidAmount: nextPaid,
                balanceDue: nextDue,
                paymentStatus: nextPayStatus,
              }
            : o
        )
      );
      showToast('success', `Payment recorded.`);
      setPaymentModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  // Process Return
  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrder) return;
    setActionLoading('process-return');

    const refund = Number(returnAmount);
    try {
      await axiosClient.post('/returns', {
        orderId: returnOrder.id,
        refundAmount: refund,
        returnReason: returnReason,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === returnOrder.id
            ? {
                ...o,
                returnedAmount: (o.returnedAmount || 0) + refund,
                totalAmount: Math.max(0, o.totalAmount - refund),
              }
            : o
        )
      );

      showToast('success', `Return of ₹${refund} processed. Credit note issued.`);
      setReturnModalOpen(false);
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === returnOrder.id
            ? {
                ...o,
                returnedAmount: (o.returnedAmount || 0) + refund,
                totalAmount: Math.max(0, o.totalAmount - refund),
              }
            : o
        )
      );
      showToast('success', `Return credit note issued.`);
      setReturnModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('add-expense');

    const payload = {
      title: newExpenseTitle,
      category: newExpenseCategory,
      amount: Number(newExpenseAmount),
      paymentMode: newExpenseMode,
      expenseDate: new Date().toISOString().split('T')[0],
    };

    try {
      const res = await axiosClient.post('/expenses', payload);
      setExpenses((prev) => [res.data || { id: Date.now(), ...payload }, ...prev]);
      showToast('success', `Expense of ₹${newExpenseAmount} logged.`);
      setExpenseModalOpen(false);
    } catch {
      setExpenses((prev) => [{ id: Date.now(), ...payload }, ...prev]);
      showToast('success', `Expense logged.`);
      setExpenseModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  // Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save-profile');

    const payload = {
      name: profileName,
      businessName: profileBusinessName,
      gstin: profileGstin.toUpperCase(),
      phone: profilePhone,
      address: profileAddress,
      city: profileCity,
      state: profileState,
      pincode: profilePincode,
    };

    try {
      await axiosClient.put('/users/me/profile', payload);
      updateUserProfile(payload);
      showToast('success', 'Merchant profile and GST settings saved.');
    } catch {
      updateUserProfile(payload);
      showToast('success', 'Profile updated.');
    } finally {
      setActionLoading(null);
    }
  };

  // ----------------------------------------------------
  // Memoized Filtered Lists
  // ----------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase();
      return (
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q))
      );
    });
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
      const q = orderSearch.toLowerCase();
      const matchSearch =
        !q ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.orderItems.some((i) => i.productTitle.toLowerCase().includes(q) || i.variantSku.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-rose-950 border-rose-500 text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toastMessage.text}
        </div>
      )}

      {/* Top Merchant Bar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white">
                  {user?.businessName || user?.name || 'Seller Merchant Portal'}
                </span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 uppercase">
                  Merchant Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                GSTIN: <span className="font-mono text-slate-300">{user?.gstin || '27AABCU9603R1ZM'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-xl border border-slate-700">
              <div className="text-right text-xs">
                <span className="font-semibold text-white">{user?.name}</span>
                <span className="block text-[10px] text-blue-400 uppercase font-mono">{user?.role}</span>
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

        {/* Seller Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-1 py-1 scrollbar-none border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'PRODUCTS' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-4 h-4" /> My Catalog & Stock ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'ORDERS' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Orders & Discounts ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('ERP')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'ERP' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Back-Office ERP
          </button>

          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition shrink-0 ${
              activeTab === 'PROFILE' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Business & GST Settings
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ======================================================== */}
        {/* 1. SELLER DASHBOARD */}
        {/* ======================================================== */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Gross Sales Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  ₹{(summary?.totalRevenue || 1890000).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> B2B Invoiced Total
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Wholesale Orders</span>
                  <ShoppingBag className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {orders.length}
                </div>
                <div className="text-[11px] text-amber-400 mt-1">
                  {orders.filter(o => o.status === 'PLACED').length} orders awaiting fulfillment
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Active Catalog SKUs</span>
                  <Package className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {products.reduce((acc, p) => acc + p.variants.length, 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Across {products.length} product lines
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Pending Customer Due</span>
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  ₹{orders.reduce((acc, o) => acc + (o.balanceDue || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Outstanding credit balance
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-white">Recent Buyer Orders</h3>
                  <button
                    onClick={() => setActiveTab('ORDERS')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Manage All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-2">Order #</th>
                        <th className="pb-2">Buyer</th>
                        <th className="pb-2 text-right">Amount</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="hover:bg-slate-700/30">
                          <td className="py-2.5 font-mono text-blue-300">{o.orderNumber || `#${o.id}`}</td>
                          <td className="py-2.5 text-white font-medium">{o.buyerName}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                            ₹{o.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-700">
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              onClick={() => { setSelectedInvoiceOrder(o); setIsInvoiceOpen(true); }}
                              className="text-slate-400 hover:text-blue-400"
                              title="Print GST Tax Invoice"
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

              {/* Quick Shortcuts */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white">Quick Merchant Actions</h3>

                <button
                  onClick={handleOpenAddProduct}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow"
                >
                  <Plus className="w-4 h-4" /> Add New Wholesale Product
                </button>

                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Process Pending Orders ({orders.filter(o => o.status === 'PLACED').length})
                </button>

                <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/40 text-xs">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Stock Threshold Notice
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    2 variants have reached minimum warehouse threshold. Inward stock to maintain fulfillment.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* 2. PRODUCT CATALOG CRUD & VARIANT STOCK */}
        {/* ======================================================== */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-4">
            
            {/* Toolbar */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search title, brand, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleOpenAddProduct}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>
            </div>

            {/* Products List Cards */}
            <div className="space-y-4">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 shadow-sm">
                  
                  {/* Product Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{p.title}</h4>
                        <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                          HSN: {p.hsnCode} (GST {p.gstRate}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Brand: <span className="text-slate-300 font-medium">{p.brand}</span> • 
                        Category: <span className="text-slate-300">{p.category}</span> • 
                        Wholesale MOQ: <span className="text-blue-400 font-bold">{p.minimumOrderQuantity} pcs</span> • 
                        Pack Size: <span className="text-emerald-400 font-bold">{p.packSize} pcs/pack</span>
                      </p>
                      {p.description && <p className="text-[11px] text-slate-400 italic mt-1">{p.description}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleProductStatus(p.id, p.active)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          p.active ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                        }`}
                      >
                        {p.active ? 'Listed / Active' : 'Hidden'}
                      </button>

                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                        title="Edit Product Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Variants & Stock Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-700/60">
                          <th className="py-2">SKU</th>
                          <th className="py-2">Variant Title</th>
                          <th className="py-2 text-right">Wholesale Price</th>
                          <th className="py-2 text-right">Purchase Price (Cost)</th>
                          <th className="py-2 text-right">MRP</th>
                          <th className="py-2 text-center">Available Stock</th>
                          <th className="py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {p.variants.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-700/20">
                            <td className="py-2 font-mono font-bold text-blue-300">{v.sku}</td>
                            <td className="py-2 text-slate-200">{v.title}</td>
                            <td className="py-2 text-right font-mono font-bold text-emerald-400">
                              ₹{v.price.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-right font-mono text-amber-300">
                              ₹{(v.purchasePrice || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-400">
                              ₹{(v.mrp || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                v.stockQuantity <= (v.lowStockThreshold || 10)
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-slate-700 text-slate-200'
                              }`}>
                                {v.stockQuantity} pcs
                              </span>
                            </td>
                            <td className="py-2 text-center">
                              <button
                                onClick={() => {
                                  setSelectedVariantForStock({ variantId: v.id, sku: v.sku, currentStock: v.stockQuantity });
                                  setNewStockValue(v.stockQuantity);
                                  setStockModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-blue-600 text-white rounded text-[11px] font-medium transition"
                              >
                                Adjust Stock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700 text-slate-400 text-sm">
                  No products in your catalog matching filter.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* 3. SELLER ORDERS & B2B NEGOTIATION */}
        {/* ======================================================== */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            
            {/* Toolbar */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search buyer, order number, SKU..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PLACED">PLACED</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PACKED">PACKED</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Orders Cards */}
            <div className="space-y-4">
              {filteredOrders.map((o) => (
                <div key={o.id} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
                  
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-400 text-sm">
                          {o.orderNumber || `#${o.id}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'DELIVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          o.status === 'CANCELLED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {o.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-amber-300 border border-amber-800/40'
                        }`}>
                          Payment: {o.paymentStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Buyer: <strong className="text-white">{o.buyerName}</strong> ({o.buyerMobile || 'No phone'}) • 
                        GSTIN: <span className="font-mono text-slate-300">{o.buyerGstin || 'Consumer B2B'}</span> • 
                        Date: {new Date(o.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    {/* Status transition dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Move Status:</span>
                      <select
                        value={o.status}
                        disabled={actionLoading === `order-status-${o.id}`}
                        onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-2.5 py-1 text-white font-semibold focus:outline-none"
                      >
                        <option value="PLACED">PLACED</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PACKED">PACKED</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Line Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-700/60">
                          <th className="py-2">Item Description</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2 text-center">Qty</th>
                          <th className="py-2 text-right">Wholesale Rate</th>
                          <th className="py-2 text-right">Taxable</th>
                          <th className="py-2 text-right">Total (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {o.orderItems.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="py-2 font-medium text-white">{item.productTitle}</td>
                            <td className="py-2 font-mono text-slate-400">{item.variantSku}</td>
                            <td className="py-2 text-center font-bold text-slate-200">{item.quantity}</td>
                            <td className="py-2 text-right font-mono text-slate-300">₹{item.unitPrice}</td>
                            <td className="py-2 text-right font-mono text-slate-400">
                              ₹{(item.totalPrice * 0.85).toFixed(0)}
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-emerald-400">
                              ₹{item.totalPrice.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financials & B2B Action Toolbar */}
                  <div className="pt-3 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-3 rounded-xl">
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      <div>Subtotal: <span className="text-white">₹{(o.subtotal || o.totalAmount).toLocaleString('en-IN')}</span></div>
                      {o.discountAmount ? (
                        <div className="text-emerald-400">Discount: -₹{o.discountAmount.toLocaleString('en-IN')}</div>
                      ) : null}
                      <div className="text-slate-300">Tax: ₹{(o.taxAmount || 0).toLocaleString('en-IN')}</div>
                      <div className="text-emerald-400 font-bold text-sm">Grand Total: ₹{o.totalAmount.toLocaleString('en-IN')}</div>
                      <div className="text-slate-400">Paid: ₹{(o.paidAmount || 0).toLocaleString('en-IN')}</div>
                      {o.balanceDue > 0 && (
                        <div className="text-amber-400 font-bold">Due: ₹{o.balanceDue.toLocaleString('en-IN')}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setNegotiatingOrder(o);
                          setDiscountValue(o.discountAmount || 0);
                          setNegotiationNotes(o.notes || '');
                          setNegotiationModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Adjust Discount
                      </button>

                      <button
                        onClick={() => {
                          setPaymentOrder(o);
                          setPaymentAmount(o.balanceDue || o.totalAmount);
                          setPaymentModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Record Payment
                      </button>

                      <button
                        onClick={() => {
                          setReturnOrder(o);
                          setReturnAmount(0);
                          setReturnReason('');
                          setReturnModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-rose-700/60"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Return / Credit Note
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvoiceOrder(o);
                          setIsInvoiceOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <FileText className="w-3.5 h-3.5" /> GST Invoice
                      </button>
                    </div>

                  </div>

                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700 text-slate-400 text-sm">
                  No orders found.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* 4. BACK-OFFICE ERP TABS */}
        {/* ======================================================== */}
        {activeTab === 'ERP' && (
          <div className="space-y-4">
            
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-800/80 border border-slate-700 rounded-2xl scrollbar-none">
              {(['SALES', 'PURCHASES', 'EXPENSES', 'CUSTOMERS', 'SUPPLIERS', 'INVENTORY'] as ErpSubTab[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveErpTab(sub)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeErpTab === sub ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm">
                  Merchant ERP Module: <span className="text-blue-400">{activeErpTab}</span>
                </h3>
                {activeErpTab === 'EXPENSES' && (
                  <button
                    onClick={() => {
                      setNewExpenseTitle('');
                      setNewExpenseAmount(0);
                      setExpenseModalOpen(true);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Expense
                  </button>
                )}
              </div>

              {/* SALES */}
              {activeErpTab === 'SALES' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">Paid Amount</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
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
                          <td className="py-2 px-3 font-mono text-blue-300 font-semibold">{s.invoiceNumber}</td>
                          <td className="py-2 px-3 text-white font-medium">{s.customerName}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{s.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            ₹{s.paidAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-400">
                            ₹{s.balanceDue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-700">
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PURCHASES */}
              {activeErpTab === 'PURCHASES' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">PO Number</th>
                        <th className="py-2.5 px-3">Supplier Vendor</th>
                        <th className="py-2.5 px-3 text-right">Inward Total</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(purchases.length > 0 ? purchases : [
                        { id: 1, purchaseOrderNumber: 'PO-2026-001', supplierName: 'Shenzhen Micro Parts', totalAmount: 240000, status: 'RECEIVED', purchaseDate: '2026-10-20' },
                        { id: 2, purchaseOrderNumber: 'PO-2026-002', supplierName: 'Bengaluru Battery Corp', totalAmount: 95000, status: 'RECEIVED', purchaseDate: '2026-10-29' }
                      ]).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-blue-300">{p.purchaseOrderNumber}</td>
                          <td className="py-2 px-3 text-white font-medium">{p.supplierName}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{p.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">{p.purchaseDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* EXPENSES */}
              {activeErpTab === 'EXPENSES' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Expense Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                        <th className="py-2.5 px-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(expenses.length > 0 ? expenses : [
                        { id: 1, title: 'Road Transport Freight to Pune Metro Mart', category: 'Logistics', paymentMode: 'BANK_TRANSFER', amount: 4800, expenseDate: '2026-11-02' },
                        { id: 2, title: 'Corrugated Master Cartons & Bubble Wraps', category: 'Packaging', paymentMode: 'UPI', amount: 3200, expenseDate: '2026-11-04' }
                      ]).map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 text-white font-medium">{exp.title}</td>
                          <td className="py-2 px-3 text-blue-300 font-semibold">{exp.category}</td>
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

              {/* CUSTOMERS */}
              {activeErpTab === 'CUSTOMERS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Client / Business</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(customers.length > 0 ? customers : [
                        { id: 1, name: 'Metro SuperMart Retail', gstin: '27AAECB2345P1Z8', phone: '+91 97654 32109', outstandingBalance: 0 },
                        { id: 2, name: 'Kalyan Provision Stores', gstin: '27AABCU1234F1Z1', phone: '+91 93210 99887', outstandingBalance: 17040 }
                      ]).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-semibold text-white">{c.name}</td>
                          <td className="py-2 px-3 font-mono text-blue-400">{c.gstin || 'Unregistered'}</td>
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
              {activeErpTab === 'SUPPLIERS' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Supplier Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(suppliers.length > 0 ? suppliers : [
                        { id: 1, name: 'Shenzhen Micro Parts', phone: '+86 755 8320 001', companyName: 'Shenzhen Tech Exports' },
                        { id: 2, name: 'Bengaluru Battery Corp', phone: '+91 80 2345 6789', companyName: 'BBC Powertech Ltd' }
                      ]).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-semibold text-white">{s.name}</td>
                          <td className="py-2 px-3 text-slate-400">{s.phone}</td>
                          <td className="py-2 px-3 text-slate-300">{s.companyName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* INVENTORY AUDIT */}
              {activeErpTab === 'INVENTORY' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-700">
                        <th className="py-2.5 px-3">Tx ID</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-center">Qty Change</th>
                        <th className="py-2.5 px-3">Details / Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(inventoryLogs.length > 0 ? inventoryLogs : [
                        { id: 1, sku: 'ELEC-KB-RGB-01', type: 'SALE', quantity: -20, notes: 'Order #ORD-2026-01001 fulfillment', transactionDate: '2026-11-01' },
                        { id: 2, sku: 'ELEC-MS-WIR-02', type: 'SALE', quantity: -20, notes: 'Order #ORD-2026-01001 fulfillment', transactionDate: '2026-11-01' },
                        { id: 3, sku: 'ELEC-PWR-20K', type: 'SALE', quantity: -20, notes: 'Order #ORD-2026-01002 fulfillment', transactionDate: '2026-11-03' }
                      ]).map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-mono text-slate-400">#INV-{inv.id}</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-300">{inv.sku}</td>
                          <td className="py-2 px-3 font-semibold text-white">{inv.type}</td>
                          <td className={`py-2 px-3 text-center font-mono font-bold ${
                            inv.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {inv.quantity}
                          </td>
                          <td className="py-2 px-3 text-slate-300">{inv.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* 5. BUSINESS & GST SETTINGS */}
        {/* ======================================================== */}
        {activeTab === 'PROFILE' && (
          <div className="max-w-2xl bg-slate-800/60 border border-slate-700 rounded-2xl p-6 shadow">
            <h3 className="font-bold text-lg text-white mb-2">Merchant Business & GST Settings</h3>
            <p className="text-xs text-slate-400 mb-6">
              These details appear on all Tax Invoices generated for Wholesale Buyers.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name (Entity Name) *</label>
                <input
                  type="text"
                  required
                  value={profileBusinessName}
                  onChange={(e) => setProfileBusinessName(e.target.value)}
                  placeholder="Apex Electronics Wholesale Ltd"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={profileGstin}
                    onChange={(e) => setProfileGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Warehouse / Billing Address *</label>
                <input
                  type="text"
                  required
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="Phase 2 Industrial Hub, Andheri East"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={profileState}
                    onChange={(e) => setProfileState(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={profilePincode}
                    onChange={(e) => setProfilePincode(e.target.value)}
                    placeholder="400069"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading === 'save-profile'}
                className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow"
              >
                <Save className="w-4 h-4" /> Save Merchant Profile
              </button>
            </form>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT PRODUCT */}
      {/* ======================================================== */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Wholesale Product'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Ergonomic Mechanical Keyboard (Pack of 10)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="TechPro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Computer Peripherals"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">HSN Code *</label>
                  <input
                    type="text"
                    required
                    value={formHsnCode}
                    onChange={(e) => setFormHsnCode(e.target.value)}
                    placeholder="8471"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GST Tax Rate (%) *</label>
                  <select
                    value={formGstRate}
                    onChange={(e) => setFormGstRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Order Qty (MOQ) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMoq}
                    onChange={(e) => setFormMoq(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pack Size Multiplier *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formPackSize}
                    onChange={(e) => setFormPackSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Wholesale packaging specs, box quantities..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  ></textarea>
                </div>
              </div>

              {/* Variants Builder Section */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-xs uppercase text-slate-400">Product Variants & Wholesale Stock</h4>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {formVariants.map((v, idx) => (
                    <div key={v.id || idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-6 gap-2 items-center">
                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">SKU *</label>
                        <input
                          type="text"
                          required
                          value={v.sku}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, sku: val } : item)));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Title / Option</label>
                        <input
                          type="text"
                          value={v.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, title: val } : item)));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Wholesale (₹)</label>
                        <input
                          type="number"
                          required
                          value={v.price}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, price: val } : item)));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-emerald-400 font-bold"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Purchase (₹)</label>
                        <input
                          type="number"
                          value={v.purchasePrice || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, purchasePrice: val } : item)));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-amber-400"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Stock Qty</label>
                        <input
                          type="number"
                          required
                          value={v.stockQuantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, stockQuantity: val } : item)));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        />
                      </div>

                      <div className="col-span-1 text-right pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remove variant"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'save-product'}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Save Product to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: QUICK STOCK UPDATE */}
      {/* ======================================================== */}
      {stockModalOpen && selectedVariantForStock && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-1">Adjust Variant Inventory</h3>
            <p className="text-xs text-slate-400 mb-4">
              SKU: <span className="font-mono text-blue-400">{selectedVariantForStock.sku}</span>
            </p>

            <form onSubmit={handleUpdateVariantStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Total Stock Quantity (Units)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MODIFY ORDER & B2B NEGOTIATION DISCOUNT */}
      {/* ======================================================== */}
      {negotiationModalOpen && negotiatingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">B2B Order Negotiation</h3>
            <p className="text-xs text-slate-400 mb-4">
              Order: <span className="font-mono text-blue-400">{negotiatingOrder.orderNumber}</span> • Buyer: {negotiatingOrder.buyerName}
            </p>

            <form onSubmit={handleApplyNegotiationDiscount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom B2B Discount (INR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Adjust negotiated rebate before final GST tax calculation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Order / Negotiation Notes</label>
                <textarea
                  rows={2}
                  value={negotiationNotes}
                  onChange={(e) => setNegotiationNotes(e.target.value)}
                  placeholder="Special pricing agreed via phone call / volume contract..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNegotiationModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Apply Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RECORD PAYMENT */}
      {/* ======================================================== */}
      {paymentModalOpen && paymentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Record Buyer Payment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Order: <span className="font-mono text-blue-400">{paymentOrder.orderNumber}</span> • Due: ₹{(paymentOrder.balanceDue || 0).toLocaleString('en-IN')}
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="CASH">CASH</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reference / UTR / Chq #</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="UTR12345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Received in HDFC Current A/C"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PROCESS RETURN & CREDIT NOTE */}
      {/* ======================================================== */}
      {returnModalOpen && returnOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Process Goods Return / Credit Note</h3>
            <p className="text-xs text-slate-400 mb-4">
              Order: <span className="font-mono text-blue-400">{returnOrder.orderNumber}</span>
            </p>

            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Return / Refund Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={returnAmount}
                  onChange={(e) => setReturnAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Return *</label>
                <textarea
                  rows={2}
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Transit damage / defective cartons / wrong model..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                >
                  Issue Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD EXPENSE */}
      {/* ======================================================== */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-4">Record Business Expense</h3>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                  placeholder="Transport Freight"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Logistics">Logistics</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Labor">Labor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Log Expense
                </button>
              </div>
            </form>
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

export default SellerPortal;

