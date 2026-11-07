import React from 'react';
import { OrderResponseDto } from '../types/api';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface GstInvoiceModalProps {
  order: OrderResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
  buyerGstin?: string;
}

export const GstInvoiceModal: React.FC<GstInvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
  buyerGstin,
}) => {
  if (!isOpen || !order) return null;

  const lineItems = Array.isArray(order.items) ? order.items : [];

  const grossSubtotal =
    order.subtotalAmount ??
    lineItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0);

  const totalTax =
    order.taxAmount ??
    lineItems.reduce((acc, item) => {
      const lineGross = Number(item.price || 0) * Number(item.quantity || 0);
      const rate = Number(item.gstPercentage ?? 0);
      const calcTax =
        item.taxAmount !== undefined
          ? Number(item.taxAmount)
          : rate > 0
          ? (lineGross * rate) / (100 + rate)
          : 0;
      return acc + calcTax;
    }, 0);

  const sellerDiscount = Number(order.discountAmount || 0);
  const returnedCredit = Number(order.returnedAmount || 0);
  const grandTotal = Number(order.totalAmount ?? Math.max(0, grossSubtotal - sellerDiscount));
  const taxableSubtotal = Math.max(0, grandTotal - totalTax);
  const netPayable = Math.max(0, grandTotal - returnedCredit);
  const paidAmount = Number(order.paidAmount || 0);
  const balanceDue = Math.max(0, netPayable - paidAmount);

  const sellerGst = (order.sellerGstNumber || '09AAACH7409R1ZP').trim().toUpperCase();
  const sellerStateCode = sellerGst.length >= 2 ? sellerGst.slice(0, 2) : '09';
  const resolvedBuyerGstin = (buyerGstin || '').trim().toUpperCase();
  const buyerStateCode = resolvedBuyerGstin.length >= 2 ? resolvedBuyerGstin.slice(0, 2) : sellerStateCode;
  const isInterState = Boolean(resolvedBuyerGstin && buyerStateCode !== sellerStateCode);

  const cgst = isInterState ? 0 : totalTax / 2;
  const sgst = isInterState ? 0 : totalTax / 2;
  const igst = isInterState ? totalTax : 0;

  const orderTimestamp = order.orderDate || new Date().toISOString();
  const invoiceNumber = `INV-${new Date(orderTimestamp).getFullYear()}-${String(order.id).padStart(5, '0')}`;
  const invoiceDate = new Date(orderTimestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header toolbar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/40 rounded-lg text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Tax Invoice Preview</h3>
              <p className="text-xs text-slate-400">Standard B2B GST Compliant Format (Rule 46 CGST)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Content */}
        <div className="overflow-y-auto p-6 sm:p-10 text-slate-900 bg-white print:p-2 print:overflow-visible text-xs sm:text-sm">
          {/* Top Title Banner */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="inline-block bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider mb-1">
                  Tax Invoice (Rule 46 of CGST Rules)
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {order.sellerBusinessName || 'Wholesale Garments Hub'}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {order.sellerAddress || 'Main Wholesale Market, Commercial Zone'}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700 font-medium mt-1">
                  <span>
                    <strong className="text-slate-900">GSTIN:</strong> {sellerGst}
                  </span>
                  {order.sellerPhone && (
                    <span>
                      <strong className="text-slate-900">Contact:</strong> {order.sellerPhone}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-xs text-slate-500 uppercase font-semibold">Invoice No</div>
                <div className="text-base sm:text-lg font-mono font-bold text-slate-900">{invoiceNumber}</div>
                <div className="text-xs text-slate-500 uppercase font-semibold mt-1">Date of Issue</div>
                <div className="text-xs sm:text-sm font-medium text-slate-800">{invoiceDate}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Order Status: {order.status}
                </div>
              </div>
            </div>
          </div>

          {/* Parties: Buyer & Dispatch Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50/50">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Billed To (Wholesale Buyer)
              </p>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {order.customerName || `Customer #${order.customerId}`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {order.deliveryAddress || 'Address on file'}
              </p>
              <div className="text-xs text-slate-700 mt-2 space-y-0.5">
                <p>
                  <span className="font-semibold text-slate-800">Mobile:</span>{' '}
                  {order.customerMobile || 'Not provided'}
                </p>
                {resolvedBuyerGstin && (
                  <p>
                    <span className="font-semibold text-slate-800">Buyer GSTIN:</span>{' '}
                    <span className="font-mono font-medium">{resolvedBuyerGstin}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="sm:border-l border-slate-200 sm:pl-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Supply & Settlement Details
              </p>
              <div className="text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-semibold text-slate-800">Delivery Address:</span>{' '}
                  {order.deliveryAddress || 'Same as Billing Address'}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Supply Type:</span>{' '}
                  {isInterState
                    ? `Inter-State Supply (IGST - State Code: ${buyerStateCode})`
                    : `Intra-State Supply (CGST + SGST - State Code: ${sellerStateCode})`}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Payment Status:</span>{' '}
                  <span className="font-bold text-indigo-700">{order.paymentStatus}</span>
                </p>
                {order.sellerRemarks && (
                  <p className="text-slate-600 italic">
                    <span className="font-semibold text-slate-800">Seller Remarks:</span> "{order.sellerRemarks}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Product & Variant SKU</th>
                  <th className="py-2.5 px-3 text-center">HSN</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-center">GST%</th>
                  <th className="py-2.5 px-3 text-right">Tax Amt</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lineItems.map((item, idx) => {
                  const rate = Number(item.gstPercentage ?? 0);
                  const unitPrice = Number(item.price || 0);
                  const qty = Number(item.quantity || 0);
                  const itemTotal = unitPrice * qty;
                  const calculatedTax =
                    item.taxAmount !== undefined
                      ? Number(item.taxAmount)
                      : rate > 0
                      ? (itemTotal * rate) / (100 + rate)
                      : 0;
                  const taxable = Math.max(0, itemTotal - calculatedTax);

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        <div>{item.productName}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          SKU: {item.sku}
                          {item.size ? ` | Size: ${item.size}` : ''}
                          {item.color ? ` | Color: ${item.color}` : ''}
                        </div>
                        {item.itemNote && (
                          <div className="text-[10px] text-amber-700 italic mt-0.5">Note: {item.itemNote}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">
                        {item.hsnCode || '6109'}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-800">{qty}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center font-medium text-slate-700">{rate}%</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        ₹{calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Financials Summary & Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            <div className="sm:col-span-7 space-y-4">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800 mb-1">B2B Settlement Instructions (RTGS / NEFT / UPI):</p>
                <p>
                  Beneficiary Name:{' '}
                  <span className="font-semibold text-slate-900">
                    {order.sellerBusinessName || 'Wholesale Garments Hub'}
                  </span>
                </p>
                <p>
                  Seller GSTIN: <span className="font-mono font-bold text-slate-900">{sellerGst}</span>
                </p>
                <p>
                  Order Reference: <span className="font-mono font-bold text-slate-900">Order #{order.id}</span>
                </p>
              </div>

              <div className="text-[10px] text-slate-500 space-y-1">
                <p className="font-bold uppercase text-slate-700">Terms & Conditions:</p>
                <ol className="list-decimal pl-3 space-y-0.5">
                  <li>Wholesale pack quantities and MOQ pricing are inclusive of applicable GST rates shown above.</li>
                  <li>Goods once delivered can only be returned against an authorized Seller Return Credit Note.</li>
                  <li>All disputes are subject to the seller's local commercial jurisdiction.</li>
                </ol>
              </div>
            </div>

            <div className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Items Amount:</span>
                  <span className="font-mono font-medium text-slate-900">
                    ₹{grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {sellerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Seller Negotiation Discount:</span>
                    <span className="font-mono">
                      - ₹{sellerDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value (Excl. GST):</span>
                  <span className="font-mono text-slate-800">
                    ₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {isInterState ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST Total:</span>
                    <span className="font-mono text-slate-700">
                      ₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (50% of GST):</span>
                      <span className="font-mono text-slate-700">
                        ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (50% of GST):</span>
                      <span className="font-mono text-slate-700">
                        ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>Invoice Total (INR):</span>
                  <span className="font-mono text-base text-indigo-700">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {returnedCredit > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Less: Return Credit Note:</span>
                    <span className="font-mono">
                      - ₹{returnedCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Paid Amount:</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                    <span>Net Balance Due:</span>
                    <span className="font-mono text-amber-800">
                      ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                <div className="h-8"></div>
                <p className="text-[11px] font-bold text-slate-800">
                  For {order.sellerBusinessName || 'Wholesale Garments Hub'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">Authorized Signatory</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:mt-4">
            Computer-generated GST Tax Invoice from FlowMart B2B Cloud ERP.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GstInvoiceModal;