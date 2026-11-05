export type Role = 'ADMIN' | 'SELLER' | 'BUYER';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE';

export type PaymentMode =
  | 'CASH'
  | 'UPI'
  | 'NEFT'
  | 'RTGS'
  | 'CHEQUE'
  | 'CREDIT';

export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  businessName?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponseDto {
  token?: string;
  accessToken?: string;
  tokenType?: string;
  user: UserResponseDto;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  businessName?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface VariantDto {
  id: number;
  sku: string;
  title?: string;
  attributeValues?: Record<string, string> | string;
  price: number;
  mrp?: number;
  purchasePrice?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  barcode?: string;
  active?: boolean;
}

export interface ProductResponseDto {
  id: number;
  sellerId?: number;
  sellerName?: string;
  sellerBusinessName?: string;
  sellerGstin?: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  hsnCode?: string;
  gstRate?: number;
  minimumOrderQuantity: number; // MOQ
  packSize: number; // pack size multiplier
  active: boolean;
  images?: string[];
  imageUrl?: string;
  variants: VariantDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItemDto {
  id?: number;
  variantId: number;
  variantSku?: string;
  productId: number;
  productTitle: string;
  sellerId?: number;
  sellerBusinessName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemNote?: string;
  packSize?: number;
  minimumOrderQuantity?: number;
  availableStock?: number;
  productImage?: string;
}

export interface CartResponseDto {
  id?: number;
  buyerId?: number;
  items: CartItemDto[];
  totalAmount: number;
  itemCount?: number;
}

export interface OrderItemDto {
  id: number;
  orderId?: number;
  variantId: number;
  variantSku: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  purchasePrice?: number;
  taxRate?: number;
  taxAmount?: number;
  hsnCode?: string;
  totalPrice: number;
  itemNote?: string;
  sellerId?: number;
  sellerBusinessName?: string;
}

export interface OrderResponseDto {
  id: number;
  orderNumber?: string;
  buyerId: number;
  buyerName: string;
  buyerEmail?: string;
  buyerMobile?: string;
  buyerAddress?: string;
  buyerGstin?: string;
  sellerId: number;
  sellerName?: string;
  sellerBusinessName?: string;
  sellerGstin?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderItems: OrderItemDto[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  returnedAmount?: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  shippingAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SellerOrderUpdateRequestDto {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  discountAmount?: number;
  notes?: string;
  trackingNumber?: string;
}

export interface PaymentResponseDto {
  id: number;
  orderId?: number;
  customerId?: number;
  customerName?: string;
  sellerId?: number;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode | string;
  referenceNumber?: string;
  notes?: string;
}

export interface SaleResponseDto {
  id: number;
  invoiceNumber: string;
  orderId?: number;
  customerId?: number;
  customerName: string;
  sellerId?: number;
  totalAmount: number;
  taxAmount?: number;
  discountAmount?: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  saleDate: string;
}

export interface PurchaseResponseDto {
  id: number;
  purchaseOrderNumber: string;
  supplierId?: number;
  supplierName: string;
  totalAmount: number;
  taxAmount?: number;
  status: string;
  purchaseDate: string;
  notes?: string;
}

export interface ReturnResponseDto {
  id: number;
  orderId?: number;
  saleId?: number;
  customerName?: string;
  returnReason: string;
  refundAmount: number;
  status: string;
  returnDate: string;
}

export interface ExpenseResponseDto {
  id: number;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMode?: string;
  notes?: string;
}

export interface InventoryTransactionResponseDto {
  id: number;
  variantId: number;
  sku: string;
  productTitle?: string;
  type: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER' | string;
  quantity: number;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  transactionDate: string;
}

export interface CustomerDto {
  id: number;
  name: string;
  businessName?: string;
  email?: string;
  phone: string;
  gstin?: string;
  address?: string;
  outstandingBalance?: number;
}

export interface SupplierDto {
  id: number;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  gstin?: string;
  address?: string;
  balancePayable?: number;
}

export interface DashboardSummaryDto {
  totalRevenue?: number;
  totalSales?: number;
  totalOrders?: number;
  totalPendingOrders?: number;
  totalCustomers?: number;
  totalProducts?: number;
  lowStockCount?: number;
  totalReceivables?: number;
  totalPayables?: number;
  monthlySales?: { month: string; amount: number }[];
  recentOrders?: OrderResponseDto[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last?: boolean;
  first?: boolean;
}

export interface ApiErrorResponse {
  message?: string;
  fieldErrors?: Record<string, string> | { field: string; message: string }[];
  error?: string;
  status?: number;
}

