import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import {
  CustomerResponseDto,
  DashboardSummaryDto,
  ExpenseResponseDto,
  InventoryTransactionResponseDto,
  OrderResponseDto,
  OrderStatus,
  PaymentResponseDto,
  ProductResponseDto,
  PurchaseResponseDto,
  ReturnResponseDto,
  SaleResponseDto,
  SupplierResponseDto,
  VariantRequestDto,
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import {
  uploadImageToCloudinary,
  getProductImageUrls,
  getPrimaryProductImage,
  getCloudinaryConfig,
  saveCloudinaryConfig,
} from '../../utils/cloudinary';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ShoppingCart,
  Truck,
  RotateCcw,
  CreditCard,
  Receipt,
  Users,
  History,
  Settings,
  LogOut,
  Plus,
  Edit3,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
  Search,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

type SellerTab =
  | 'DASHBOARD'
  | 'PRODUCTS'
  | 'ORDERS'
  | 'POS_SALES'
  | 'PURCHASES'
  | 'RETURNS'
  | 'PAYMENTS'
  | 'EXPENSES'
  | 'PARTIES'
  | 'INVENTORY'
  | 'SETTINGS';

const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'PROCESSING', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

// ============================================================================
// SMART WHOLESALE SKU & PRODUCT CODE NORMALIZATION HELPERS
// (100% synced with Spring Boot SkuGeneratorService.java)
// ============================================================================
function smartCode(input?: string, fallback: string = 'GEN'): string {
  if (!input || !input.trim()) return fallback;
  const words = input.trim().toUpperCase().split(/\s+/);

  if (words.length >= 2) {
    const w1 = words[0].replace(/[^A-Z0-9]/g, '');
    const w2 = words[1].replace(/[^A-Z0-9]/g, '');
    if (w1.length >= 2 && w2.length >= 1) {
      return w1.substring(0, 2) + w2.substring(0, 1);
    }
  }

  const cleaned = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleaned) return fallback;
  return cleaned.length >= 3 ? cleaned.substring(0, 3) : cleaned;
}

