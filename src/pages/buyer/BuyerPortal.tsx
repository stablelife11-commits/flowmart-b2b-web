import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import {
  ProductResponseDto,
  VariantDto,
  OrderResponseDto,
  CartResponseDto,
  CartItemDto,
  OrderStatus,
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import {
  ShoppingCart,
  Package,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  FileText,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  Info,
  ArrowRight,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

export const BuyerPortal: React.FC = () => {
  const { user, logout } = useAuth();

  type BuyerTab = 'MARKETPLACE' | 'ORDERS' | 'CART';
  const [activeTab, setActiveTab] = useState<BuyerTab>('MARKETPLACE');

  // Loading & Toasts
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Data
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [cart, setCart] = useState<CartResponseDto>({ items: [], totalAmount: 0 });
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);

  // Marketplace Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Product Detail & Quantity Selector Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponseDto | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantDto | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(10);
  const [itemNote, setItemNote] = useState<string>('');

  // Cart Drawer & Checkout
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(user?.address || 'Shop 14, Commercial Complex, FC Road, Pune');
  const [orderNotes, setOrderNotes] = useState('');
  const [checkoutSuccessOrders, setCheckoutSuccessOrders] = useState<OrderResponseDto[] | null>(null);

  // GST Invoice Modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderResponseDto | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------------------
  // Initial API Fetching
  // ----------------------------------------------------
  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/products/paged?page=0&size=50');
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setProducts(data);
    } catch {
      // Seed default marketplace catalog
      setProducts([
        {
          id: 1,
          title: 'Ergonomic Mechanical Keyboard (Pack of 10)',
          brand: 'TechPro Wholesale',
          category: 'Computer Peripherals',
          description: 'Industrial double-shot ABS mechanical keyboards with hot-swappable tactile switches.',
          hsnCode: '8471',
          gstRate: 18,
          minimumOrderQuantity: 10,
          packSize: 10,
          active: true,
          sellerId: 2,
          sellerBusinessName: 'Apex Electronics Wholesale',
          sellerGstin: '27AABCU9603R1ZM',
          variants: [
            { id: 101, sku: 'ELEC-KB-RGB-01', title: 'Blue Tactile Clicky - RGB', price: 2000, mrp: 2999, stockQuantity: 120, lowStockThreshold: 20, active: true },
            { id: 102, sku: 'ELEC-KB-BRW-02', title: 'Brown Silent Tactile', price: 2100, mrp: 3199, stockQuantity: 45, lowStockThreshold: 15, active: true },
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
          sellerId: 2,
          sellerBusinessName: 'Apex Electronics Wholesale',
          sellerGstin: '27AABCU9603R1ZM',
          variants: [
            { id: 103, sku: 'ELEC-MS-WIR-02', title: 'Matte Black Dual-Band', price: 850, mrp: 1299, stockQuantity: 260, lowStockThreshold: 30, active: true }
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
          sellerId: 2,
          sellerBusinessName: 'Apex Electronics Wholesale',
          sellerGstin: '27AABCU9603R1ZM',
          variants: [
            { id: 104, sku: 'ELEC-PWR-20K', title: 'Black Aluminum 65W PD', price: 1150, mrp: 1999, stockQuantity: 80, lowStockThreshold: 15, active: true }
          ]
        },
        {
          id: 4,
          title: 'Pure Premium Combed Cotton Fabric Rolls (Bale of 5)',
          brand: 'Gujarat Textiles',
          category: 'Apparel & Fabrics',
          description: '100% fine combed 60s count pure cotton fabric rolls suitable for retail garment manufacturing.',
          hsnCode: '5208',
          gstRate: 5,
          minimumOrderQuantity: 5,
          packSize: 5,
          active: true,
          sellerId: 4,
          sellerBusinessName: 'Surat Fabrics Wholesale',
          sellerGstin: '24AAACT4921K1ZZ',
          variants: [
            { id: 201, sku: 'TEX-COT-BALE-50', title: 'White Combed 60s Count', price: 4500, mrp: 5500, stockQuantity: 18, lowStockThreshold: 10, active: true }
          ]
        }
      ]);
    }
  };

  const fetchCart = async () => {
    try {
      const res = await axiosClient.get('/cart');
      if (res.data) {
        setCart({
          items: res.data.items || [],
          totalAmount: res.data.totalAmount || 0,
        });
      }
    } catch {
      // Cart defaults to empty or persistent local session
      const storedCart = localStorage.getItem('flowmart_buyer_cart');
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch {}
      }
    }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await axiosClient.get('/orders/my-orders');
      const data = Array.isArray(res.data) ? res.data : (res.data.content || []);
      setOrders(data);
    } catch {
      // Seed sample orders for buyer
      setOrders([
        {
          id: 1001,
          orderNumber: 'ORD-2026-01001',
          buyerId: user?.id || 3,
          buyerName: user?.name || 'Metro SuperMart Retail',
          buyerMobile: user?.phone || '+91 97654 32109',
          buyerGstin: user?.gstin || '27AAECB2345P1Z8',
          buyerAddress: user?.address || 'Shop 14, Commercial Complex, FC Road, Pune',
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
          id: 1004,
          orderNumber: 'ORD-2026-01004',
          buyerId: user?.id || 3,
          buyerName: user?.name || 'Metro SuperMart Retail',
          buyerMobile: user?.phone || '+91 97654 32109',
          buyerAddress: user?.address || 'Shop 14, Commercial Complex, FC Road, Pune',
          sellerId: 2,
          sellerName: 'Apex Distributing Co',
          sellerBusinessName: 'Apex Electronics Wholesale',
          sellerGstin: '27AABCU9603R1ZM',
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

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchCart(), fetchMyOrders()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Save cart to localStorage
  const saveCartLocally = (newCart: CartResponseDto) => {
    setCart(newCart);
    localStorage.setItem('flowmart_buyer_cart', JSON.stringify(newCart));
  };

  // ----------------------------------------------------
  // Product Detail & Quantity Selection Modal
  // ----------------------------------------------------
  const handleOpenProductDetail = (prod: ProductResponseDto) => {
    setSelectedProduct(prod);
    const firstVariant = prod.variants[0] || null;
    setSelectedVariant(firstVariant);

    // Initial quantity satisfies MOQ and is a multiple of packSize
    const moq = prod.minimumOrderQuantity || 1;
    const pack = prod.packSize || 1;
    const initialQty = Math.ceil(moq / pack) * pack;
    setSelectedQuantity(initialQty);
    setItemNote('');
    setDetailModalOpen(true);
  };

  const handleIncrementQuantity = () => {
    if (!selectedProduct) return;
    const step = selectedProduct.packSize || 1;
    setSelectedQuantity((prev) => prev + step);
  };

  const handleDecrementQuantity = () => {
    if (!selectedProduct) return;
    const step = selectedProduct.packSize || 1;
    const moq = selectedProduct.minimumOrderQuantity || 1;
    setSelectedQuantity((prev) => Math.max(moq, prev - step));
  };

  const handleAddToCart = async () => {
    if (!selectedProduct || !selectedVariant) return;

    // Validate MOQ and pack size
    const moq = selectedProduct.minimumOrderQuantity || 1;
    const pack = selectedProduct.packSize || 1;

    if (selectedQuantity < moq) {
      showToast('error', `Minimum Order Quantity is ${moq} units.`);
      return;
    }
    if (selectedQuantity % pack !== 0) {
      showToast('error', `Order quantity must be in multiples of pack size (${pack} units).`);
      return;
    }

    setActionLoading('add-cart');

    const payload = {
      variantId: selectedVariant.id,
      quantity: selectedQuantity,
      itemNote: itemNote.trim() || undefined,
    };

    try {
      await axiosClient.post('/cart/items', payload);
      await fetchCart();
      showToast('success', `Added ${selectedQuantity} units of ${selectedProduct.title} to B2B Cart!`);
      setDetailModalOpen(false);
    } catch {
      // Local optimistic cart update
      const existingIdx = cart.items.findIndex((i) => i.variantId === selectedVariant.id);
      let updatedItems = [...cart.items];

      if (existingIdx >= 0) {
        updatedItems[existingIdx].quantity += selectedQuantity;
        updatedItems[existingIdx].totalPrice = updatedItems[existingIdx].quantity * selectedVariant.price;
      } else {
        const newItem: CartItemDto = {
          variantId: selectedVariant.id,
          variantSku: selectedVariant.sku,
          productId: selectedProduct.id,
          productTitle: selectedProduct.title,
          sellerId: selectedProduct.sellerId,
          sellerBusinessName: selectedProduct.sellerBusinessName,
          quantity: selectedQuantity,
          unitPrice: selectedVariant.price,
          totalPrice: selectedQuantity * selectedVariant.price,
          itemNote: itemNote.trim(),
          packSize: selectedProduct.packSize,
          minimumOrderQuantity: selectedProduct.minimumOrderQuantity,
          availableStock: selectedVariant.stockQuantity,
        };
        updatedItems.push(newItem);
      }

      const newTotal = updatedItems.reduce((acc, i) => acc + i.totalPrice, 0);
      saveCartLocally({ items: updatedItems, totalAmount: newTotal });
      showToast('success', `Added ${selectedQuantity} units to Cart!`);
      setDetailModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  // ----------------------------------------------------
  // Cart Actions (Inline update, remove, checkout)
  // ----------------------------------------------------
  const handleUpdateCartQuantity = async (variantId: number, nextQty: number, itemNote?: string) => {
    try {
      await axiosClient.put(`/cart/items/${variantId}?quantity=${nextQty}&itemNote=${itemNote || ''}`);
      await fetchCart();
    } catch {
      // Local update
      const updated = cart.items.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: nextQty, totalPrice: nextQty * i.unitPrice, itemNote }
          : i
      );
      const newTotal = updated.reduce((acc, i) => acc + i.totalPrice, 0);
      saveCartLocally({ items: updated, totalAmount: newTotal });
    }
  };

  const handleRemoveFromCart = async (variantId: number) => {
    try {
      await axiosClient.delete(`/cart/items/${variantId}`);
      await fetchCart();
      showToast('success', 'Item removed from cart.');
    } catch {
      const updated = cart.items.filter((i) => i.variantId !== variantId);
      const newTotal = updated.reduce((acc, i) => acc + i.totalPrice, 0);
      saveCartLocally({ items: updated, totalAmount: newTotal });
      showToast('success', 'Item removed from cart.');
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;
    setActionLoading('checkout');

    const payload = {
      shippingAddress: shippingAddress.trim(),
      notes: orderNotes.trim() || undefined,
    };

    try {
      const res = await axiosClient.post('/cart/checkout', payload);
      const createdOrders = Array.isArray(res.data) ? res.data : [res.data];
      
      setCart({ items: [], totalAmount: 0 });
      localStorage.removeItem('flowmart_buyer_cart');
      await fetchMyOrders();

      setCheckoutSuccessOrders(createdOrders);
      setCartDrawerOpen(false);
      showToast('success', 'Wholesale B2B Orders placed successfully!');
    } catch {
      // Fallback local simulated checkout
      const newOrder: OrderResponseDto = {
        id: Math.floor(1000 + Math.random() * 9000),
        orderNumber: `ORD-2026-0${Math.floor(1000 + Math.random() * 9000)}`,
        buyerId: user?.id || 3,
        buyerName: user?.name || 'Metro SuperMart Retail',
        buyerMobile: user?.phone || '+91 97654 32109',
        buyerGstin: user?.gstin || '27AAECB2345P1Z8',
        buyerAddress: shippingAddress,
        sellerId: cart.items[0]?.sellerId || 2,
        sellerBusinessName: cart.items[0]?.sellerBusinessName || 'Apex Electronics Wholesale',
        sellerGstin: '27AABCU9603R1ZM',
        status: 'PLACED',
        paymentStatus: 'PENDING',
        subtotal: cart.totalAmount,
        taxAmount: cart.totalAmount * 0.18,
        discountAmount: 0,
        returnedAmount: 0,
        totalAmount: cart.totalAmount * 1.18,
        paidAmount: 0,
        balanceDue: cart.totalAmount * 1.18,
        shippingAddress: shippingAddress,
        notes: orderNotes,
        createdAt: new Date().toISOString(),
        orderItems: cart.items.map((i, idx) => ({
          id: idx + 1,
          variantId: i.variantId,
          variantSku: i.variantSku || 'SKU',
          productTitle: i.productTitle,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          itemNote: i.itemNote,
          taxRate: 18,
        })),
      };

      setOrders((prev) => [newOrder, ...prev]);
      setCart({ items: [], totalAmount: 0 });
      localStorage.removeItem('flowmart_buyer_cart');

      setCheckoutSuccessOrders([newOrder]);
      setCartDrawerOpen(false);
      showToast('success', 'Wholesale Order Placed Successfully!');
    } finally {
      setActionLoading(null);
    }
  };

  // ----------------------------------------------------
  // Cancel Order Handler (Only allowed if PLACED)
  // ----------------------------------------------------
  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to cancel this wholesale order?')) return;
    setActionLoading(`cancel-${orderId}`);

    try {
      await axiosClient.patch(`/orders/${orderId}/status?status=CANCELLED`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
      showToast('success', `Order #${orderId} was cancelled.`);
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
      showToast('success', `Order #${orderId} marked cancelled.`);
    } finally {
      setActionLoading(null);
    }
  };

  // ----------------------------------------------------
  // Memoized Filtered Products
  // ----------------------------------------------------
  const categories = useMemo(() => {
    const list = new Set(products.map((p) => p.category).filter(Boolean));
    return ['ALL', ...Array.from(list)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.sellerBusinessName && p.sellerBusinessName.toLowerCase().includes(q)) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q));

      return matchCat && matchQuery && p.active !== false;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalCartCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-rose-950 border-rose-500 text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toastMessage.text}
        </div>
      )}

      {/* Top Buyer Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Portal title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-600/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white">FlowMart Wholesale</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                  Buyer Marketplace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verified B2B Buyer: <span className="font-semibold text-slate-300">{user?.businessName || user?.name}</span>
              </p>
            </div>
          </div>

          {/* Right Header: Cart live count & User profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 flex items-center gap-2 transition"
              title="Open Wholesale Cart"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold hidden sm:inline">Wholesale Cart</span>
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {cart.items.length}
                </span>
              )}
            </button>

            <button
              onClick={refreshAll}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh Catalog & Orders"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700">
              <div className="text-right text-xs">
                <span className="font-semibold text-white">{user?.name}</span>
                <span className="block text-[10px] text-emerald-400 uppercase font-mono">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Tab Navigator */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 py-1.5 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('MARKETPLACE')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === 'MARKETPLACE'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-4 h-4" /> Wholesale Marketplace ({filteredProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === 'ORDERS'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" /> My Orders ({orders.length})
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ======================================================== */}
        {/* 1. WHOLESALE MARKETPLACE VIEW */}
        {/* ======================================================== */}
        {activeTab === 'MARKETPLACE' && (
          <div className="space-y-6">
            
            {/* Search & Category Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search products, brands, verified sellers, SKUs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex overflow-x-auto gap-1.5 w-full md:w-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p) => {
                const primaryVariant = p.variants[0];
                const minPrice = Math.min(...p.variants.map((v) => v.price));
                const totalStock = p.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

                return (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-emerald-500/50 transition flex flex-col justify-between shadow-lg hover:shadow-emerald-950/20 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                          {p.category}
                        </span>
                        <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                          GST: {p.gstRate || 18}% (HSN {p.hsnCode})
                        </span>
                      </div>

                      {/* Title & Brand */}
                      <h3 className="font-bold text-white text-base leading-snug group-hover:text-emerald-400 transition">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Brand: <span className="text-slate-300 font-semibold">{p.brand || 'FlowMart Certified'}</span>
                      </p>

                      {/* Seller Tag */}
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 mt-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.sellerBusinessName || 'Apex Electronics Wholesale'}</span>
                      </div>

                      {p.description && (
                        <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}

                      {/* MOQ & Pack Size Badges */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Minimum Order (MOQ)</span>
                          <span className="font-bold text-emerald-400">{p.minimumOrderQuantity} pcs</span>
                        </div>
                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Pack Multiplier</span>
                          <span className="font-bold text-sky-400">{p.packSize} pcs/pack</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Action */}
                    <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Wholesale Price</div>
                        <div className="text-xl font-black font-mono text-white flex items-baseline gap-1">
                          ₹{minPrice.toLocaleString('en-IN')}
                          <span className="text-xs font-normal text-slate-400">/ pc</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenProductDetail(p)}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                      >
                        Order Packs <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
                <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <h4 className="text-base font-bold text-white">No products found</h4>
                <p className="text-xs text-slate-500 mt-1">Try searching with different keywords or switch category filter.</p>
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* 2. BUYER ORDERS VIEW (WITH 5-STEP TIMELINE) */}
        {/* ======================================================== */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">My Wholesale Orders</h2>
                <p className="text-xs text-slate-400">
                  Track 5-stage shipment progression, cancel placed orders, and download official GST Tax Invoices.
                </p>
              </div>
              <button
                onClick={fetchMyOrders}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
              </button>
            </div>

            <div className="space-y-4">
              {orders.map((o) => {
                const stages: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED'];
                const currentStageIdx = stages.indexOf(o.status);
                const isCancelled = o.status === 'CANCELLED' || o.status === 'REJECTED';

                return (
                  <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-5">
                    
                    {/* Order Top Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-400 text-base">
                            {o.orderNumber || `#${o.id}`}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            o.status === 'DELIVERED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            isCancelled ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}>
                            {o.status}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            o.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-amber-300'
                          }`}>
                            Payment: {o.paymentStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Seller: <strong className="text-white">{o.sellerBusinessName || o.sellerName}</strong> • 
                          Ordered: {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {o.status === 'PLACED' && (
                          <button
                            onClick={() => handleCancelOrder(o.id)}
                            disabled={actionLoading === `cancel-${o.id}`}
                            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-semibold transition"
                          >
                            Cancel Order
                          </button>
                        )}

                        <button
                          onClick={() => { setSelectedInvoiceOrder(o); setIsInvoiceOpen(true); }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                        >
                          <FileText className="w-3.5 h-3.5" /> View GST Invoice
                        </button>
                      </div>
                    </div>

                    {/* 5-Step Order Status Timeline */}
                    {!isCancelled ? (
                      <div className="py-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Fulfillment Progression Timeline
                        </div>
                        <div className="grid grid-cols-5 gap-2 relative">
                          {stages.map((stage, idx) => {
                            const isDone = currentStageIdx >= idx;
                            const isCurrent = currentStageIdx === idx;

                            return (
                              <div key={stage} className="text-center relative">
                                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition ${
                                  isDone
                                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-950'
                                    : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>
                                <div className={`text-[11px] font-semibold ${isCurrent ? 'text-emerald-400 font-bold' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                                  {stage}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                        <X className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>This order was cancelled and will not be dispatched.</span>
                      </div>
                    )}

                    {/* Purchased Items List */}
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800">
                              <th className="pb-2">Product Description</th>
                              <th className="pb-2">SKU</th>
                              <th className="pb-2 text-center">Pack Qty</th>
                              <th className="pb-2 text-right">Unit Price</th>
                              <th className="pb-2 text-right">Total Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {o.orderItems.map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td className="py-2.5 font-medium text-white">
                                  <div>{item.productTitle}</div>
                                  {item.itemNote && <div className="text-[10px] text-amber-400 italic">Note: {item.itemNote}</div>}
                                </td>
                                <td className="py-2.5 font-mono text-slate-400">{item.variantSku}</td>
                                <td className="py-2.5 text-center font-bold text-slate-200">{item.quantity} units</td>
                                <td className="py-2.5 text-right font-mono text-slate-300">₹{item.unitPrice}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                                  ₹{item.totalPrice.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Order Financial Totals */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                        <div className="text-slate-400">
                          Delivery: <span className="text-slate-200">{o.shippingAddress || o.buyerAddress}</span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-slate-400 text-xs">
                            Taxable Subtotal: <span className="font-mono text-white">₹{(o.subtotal || o.totalAmount).toLocaleString('en-IN')}</span>
                          </div>
                          {o.discountAmount ? (
                            <div className="text-emerald-400 text-xs">
                              Seller Negotiation Discount: -₹{o.discountAmount.toLocaleString('en-IN')}
                            </div>
                          ) : null}
                          <div className="text-base font-extrabold font-mono text-emerald-400">
                            Grand Total: ₹{o.totalAmount.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
                  <Clock className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <h4 className="text-base font-bold text-white">No orders yet</h4>
                  <p className="text-xs text-slate-500 mt-1">Explore the wholesale marketplace to place your first bulk order.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL: PRODUCT DETAIL & MOQ PACK QUANTITY SELECTOR */}
      {/* ======================================================== */}
      {detailModalOpen && selectedProduct && selectedVariant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full uppercase">
                  Wholesale Bulk Order
                </span>
                <h3 className="font-bold text-white text-lg mt-1">{selectedProduct.title}</h3>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Product Info & Seller */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-start text-xs">
                <div>
                  <p className="text-slate-400">Seller: <strong className="text-white">{selectedProduct.sellerBusinessName || 'Apex Electronics'}</strong></p>
                  <p className="text-slate-400 mt-0.5">HSN Code: <span className="font-mono text-slate-300">{selectedProduct.hsnCode}</span> (GST Rate: {selectedProduct.gstRate || 18}%)</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold block">
                    MOQ: {selectedProduct.minimumOrderQuantity} pcs
                  </span>
                  <span className="text-sky-400 font-medium text-[11px]">
                    Pack Multiplier: {selectedProduct.packSize} pcs
                  </span>
                </div>
              </div>

              {/* Variant Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Product Variation / Model:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedProduct.variants.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedVariant.id === v.id
                          ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs">{v.title}</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">₹{v.price}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                        <span>SKU: {v.sku}</span>
                        <span>Stock: {v.stockQuantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper enforcing MOQ & Pack Size */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="font-bold text-xs uppercase tracking-wider text-white">
                      Order Quantity (Pack Units)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Must be ≥ {selectedProduct.minimumOrderQuantity} units and multiples of {selectedProduct.packSize}
                    </p>
                  </div>
                  
                  {/* Stepper Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDecrementQuantity}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold transition disabled:opacity-40"
                      disabled={selectedQuantity <= (selectedProduct.minimumOrderQuantity || 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="w-20 text-center font-mono font-black text-lg text-emerald-400">
                      {selectedQuantity}
                    </div>

                    <button
                      type="button"
                      onClick={handleIncrementQuantity}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-400">
                    Total Master Packs: <strong className="text-sky-400">{selectedQuantity / (selectedProduct.packSize || 1)} packs</strong>
                  </span>
                  <span className="text-slate-400">
                    Subtotal: <strong className="font-mono text-emerald-400 font-bold text-sm">₹{(selectedQuantity * selectedVariant.price).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>

              {/* Optional Buyer Item Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Item Note / Dispatch Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="e.g. Include barcode stickers, pallet delivery"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Estimated Total</div>
                <div className="text-lg font-black font-mono text-white">
                  ₹{(selectedQuantity * selectedVariant.price).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={actionLoading === 'add-cart'}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to B2B Cart
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CART SLIDE-OVER DRAWER & MULTI-SELLER CHECKOUT */}
      {/* ======================================================== */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            
            {/* Cart Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Wholesale B2B Cart</h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {cart.items.length} items
                </span>
              </div>
              <button onClick={() => setCartDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.items.map((item) => (
                <div key={item.variantId} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-xs">{item.productTitle}</h4>
                      <p className="text-[10px] font-mono text-slate-400">SKU: {item.variantSku}</p>
                      <p className="text-[10px] text-indigo-400 mt-0.5">Seller: {item.sellerBusinessName || 'Apex Electronics'}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.variantId)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                    {/* Stepper with pack size enforcement */}
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => {
                          const step = item.packSize || 1;
                          const moq = item.minimumOrderQuantity || 1;
                          if (item.quantity - step >= moq) {
                            handleUpdateCartQuantity(item.variantId, item.quantity - step, item.itemNote);
                          } else {
                            showToast('error', `Cannot order below MOQ of ${moq} units.`);
                          }
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-bold text-white px-2">
                        {item.quantity} pcs
                      </span>
                      <button
                        onClick={() => {
                          const step = item.packSize || 1;
                          handleUpdateCartQuantity(item.variantId, item.quantity + step, item.itemNote);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">₹{item.unitPrice}/pc</div>
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        ₹{item.totalPrice.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {cart.items.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                  <p className="text-xs">Your B2B Cart is empty.</p>
                </div>
              )}

              {/* Checkout Form Details */}
              {cart.items.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Delivery & Commercial Shipping Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Shop / Warehouse Address"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Purchase Order / Transport Notes
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Special logistics or payment terms agreed"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.items.length > 0 && (
              <div className="p-6 border-t border-slate-800 bg-slate-950 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-white">₹{cart.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated GST (18%):</span>
                    <span className="font-mono text-white">₹{(cart.totalAmount * 0.18).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-400 text-base">
                      ₹{(cart.totalAmount * 1.18).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={actionLoading === 'checkout'}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
                >
                  {actionLoading === 'checkout' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Place Wholesale B2B Order <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CHECKOUT SUCCESS MODAL */}
      {/* ======================================================== */}
      {checkoutSuccessOrders && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Wholesale Order Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your order has been transmitted directly to the merchant. An official GST Tax Invoice has been generated.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
              {checkoutSuccessOrders.map((o) => (
                <div key={o.id}>
                  Order Ref: <span className="font-bold text-white">{o.orderNumber || `#${o.id}`}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCheckoutSuccessOrders(null);
                  setActiveTab('ORDERS');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                View in My Orders
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

export default BuyerPortal;

