import React, { useState, useEffect } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import { Bell, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminNotificationSenderProps {
  defaultOrderId?: number;
  defaultBuyerName?: string;
  onSuccess?: () => void;
}

type TargetMode = 'ALL' | 'ORDER' | 'CUSTOMER';

export const AdminNotificationSender: React.FC<AdminNotificationSenderProps> = ({
  defaultOrderId,
  defaultBuyerName,
  onSuccess,
}) => {
  const [targetMode, setTargetMode] = useState<TargetMode>(defaultOrderId ? 'ORDER' : 'ALL');
  const [orderId, setOrderId] = useState<string>(defaultOrderId ? String(defaultOrderId) : '');
  const [customerId, setCustomerId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (defaultOrderId) {
      setTargetMode('ORDER');
      setOrderId(String(defaultOrderId));
      setTitle(`Order #${defaultOrderId} अपडेट 🔔`);
    }
  }, [defaultOrderId]);

  // 1-Click रेडीमेड टेम्पलेट्स
  const applyTemplate = (tplType: 'DISPATCH' | 'PACKING' | 'OFFER') => {
    const ordText = orderId ? `#${orderId}` : '';
    if (tplType === 'PACKING') {
      setTitle(`Order ${ordText} पैकिंग शुरू 📦`);
      setMessage(
        `आपका होलसेल ऑर्डर ${ordText} गोदाम में पैक किया जा रहा है। बिल और माल की जांच पूरी हो चुकी है।`
      );
    } else if (tplType === 'DISPATCH') {
      setTitle(`Order ${ordText} ट्रांसपोर्ट अपडेट 🚚`);
      setMessage(
        `आपका होलसेल ऑर्डर ${ordText} गोदाम से डिस्पैच हो चुका है। जल्द ही आपकी दुकान पर डिलीवर हो जाएगा।`
      );
    } else if (tplType === 'OFFER') {
      setTitle('विशेष होलसेल स्कीम और नया स्टॉक! 🎉');
      setMessage(
        'FlowMart पर नया इनरवियर और गारमेंट स्टॉक आ चुका है। आज बल्क ऑर्डर करने पर विशेष छूट का लाभ उठाएं!'
      );
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!title.trim() || !message.trim()) {
      setStatusMsg({ type: 'error', text: 'कृपया नोटिफिकेशन का Title और Message दोनों भरें।' });
      return;
    }

    if (targetMode === 'ORDER' && !orderId.trim()) {
      setStatusMsg({ type: 'error', text: 'कृपया Order ID दर्ज करें।' });
      return;
    }

    if (targetMode === 'CUSTOMER' && !customerId.trim()) {
      setStatusMsg({ type: 'error', text: 'कृपया Customer ID दर्ज करें।' });
      return;
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      sendToAllBuyers: targetMode === 'ALL',
      orderId: targetMode === 'ORDER' ? Number(orderId) : null,
      customerId: targetMode === 'CUSTOMER' ? Number(customerId) : null,
    };

    try {
      setLoading(true);
      const res = await axiosClient.post('/notifications/send', payload);
      const sentCount = res.data?.sentCount;

      const successText =
        targetMode === 'ALL'
          ? `सभी सक्रिय दुकानदारों (${sentCount ?? 'All'}) को नोटिफिकेशन भेज दिया गया! ✅`
          : `ग्राहक ${defaultBuyerName ? `(${defaultBuyerName})` : ''} को नोटिफिकेशन भेज दिया गया! ✅`;

      setStatusMsg({ type: 'success', text: successText });
      setTitle('');
      setMessage('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setStatusMsg({ type: 'error', text: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 w-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            {defaultOrderId
              ? `Order #${defaultOrderId} के ग्राहक को नोटिफिकेशन भेजें`
              : 'कस्टमर ऐप नोटिफिकेशन सेंटर (Admin)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {defaultBuyerName
              ? `ग्राहक: ${defaultBuyerName}`
              : 'किसी खास ऑर्डर के ग्राहक को या सभी दुकानदारों के मोबाइल ऐप पर सीधा अलर्ट भेजें।'}
          </p>
        </div>
      </div>

      {/* Target Mode Selector */}
      <div className="grid grid-cols-3 gap-2 mb-5 bg-slate-100 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setTargetMode('ALL')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
            targetMode === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          📢 सभी दुकानदार (All)
        </button>
        <button
          type="button"
          onClick={() => setTargetMode('ORDER')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
            targetMode === 'ORDER'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          📦 खास ऑर्डर (Order ID)
        </button>
        <button
          type="button"
          onClick={() => setTargetMode('CUSTOMER')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
            targetMode === 'CUSTOMER'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          👤 एक ग्राहक (Customer ID)
        </button>
      </div>

      {/* Quick Templates */}
      <div className="mb-4">
        <span className="text-xs font-medium text-slate-500 block mb-1.5">
          ⚡ 1-Click रेडीमेड मैसेज टेम्पलेट चुनें:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyTemplate('PACKING')}
            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 font-medium"
          >
            📦 पैकिंग शुरू
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('DISPATCH')}
            className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 font-medium"
          >
            🚚 माल डिस्पैच / ट्रांसपोर्ट
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('OFFER')}
            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium"
          >
            🎉 नया स्टॉक / ऑफर
          </button>
        </div>
      </div>

      <form onSubmit={handleSendNotification} className="space-y-4">
        {targetMode === 'ORDER' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Order ID (ऑर्डर नंबर) *
            </label>
            <input
              type="number"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="उदा: 15"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        )}

        {targetMode === 'CUSTOMER' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer ID (ग्राहक आईडी) *
            </label>
            <input
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="उदा: 4"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            नोटिफिकेशन हेडिंग (Title) *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="उदा: Order #15 डिस्पैच अपडेट 🚚"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            पूरा संदेश (Message) *
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="उदा: आपका माल ट्रांसपोर्ट में लग गया है, शाम तक दुकान पर पहुँच जाएगा।"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Send className="w-4 h-4" />
          {loading ? 'भेजा जा रहा है...' : 'अभी नोटिफिकेशन भेजें (Send Notification)'}
        </button>
      </form>
    </div>
  );
};

export default AdminNotificationSender;