function normalizeSize(size?: string): string {
  if (!size || !size.trim()) return 'FS';
  const s = size
    .toUpperCase()
    .trim()
    .replace(/CM|CMS|INCH|INCHES|\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
  return s || 'FS';
}

function generateSmartProductCode(
  brand?: string,
  category?: string,
  productName?: string
): string {
  const b = smartCode(brand, 'GEN');
  const c = smartCode(category, 'APP');
  const p = smartCode(productName, 'ITM');
  return `${b}-${c}-${p}`;
}

function generateSmartVariantSku(
  brand?: string,
  category?: string,
  productName?: string,
  color?: string,
  size?: string
): string {
  const b = smartCode(brand, 'GEN');
  const c = smartCode(category, 'APP');
  const p = smartCode(productName, 'ITM');
  const col = smartCode(color, 'STD');
  const s = normalizeSize(size);
  return `${b}-${c}-${p}-${col}-${s}`;
}

export const SellerPortal: React.FC = () => {
  const { user, logout, saveProfileToBackend } = useAuth();
  const [activeTab, setActiveTab] = useState<SellerTab>('DASHBOARD');

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [sales, setSales] = useState<SaleResponseDto[]>([]);
  const [purchases, setPurchases] = useState<PurchaseResponseDto[]>([]);
  const [returns, setReturns] = useState<ReturnResponseDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]);
  const [customers, setCustomers] = useState<CustomerResponseDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierResponseDto[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransactionResponseDto[]>([]);

  const [invoiceOrder, setInvoiceOrder] = useState<OrderResponseDto | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // Product Filter & Search State (Matches ProductsFragment.java)
  const [prodSearch, setProdSearch] = useState('');
  const [prodChipFilter, setProdChipFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE' | 'MEN' | 'WOMEN' | 'KIDS'
  >('ALL');

  // Product Add/Edit Modal + Cloudinary Upload + Smart Auto-SKU State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponseDto | null>(null);
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodImageUrls, setProdImageUrls] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCloudinarySetup, setShowCloudinarySetup] = useState(false);
  const [cloudNameInput, setCloudNameInput] = useState(getCloudinaryConfig().cloudName);
  const [uploadPresetInput, setUploadPresetInput] = useState(getCloudinaryConfig().uploadPreset);
  const [prodVariants, setProdVariants] = useState<VariantRequestDto[]>([]);
  const [isManualProdCode, setIsManualProdCode] = useState<boolean>(false);
  const [manualSkuLocks, setManualSkuLocks] = useState<Record<number, boolean>>({});

  // Batch Stock Update Modal (Matches UpdateStockBottomSheet.java)
  const [batchStockProduct, setBatchStockProduct] = useState<ProductResponseDto | null>(null);
  const [batchStockMap, setBatchStockMap] = useState<Record<number, number>>({});
  const [isSavingBatchStock, setIsSavingBatchStock] = useState(false);

  // Order Search & Status Filter State (Matches SalesFragment.java)
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');

  // Order Negotiation / Modify Modal State (Matches SaleAdapter.java)
  const [modifyingOrder, setModifyingOrder] = useState<OrderResponseDto | null>(null);
  const [modDiscount, setModDiscount] = useState<number>(0);
  const [modRemarks, setModRemarks] = useState<string>('');
  const [modAddress, setModAddress] = useState<string>('');
  const [modItems, setModItems] = useState<
    {
      variantId: number;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      itemNote?: string;
    }[]
  >([]);

  // Order Quick Payment Modal (Matches SaleAdapter.showRecordPaymentDialog)
  const [paymentModalOrder, setPaymentModalOrder] = useState<OrderResponseDto | null>(null);
  const [orderPayAmount, setOrderPayAmount] = useState<string>('');
  const [orderPayMethod, setOrderPayMethod] = useState<string>('UPI');
  const [orderPayNotes, setOrderPayNotes] = useState<string>('');

  // Multi-Item Order Return Modal (Matches ReturnProcessActivity.java)
  const [returnModalOrder, setReturnModalOrder] = useState<OrderResponseDto | null>(null);
  const [orderReturnQtys, setOrderReturnQtys] = useState<Record<number, number>>({});
  const [orderReturnReason, setOrderReturnReason] = useState<string>('Defective / Size Exchange');

  // Inventory Tab Filter State (Matches InventoryFragment.java)
  const [invSearch, setInvSearch] = useState('');
  const [invFilter, setInvFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW' | 'OUT' | 'HISTORY'>('ALL');

  // Standalone Payment Tab Form
  const [payCustomerId, setPayCustomerId] = useState<number>(0);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<string>('UPI');
  const [payRefType, setPayRefType] = useState<'ORDER' | 'SALE' | 'GENERAL'>('GENERAL');
  const [payRefId, setPayRefId] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Standalone Return Tab Form
  const [retMode, setRetMode] = useState<'ORDER' | 'SALE'>('ORDER');
  const [retTargetId, setRetTargetId] = useState<string>('');
  const [retVariantId, setRetVariantId] = useState<string>('');
  const [retQty, setRetQty] = useState<string>('1');
  const [retReason, setRetReason] = useState<string>('Defective / Size Exchange');

  // POS Sale Form
  const [saleNumber, setSaleNumber] = useState<string>(`POS-${Date.now().toString().slice(-5)}`);
  const [saleCustomerId, setSaleCustomerId] = useState<string>('');
  const [saleVariantId, setSaleVariantId] = useState<string>('');
  const [saleQty, setSaleQty] = useState<string>('1');

  // Purchase Form
  const [purNumber, setPurNumber] = useState<string>(`PO-${Date.now().toString().slice(-5)}`);
  const [purSupplierId, setPurSupplierId] = useState<string>('');
  const [purVariantId, setPurVariantId] = useState<string>('');
  const [purQty, setPurQty] = useState<string>('50');
  const [purUnitCost, setPurUnitCost] = useState<string>('100');

  // Expense Form
  const [expAmount, setExpAmount] = useState<string>('');
  const [expCategory, setExpCategory] = useState<string>('LOGISTICS');
  const [expDesc, setExpDesc] = useState<string>('');

  // Parties Forms
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Settings State
  const [profName, setProfName] = useState(user?.name || '');
  const [profBusinessName, setProfBusinessName] = useState(user?.businessName || '');
  const [profGst, setProfGst] = useState(user?.gstNumber || '');
  const [profPhone, setProfPhone] = useState(user?.businessPhone || '');
  const [profAddress, setProfAddress] = useState(user?.businessAddress || '');

  useEffect(() => {
    if (user) {
      setProfName(user.name || '');
      setProfBusinessName(user.businessName || '');
      setProfGst(user.gstNumber || '');
      setProfPhone(user.businessPhone || '');
      setProfAddress(user.businessAddress || '');
    }
  }, [user]);

  const loadAllSellerData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [
        sumRes,
        prodRes,
        ordRes,
        salRes,
        purRes,
        retRes,
        payRes,
        expRes,
        custRes,
        supRes,
        invRes,
      ] = await Promise.all([
        axiosClient.get<DashboardSummaryDto>('/reports/dashboard-summary'),
        axiosClient.get<ProductResponseDto[]>('/products/my-products', {
          params: { page: 0, size: 100 },
        }),
        user.role === 'ADMIN'
          ? axiosClient.get<OrderResponseDto[]>('/orders', { params: { page: 0, size: 100 } })
          : axiosClient.get<OrderResponseDto[]>(`/orders/seller/${user.id}`, {
              params: { page: 0, size: 100 },
            }),
        axiosClient.get<SaleResponseDto[]>('/sales', { params: { page: 0, size: 50 } }),
        axiosClient.get<PurchaseResponseDto[]>('/purchases', { params: { page: 0, size: 50 } }),
        axiosClient.get<ReturnResponseDto[]>('/returns'),
        axiosClient.get<PaymentResponseDto[]>('/payments'),
        axiosClient.get<ExpenseResponseDto[]>('/expenses'),
        axiosClient.get<CustomerResponseDto[]>('/customers'),
        axiosClient.get<SupplierResponseDto[]>('/suppliers'),
        axiosClient.get<InventoryTransactionResponseDto[]>('/inventory/transactions', {
          params: { page: 0, size: 50 },
        }),
      ]);

      setSummary(sumRes.data);
      setProducts(prodRes.data || []);
      setOrders(ordRes.data || []);
      setSales(salRes.data || []);
      setPurchases(purRes.data || []);
      setReturns(retRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setCustomers(custRes.data || []);
      setSuppliers(supRes.data || []);
      setTransactions(invRes.data || []);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    loadAllSellerData();
  }, [loadAllSellerData]);

  // ============================================================================
  // DASHBOARD ANALYTICS (Matches DashboardFragment.java in Seller Android App)
  // ============================================================================
  const dashboardAnalytics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthPrefix = todayStr.slice(0, 7);

    let todaySales = 0;
    let todayOrdersCount = 0;
    let monthlyRevenue = 0;
    let pendingOrdersCount = 0;
    let deliveredOrdersCount = 0;

    // Last 7 days map
    const last7Days: { date: string; label: string; revenue: number }[] = [];
    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      last7Days.push({ date: iso, label, revenue: 0 });
      dayMap[iso] = 0;
    }

    const bestSellerMap: Record<string, { productName: string; unitsSold: number; revenue: number }> =
      {};

    for (const o of orders) {
      const st = (o.status || 'PLACED').toUpperCase();
      const isCancelled = st === 'CANCELLED' || st === 'REJECTED';
      if (st === 'PLACED') pendingOrdersCount++;
      if (st === 'DELIVERED') deliveredOrdersCount++;

      const dateStr = (o.orderDate || o.createdAt || '').slice(0, 10);
      const netPayable = Math.max(0, Number(o.totalAmount || 0) - Number(o.returnedAmount || 0));

      if (!isCancelled) {
        if (dateStr === todayStr) {
          todaySales += netPayable;
          todayOrdersCount++;
        }
        if (dateStr.startsWith(currentMonthPrefix)) {
          monthlyRevenue += netPayable;
        }
        if (dayMap[dateStr] !== undefined) {
          dayMap[dateStr] += netPayable;
        }

        for (const item of o.items || []) {
          const pName = item.productName || 'Product';
          if (!bestSellerMap[pName]) {
            bestSellerMap[pName] = { productName: pName, unitsSold: 0, revenue: 0 };
          }
          bestSellerMap[pName].unitsSold += Number(item.quantity || 0);
          bestSellerMap[pName].revenue += Number(item.quantity || 0) * Number(item.price || 0);
        }
      }
    }

    for (const dayObj of last7Days) {
      dayObj.revenue = dayMap[dayObj.date] || 0;
    }

    const bestSellers = Object.values(bestSellerMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 4);

    // Product & Low Stock stats
    let activeProductsCount = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockAlerts: string[] = [];

    for (const p of products) {
      if (p.active) activeProductsCount++;
      for (const v of p.variants || []) {
        const st = Number(v.stock || 0);
        totalUnits += st;
        if (st <= 0) {
          outOfStockCount++;
          lowStockCount++;
        } else if (st < 10) {
          lowStockCount++;
        }
        if (st < 10 && lowStockAlerts.length < 6) {
          lowStockAlerts.push(
            `${p.name} (${v.size || 'Std'} • ${v.color || 'Std'}) — SKU: ${v.sku} | Stock: ${st}`
          );
        }
      }
    }

    return {
      todaySales,
      todayOrdersCount,
      monthlyRevenue,
      pendingOrdersCount,
      deliveredOrdersCount,
      last7Days,
      sevenDayTotal: last7Days.reduce((s, d) => s + d.revenue, 0),
      maxDayRevenue: Math.max(1, ...last7Days.map((d) => d.revenue)),
      bestSellers,
      activeProductsCount,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      lowStockAlerts,
    };
  }, [orders, products]);

  // ============================================================================
  // PRODUCT CRUD, SMART AUTO-SKU & CLOUDINARY UPLOAD HANDLERS
  // ============================================================================
  const syncAutoSkus = (
    nextBrand: string,
    nextCategory: string,
    nextName: string,
    currentVariants: VariantRequestDto[],
    locks: Record<number, boolean>,
    manualCodeLocked: boolean
  ) => {
    if (!manualCodeLocked) {
      setProdCode(generateSmartProductCode(nextBrand, nextCategory, nextName));
    }
    setProdVariants(
      currentVariants.map((v, idx) => {
        if (locks[idx]) return v;
        return {
          ...v,
          sku: generateSmartVariantSku(nextBrand, nextCategory, nextName, v.color, v.size),
        };
      })
    );
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    const defaultBrand = '';
    const defaultCategory = 'Men Undergarments';
    const defaultName = '';
    const defaultColor = 'White';
    const defaultSize = '85';

    setIsManualProdCode(false);
    setManualSkuLocks({});
    setProdName(defaultName);
    setProdDesc('');
    setProdCategory(defaultCategory);
    setProdBrand(defaultBrand);
    setProdCode(generateSmartProductCode(defaultBrand, defaultCategory, defaultName));
    setProdImageUrls('');
    setUploadedImages([]);
    setProdVariants([
      {
        sku: generateSmartVariantSku(
          defaultBrand,
          defaultCategory,
          defaultName,
          defaultColor,
          defaultSize
        ),
        size: defaultSize,
        color: defaultColor,
        sellingPrice: 140,
        purchasePrice: 95,
        stock: 120,
        minimumOrderQuantity: 12,
        packSize: 6,
        hsnCode: '6107',
        gstPercentage: 5,
      },
    ]);
    setShowProductModal(true);
  };

  const openEditProductModal = (p: ProductResponseDto) => {
    setEditingProduct(p);
    setProdCode(p.productCode);
    setProdName(p.name);
    setProdDesc(p.description || '');
    setProdCategory(p.category || '');
    setProdBrand(p.brand || '');
    setIsManualProdCode(true); // Preserve existing product style code during edit

    const existingImgs = getProductImageUrls(p);
    setUploadedImages(existingImgs);
    setProdImageUrls(existingImgs.join(', '));

    const existingLocks: Record<number, boolean> = {};
    const mappedVariants = (p.variants || []).map((v, idx) => {
      existingLocks[idx] = true; // Lock existing saved SKUs by default so they don't change accidentally
      return {
        id: v.id,
        sku: v.sku,
        size: v.size || '',
        color: v.color || '',
        sellingPrice: Number(v.sellingPrice),
        purchasePrice: Number(v.purchasePrice ?? 0),
        stock: Number(v.stock),
        minimumOrderQuantity: Number(v.minimumOrderQuantity || 1),
        packSize: Number(v.packSize || 1),
        hsnCode: v.hsnCode || '6107',
        gstPercentage: Number(v.gstPercentage ?? 5),
      };
    });

    setManualSkuLocks(existingLocks);
    setProdVariants(mappedVariants);
    setShowProductModal(true);
  };

  const handleQuickAddSizes = (sizesToAdd: string[], defaultColor: string = 'White') => {
    setProdVariants((prev) => {
      const template = prev[0] || {
        sellingPrice: 140,
        purchasePrice: 95,
        stock: 100,
        minimumOrderQuantity: 12,
        packSize: 6,
        hsnCode: '6107',
        gstPercentage: 5,
      };

      const existingSizes = new Set(prev.map((v) => normalizeSize(v.size)));

      const newRows: VariantRequestDto[] = sizesToAdd
        .filter((sz) => !existingSizes.has(normalizeSize(sz)))
        .map((sz) => {
          const cleanSz = normalizeSize(sz);
          const col = template.color || defaultColor;
          return {
            sku: generateSmartVariantSku(prodBrand, prodCategory, prodName, col, cleanSz),
            size: cleanSz,
            color: col,
            sellingPrice: template.sellingPrice,
            purchasePrice: template.purchasePrice,
            stock: template.stock,
            minimumOrderQuantity: template.minimumOrderQuantity,
            packSize: template.packSize,
            hsnCode: template.hsnCode || '6107',
            gstPercentage: template.gstPercentage ?? 5,
          };
        });

      // Replace first row if it was an empty placeholder
      if (prev.length === 1 && !prev[0].size && !prev[0].id) {
        return newRows.length > 0 ? newRows : prev;
      }
      return [...prev, ...newRows];
    });
  };

  const handleCloudinaryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const uploadedUrl = await uploadImageToCloudinary(file);
        newUrls.push(uploadedUrl);
      }
      setUploadedImages((prev) => {
        const combined = Array.from(new Set([...prev, ...newUrls]));
        setProdImageUrls(combined.join(', '));
        return combined;
      });
      showToast('success', `Uploaded ${newUrls.length} photo(s) to Cloudinary!`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Cloudinary upload failed.');
      setShowCloudinarySetup(true);
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveUploadedImage = (urlToRemove: string) => {
    setUploadedImages((prev) => {
      const filtered = prev.filter((u) => u !== urlToRemove);
      setProdImageUrls(filtered.join(', '));
      return filtered;
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const preparedVariants = prodVariants.map((v) => {
      const normalizedSz = normalizeSize(v.size);
      const finalSku =
        v.sku && v.sku.trim()
          ? v.sku.trim().toUpperCase().replace(/\s+/g, '-')
          : generateSmartVariantSku(prodBrand, prodCategory, prodName, v.color, normalizedSz);

      return {
        ...v,
        size: normalizedSz,
        sku: finalSku,
      };
    });

    for (const v of preparedVariants) {
      if (
        v.minimumOrderQuantity < 1 ||
        v.packSize < 1 ||
        v.minimumOrderQuantity % v.packSize !== 0
      ) {
        showToast(
          'error',
          `MOQ (${v.minimumOrderQuantity}) for SKU '${v.sku}' must be a multiple of Pack Size (${v.packSize}).`
        );
        return;
      }
    }

    const imageList = Array.from(
      new Set(
        [
          ...uploadedImages,
          ...prodImageUrls
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.startsWith('http://') || s.startsWith('https://')),
        ].filter(Boolean)
      )
    );

    const resolvedProdCode =
      prodCode && prodCode.trim()
        ? prodCode.trim().toUpperCase()
        : generateSmartProductCode(prodBrand, prodCategory, prodName);

    const payload = {
      sellerId: user.id,
      productCode: resolvedProdCode,
      name: prodName.trim(),
      description: prodDesc.trim() || undefined,
      category: prodCategory.trim() || undefined,
      brand: prodBrand.trim() || undefined,
      imageUrls: imageList,
      variants: preparedVariants,
    };

    try {
      if (editingProduct) {
        await axiosClient.put(`/products/${editingProduct.id}`, payload);
        showToast('success', 'Product updated successfully!');
      } else {
        await axiosClient.post('/products', payload);
        showToast('success', 'Product created successfully!');
      }
      setShowProductModal(false);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleToggleProductStatus = async (product: ProductResponseDto) => {
    try {
      await axiosClient.patch(`/products/${product.id}/status`, null, {
        params: { active: !product.active },
      });
      showToast('success', `Product '${product.name}' status updated.`);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const openBatchStockModal = (product: ProductResponseDto) => {
    setBatchStockProduct(product);
    const initialMap: Record<number, number> = {};
    for (const v of product.variants || []) {
      initialMap[v.id] = v.stock;
    }
    setBatchStockMap(initialMap);
  };

  const handleSaveBatchStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchStockProduct) return;
    setIsSavingBatchStock(true);
    try {
      const updates = (batchStockProduct.variants || []).filter(
        (v) => batchStockMap[v.id] !== undefined && batchStockMap[v.id] !== v.stock
      );
      await Promise.all(
        updates.map((v) =>
          axiosClient.patch(`/products/variants/${v.id}/stock`, {
            stock: Number(batchStockMap[v.id]),
          })
        )
      );
      showToast('success', 'Inventory stock updated for all modified variants!');
      setBatchStockProduct(null);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    } finally {
      setIsSavingBatchStock(false);
    }
  };

  // Filtered Products (Matches ProductsFragment.java)
  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (prodChipFilter === 'ACTIVE' && !p.active) return false;
      if (prodChipFilter === 'INACTIVE' && p.active) return false;

      const catText = `${p.category || ''} ${p.name || ''}`.toLowerCase();
      if (
        prodChipFilter === 'MEN' &&
        !((catText.includes('men') && !catText.includes('women')) ||
          catText.includes('vest') ||
          catText.includes('brief') ||
          catText.includes('trunk'))
      ) {
        return false;
      }
      if (
        prodChipFilter === 'WOMEN' &&
        !(
          catText.includes('women') ||
          catText.includes('bra') ||
          catText.includes('panty') ||
          catText.includes('lingerie')
        )
      ) {
        return false;
      }
      if (
        prodChipFilter === 'KIDS' &&
        !(catText.includes('kid') || catText.includes('boy') || catText.includes('girl'))
      ) {
        return false;
      }

      if (!q) return true;
      const matchHeader =
        p.name?.toLowerCase().includes(q) ||
        p.productCode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q);
      const matchSku = (p.variants || []).some((v) => v.sku?.toLowerCase().includes(q));
      return matchHeader || matchSku;
    });
  }, [products, prodSearch, prodChipFilter]);

  // ============================================================================
  // ORDER WORKFLOW, NEGOTIATION, PAYMENT & MULTI-ITEM RETURN HANDLERS
  // ============================================================================
  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      const matchHeader =
        String(o.id).includes(q) ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerMobile?.toLowerCase().includes(q);
      const matchItem = (o.items || []).some(
        (i) => i.productName?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)
      );
      return matchHeader || matchItem;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const handleOrderStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      await axiosClient.patch(`/orders/${orderId}/status`, null, {
        params: { status: nextStatus },
      });
      showToast('success', `Order #${orderId} updated to ${nextStatus}.`);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const openModifyOrderModal = (order: OrderResponseDto) => {
    setModifyingOrder(order);
    setModDiscount(Number(order.discountAmount || 0));
    setModRemarks(order.sellerRemarks || '');
    setModAddress(order.deliveryAddress || '');
    setModItems(
      (order.items || []).map((i) => ({
        variantId: i.variantId,
        sku: i.sku,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.price),
        itemNote: i.itemNote || '',
      }))
    );
  };

  const submitModifiedOrder = async (confirmImmediately: boolean) => {
    if (!modifyingOrder) return;
    const validItems = modItems.filter((i) => i.variantId > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      showToast('error', 'Order must contain at least 1 item with Quantity > 0.');
      return;
    }

    try {
      await axiosClient.put(`/orders/${modifyingOrder.id}`, {
        deliveryAddress: modAddress.trim(),
        discountAmount: Number(modDiscount || 0),
        sellerRemarks: modRemarks.trim() || undefined,
        confirmImmediately,
        items: validItems.map((i) => ({
          variantId: Number(i.variantId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          itemNote: i.itemNote?.trim() || undefined,
        })),
      });
      showToast(
        'success',
        `Order #${modifyingOrder.id} ${confirmImmediately ? 'modified & confirmed' : 'updated'}!`
      );
      setModifyingOrder(null);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const openOrderPaymentModal = (order: OrderResponseDto) => {
    const netPayable = Math.max(0, Number(order.totalAmount || 0) - Number(order.returnedAmount || 0));
    const due = Math.max(0, netPayable - Number(order.paidAmount || 0));
    setPaymentModalOrder(order);
    setOrderPayAmount(due.toFixed(2));
    setOrderPayMethod('UPI');
    setOrderPayNotes('');
  };

  const handleSaveOrderPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;
    try {
      await axiosClient.post('/payments', {
        customerId: paymentModalOrder.customerId,
        amount: Number(orderPayAmount),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: orderPayMethod,
        referenceType: 'ORDER',
        referenceId: paymentModalOrder.id,
        notes: orderPayNotes.trim() || 'Recorded via Web Seller ERP',
      });
      showToast('success', `Payment of ₹${orderPayAmount} recorded for Order #${paymentModalOrder.id}!`);
      setPaymentModalOrder(null);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const openOrderReturnModal = (order: OrderResponseDto) => {
    setReturnModalOrder(order);
    const initialQtys: Record<number, number> = {};
    for (const item of order.items || []) {
      initialQtys[item.variantId] = 0;
    }
    setOrderReturnQtys(initialQtys);
    setOrderReturnReason('Defective / Size Exchange');
  };

  const handleSaveMultiItemOrderReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrder) return;

    const itemsToReturn = Object.entries(orderReturnQtys)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([variantId, quantity]) => ({
        variantId: Number(variantId),
        quantity: Number(quantity),
      }));

    if (itemsToReturn.length === 0) {
      showToast('error', 'Enter a return quantity (> 0) for at least one order item.');
      return;
    }

    try {
      await axiosClient.post('/returns', {
        orderId: returnModalOrder.id,
        reason: orderReturnReason.trim() || 'Order Return',
        items: itemsToReturn,
      });
      showToast(
        'success',
        `Return processed for Order #${returnModalOrder.id} — stock restored & credit applied!`
      );
      setReturnModalOrder(null);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  // ============================================================================
  // BACK-OFFICE ERP FORM HANDLERS
  // ============================================================================
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/payments', {
        customerId: Number(payCustomerId),
        amount: Number(payAmount),
        paymentDate: payDate,
        paymentMethod: payMethod,
        referenceType: payRefType,
        referenceId: payRefId ? Number(payRefId) : undefined,
        notes: payNotes.trim() || undefined,
      });
      showToast('success', 'Payment recorded and ledger updated!');
      setPayAmount('');
      setPayRefId('');
      setPayNotes('');
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/returns', {
        orderId: retMode === 'ORDER' ? Number(retTargetId) : undefined,
        saleId: retMode === 'SALE' ? Number(retTargetId) : undefined,
        reason: retReason.trim(),
        items: [{ variantId: Number(retVariantId), quantity: Number(retQty) }],
      });
      showToast('success', 'Return processed, stock restored, and receivable balance adjusted!');
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCreatePosSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/sales', {
        saleNumber: saleNumber.trim(),
        customerId: Number(saleCustomerId),
        saleDate: new Date().toISOString().slice(0, 10),
        items: [{ variantId: Number(saleVariantId), quantity: Number(saleQty) }],
      });
      showToast('success', 'POS Sale recorded and stock deducted!');
      setSaleNumber(`POS-${Date.now().toString().slice(-5)}`);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/purchases', {
        purchaseNumber: purNumber.trim(),
        supplierId: Number(purSupplierId),
        purchaseDate: new Date().toISOString().slice(0, 10),
        items: [
          {
            variantId: Number(purVariantId),
            quantity: Number(purQty),
            unitCost: Number(purUnitCost),
          },
        ],
      });
      showToast('success', 'Purchase recorded and variant stock incremented!');
      setPurNumber(`PO-${Date.now().toString().slice(-5)}`);
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/expenses', {
        amount: Number(expAmount),
        expenseDate: new Date().toISOString().slice(0, 10),
        category: expCategory.trim(),
        description: expDesc.trim() || undefined,
      });
      showToast('success', 'Expense recorded!');
      setExpAmount('');
      setExpDesc('');
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/customers', {
        name: custName.trim(),
        mobile: custMobile.replace(/\D/g, '').slice(-10),
        email: custEmail.trim() || undefined,
      });
      showToast('success', 'Customer added to directory!');
      setCustName('');
      setCustMobile('');
      setCustEmail('');
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post('/suppliers', {
        name: supName.trim(),
        contactPerson: supContact.trim() || undefined,
        phone: supPhone.trim(),
        address: supAddress.trim() || undefined,
      });
      showToast('success', 'Supplier added to directory!');
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupAddress('');
      await loadAllSellerData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveProfileToBackend({
      name: profName,
      businessName: profBusinessName,
      gstNumber: profGst,
      businessPhone: profPhone,
      businessAddress: profAddress,
    });
    if (res.success) showToast('success', res.message || 'Settings saved!');
    else showToast('error', res.message || 'Failed to save settings.');
  };

  const allVariants = useMemo(
    () =>
      products.flatMap((p) =>
        (p.variants || []).map((v) => ({
          ...v,
          productId: p.id,
          productName: p.name,
          productCode: p.productCode,
        }))
      ),
    [products]
  );

  const filteredInventoryVariants = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return allVariants.filter((v) => {
      const st = Number(v.stock || 0);
      if (invFilter === 'AVAILABLE' && st <= 0) return false;
      if (invFilter === 'LOW' && (st <= 0 || st >= 10)) return false;
      if (invFilter === 'OUT' && st > 0) return false;
      if (!q) return true;
      const hay = `${v.productName} ${v.sku} ${v.size || ''} ${v.color || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allVariants, invSearch, invFilter]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow">
                S
              </div>
              <div>
                <div className="font-bold text-white text-sm leading-tight">
                  {user?.businessName || user?.name || 'Merchant ERP'}
                </div>
                <div className="text-[10px] font-mono text-blue-400">
                  Seller #{user?.id} {user?.gstNumber ? `| ${user.gstNumber}` : ''}
                </div>
              </div>
            </div>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {[
              { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'PRODUCTS', label: `Catalog (${products.length})`, icon: Package },
              { id: 'ORDERS', label: `B2B Orders (${orders.length})`, icon: ClipboardList },
              { id: 'INVENTORY', label: 'Inventory & History', icon: History },
              { id: 'POS_SALES', label: 'POS Offline Sales', icon: ShoppingCart },
              { id: 'PURCHASES', label: 'Purchases (Inward)', icon: Truck },
              { id: 'RETURNS', label: 'Returns & Credits', icon: RotateCcw },
              { id: 'PAYMENTS', label: 'Payments Ledger', icon: CreditCard },
              { id: 'EXPENSES', label: 'Expenses', icon: Receipt },
              { id: 'PARTIES', label: 'Customers & Suppliers', icon: Users },
              { id: 'SETTINGS', label: 'GST & Business Info', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as SellerTab)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 whitespace-nowrap transition ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 hidden lg:block">
          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium">{toast.text}</span>
          </div>
        )}

        {/* ===================================================================
            TAB 1: EXECUTIVE DASHBOARD (Matches Seller App DashboardFragment)
           =================================================================== */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            {/* Deep Navy Executive Hero Card */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                  {user?.businessName || 'Wholesale Merchant ERP'} • {user?.email}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold">
                  Welcome, {user?.name || 'Seller'}
                </h1>
                <p className="text-xs text-slate-300">
                  Online Delivered: ₹
                  {Number(summary?.onlineOrderSalesAmount || 0).toLocaleString('en-IN')} • POS Sales: ₹
                  {Number(summary?.posSalesAmount || 0).toLocaleString('en-IN')} • Returns: ₹
                  {Number(summary?.totalReturnsAmount || 0).toLocaleString('en-IN')} • Buyers:{' '}
                  {summary?.totalCustomers || 0}
                </p>
              </div>

              <div className="flex flex-wrap gap-6 items-center">
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase">
                    Monthly Order Revenue
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-white mt-0.5">
                    ₹{dashboardAnalytics.monthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="border-l border-slate-700 pl-6">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">
                    Net Delivered Revenue
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-0.5">
                    ₹{Number(summary?.totalSalesAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadAllSellerData}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>

            {/* 4 KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Today's Sales
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
                  ₹{dashboardAnalytics.todaySales.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-700 mt-1 font-medium">
                  {dashboardAnalytics.todayOrdersCount} order(s) placed today
                </div>
              </div>

              <div
                onClick={() => setActiveTab('ORDERS')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition"
              >
                <div className="text-xs font-bold text-slate-500">Total B2B Orders</div>
                <div className="text-2xl font-extrabold text-blue-600 mt-2 font-mono">
                  {orders.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {dashboardAnalytics.deliveredOrdersCount} delivered
                </div>
              </div>

              <div
                onClick={() => {
                  setOrderStatusFilter('PLACED');
                  setActiveTab('ORDERS');
                }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-400 transition"
              >
                <div className="text-xs font-bold text-slate-500">Pending Orders (PLACED)</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-2 font-mono">
                  {dashboardAnalytics.pendingOrdersCount}
                </div>
                <div className="text-xs text-amber-700 mt-1">Awaiting confirmation →</div>
              </div>

              <div
                onClick={() => {
                  setInvFilter('LOW');
                  setActiveTab('INVENTORY');
                }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-400 transition"
              >
                <div className="text-xs font-bold text-slate-500">Low Stock SKUs (&lt;10)</div>
                <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
                  {dashboardAnalytics.lowStockCount}
                </div>
                <div className="text-xs text-rose-700 mt-1">
                  {dashboardAnalytics.outOfStockCount} out of stock • Restock →
                </div>
              </div>
            </div>

            {/* 7-Day Sales Trend Bar Chart & Best-Selling Products */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Sales Analytics (Last 7 Days)
                    </h3>
                    <p className="text-xs text-slate-500">Daily wholesale order volume</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-mono font-bold">
                    7d: ₹{dashboardAnalytics.sevenDayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-100">
                  {dashboardAnalytics.last7Days.map((d, idx) => {
                    const heightPct =
                      d.revenue <= 0
                        ? 8
                        : Math.max(12, Math.round((d.revenue / dashboardAnalytics.maxDayRevenue) * 100));
                    const isToday = idx === dashboardAnalytics.last7Days.length - 1;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500">
                          {d.revenue >= 1000
                            ? `₹${(d.revenue / 1000).toFixed(1)}k`
                            : `₹${Math.round(d.revenue)}`}
                        </span>
                        <div className="w-full max-w-[32px] h-24 flex items-end justify-center">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t-lg transition-all ${
                              isToday
                                ? 'bg-blue-600'
                                : d.revenue > 0
                                ? 'bg-slate-800'
                                : 'bg-slate-200'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[11px] ${
                            isToday ? 'font-bold text-blue-600' : 'text-slate-500'
                          }`}
                        >
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best-Selling Products & Low Stock Alerts */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">Best-Selling Products</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('PRODUCTS')}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      View Catalog →
                    </button>
                  </div>
                  {dashboardAnalytics.bestSellers.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Best-selling wholesale products will appear here as orders are placed.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dashboardAnalytics.bestSellers.map((item, i) => (
                        <div
                          key={item.productName}
                          className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-none"
                        >
                          <span className="font-bold text-slate-800">
                            #{i + 1} {item.productName}
                          </span>
                          <span className="font-mono font-semibold text-emerald-700">
                            {item.unitsSold} pcs • ₹{item.revenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" /> Low Stock Alerts
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('INVENTORY')}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Manage Stock →
                    </button>
                  </div>
                  {dashboardAnalytics.lowStockAlerts.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-medium">
                      ✓ All product variants are well-stocked (10+ units).
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {dashboardAnalytics.lowStockAlerts.map((line, idx) => (
                        <div key={idx} className="text-xs text-rose-600 font-medium">
                          ⚠ {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: CATALOG & STOCK (With Direct Cloudinary Photo Upload)
           =================================================================== */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Wholesale Product Catalog</h2>
                  <p className="text-xs text-slate-500">
                    Showing {filteredProducts.length} of {products.length} product(s) • Smart Auto-SKU & Direct Cloudinary Photo Upload Enabled
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateProductModal}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Add New Product
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Search by product name, style code, category, brand, or variant SKU..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {(['ALL', 'ACTIVE', 'INACTIVE', 'MEN', 'WOMEN', 'KIDS'] as const).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setProdChipFilter(chip)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        prodChipFilter === chip
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map((p) => {
                const thumbUrl = getPrimaryProductImage(p);
                const allImgs = getProductImageUrls(p);

                return (
                  <div
                    key={p.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">
                              Style Code: {p.productCode}
                            </span>
                            {allImgs.length > 0 && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                {allImgs.length} Photo(s)
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                          <div className="text-xs text-slate-500">
                            Category: {p.category || 'General'} • Brand: {p.brand || 'Generic'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            p.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openBatchStockModal(p)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold"
                        >
                          Update Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditProductModal(p)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(p)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-t border-slate-100">
                        <thead>
                          <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-100">
                            <th className="py-2">SKU</th>
                            <th className="py-2">Size / Color</th>
                            <th className="py-2">Wholesale Price</th>
                            <th className="py-2">Purchase Cost</th>
                            <th className="py-2">MOQ / Pack</th>
                            <th className="py-2">HSN / GST</th>
                            <th className="py-2 text-right">Available Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(p.variants || []).map((v) => (
                            <tr key={v.id}>
                              <td className="py-2 font-mono font-semibold">{v.sku}</td>
                              <td className="py-2">
                                {v.size || 'Std'} | {v.color || 'Std'}
                              </td>
                              <td className="py-2 font-mono font-bold text-slate-900">
                                ₹{Number(v.sellingPrice).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 font-mono text-slate-500">
                                ₹{Number(v.purchasePrice ?? 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2">
                                MOQ: {v.minimumOrderQuantity} | Pack: {v.packSize}
                              </td>
                              <td className="py-2 font-mono">
                                {v.hsnCode || '6107'} ({v.gstPercentage ?? 0}%)
                              </td>
                              <td className="py-2 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono font-bold ${
                                    v.stock < 10
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  Stock: {v.stock}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: B2B ORDERS (With Status Chips, Negotiation, Payment & Return)
           =================================================================== */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Incoming Wholesale B2B Orders</h2>
                  <p className="text-xs text-slate-500">
                    Showing {filteredOrders.length} of {orders.length} order(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAllSellerData}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order #, buyer name, mobile, product or SKU..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {(
                    [
                      'ALL',
                      'PLACED',
                      'CONFIRMED',
                      'PROCESSING',
                      'SHIPPED',
                      'DELIVERED',
                      'CANCELLED',
                    ] as const
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        orderStatusFilter === st
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'PLACED' ? 'PENDING (PLACED)' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredOrders.map((order) => {
              const allowedNext = NEXT_ORDER_STATUSES[order.status] || [];
              const netPayable = Math.max(
                0,
                Number(order.totalAmount || 0) - Number(order.returnedAmount || 0)
              );
              const balanceDue = Math.max(0, netPayable - Number(order.paidAmount || 0));
              const canModify = order.status === 'PLACED' || order.status === 'CONFIRMED';
              const canPay =
                order.status !== 'CANCELLED' &&
                order.status !== 'REJECTED' &&
                balanceDue > 0.009;

              return (
                <div
                  key={order.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        Order #{order.id}
                      </span>
                      <span className="ml-2 text-xs text-slate-600">
                        Buyer: <strong>{order.customerName}</strong> ({order.customerMobile})
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Placed: {new Date(order.orderDate).toLocaleString('en-IN')} • Address:{' '}
                        {order.deliveryAddress}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                        {order.status}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {order.paymentStatus} (Due: ₹{balanceDue.toLocaleString('en-IN')})
                      </span>

                      {canModify && (
                        <button
                          type="button"
                          onClick={() => openModifyOrderModal(order)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                        >
                          ✏️ Modify Items & Discount
                        </button>
                      )}

                      {canPay && (
                        <button
                          type="button"
                          onClick={() => openOrderPaymentModal(order)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                        >
                          💳 Record Payment
                        </button>
                      )}

                      {order.status === 'DELIVERED' && (
                        <button
                          type="button"
                          onClick={() => openOrderReturnModal(order)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                        >
                          ↩️ Process Return
                        </button>
                      )}

                      {allowedNext.map((nextSt) => (
                        <button
                          key={nextSt}
                          type="button"
                          onClick={() => handleOrderStatusChange(order.id, nextSt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${
                            nextSt === 'REJECTED' || nextSt === 'CANCELLED'
                              ? 'bg-rose-500 hover:bg-rose-600'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          → {nextSt}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(order)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> GST Invoice
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    {(order.items || []).map((item) => (
                      <div key={item.id} className="flex justify-between py-0.5">
                        <span>
                          <strong>{item.productName}</strong> ({item.sku} • {item.size || 'Std'}{' '}
                          {item.color || ''}) × {item.quantity}
                          {item.itemNote ? (
                            <span className="text-amber-700 italic">
                              {' '}
                              — Buyer Note: "{item.itemNote}"
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono font-semibold">
                          ₹{Number(item.price).toLocaleString('en-IN')} × {item.quantity} = ₹
                          {(item.quantity * Number(item.price)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-600">
                    <div>
                      {order.sellerRemarks && (
                        <span className="text-indigo-700 font-medium">
                          💬 Seller Remarks: "{order.sellerRemarks}"
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 font-mono">
                      {Number(order.discountAmount) > 0 && (
                        <span className="text-emerald-700">
                          Discount: -₹{Number(order.discountAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                      {Number(order.returnedAmount) > 0 && (
                        <span className="text-amber-700">
                          Return Credit: -₹{Number(order.returnedAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                      <span>
                        Paid: ₹{Number(order.paidAmount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="font-bold text-slate-900">
                        Net Payable: ₹{netPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================================================================
            TAB 4: INVENTORY & SKU CONTROL (Matches InventoryFragment.java)
           =================================================================== */}
        {activeTab === 'INVENTORY' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Inventory & SKU Control</h2>
                  <p className="text-xs text-slate-500">
                    Real-time variant stock, sizes, colors, and immutable stock movement history
                  </p>
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold">
                    Available Units: {dashboardAnalytics.totalUnits}
                  </span>
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl font-bold">
                    Low Stock (&lt;10): {dashboardAnalytics.lowStockCount}
                  </span>
                  <span className="px-3 py-1.5 bg-rose-50 text-rose-800 rounded-xl font-bold">
                    Out of Stock: {dashboardAnalytics.outOfStockCount}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Filter by SKU, Size (e.g. 85, XL), Color or Product..."
                  className="w-full sm:flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'ALL', label: 'All SKUs' },
                    { id: 'AVAILABLE', label: 'In Stock' },
                    { id: 'LOW', label: 'Low Stock (<10)' },
                    { id: 'OUT', label: 'Out of Stock (0)' },
                    { id: 'HISTORY', label: 'Transaction History' },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setInvFilter(chip.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        invFilter === chip.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {invFilter === 'HISTORY' ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                      <th className="py-2">Date</th>
                      <th className="py-2">Product & SKU</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Delta</th>
                      <th className="py-2">Stock Change</th>
                      <th className="py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => {
                      const delta = Number(t.newStock) - Number(t.previousStock);
                      return (
                        <tr key={t.id}>
                          <td className="py-2.5 text-slate-500">
                            {new Date(t.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 font-medium">
                            {t.productName}{' '}
                            <span className="font-mono text-slate-500">({t.sku})</span>
                          </td>
                          <td className="py-2.5 font-mono font-bold">{t.type}</td>
                          <td
                            className={`py-2.5 font-mono font-bold ${
                              delta >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {delta >= 0 ? `+${delta}` : delta}
                          </td>
                          <td className="py-2.5 font-mono">
                            {t.previousStock} → <strong>{t.newStock}</strong>
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {t.referenceType} {t.referenceId ? `#${t.referenceId}` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInventoryVariants.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-sm">{v.productName}</div>
                      <div className="text-xs font-mono text-slate-500">
                        SKU: {v.sku} (#{v.id}) • Size: {v.size || 'Std'} • Color: {v.color || 'Std'}
                      </div>
                      <div className="text-xs text-slate-600">
                        Wholesale: ₹{v.sellingPrice} | Cost: ₹{v.purchasePrice ?? 0} | MOQ:{' '}
                        {v.minimumOrderQuantity} (Pack of {v.packSize})
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            v.stock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : v.stock < 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {v.stock <= 0
                            ? 'OUT OF STOCK (0)'
                            : v.stock < 10
                            ? `LOW STOCK: ${v.stock}`
                            : `IN STOCK: ${v.stock}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetProd = products.find((p) => p.id === v.productId);
                          if (targetProd) openBatchStockModal(targetProd);
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: POS OFFLINE SALES */}
        {activeTab === 'POS_SALES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreatePosSale}
              className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="font-bold text-slate-900 text-base">New Offline POS Sale</h3>
              <input
                type="text"
                required
                value={saleNumber}
                onChange={(e) => setSaleNumber(e.target.value)}
                placeholder="Sale Invoice Number"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <select
                required
                value={saleCustomerId}
                onChange={(e) => setSaleCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="">Select Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </select>
              <select
                required
                value={saleVariantId}
                onChange={(e) => setSaleVariantId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="">Select Variant SKU...</option>
                {allVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} - {v.productName} (₹{v.sellingPrice}, Stock: {v.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                required
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                placeholder="Quantity"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Record POS Sale
              </button>
            </form>

            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">POS Sales History</h3>
              {sales.map((s) => (
                <div
                  key={s.id}
                  className="p-3 border border-slate-100 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {s.saleNumber} (#{s.id}) — {s.customerName}
                    </div>
                    <div className="text-slate-500">
                      Date: {s.saleDate} | Status: {s.paymentStatus}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-slate-900">
                      ₹{Number(s.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <div className="text-emerald-600">
                      Paid: ₹{Number(s.paidAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PURCHASES */}
        {activeTab === 'PURCHASES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreatePurchase}
              className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="font-bold text-slate-900 text-base">
                Record Supplier Purchase (Inward Stock)
              </h3>
              <input
                type="text"
                required
                value={purNumber}
                onChange={(e) => setPurNumber(e.target.value)}
                placeholder="PO Number"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <select
                required
                value={purSupplierId}
                onChange={(e) => setPurSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
              <select
                required
                value={purVariantId}
                onChange={(e) => setPurVariantId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="">Select Variant SKU...</option>
                {allVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} - {v.productName} (Current Stock: {v.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                required
                value={purQty}
                onChange={(e) => setPurQty(e.target.value)}
                placeholder="Inward Quantity"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <input
                type="number"
                step="0.01"
                min={0.01}
                required
                value={purUnitCost}
                onChange={(e) => setPurUnitCost(e.target.value)}
                placeholder="Unit Purchase Cost (INR)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Save Purchase & Add Stock
              </button>
            </form>

            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Purchase History</h3>
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border border-slate-100 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {p.purchaseNumber} — {p.supplierName}
                    </div>
                    <div className="text-slate-500">Date: {p.purchaseDate}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    ₹{Number(p.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: RETURNS */}
        {activeTab === 'RETURNS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreateReturn}
              className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="font-bold text-slate-900 text-base">Process Sales / Order Return</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRetMode('ORDER')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                    retMode === 'ORDER' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Delivered Order
                </button>
                <button
                  type="button"
                  onClick={() => setRetMode('SALE')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                    retMode === 'SALE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  POS Sale
                </button>
              </div>
              <input
                type="number"
                required
                value={retTargetId}
                onChange={(e) => setRetTargetId(e.target.value)}
                placeholder={retMode === 'ORDER' ? 'Delivered Order ID' : 'POS Sale ID'}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <select
                required
                value={retVariantId}
                onChange={(e) => setRetVariantId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="">Select Returned Variant SKU...</option>
                {allVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    #{v.id} {v.sku} - {v.productName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                required
                value={retQty}
                onChange={(e) => setRetQty(e.target.value)}
                placeholder="Return Quantity"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <input
                type="text"
                value={retReason}
                onChange={(e) => setRetReason(e.target.value)}
                placeholder="Reason for return"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-xs font-semibold"
              >
                Process Return Credit Note
              </button>
            </form>

            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Processed Returns & Credit Notes</h3>
              {returns.map((r) => (
                <div
                  key={r.id}
                  className="p-3 border border-slate-100 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      Return #{r.id} ({r.orderId ? `Order #${r.orderId}` : `Sale #${r.saleId}`})
                    </div>
                    <div className="text-slate-500">
                      Date: {r.returnDate} | Reason: {r.reason || 'N/A'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-amber-700">
                    ₹{Number(r.totalReturnAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: PAYMENTS */}
        {activeTab === 'PAYMENTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleRecordPayment}
              className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="font-bold text-slate-900 text-base">Record Customer Payment</h3>
              <select
                required
                value={payCustomerId}
                onChange={(e) => setPayCustomerId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value={0}>Select Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (#{c.id} - {c.mobile})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0.01}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Amount Received (INR)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="CASH">CASH</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
              <select
                value={payRefType}
                onChange={(e) => setPayRefType(e.target.value as 'ORDER' | 'SALE' | 'GENERAL')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              >
                <option value="GENERAL">GENERAL LEDGER</option>
                <option value="ORDER">AGAINST B2B ORDER</option>
                <option value="SALE">AGAINST POS SALE</option>
              </select>
              {payRefType !== 'GENERAL' && (
                <input
                  type="number"
                  required
                  value={payRefId}
                  onChange={(e) => setPayRefId(e.target.value)}
                  placeholder={payRefType === 'ORDER' ? 'Order ID' : 'Sale ID'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              )}
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="UTR / Reference Notes"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Record Payment
              </button>
            </form>

            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Payment Receipts Ledger</h3>
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border border-slate-100 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {p.customerName} — {p.paymentMethod}
                    </div>
                    <div className="text-slate-500">
                      {p.paymentDate} | Ref: {p.referenceType}{' '}
                      {p.referenceId ? `#${p.referenceId}` : ''} {p.notes ? `(${p.notes})` : ''}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-700">
                    + ₹{Number(p.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: EXPENSES */}
        {activeTab === 'EXPENSES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreateExpense}
              className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 space-y-3 h-fit"
            >
              <h3 className="font-bold text-slate-900 text-base">Record Operational Expense</h3>
              <input
                type="number"
                step="0.01"
                min={0.01}
                required
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="Expense Amount (INR)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <input
                type="text"
                required
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                placeholder="Category (LOGISTICS, RENT, PACKAGING)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <input
                type="text"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Description"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Save Expense
              </button>
            </form>

            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Expenses Ledger</h3>
              {expenses.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 border border-slate-100 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{ex.category}</div>
                    <div className="text-slate-500">
                      {ex.expenseDate} — {ex.description || 'No description'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-rose-600">
                    ₹{Number(ex.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: CUSTOMERS & SUPPLIERS */}
        {activeTab === 'PARTIES' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-base">B2B Customers Directory</h3>
              <form onSubmit={handleCreateCustomer} className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Customer Name"
                  className="px-2.5 py-1.5 text-xs border rounded-lg"
                />
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-Digit Mobile"
                  className="px-2.5 py-1.5 text-xs border rounded-lg"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  + Add Customer
                </button>
              </form>
              <div className="divide-y divide-slate-100 text-xs">
                {customers.map((c) => (
                  <div key={c.id} className="py-2 flex justify-between">
                    <span className="font-semibold text-slate-800">
                      #{c.id} {c.name}
                    </span>
                    <span className="font-mono text-slate-500">{c.mobile}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Suppliers Directory</h3>
              <form onSubmit={handleCreateSupplier} className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Supplier Name"
                  className="px-2.5 py-1.5 text-xs border rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="Phone"
                  className="px-2.5 py-1.5 text-xs border rounded-lg"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  + Add Supplier
                </button>
              </form>
              <div className="divide-y divide-slate-100 text-xs">
                {suppliers.map((s) => (
                  <div key={s.id} className="py-2 flex justify-between">
                    <span className="font-semibold text-slate-800">
                      #{s.id} {s.name}
                    </span>
                    <span className="font-mono text-slate-500">{s.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: BUSINESS SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <form
            onSubmit={handleSaveSettings}
            className="max-w-xl bg-white p-6 rounded-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-bold text-slate-900 text-lg">Seller GST & Invoice Header Settings</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Business / Firm Name
              </label>
              <input
                type="text"
                value={profBusinessName}
                onChange={(e) => setProfBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Seller GSTIN</label>
              <input
                type="text"
                maxLength={15}
                value={profGst}
                onChange={(e) => setProfGst(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Phone</label>
              <input
                type="text"
                value={profPhone}
                onChange={(e) => setProfPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Market / Godown Address
              </label>
              <textarea
                rows={3}
                value={profAddress}
                onChange={(e) => setProfAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
            >
              Save Seller Settings
            </button>
          </form>
        )}
      </div>

      {/* =====================================================================
          MODAL 1: CREATE / EDIT PRODUCT WITH SMART AUTO-SKU & CLOUDINARY UPLOAD
         ===================================================================== */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg">
                  {editingProduct
                    ? `Edit Product #${editingProduct.id}`
                    : 'Add New Wholesale Product'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Smart SKU Auto-Generator active — Brand, Category, Name & Size automatically format clean SKUs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Product Style Code (Auto-Generated or Custom)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={prodCode}
                    onChange={(e) => {
                      setIsManualProdCode(true);
                      setProdCode(e.target.value.toUpperCase());
                    }}
                    placeholder="Auto: LUC-MEV-VEN"
                    className="w-full px-3 py-2 text-xs font-mono uppercase border rounded-xl bg-slate-50 focus:bg-white"
                  />
                  {isManualProdCode && (
                    <button
                      type="button"
                      title="Reset to Smart Auto Style Code"
                      onClick={() => {
                        setIsManualProdCode(false);
                        setProdCode(generateSmartProductCode(prodBrand, prodCategory, prodName));
                      }}
                      className="ml-1.5 px-2 py-1 text-[10px] bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100"
                    >
                      🔄 Auto
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProdName(val);
                    syncAutoSkus(
                      prodBrand,
                      prodCategory,
                      val,
                      prodVariants,
                      manualSkuLocks,
                      isManualProdCode
                    );
                  }}
                  placeholder="e.g. Venus Ribbed Vest"
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={prodCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProdCategory(val);
                    syncAutoSkus(
                      prodBrand,
                      val,
                      prodName,
                      prodVariants,
                      manualSkuLocks,
                      isManualProdCode
                    );
                  }}
                  placeholder="e.g. Men Vest / Brief / Kids Wear"
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Brand</label>
                <input
                  type="text"
                  value={prodBrand}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProdBrand(val);
                    syncAutoSkus(
                      val,
                      prodCategory,
                      prodName,
                      prodVariants,
                      manualSkuLocks,
                      isManualProdCode
                    );
                  }}
                  placeholder="e.g. Lux Cozi / Rupa / Amul Macho"
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Fabric quality, GSM, wholesale packing notes..."
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            {/* Cloudinary Direct Image Upload Box */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Product Photo (Cloudinary Cloud Upload)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Connected to Cloud: <code className="font-mono">{cloudNameInput}</code> | Preset:{' '}
                    <code className="font-mono">{uploadPresetInput}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloudinarySetup((prev) => !prev)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                  >
                    Cloudinary Settings
                  </button>

                  <label className="cursor-pointer px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingImage
                        ? 'Uploading to Cloud...'
                        : '📷 Select Photo & Upload to Cloud'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingImage}
                      onChange={handleCloudinaryFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {showCloudinarySetup && (
                <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                  <div className="text-[11px] font-semibold text-indigo-900">
                    Cloudinary Unsigned Upload Settings
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cloudNameInput}
                      onChange={(e) => setCloudNameInput(e.target.value)}
                      placeholder="Cloud Name (kfapwod1)"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={uploadPresetInput}
                      onChange={(e) => setUploadPresetInput(e.target.value)}
                      placeholder="Upload Preset (retail_flow_unsigned)"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      saveCloudinaryConfig(cloudNameInput, uploadPresetInput);
                      setShowCloudinarySetup(false);
                      showToast('success', 'Cloudinary configuration saved!');
                    }}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Save Config
                  </button>
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {uploadedImages.map((imgUrl, index) => (
                    <div
                      key={imgUrl + index}
                      className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm"
                    >
                      <img
                        src={imgUrl}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-0.5">
                          Primary Photo
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveUploadedImage(imgUrl)}
                        className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-0.5 hover:bg-rose-600 transition"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={prodImageUrls}
                onChange={(e) => {
                  setProdImageUrls(e.target.value);
                  const manualUrls = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.startsWith('http://') || s.startsWith('https://'));
                  setUploadedImages(manualUrls);
                }}
                placeholder="Auto-filled after Cloud upload, or paste direct HTTPS Image URLs (comma-separated)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
              />
            </div>

            {/* Variants Section with Quick Multi-Size Generator */}
            <div className="space-y-2">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-600">
                  Product Variants (Sizes / Colors / Pricing / MOQ / GST)
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAddSizes(['75', '80', '85', '90', '95', '100'])}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                  >
                    ⚡ + Innerwear Sizes (75–100)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddSizes(['S', 'M', 'L', 'XL', 'XXL'])}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                  >
                    ⚡ + Apparel Sizes (S–XXL)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setProdVariants((prev) => {
                        const defaultSize = '90';
                        const defaultColor = prev[0]?.color || 'White';
                        return [
                          ...prev,
                          {
                            sku: generateSmartVariantSku(
                              prodBrand,
                              prodCategory,
                              prodName,
                              defaultColor,
                              defaultSize
                            ),
                            size: defaultSize,
                            color: defaultColor,
                            sellingPrice: prev[0]?.sellingPrice ?? 150,
                            purchasePrice: prev[0]?.purchasePrice ?? 100,
                            stock: prev[0]?.stock ?? 100,
                            minimumOrderQuantity: prev[0]?.minimumOrderQuantity ?? 12,
                            packSize: prev[0]?.packSize ?? 6,
                            hsnCode: prev[0]?.hsnCode || '6107',
                            gstPercentage: prev[0]?.gstPercentage ?? 5,
                          },
                        ];
                      })
                    }
                    className="px-2.5 py-1 text-xs text-blue-600 font-semibold hover:bg-blue-50 rounded-lg"
                  >
                    + Add Row
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-1.5 text-[10px] font-bold text-slate-500 uppercase px-2">
                <span className="col-span-2">SKU (Auto / Custom)</span>
                <span>Size</span>
                <span>Color</span>
                <span>Sell ₹ *</span>
                <span>Cost ₹ *</span>
                <span>Stock *</span>
                <span>MOQ *</span>
                <span>Pack *</span>
                <span>GST %</span>
              </div>

              {prodVariants.map((v, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-10 gap-1.5 bg-slate-50 p-2 rounded-xl items-center"
                >
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setManualSkuLocks((prev) => ({ ...prev, [idx]: true }));
                        const next = [...prodVariants];
                        next[idx] = { ...next[idx], sku: val };
                        setProdVariants(next);
                      }}
                      placeholder="Auto SKU"
                      className="w-full px-2 py-1 text-xs font-mono uppercase border rounded bg-white"
                    />
                    {manualSkuLocks[idx] && (
                      <button
                        type="button"
                        title="Reset to Smart Auto-SKU"
                        onClick={() => {
                          setManualSkuLocks((prev) => ({ ...prev, [idx]: false }));
                          const next = [...prodVariants];
                          next[idx] = {
                            ...next[idx],
                            sku: generateSmartVariantSku(
                              prodBrand,
                              prodCategory,
                              prodName,
                              next[idx].color,
                              next[idx].size
                            ),
                          };
                          setProdVariants(next);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 px-1"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={v.size}
                    onChange={(e) => {
                      const newSize = e.target.value;
                      const next = [...prodVariants];
                      const updatedRow = { ...next[idx], size: newSize };
                      if (!manualSkuLocks[idx]) {
                        updatedRow.sku = generateSmartVariantSku(
                          prodBrand,
                          prodCategory,
                          prodName,
                          updatedRow.color,
                          newSize
                        );
                      }
                      next[idx] = updatedRow;
                      setProdVariants(next);
                    }}
                    placeholder="85 / XL"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="text"
                    value={v.color}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      const next = [...prodVariants];
                      const updatedRow = { ...next[idx], color: newColor };
                      if (!manualSkuLocks[idx]) {
                        updatedRow.sku = generateSmartVariantSku(
                          prodBrand,
                          prodCategory,
                          prodName,
                          newColor,
                          updatedRow.size
                        );
                      }
                      next[idx] = updatedRow;
                      setProdVariants(next);
                    }}
                    placeholder="Color"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={v.sellingPrice}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx] = { ...next[idx], sellingPrice: Number(e.target.value) };
                      setProdVariants(next);
                    }}
                    placeholder="Sell ₹"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={v.purchasePrice}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx] = { ...next[idx], purchasePrice: Number(e.target.value) };
                      setProdVariants(next);
                    }}
                    placeholder="Cost ₹"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="number"
                    required
                    value={v.stock}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx] = { ...next[idx], stock: Number(e.target.value) };
                      setProdVariants(next);
                    }}
                    placeholder="Stock"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="number"
                    min={1}
                    required
                    value={v.minimumOrderQuantity}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx] = { ...next[idx], minimumOrderQuantity: Number(e.target.value) };
                      setProdVariants(next);
                    }}
                    placeholder="MOQ"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="number"
                    min={1}
                    required
                    value={v.packSize}
                    onChange={(e) => {
                      const next = [...prodVariants];
                      next[idx] = { ...next[idx], packSize: Number(e.target.value) };
                      setProdVariants(next);
                    }}
                    placeholder="Pack"
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={28}
                      value={v.gstPercentage}
                      onChange={(e) => {
                        const next = [...prodVariants];
                        next[idx] = { ...next[idx], gstPercentage: Number(e.target.value) };
                        setProdVariants(next);
                      }}
                      placeholder="GST%"
                      className="w-full px-1.5 py-1 text-xs border rounded"
                    />
                    {prodVariants.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setProdVariants((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-rose-500 hover:text-rose-700 font-bold"
                        title="Remove variant"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingImage}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: BATCH VARIANT STOCK UPDATE (Matches UpdateStockBottomSheet)
         ===================================================================== */}
      {batchStockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBatchStock}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Update Stock: {batchStockProduct.name}
              </h3>
              <p className="text-xs text-slate-500">
                Style Code: {batchStockProduct.productCode} | Brand:{' '}
                {batchStockProduct.brand || 'Generic'}
              </p>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {(batchStockProduct.variants || []).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">
                      Size: {v.size || 'Standard'} | {v.color || 'Standard'}
                    </div>
                    <div className="text-slate-500 font-mono">
                      SKU: {v.sku} | Current: {v.stock}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    required
                    value={batchStockMap[v.id] ?? v.stock}
                    onChange={(e) =>
                      setBatchStockMap((prev) => ({
                        ...prev,
                        [v.id]: Number(e.target.value),
                      }))
                    }
                    className="w-28 px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg text-right"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setBatchStockProduct(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingBatchStock}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                {isSavingBatchStock ? 'Saving...' : 'Save Stock Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: MODIFY / NEGOTIATE ORDER (Matches SaleAdapter.java)
         ===================================================================== */}
      {modifyingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-900">
              Modify Order #{modifyingOrder.id} (Set Qty = 0 to remove item)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Address
              </label>
              <input
                type="text"
                value={modAddress}
                onChange={(e) => setModAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Bill Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={modDiscount}
                  onChange={(e) => setModDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seller Remarks (Visible to Buyer)
                </label>
                <input
                  type="text"
                  value={modRemarks}
                  onChange={(e) => setModRemarks(e.target.value)}
                  placeholder="e.g., Adjusted qty & applied wholesale discount"
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">Order Line Items</span>
                <button
                  type="button"
                  onClick={() =>
                    setModItems((prev) => [
                      ...prev,
                      {
                        variantId: allVariants[0]?.id || 0,
                        sku: allVariants[0]?.sku || '',
                        productName: allVariants[0]?.productName || 'Additional Variant',
                        quantity: 1,
                        unitPrice: Number(allVariants[0]?.sellingPrice || 100),
                        itemNote: '',
                      },
                    ])
                  }
                  className="text-xs text-blue-600 font-semibold"
                >
                  + Add Another Variant to Order
                </button>
              </div>

              {modItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <label className="text-[10px] text-slate-400 block">Variant</label>
                      <select
                        value={item.variantId}
                        onChange={(e) => {
                          const vId = Number(e.target.value);
                          const found = allVariants.find((v) => v.id === vId);
                          const next = [...modItems];
                          next[idx].variantId = vId;
                          if (found) {
                            next[idx].sku = found.sku;
                            next[idx].productName = found.productName;
                            next[idx].unitPrice = Number(found.sellingPrice);
                          }
                          setModItems(next);
                        }}
                        className="w-full px-2 py-1 border rounded"
                      >
                        {allVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            #{v.id} {v.sku} - {v.productName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-400 block">Qty (0=Remove)</label>
                      <input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...modItems];
                          next[idx].quantity = Number(e.target.value);
                          setModItems(next);
                        }}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[10px] text-slate-400 block">Unit Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        value={item.unitPrice}
                        onChange={(e) => {
                          const next = [...modItems];
                          next[idx].unitPrice = Number(e.target.value);
                          setModItems(next);
                        }}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={item.itemNote || ''}
                    onChange={(e) => {
                      const next = [...modItems];
                      next[idx].itemNote = e.target.value;
                      setModItems(next);
                    }}
                    placeholder="Item Note (Visible to Buyer)"
                    className="w-full px-2 py-1 border rounded bg-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setModifyingOrder(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitModifiedOrder(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Save Changes Only
              </button>
              <button
                type="button"
                onClick={() => submitModifiedOrder(true)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Save & Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: RECORD ORDER PAYMENT (Matches SaleAdapter.showRecordPaymentDialog)
         ===================================================================== */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveOrderPayment}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="font-bold text-lg text-slate-900">
              Record Payment — Order #{paymentModalOrder.id}
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>
                Buyer: <strong>{paymentModalOrder.customerName}</strong>
              </div>
              <div>
                Net Payable: ₹
                {Math.max(
                  0,
                  Number(paymentModalOrder.totalAmount) -
                    Number(paymentModalOrder.returnedAmount || 0)
                ).toLocaleString('en-IN')}{' '}
                | Paid: ₹{Number(paymentModalOrder.paidAmount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                required
                value={orderPayAmount}
                onChange={(e) => setOrderPayAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Payment Method</label>
              <select
                value={orderPayMethod}
                onChange={(e) => setOrderPayMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="NEFT_RTGS">NEFT / RTGS</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                UTR / Reference / Receipt Note
              </label>
              <input
                type="text"
                value={orderPayNotes}
                onChange={(e) => setOrderPayNotes(e.target.value)}
                placeholder="Optional note"
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: MULTI-ITEM ORDER RETURN (Matches ReturnProcessActivity.java)
         ===================================================================== */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMultiItemOrderReturn}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Process Customer Return — Order #{returnModalOrder.id}
              </h3>
              <p className="text-xs text-slate-500">
                Enter return quantity for items below (Leave 0 to skip):
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(returnModalOrder.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {item.productName} ({item.size || 'Std'} | {item.color || 'Std'})
                    </div>
                    <div className="text-slate-500 font-mono">
                      Variant #{item.variantId} • Sold Qty: {item.quantity} × ₹{item.price}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={orderReturnQtys[item.variantId] ?? 0}
                    onChange={(e) =>
                      setOrderReturnQtys((prev) => ({
                        ...prev,
                        [item.variantId]: Number(e.target.value),
                      }))
                    }
                    className="w-20 px-2.5 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg text-center"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Return Reason</label>
              <input
                type="text"
                value={orderReturnReason}
                onChange={(e) => setOrderReturnReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold"
              >
                Submit Return & Restore Stock
              </button>
            </div>
          </form>
        </div>
      )}

      <GstInvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
};

export default SellerPortal;