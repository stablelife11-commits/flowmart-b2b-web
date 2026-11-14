import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import {
  DashboardSummaryDto,
  OrderResponseDto,
  OrderStatus,
  ProductResponseDto,
  Role,
  UserResponseDto,
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import AdminNotificationSender from '../../components/admin/AdminNotificationSender';
import {
  ShieldCheck,
  Users,
  ClipboardList,
  Package,
  LogOut,
  RefreshCw,
  FileText,
  Store,
  CheckCircle2,
  AlertCircle,
  Bell,
  X,
  Edit3,
  Search,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'PRODUCTS' | 'USERS' | 'ORDERS' | 'NOTIFICATIONS'
  >('OVERVIEW');

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderResponseDto | null>(null);

  // Search & Filter states for Admin Products & Orders
  const [prodSearch, setProdSearch] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');

  // Admin Order Approval & Multi-Seller Routing Modal State
  const [routingOrder, setRoutingOrder] = useState<OrderResponseDto | null>(null);
  const [modAddress, setModAddress] = useState<string>('');
  const [modDiscount, setModDiscount] = useState<number>(0);
  const [modRemarks, setModRemarks] = useState<string>('');
  const [modItems, setModItems] = useState<
    {
      variantId: number;
      sku: string;
      productName: string;
      sellerId: number;
      quantity: number;
      unitPrice: number;
      itemNote?: string;
    }[]
  >([]);

  // Order या Customer पर सीधे Notify पॉपअप खोलने के लिए
  const [notifModalTarget, setNotifModalTarget] = useState<{
    orderId?: number;
    customerId?: number;
    buyerName?: string;
  } | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAdminData = useCallback(async () => {
    try {
      const [sumRes, prodRes, usrRes, ordRes] = await Promise.all([
        axiosClient.get<DashboardSummaryDto>('/reports/dashboard-summary'),
        axiosClient.get<ProductResponseDto[]>('/products', { params: { page: 0, size: 100 } }),
        axiosClient.get<UserResponseDto[]>('/admin/users'),
        axiosClient.get<OrderResponseDto[]>('/orders', { params: { page: 0, size: 100 } }),
      ]);
      setSummary(sumRes.data);
      setProducts(prodRes.data || []);
      setUsers(usrRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Map Seller ID -> Seller Business Name / Name
  const sellerNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const u of users) {
      map[u.id] = u.businessName ? `${u.businessName} (#${u.id})` : `${u.name} (#${u.id})`;
    }
    return map;
  }, [users]);

  // All Variants across all Sellers for Admin Order Routing
  const allPlatformVariants = useMemo(
    () =>
      products.flatMap((p) =>
        (p.variants || []).map((v) => ({
          ...v,
          productId: p.id,
          productName: p.name,
          productCode: p.productCode,
          sellerId: p.sellerId,
          sellerLabel: sellerNameMap[p.sellerId] || `Seller #${p.sellerId}`,
        }))
      ),
    [products, sellerNameMap]
  );

  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedSellerFilter !== 'ALL' && String(p.sellerId) !== selectedSellerFilter) {
        return false;
      }
      if (!q) return true;
      const matchHeader =
        p.name?.toLowerCase().includes(q) ||
        p.productCode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        String(p.sellerId).includes(q);
      const matchVariant = (p.variants || []).some((v) => v.sku?.toLowerCase().includes(q));
      return matchHeader || matchVariant;
    });
  }, [products, prodSearch, selectedSellerFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
      return true;
    });
  }, [orders, orderStatusFilter]);

  const pendingAdminApprovalCount = useMemo(
    () => orders.filter((o) => o.status === 'PLACED').length,
    [orders]
  );

  const handleRoleUpdate = async (targetUserId: number, newRole: Role) => {
    try {
      await axiosClient.patch(`/admin/users/${targetUserId}/role`, null, {
        params: { role: newRole },
      });
      showToast('success', `Updated User #${targetUserId} role to ${newRole}.`);
      await fetchAdminData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleStatusToggle = async (targetUser: UserResponseDto) => {
    try {
      await axiosClient.patch(`/admin/users/${targetUser.id}/status`, null, {
        params: { active: !targetUser.active },
      });
      showToast(
        'success',
        `User ${targetUser.email} is now ${!targetUser.active ? 'Active' : 'Suspended'}.`
      );
      await fetchAdminData();
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
      await fetchAdminData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleOrderStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      await axiosClient.patch(`/orders/${orderId}/status`, null, {
        params: { status: nextStatus },
      });
      showToast('success', `Order #${orderId} updated to ${nextStatus}.`);
      await fetchAdminData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const openOrderRoutingModal = (order: OrderResponseDto) => {
    setRoutingOrder(order);
    setModAddress(order.deliveryAddress || '');
    setModDiscount(Number(order.discountAmount || 0));
    setModRemarks(order.sellerRemarks || '');
    setModItems(
      (order.items || []).map((i) => {
        const matchedVar = allPlatformVariants.find((v) => v.id === i.variantId);
        return {
          variantId: i.variantId,
          sku: i.sku,
          productName: i.productName,
          sellerId: matchedVar?.sellerId || order.sellerId,
          quantity: i.quantity,
          unitPrice: Number(i.price),
          itemNote: i.itemNote || '',
        };
      })
    );
  };

  const submitAdminRoutedOrder = async (confirmImmediately: boolean) => {
    if (!routingOrder) return;
    const validItems = modItems.filter((i) => i.variantId > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      showToast('error', 'Order must contain at least 1 item with Quantity > 0.');
      return;
    }

    try {
      await axiosClient.put(`/orders/${routingOrder.id}`, {
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
        confirmImmediately
          ? `Order #${routingOrder.id} approved & routed to Seller(s)!`
          : `Order #${routingOrder.id} changes saved!`
      );
      setRoutingOrder(null);
      await fetchAdminData();
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  };

  const uniqueSellerIds = useMemo(
    () => Array.from(new Set(products.map((p) => p.sellerId))).sort((a, b) => a - b),
    [products]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black">
              A
            </div>
            <div>
              <span className="font-bold text-lg">FlowMart Admin Control</span>
              <span className="ml-2 text-xs text-indigo-300 font-mono hidden sm:inline">
                {user?.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PRODUCTS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'PRODUCTS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> All Products ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'ORDERS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Orders ({orders.length})
              {pendingAdminApprovalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-extrabold">
                  {pendingAdminApprovalCount} New
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('USERS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'USERS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Users ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" /> Notify Buyers
            </button>
            <Link
              to="/seller"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white flex items-center gap-1 transition whitespace-nowrap"
            >
              <Store className="w-3.5 h-3.5" /> Full ERP View
            </Link>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" /> Platform-Wide Executive Audit
              </h1>
              <button
                type="button"
                onClick={fetchAdminData}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">Global Net GMV / Sales</div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                  ₹{Number(summary?.totalSalesAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div
                onClick={() => {
                  setOrderStatusFilter('PLACED');
                  setActiveTab('ORDERS');
                }}
                className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm cursor-pointer hover:bg-amber-50/40 transition"
              >
                <div className="text-xs text-amber-800 font-bold">
                  Orders Awaiting Admin Permission
                </div>
                <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
                  {pendingAdminApprovalCount} Pending
                </div>
                <div className="text-[11px] text-amber-700 mt-1">
                  Click to review, assign sellers & approve →
                </div>
              </div>
              <div
                onClick={() => setActiveTab('PRODUCTS')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 transition"
              >
                <div className="text-xs text-slate-500">All Sellers Catalog Products</div>
                <div className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">
                  {products.length} Products
                </div>
                <div className="text-[11px] text-indigo-600 mt-1">View all sellers' products →</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">Registered Accounts</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {users.length} Users
                </div>
              </div>
            </div>

            <div className="max-w-2xl">
              <AdminNotificationSender />
            </div>
          </div>
        )}

        {/* ALL SELLERS PRODUCTS TAB */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    All Sellers Product Catalog ({filteredProducts.length} of {products.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Admin view of every seller's active and inactive products across the platform
                  </p>
                </div>
                <Link
                  to="/seller"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Add / Edit Products in Full ERP
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Search by product name, SKU, style code, brand, or Seller ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <select
                  value={selectedSellerFilter}
                  onChange={(e) => setSelectedSellerFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl font-semibold bg-white"
                >
                  <option value="ALL">All Sellers ({uniqueSellerIds.length})</option>
                  {uniqueSellerIds.map((sId) => (
                    <option key={sId} value={String(sId)}>
                      {sellerNameMap[sId] || `Seller #${sId}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">
                          🏪 {sellerNameMap[p.sellerId] || `Seller #${p.sellerId}`}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          Style Code: {p.productCode}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{p.name}</h3>
                      <div className="text-xs text-slate-500">
                        Category: {p.category || 'General'} • Brand: {p.brand || 'Generic'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
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
                          <th className="py-2">Variant ID & SKU</th>
                          <th className="py-2">Size / Color</th>
                          <th className="py-2">Wholesale Price</th>
                          <th className="py-2">Purchase Cost</th>
                          <th className="py-2">MOQ / Pack</th>
                          <th className="py-2 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(p.variants || []).map((v) => (
                          <tr key={v.id}>
                            <td className="py-2 font-mono font-semibold">
                              #{v.id} • {v.sku}
                            </td>
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
                            <td className="py-2 text-right font-mono font-bold">
                              {v.stock}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">User & Merchant Governance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                    <th className="py-2">User ID</th>
                    <th className="py-2">Name & Email</th>
                    <th className="py-2">Business & Phone</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 font-mono font-bold text-indigo-600">#{u.id}</td>
                      <td className="py-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <div>{u.businessName || '-'}</div>
                        <div className="font-mono text-slate-500">
                          {u.businessPhone || u.gstNumber || ''}
                        </div>
                      </td>
                      <td className="py-3">
                        <select
                          disabled={u.email === user?.email}
                          value={u.role}
                          onChange={(e) => handleRoleUpdate(u.id, e.target.value as Role)}
                          className="px-2 py-1 border rounded-lg font-semibold"
                        >
                          <option value="BUYER">BUYER</option>
                          <option value="SELLER">SELLER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role === 'BUYER' && (
                            <button
                              type="button"
                              onClick={() =>
                                setNotifModalTarget({
                                  customerId: u.id,
                                  buyerName: u.name,
                                })
                              }
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold flex items-center gap-1"
                            >
                              <Bell className="w-3 h-3 text-amber-600" /> Notify
                            </button>
                          )}
                          {u.email !== user?.email && (
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(u)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                            >
                              {u.active ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Global Marketplace Orders (Admin Permission & Seller Routing)
                </h2>
                <p className="text-xs text-slate-500">
                  Orders in PLACED status are hidden from Sellers until Admin approves or routes them
                </p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
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
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'PLACED' ? `AWAITING ADMIN (${pendingAdminApprovalCount})` : st}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 border border-slate-200 rounded-xl space-y-3 text-xs bg-slate-50/40"
              >
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      Order #{o.id}
                    </span>
                    <span className="ml-2 text-slate-700">
                      Assigned Seller: <strong>{o.sellerBusinessName}</strong> (#{o.sellerId}) →
                      Buyer: <strong>{o.customerName}</strong> ({o.customerMobile}){' '}
                      <span className="font-mono text-indigo-600 font-semibold">
                        (Customer ID: #{o.customerId})
                      </span>
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Delivery Address: {o.deliveryAddress}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm">
                      ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold ${
                        o.status === 'PLACED'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {o.status === 'PLACED' ? 'AWAITING ADMIN APPROVAL' : o.status}
                    </span>

                    {(o.status === 'PLACED' || o.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        onClick={() => openOrderRoutingModal(o)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Review, Route Sellers & Approve
                      </button>
                    )}

                    {o.status === 'PLACED' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatusChange(o.id, 'REJECTED')}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                      >
                        Reject
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setNotifModalTarget({
                          orderId: o.id,
                          buyerName: `${o.customerName} (Customer #${o.customerId})`,
                        })
                      }
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold flex items-center gap-1 transition"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-600" /> Notify Buyer
                    </button>

                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(o)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1 transition"
                    >
                      <FileText className="w-3.5 h-3.5" /> GST Invoice
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200/70 pt-2 space-y-1">
                  {(o.items || []).map((item) => (
                    <div key={item.id} className="flex justify-between text-slate-600">
                      <span>
                        • <strong>{item.productName}</strong> (Variant #{item.variantId} • SKU:{' '}
                        {item.sku} • {item.size || 'Std'} {item.color || ''}) × {item.quantity}
                      </span>
                      <span className="font-mono font-semibold">
                        ₹{Number(item.price).toLocaleString('en-IN')} × {item.quantity} = ₹
                        {(item.quantity * Number(item.price)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'NOTIFICATIONS' && (
          <div className="max-w-2xl mx-auto">
            <AdminNotificationSender />
          </div>
        )}
      </main>

      {/* ADMIN ORDER APPROVAL & MULTI-SELLER ROUTING MODAL */}
      {routingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Admin Order Review & Multi-Seller Routing — Order #{routingOrder.id}
                </h3>
                <p className="text-xs text-slate-500">
                  You can assign items to different Sellers below; items assigned to other Sellers
                  will automatically split into separate confirmed Seller orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoutingOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Discount (₹)
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
              <div className="sm:col-span-2">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin / Dispatch Remarks
              </label>
              <input
                type="text"
                value={modRemarks}
                onChange={(e) => setModRemarks(e.target.value)}
                placeholder="e.g., Approved by Admin & routed to seller"
                className="w-full px-3 py-2 text-xs border rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Order Items & Seller Variant Assignment (Set Qty = 0 to remove)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const firstVar = allPlatformVariants[0];
                    if (!firstVar) return;
                    setModItems((prev) => [
                      ...prev,
                      {
                        variantId: firstVar.id,
                        sku: firstVar.sku,
                        productName: firstVar.productName,
                        sellerId: firstVar.sellerId,
                        quantity: 1,
                        unitPrice: Number(firstVar.sellingPrice),
                        itemNote: '',
                      },
                    ]);
                  }}
                  className="text-xs text-indigo-600 font-semibold"
                >
                  + Add Product Variant from Any Seller
                </button>
              </div>

              {modItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <label className="text-[10px] text-slate-500 font-semibold block">
                        Assign Seller & Product Variant
                      </label>
                      <select
                        value={item.variantId}
                        onChange={(e) => {
                          const vId = Number(e.target.value);
                          const found = allPlatformVariants.find((v) => v.id === vId);
                          const next = [...modItems];
                          next[idx].variantId = vId;
                          if (found) {
                            next[idx].sku = found.sku;
                            next[idx].productName = found.productName;
                            next[idx].sellerId = found.sellerId;
                            next[idx].unitPrice = Number(found.sellingPrice);
                          }
                          setModItems(next);
                        }}
                        className="w-full px-2 py-1.5 border rounded-lg bg-white font-medium"
                      >
                        {allPlatformVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            [{v.sellerLabel}] {v.productName} ({v.size || 'Std'}/{v.color || 'Std'})
                            — SKU: {v.sku} | ₹{v.sellingPrice} | Stock: {v.stock}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 font-semibold block">
                        Qty (0=Remove)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...modItems];
                          next[idx].quantity = Number(e.target.value);
                          setModItems(next);
                        }}
                        className="w-full px-2 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 font-semibold block">
                        Unit Price (₹)
                      </label>
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
                        className="w-full px-2 py-1.5 border rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setRoutingOrder(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitAdminRoutedOrder(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Save Changes Only
              </button>
              <button
                type="button"
                onClick={() => submitAdminRoutedOrder(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Approve & Send to Seller(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: जब किसी Order या User के "Notify" बटन पर क्लिक हो */}
      {notifModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-xl">
            <button
              type="button"
              onClick={() => setNotifModalTarget(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminNotificationSender
              defaultOrderId={notifModalTarget.orderId}
              defaultCustomerId={notifModalTarget.customerId}
              defaultBuyerName={notifModalTarget.buyerName}
              onSuccess={() => {
                showToast(
                  'success',
                  `ग्राहक (${notifModalTarget.buyerName || ''}) को नोटिफिकेशन भेज दिया गया!`
                );
                setTimeout(() => setNotifModalTarget(null), 1200);
              }}
            />
          </div>
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

export default AdminPortal;