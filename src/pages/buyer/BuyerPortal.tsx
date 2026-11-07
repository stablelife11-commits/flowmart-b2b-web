import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import {
  CartItemDto,
  CartResponseDto,
  OrderResponseDto,
  PagedResponseDto,
  ProductResponseDto,
  VariantResponseDto,
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import { getProductImageUrls, getPrimaryProductImage } from '../../utils/cloudinary';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  User,
  Search,
  LogOut,
  Plus,
  Minus,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Truck,
  XCircle,
  RefreshCw,
  Building2,
  MapPin,
  Edit3,
  Eye,
  X,
} from 'lucide-react';

export const BuyerPortal: React.FC = () => {
  const { user, logout, saveProfileToBackend } = useAuth();

  const [activeTab, setActiveTab] = useState<'CATALOG' | 'CART' | 'ORDERS' | 'PROFILE'>('CATALOG');

  // Catalog state
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<
    'RECOMMENDED' | 'PRICE_LOW_HIGH' | 'PRICE_HIGH_LOW' | 'NAME'
  >('RECOMMENDED');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Selected variant & quantity per product card
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, number>>(
    {}
  );
  const [quantityByVariant, setQuantityByVariant] = useState<Record<number, number>>({});
  const [noteByVariant, setNoteByVariant] = useState<Record<number, string>>({});

  // Product Detail & Multi-Size Pack Selector Modal (Matches ProductDetailActivity.java)
  const [detailProduct, setDetailProduct] = useState<ProductResponseDto | null>(null);
  const [detailImageIdx, setDetailImageIdx] = useState(0);
  const [detailMultiSelections, setDetailMultiSelections] = useState<Record<number, number>>({});
  const [detailBuyerNote, setDetailBuyerNote] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartResponseDto | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.businessAddress || '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderResponseDto | null>(null);

  // Profile form state
  const [profName, setProfName] = useState(user?.name || '');
  const [profBusinessName, setProfBusinessName] = useState(user?.businessName || '');
  const [profGst, setProfGst] = useState(user?.gstNumber || '');
  const [profPhone, setProfPhone] = useState(user?.businessPhone || '');
  const [profAddress, setProfAddress] = useState(user?.businessAddress || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    if (user?.businessAddress && !deliveryAddress) {
      setDeliveryAddress(user.businessAddress);
    }
    if (user) {
      setProfName(user.name || '');
      setProfBusinessName(user.businessName || '');
      setProfGst(user.gstNumber || '');
      setProfPhone(user.businessPhone || '');
      setProfAddress(user.businessAddress || '');
    }
  }, [user, deliveryAddress]);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await axiosClient.get<PagedResponseDto<ProductResponseDto>>('/products/paged', {
        params: {
          page,
          size: 20,
          keyword: keyword.trim() || undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        },
      });
      const list = res.data.content || [];
      setProducts(list);
      setTotalPages(Math.max(1, res.data.totalPages || 1));

      setSelectedVariantByProduct((prev) => {
        const next = { ...prev };
        for (const p of list) {
          if (p.variants && p.variants.length > 0 && !next[p.id]) {
            next[p.id] = p.variants[0].id;
          }
        }
        return next;
      });

      setQuantityByVariant((prev) => {
        const next = { ...prev };
        for (const p of list) {
          for (const v of p.variants || []) {
            if (!next[v.id]) {
              next[v.id] = Math.max(1, v.minimumOrderQuantity || 1);
            }
          }
        }
        return next;
      });
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    } finally {
      setIsLoadingProducts(false);
    }
  }, [page, keyword, categoryFilter]);

  const fetchCart = useCallback(async () => {
    setIsLoadingCart(true);
    try {
      const res = await axiosClient.get<CartResponseDto>('/cart');
      setCart(res.data);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    } finally {
      setIsLoadingCart(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const res = await axiosClient.get<OrderResponseDto[]>('/orders/my-orders', {
        params: { page: 0, size: 50 },
      });
      setOrders(res.data || []);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCart();
    fetchOrders();
  }, [fetchCart, fetchOrders]);

  // Extract unique categories & sort/filter products (Matches ProductViewModel.java)
  const categories = useMemo(() => {
    const set = new Set<string>(['ALL']);
    for (const p of products) {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    }
    return Array.from(set);
  }, [products]);

  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (inStockOnly) {
      list = list.filter((p) => {
        const totalStock = (p.variants || []).reduce((s, v) => s + Number(v.stock || 0), 0);
        const moq = p.variants?.[0]?.minimumOrderQuantity || 1;
        return p.active && totalStock >= moq;
      });
    }
    if (sortOrder === 'PRICE_LOW_HIGH') {
      list.sort(
        (a, b) =>
          Number(a.variants?.[0]?.sellingPrice || 0) - Number(b.variants?.[0]?.sellingPrice || 0)
      );
    } else if (sortOrder === 'PRICE_HIGH_LOW') {
      list.sort(
        (a, b) =>
          Number(b.variants?.[0]?.sellingPrice || 0) - Number(a.variants?.[0]?.sellingPrice || 0)
      );
    } else if (sortOrder === 'NAME') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [products, inStockOnly, sortOrder]);

  const adjustVariantQty = (variant: VariantResponseDto, deltaPacks: number) => {
    const moq = Math.max(1, variant.minimumOrderQuantity || 1);
    const pack = Math.max(1, variant.packSize || 1);
    const current = quantityByVariant[variant.id] || moq;
    const next = Math.max(moq, current + deltaPacks * pack);
    if (variant.stock > 0 && next > variant.stock) {
      showToast('error', `Maximum available stock for ${variant.sku} is ${variant.stock} units.`);
      return;
    }
    setQuantityByVariant((prev) => ({ ...prev, [variant.id]: next }));
  };

  const handleAddToCart = async (variant: VariantResponseDto, customQty?: number, customNote?: string) => {
    const moq = Math.max(1, variant.minimumOrderQuantity || 1);
    const qty = customQty ?? (quantityByVariant[variant.id] || moq);
    const itemNote = (customNote ?? noteByVariant[variant.id])?.trim() || undefined;

    try {
      const res = await axiosClient.post<CartResponseDto>('/cart/items', {
        variantId: variant.id,
        quantity: qty,
        itemNote,
      });
      setCart(res.data);
      showToast('success', `Added ${qty} units of ${variant.sku} to wholesale cart!`);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const openProductDetailModal = (product: ProductResponseDto) => {
    setDetailProduct(product);
    setDetailImageIdx(0);
    setDetailMultiSelections({});
    setDetailBuyerNote('');
  };

  const handleDetailMultiAddToCart = async (buyNow: boolean) => {
    if (!detailProduct) return;
    const entries = Object.entries(detailMultiSelections).filter(([, q]) => q > 0);
    if (entries.length === 0) {
      showToast('error', 'Please select a pack quantity for at least one size variant.');
      return;
    }

    try {
      for (const [varIdStr, qty] of entries) {
        await axiosClient.post<CartResponseDto>('/cart/items', {
          variantId: Number(varIdStr),
          quantity: qty,
          itemNote: detailBuyerNote.trim() || undefined,
        });
      }
      await fetchCart();
      setDetailProduct(null);
      showToast('success', 'Added selected wholesale size packs to cart!');
      if (buyNow) {
        setActiveTab('CART');
      }
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleUpdateCartQty = async (variantId: number, newQty: number, itemNote?: string) => {
    try {
      const res = await axiosClient.put<CartResponseDto>(`/cart/items/${variantId}`, null, {
        params: { quantity: newQty, itemNote },
      });
      setCart(res.data);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleEditCartItemNote = async (item: CartItemDto) => {
    const updatedNote = window.prompt(
      `Enter note for Seller (${item.productName} - ${item.sku}):`,
      item.itemNote || ''
    );
    if (updatedNote === null) return;
    await handleUpdateCartQty(item.variantId, item.quantity, updatedNote.trim());
    showToast('success', 'Seller note updated!');
  };

  const handleRemoveCartItem = async (variantId: number) => {
    try {
      const res = await axiosClient.delete<CartResponseDto>(`/cart/items/${variantId}`);
      setCart(res.data);
      showToast('success', 'Item removed from cart.');
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleClearCart = async () => {
    try {
      await axiosClient.delete('/cart');
      await fetchCart();
      showToast('success', 'Cart cleared.');
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      showToast('error', 'Please enter a delivery address for checkout.');
      return;
    }
    setIsCheckingOut(true);
    try {
      const res = await axiosClient.post<OrderResponseDto[]>('/cart/checkout', {
        deliveryAddress: deliveryAddress.trim(),
      });
      const created = res.data || [];
      showToast('success', `Successfully placed ${created.length} seller-split wholesale order(s)!`);
      await fetchCart();
      await fetchOrders();
      await fetchProducts();
      setActiveTab('ORDERS');
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm(`Cancel Order #${orderId}? Reserved stock will be restored immediately.`)) {
      return;
    }
    try {
      await axiosClient.patch(`/orders/${orderId}/status`, null, {
        params: { status: 'CANCELLED' },
      });
      showToast('success', `Order #${orderId} cancelled and reserved stock released.`);
      await fetchOrders();
      await fetchProducts();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const res = await saveProfileToBackend({
      name: profName,
      businessName: profBusinessName,
      gstNumber: profGst,
      businessPhone: profPhone,
      businessAddress: profAddress,
    });
    setIsSavingProfile(false);
    if (res.success) {
      setDeliveryAddress(profAddress);
      showToast('success', res.message || 'Profile updated!');
    } else {
      showToast('error', res.message || 'Failed to update profile.');
    }
  };

  const cartItemCount = cart?.totalDistinctItems || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950">
              F
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">FlowMart Wholesale</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                B2B Buyer Portal
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CATALOG')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition ${
                activeTab === 'CATALOG'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CART')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition relative ${
                activeTab === 'CART'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[11px] font-extrabold">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition ${
                activeTab === 'ORDERS'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Orders ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition ${
                activeTab === 'PROFILE'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="ml-2 p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ===================================================================
            TAB 1: WHOLESALE CATALOG
           =================================================================== */}
        {activeTab === 'CATALOG' && (
          <div className="space-y-6">
            {/* Search, Sort & Category Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search garments, innerwear, brands, SKUs..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full md:w-48 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl"
                >
                  <option value="RECOMMENDED">Sort: Recommended</option>
                  <option value="PRICE_LOW_HIGH">Price: Low to High</option>
                  <option value="PRICE_HIGH_LOW">Price: High to Low</option>
                  <option value="NAME">Name (A–Z)</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span>In Stock Only</span>
                </label>

                <button
                  type="button"
                  onClick={fetchProducts}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Category Chips */}
              <div className="flex gap-1.5 overflow-x-auto pt-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat);
                      setPage(0);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      categoryFilter === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="py-20 text-center text-slate-500">Loading wholesale catalog...</div>
            ) : displayedProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No Matching Wholesale Products</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try clearing your search filters or switching categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProducts.map((product) => {
                  const variants = product.variants || [];
                  const selectedVarId = selectedVariantByProduct[product.id] ?? variants[0]?.id;
                  const activeVariant =
                    variants.find((v) => v.id === selectedVarId) || variants[0];
                  const primaryImg = getPrimaryProductImage(product);

                  if (!activeVariant) return null;

                  const moq = Math.max(1, activeVariant.minimumOrderQuantity || 1);
                  const packSize = Math.max(1, activeVariant.packSize || 1);
                  const currentQty = quantityByVariant[activeVariant.id] || moq;
                  const sellPrice = Number(activeVariant.sellingPrice || 0);
                  const mrpPrice = Math.ceil(sellPrice * 1.25);

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        {/* Product Image with Overlays */}
                        <div
                          onClick={() => openProductDetailModal(product)}
                          className="h-52 bg-slate-100 relative flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer group"
                        >
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="text-slate-400 text-xs font-medium flex flex-col items-center">
                              <Package className="w-10 h-10 mb-1 stroke-1" />
                              <span>{product.productCode}</span>
                            </div>
                          )}

                          <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            20% MARGIN
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProductDetailModal(product);
                            }}
                            className="absolute bottom-2.5 right-2.5 bg-slate-900/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Multi-Size Picker
                          </button>
                        </div>

                        {/* Product Details */}
                        <div className="p-4">
                          <div className="flex justify-between items-center text-[11px] font-bold text-emerald-700 uppercase">
                            <span>{product.brand || product.category || 'FLOWMART B2B'}</span>
                            <span className="font-mono text-slate-400">
                              Code: {product.productCode}
                            </span>
                          </div>

                          <h3
                            onClick={() => openProductDetailModal(product)}
                            className="font-bold text-slate-900 text-base leading-snug mt-0.5 cursor-pointer hover:text-emerald-700"
                          >
                            {product.name}
                          </h3>

                          {/* Variant Selector Pills */}
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1.5">
                              {variants.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVariantByProduct((prev) => ({
                                      ...prev,
                                      [product.id]: v.id,
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                                    v.id === activeVariant.id
                                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {v.size || v.color
                                    ? `${v.size || ''} ${v.color || ''}`.trim()
                                    : v.sku}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Selected Variant Pricing & Wholesale Rules */}
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                            <div className="flex justify-between items-baseline">
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-extrabold text-slate-900 font-mono">
                                  ₹{sellPrice.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs text-slate-400 line-through font-mono">
                                  ₹{mrpPrice}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                SKU: {activeVariant.sku}
                              </span>
                            </div>

                            <div className="flex flex-wrap justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                              <span>
                                <strong>Min Order:</strong> {moq} pcs
                              </span>
                              <span>
                                <strong>Pack of:</strong> {packSize}
                              </span>
                              <span>
                                <strong>GST:</strong> {activeVariant.gstPercentage ?? 0}%
                              </span>
                              <span
                                className={
                                  activeVariant.stock >= moq
                                    ? 'text-emerald-700 font-semibold'
                                    : 'text-rose-600 font-semibold'
                                }
                              >
                                Stock: {activeVariant.stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper & Add to Cart Footer */}
                      <div className="p-4 pt-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => adjustVariantQty(activeVariant, -1)}
                              className="p-2 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-mono font-bold text-slate-900">
                              {currentQty} pcs
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustVariantQty(activeVariant, 1)}
                              className="p-2 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">Lot Total</div>
                            <div className="text-xs font-mono font-bold text-emerald-700">
                              ₹{(sellPrice * currentQty).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={noteByVariant[activeVariant.id] || ''}
                          onChange={(e) =>
                            setNoteByVariant((prev) => ({
                              ...prev,
                              [activeVariant.id]: e.target.value,
                            }))
                          }
                          placeholder="Note for Seller (e.g. color mix, packing request)"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                        />

                        <button
                          type="button"
                          disabled={activeVariant.stock < moq}
                          onClick={() => handleAddToCart(activeVariant)}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {activeVariant.stock < moq
                            ? 'Out of Stock'
                            : `+ Add ${currentQty} pcs to Cart`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-4">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-600 font-medium">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 2: MULTI-SELLER WHOLESALE CART
           =================================================================== */}
        {activeTab === 'CART' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Wholesale Cart</h2>
                  <p className="text-xs text-slate-500">
                    Multi-seller orders are split automatically at checkout.
                  </p>
                </div>
                {cart && cart.items && cart.items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                  </button>
                )}
              </div>

              {isLoadingCart ? (
                <div className="bg-white p-12 rounded-2xl text-center text-slate-500">
                  Loading cart...
                </div>
              ) : !cart || !cart.items || cart.items.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Your Wholesale Cart is Empty</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CATALOG')}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Explore Wholesale Catalog
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => {
                    const pack = Math.max(1, item.packSize || 1);
                    const moq = Math.max(1, item.minimumOrderQuantity || 1);

                    return (
                      <div
                        key={item.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {item.primaryImageUrl ? (
                              <img
                                src={item.primaryImageUrl}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                                Seller #{item.sellerId}
                              </span>
                              <span className="text-xs font-mono text-slate-500">
                                SKU: {item.sku}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">{item.productName}</h4>
                            <div className="text-xs text-slate-500">
                              {item.size && `Size: ${item.size} | `}
                              {item.color && `Color: ${item.color} | `}
                              Rate: ₹{Number(item.unitPrice).toLocaleString('en-IN')} • MOQ: {moq} •
                              Pack: {pack}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditCartItemNote(item)}
                              className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Edit3 className="w-3 h-3" />
                              {item.itemNote
                                ? `Note: "${item.itemNote}" (Edit)`
                                : '+ Add Note for Seller'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-center">
                          <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCartQty(
                                  item.variantId,
                                  Math.max(moq, item.quantity - pack),
                                  item.itemNote
                                )
                              }
                              className="p-2 hover:bg-slate-100 text-slate-600"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-mono font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCartQty(
                                  item.variantId,
                                  item.quantity + pack,
                                  item.itemNote
                                )
                              }
                              className="p-2 hover:bg-slate-100 text-slate-600"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[90px]">
                            <div className="text-sm font-mono font-bold text-slate-900">
                              ₹{Number(item.lineTotal).toLocaleString('en-IN')}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(item.variantId)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <form
                onSubmit={handleCheckout}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-24"
              >
                <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
                  Wholesale Lot Checkout
                </h3>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Distinct Variants:</span>
                    <span className="font-bold text-slate-900">{cart?.totalDistinctItems || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Units:</span>
                    <span className="font-bold text-slate-900">{cart?.totalQuantity || 0} pcs</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Payable (Incl. GST):</span>
                    <span className="font-mono text-emerald-700">
                      ₹{Number(cart?.estimatedTotalAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shop / Godown Delivery Address *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Shop Name, Market, Street, City & Pincode..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCheckingOut || !cart || !cart.items || cart.items.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs transition shadow-md"
                >
                  {isCheckingOut ? 'Placing Wholesale Orders...' : 'Place Order'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: MY ORDERS & 5-STEP TIMELINE (Matches OrderDetailActivity.java)
           =================================================================== */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Wholesale Orders</h2>
                <p className="text-xs text-slate-500">
                  Track fulfillment timeline, seller discounts, return credits, and print GST invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchOrders}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {isLoadingOrders ? (
              <div className="py-16 text-center text-slate-500">Loading your orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Orders Yet</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const st = (o.status || 'PLACED').toUpperCase();
                  const netPayable = Math.max(
                    0,
                    Number(o.totalAmount || 0) - Number(o.returnedAmount || 0)
                  );
                  const balanceDue = Math.max(0, netPayable - Number(o.paidAmount || 0));
                  const refundCredit = Math.max(0, Number(o.paidAmount || 0) - netPayable);

                  const isConfirmed = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(st);
                  const isProcessing = ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(st);
                  const isShipped = ['SHIPPED', 'DELIVERED'].includes(st);
                  const isDelivered = st === 'DELIVERED';

                  return (
                    <div
                      key={o.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {o.orderNumber || `Order #${o.id}`}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(o.orderDate || o.createdAt || Date.now()).toLocaleDateString(
                              'en-IN',
                              { day: '2-digit', month: 'short', year: 'numeric' }
                            )}
                          </span>
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                            Seller: {o.sellerBusinessName || `#${o.sellerId}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                            {st === 'CONFIRMED' ? 'SELLER CONFIRMED' : st}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              o.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInvoiceOrder(o)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> GST Invoice
                          </button>
                          {st === 'PLACED' && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(o.id)}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel Order
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 5-Stage Fulfillment Timeline */}
                      <div className="px-5 py-2.5 bg-emerald-50/40 border-b border-slate-100 flex flex-wrap gap-4 text-[11px] font-semibold">
                        <span className="text-emerald-700">✓ 1. Order Placed</span>
                        <span className={isConfirmed ? 'text-emerald-700' : 'text-slate-400'}>
                          {isConfirmed ? '✓' : '○'} 2. Seller Confirmed Lot
                        </span>
                        <span className={isProcessing ? 'text-emerald-700' : 'text-slate-400'}>
                          {isProcessing ? '✓' : '○'} 3. Godown Packing
                        </span>
                        <span className={isShipped ? 'text-emerald-700' : 'text-slate-400'}>
                          {isShipped ? '✓' : '○'} 4. Dispatched
                        </span>
                        <span className={isDelivered ? 'text-emerald-700' : 'text-slate-400'}>
                          {isDelivered ? '✓' : '○'} 5. Delivered
                        </span>
                      </div>

                      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-8 space-y-2">
                          {(o.items || []).map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-xs border-b border-slate-100 pb-2"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {item.productName}
                                </span>{' '}
                                <span className="font-mono text-slate-500">({item.sku})</span>
                                {(item.size || item.color) && (
                                  <span className="text-slate-500 ml-1">
                                    [{item.size} {item.color}]
                                  </span>
                                )}
                                {item.itemNote && (
                                  <div className="text-[11px] text-amber-700 italic">
                                    📝 Note: "{item.itemNote}"
                                  </div>
                                )}
                              </div>
                              <div className="font-mono text-slate-800">
                                {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN')} ={' '}
                                <strong>
                                  ₹{(item.quantity * Number(item.price)).toLocaleString('en-IN')}
                                </strong>
                              </div>
                            </div>
                          ))}
                          <div className="text-xs text-slate-500 pt-1 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Delivery Address: {o.deliveryAddress}</span>
                          </div>
                          {o.sellerRemarks && (
                            <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg">
                              💬 <strong>Seller Note:</strong> "{o.sellerRemarks}"
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Subtotal:</span>
                            <span className="font-mono">
                              ₹{Number(o.subtotalAmount || o.totalAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {Number(o.discountAmount) > 0 && (
                            <div className="flex justify-between text-emerald-700 font-medium">
                              <span>Seller Discount:</span>
                              <span className="font-mono">
                                - ₹{Number(o.discountAmount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Included GST:</span>
                            <span className="font-mono">
                              ₹{Number(o.taxAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                            <span>Order Total:</span>
                            <span className="font-mono">
                              ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {Number(o.returnedAmount) > 0 && (
                            <div className="flex justify-between text-amber-700">
                              <span>Returned Items Credit:</span>
                              <span className="font-mono">
                                - ₹{Number(o.returnedAmount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-emerald-700">
                            <span>Paid Amount:</span>
                            <span className="font-mono">
                              ₹{Number(o.paidAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {refundCredit > 0.009 ? (
                            <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-200">
                              <span>Refund / Credit Due:</span>
                              <span className="font-mono">
                                ₹{refundCredit.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-slate-200">
                              <span>Balance Due:</span>
                              <span className="font-mono">
                                ₹{balanceDue.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BUYER BUSINESS PROFILE */}
        {activeTab === 'PROFILE' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Buyer Business & GST Profile</h2>
                <p className="text-xs text-slate-500">
                  Saved details appear on your B2B GST tax invoices and default delivery address.
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-100 text-slate-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retail / Wholesale Shop Name
                  </label>
                  <input
                    type="text"
                    value={profBusinessName}
                    onChange={(e) => setProfBusinessName(e.target.value)}
                    placeholder="Kumar Garments & Hosiery"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buyer GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={profGst}
                    onChange={(e) => setProfGst(e.target.value.toUpperCase())}
                    placeholder="09AAACH7409R1ZP"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Phone
                </label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Default Billing & Delivery Address
                </label>
                <textarea
                  rows={3}
                  value={profAddress}
                  onChange={(e) => setProfAddress(e.target.value)}
                  placeholder="Shop No, Market Name, City, State, Pincode"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition shadow"
              >
                {isSavingProfile ? 'Saving...' : 'Save Business Profile'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* =====================================================================
          PRODUCT DETAIL & MULTI-SIZE PACK PICKER MODAL (ProductDetailActivity)
         ===================================================================== */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700">
                  {detailProduct.brand || detailProduct.category || 'FLOWMART WHOLESALE'}
                </span>
                <h3 className="text-xl font-bold text-slate-900">{detailProduct.name}</h3>
                <p className="text-xs font-mono text-slate-400">
                  Style Code: {detailProduct.productCode} • Seller #{detailProduct.sellerId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Image Carousel */}
              <div className="md:col-span-5 space-y-2">
                {(() => {
                  const imgs = getProductImageUrls(detailProduct);
                  const currentImg = imgs[detailImageIdx] || null;
                  return (
                    <>
                      <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {currentImg ? (
                          <img
                            src={currentImg}
                            alt={detailProduct.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-slate-300" />
                        )}
                      </div>
                      {imgs.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {imgs.map((u, i) => (
                            <button
                              key={u + i}
                              type="button"
                              onClick={() => setDetailImageIdx(i)}
                              className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                                i === detailImageIdx ? 'border-emerald-600' : 'border-slate-200'
                              }`}
                            >
                              <img src={u} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Multi-Size Pack Selector */}
              <div className="md:col-span-7 space-y-4">
                <p className="text-xs text-slate-600">
                  {detailProduct.description ||
                    'Select wholesale pack quantities across multiple sizes below:'}
                </p>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {(detailProduct.variants || []).map((v) => {
                    const moq = Math.max(1, v.minimumOrderQuantity || 1);
                    const pack = Math.max(1, v.packSize || 1);
                    const stock = Number(v.stock || 0);
                    const selectedQty = detailMultiSelections[v.id] || 0;

                    // Generate pack multiples (matching ProductDetailActivity.onVariantClick)
                    const packOptions: number[] = [0];
                    for (let q = moq; q <= stock && packOptions.length <= 15; q += pack) {
                      packOptions.push(q);
                    }

                    return (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                          selectedQty > 0
                            ? 'bg-emerald-50/70 border-emerald-600'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {v.size || 'Std'} {v.color ? `• ${v.color}` : ''}{' '}
                            <span className="font-mono text-slate-400">({v.sku})</span>
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            Rate: <strong>₹{v.sellingPrice}</strong>/pc • MOQ: {moq} • Pack: {pack}{' '}
                            • GST: {v.gstPercentage ?? 0}% • Stock: {stock}
                          </div>
                        </div>

                        {stock < moq ? (
                          <span className="text-rose-600 font-bold">Out of Stock</span>
                        ) : (
                          <select
                            value={selectedQty}
                            onChange={(e) =>
                              setDetailMultiSelections((prev) => ({
                                ...prev,
                                [v.id]: Number(e.target.value),
                              }))
                            }
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                          >
                            {packOptions.map((q) => (
                              <option key={q} value={q}>
                                {q === 0
                                  ? '0 pcs (Skip)'
                                  : `${q} pcs (₹${(q * Number(v.sellingPrice)).toLocaleString(
                                      'en-IN'
                                    )})`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={detailBuyerNote}
                  onChange={(e) => setDetailBuyerNote(e.target.value)}
                  placeholder="Note for Seller (e.g., color mix, packing instruction)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDetailMultiAddToCart(false)}
                    className="flex-1 py-2.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-xl text-xs"
                  >
                    Add Selected Packs to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDetailMultiAddToCart(true)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow"
                  >
                    Buy Now / Go to Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <GstInvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        buyerGstin={user?.gstNumber}
      />
    </div>
  );
};

export default BuyerPortal;