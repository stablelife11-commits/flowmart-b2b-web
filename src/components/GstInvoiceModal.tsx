import React from 'react';
import { OrderResponseDto } from '../types/api';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface GstInvoiceModalProps {
  order: OrderResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GstInvoiceModal: React.FC<GstInvoiceModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  // Invoice calculations
  const subtotal = order.subtotal ?? order.orderItems.reduce((acc, item) => {
    const itemTax = item.taxAmount || (item.totalPrice * (item.taxRate || 18)) / (100 + (item.taxRate || 18));
    return acc + (item.totalPrice - itemTax);
  }, 0);

  const totalTax = order.taxAmount ?? order.orderItems.reduce((acc, item) => {
    return acc + (item.taxAmount || ((item.totalPrice * (item.taxRate || 18)) / (100 + (item.taxRate || 18))));
  }, 0);

  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  const sellerDiscount = order.discountAmount || 0;
  const returnedCredit = order.returnedAmount || 0;
  const grandTotal = order.totalAmount ?? (subtotal + totalTax - sellerDiscount - returnedCredit);
  const paidAmount = order.paidAmount || 0;
  const balanceDue = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, grandTotal - paidAmount);

  const invoiceNumber = order.orderNumber || `INV-${new Date(order.createdAt || Date.now()).getFullYear()}-${String(order.id).padStart(5, '0')}`;
  const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container */}
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header toolbar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/40 rounded-lg text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Tax Invoice Preview</h3>
              <p className="text-xs text-slate-400">Standard B2B GST Compliant Format (A4)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
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
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider mb-1">
                  Tax Invoice (Rule 46 of CGST Rules)
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {order.sellerBusinessName || order.sellerName || 'FLOWMART ENTERPRISES'}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {order.sellerAddress || 'Industrial Phase 2, B2B Commercial Zone'}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700 font-medium mt-1">
                  <span>
                    <strong className="text-slate-900">GSTIN:</strong> {order.sellerGstin || '27AABCU9603R1ZM'}
                  </span>
                  <span>
                    <strong className="text-slate-900">Contact:</strong> {order.sellerPhone || '+91 98200 12345'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-semibold">Invoice No</div>
                <div className="text-base sm:text-lg font-mono font-bold text-slate-900">{invoiceNumber}</div>
                <div className="text-xs text-slate-500 uppercase font-semibold mt-1">Date of Issue</div>
                <div className="text-xs sm:text-sm font-medium text-slate-800">{invoiceDate}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Status: {order.status}
                </div>
              </div>
            </div>
          </div>

          {/* Parties: Seller & Buyer Grid */}
          <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50/50">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Billed To (Buyer)
              </p>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {order.buyerName}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {order.buyerAddress || order.shippingAddress || 'Commercial Complex, Main Road'}
              </p>
              <div className="text-xs text-slate-700 mt-2 space-y-0.5">
                <p>
                  <span className="font-semibold text-slate-800">Phone:</span> {order.buyerMobile || 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Buyer GSTIN:</span>{' '}
                  <span className="font-mono font-medium">{order.buyerGstin || '27AAECB2345P1Z8'}</span>
                </p>
              </div>
            </div>

            <div className="border-l border-slate-200 pl-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Dispatch & Transport
              </p>
              <div className="text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-semibold text-slate-800">Delivery Address:</span>{' '}
                  {order.shippingAddress || order.buyerAddress || 'Same as Billing Address'}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Place of Supply:</span> Intra-State (State Code: 27)
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Payment Status:</span>{' '}
                  <span className="font-bold text-indigo-700">{order.paymentStatus}</span>
                </p>
                {order.notes && (
                  <p className="text-slate-500 italic">
                    <span className="font-semibold text-slate-700">Order Note:</span> "{order.notes}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Item Description & SKU</th>
                  <th className="py-2.5 px-3 text-center">HSN</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-center">GST%</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {order.orderItems.map((item, idx) => {
                  const rate = item.taxRate || 18;
                  const itemTotal = item.totalPrice;
                  const calculatedTax = item.taxAmount || (itemTotal * rate) / (100 + rate);
                  const taxable = itemTotal - calculatedTax;
                  const itemCgst = calculatedTax / 2;
                  const itemSgst = calculatedTax / 2;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        <div>{item.productTitle}</div>
                        <div className="text-[10px] font-mono text-slate-500">{item.variantSku}</div>
                        {item.itemNote && (
                          <div className="text-[10px] text-amber-700 italic">Note: {item.itemNote}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">
                        {item.hsnCode || '8471'}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center font-medium text-slate-700">
                        {rate}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        ₹{itemCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        ₹{itemSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <div className="grid grid-cols-12 gap-6 items-start">
            
            {/* Left: Notes, Bank Details, Declaration */}
            <div className="col-span-7 space-y-4">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800 mb-1">Bank Payment Details for RTGS / NEFT / IMPS:</p>
                <p>Bank Name: <span className="font-semibold text-slate-900">HDFC Bank Ltd</span></p>
                <p>Account Name: <span className="font-semibold text-slate-900">{order.sellerBusinessName || 'FlowMart Enterprises Ltd'}</span></p>
                <p>Account No: <span className="font-mono font-bold text-slate-900">50200088924712</span></p>
                <p>IFSC Code: <span className="font-mono font-bold text-slate-900">HDFC0000287</span></p>
              </div>

              <div className="text-[10px] text-slate-500 space-y-1">
                <p className="font-bold uppercase text-slate-700">Terms & Conditions:</p>
                <ol className="list-decimal pl-3 space-y-0.5">
                  <li>Goods once supplied will only be returned within 7 days under standard return policy.</li>
                  <li>Disputes, if any, subject to local jurisdiction only.</li>
                  <li>Overdue invoices are subject to 18% p.a. interest after 30 days credit.</li>
                </ol>
              </div>
            </div>

            {/* Right: Calculations Box */}
            <div className="col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Taxable Value):</span>
                  <span className="font-mono font-medium text-slate-900">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST Total:</span>
                  <span className="font-mono text-slate-700">
                    ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST Total:</span>
                  <span className="font-mono text-slate-700">
                    ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                {returnedCredit > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Returned Credit / Debit Note:</span>
                    <span className="font-mono">
                      - ₹{returnedCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-base text-indigo-700">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Paid Amount:</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                    <span>Balance Due:</span>
                    <span className="font-mono text-amber-800">
                      ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatory Box */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                <div className="h-10"></div>
                <p className="text-[11px] font-bold text-slate-800">
                  For {order.sellerBusinessName || order.sellerName || 'FlowMart Enterprises'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">Authorized Signatory</p>
              </div>
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:mt-4">
            This is a computer generated invoice and does not require a physical seal if digitally authenticated.
          </div>

        </div>

      </div>
    </div>
  );
};

export default GstInvoiceModal;

