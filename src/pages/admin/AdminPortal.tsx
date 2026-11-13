import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import {
  DashboardSummaryDto,
  OrderResponseDto,
  Role,
  UserResponseDto,
} from '../../types/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import AdminNotificationSender from '../../components/admin/AdminNotificationSender';
import {
  ShieldCheck,
  Users,
  ClipboardList,
  LogOut,
  RefreshCw,
  FileText,
  Store,
  CheckCircle2,
  AlertCircle,
  Bell,
  X,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'ORDERS' | 'NOTIFICATIONS'>('OVERVIEW');

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderResponseDto | null>(null);

  // Step 3 State: किसी खास Order के लिए Notify Modal खोलने का स्टेट
  const [selectedOrderForNotif, setSelectedOrderForNotif] = useState<OrderResponseDto | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAdminData = useCallback(async () => {
    try {
      const [sumRes, usrRes, ordRes] = await Promise.all([
        axiosClient.get<DashboardSummaryDto>('/reports/dashboard-summary'),
        axiosClient.get<UserResponseDto[]>('/admin/users'),
        axiosClient.get<OrderResponseDto[]>('/orders', { params: { page: 0, size: 50 } }),
      ]);
      setSummary(sumRes.data);
      setUsers(usrRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      showToast('error', extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black">
              A
            </div>
            <div>
              <span className="font-bold text-lg">FlowMart Admin Control</span>
              <span className="ml-2 text-xs text-indigo-300 font-mono">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('USERS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                activeTab === 'USERS' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Users ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                activeTab === 'ORDERS' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> All Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                activeTab === 'NOTIFICATIONS' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" /> Notify Buyers
            </button>
            <Link
              to="/seller"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white flex items-center gap-1 transition"
            >
              <Store className="w-3.5 h-3.5" /> Seller ERP View
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
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">Delivered Online B2B Orders</div>
                <div className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">
                  ₹{Number(summary?.onlineOrderSalesAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">Global Returns Credit</div>
                <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
                  ₹{Number(summary?.totalReturnsAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">Registered Accounts & Products</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {users.length} Users / {summary?.totalProducts || 0} SKUs
                </div>
              </div>
            </div>

            {/* Overview पेज पर भी सीधा Notification बॉक्स */}
            <div className="max-w-2xl">
              <AdminNotificationSender />
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
                    <th className="py-2">ID</th>
                    <th className="py-2">Name & Email</th>
                    <th className="py-2">Business & GSTIN</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 font-mono">#{u.id}</td>
                      <td className="py-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <div>{u.businessName || '-'}</div>
                        <div className="font-mono text-slate-500">{u.gstNumber || ''}</div>
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
                        {u.email !== user?.email && (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(u)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                          >
                            {u.active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Global Marketplace Orders</h2>
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 border border-slate-100 rounded-xl flex flex-wrap justify-between items-center gap-3 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">Order #{o.id}</span>
                  <span className="ml-2 text-slate-600">
                    Seller: <strong>{o.sellerBusinessName}</strong> (#{o.sellerId}) → Buyer:{' '}
                    <strong>{o.customerName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="font-mono font-bold">
                    ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded-full font-bold">
                    {o.status}
                  </span>

                  {/* Step 3: हर Order के आगे Notify Buyer बटन */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForNotif(o)}
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
            ))}
          </div>
        )}

        {activeTab === 'NOTIFICATIONS' && (
          <div className="max-w-2xl mx-auto">
            <AdminNotificationSender />
          </div>
        )}
      </main>

      {/* Step 3 Modal: जब किसी Order के "Notify Buyer" बटन पर क्लिक हो */}
      {selectedOrderForNotif && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-xl">
            <button
              type="button"
              onClick={() => setSelectedOrderForNotif(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminNotificationSender
              defaultOrderId={selectedOrderForNotif.id}
              defaultBuyerName={selectedOrderForNotif.customerName}
              onSuccess={() => {
                showToast(
                  'success',
                  `Order #${selectedOrderForNotif.id} (${selectedOrderForNotif.customerName}) को नोटिफिकेशन भेज दिया गया!`
                );
                setTimeout(() => setSelectedOrderForNotif(null), 1200);
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