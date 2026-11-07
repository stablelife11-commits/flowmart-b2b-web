export type Role = 'ADMIN' | 'SELLER' | 'BUYER';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID';

export type PaymentMode =
  | 'CASH'
  | 'UPI'
  | 'NEFT'
  | 'RTGS'
  | 'CHEQUE'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CREDIT';

export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  customerId?: number | null;
  businessName?: string;
  gstNumber?: string;
  businessPhone?: string;
  businessAddress?: string;
  // Optional compatibility aliases
  phone?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileDto {
  id?: number;
  email?: string;
  role?: Role | string;
  name: string;
  businessName?: string;
  gstNumber?: string;
  businessPhone?: string;
  businessAddress?: string;
}

export interface AuthResponseDto {
  token: string;
  accessToken?: string;
  tokenType?: string;
  userId: number;
  email: string;
  name: string;
  role: Role;
  customerId?: number | null;
  businessName?: string;
  gstNumber?: string;
  businessPhone?: string;
  businessAddress?: string;
  user?: UserResponseDto;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
  mobile: string; // Strictly 10 digits: ^\d{10}$
  role?: Role;
  businessName?: string;
  gstNumber?: string;
  businessAddress?: string;
  // Optional compatibility aliases
  phone?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface VariantDto {
  id: number;
  sku: string;
  size?: string;
  color?: string;
  sellingPrice: number;
  purchasePrice?: number;
  stock: number;
  minimumOrderQuantity: number;
  packSize: number;
  hsnCode?: string;
  gstPercentage: number;
  // Optional compatibility aliases
  price?: number;
  stockQuantity?: number;
  title?: string;
  active?: boolean;
}

// Exported alias required by BuyerPortal.tsx & SellerPortal.tsx
export type VariantResponseDto = VariantDto;

export interface VariantRequestDto {
  id?: number;
  sku: string;
  size?: string;
  color?: string;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  minimumOrderQuantity: number;
  packSize: number;
  hsnCode?: string;
  gstPercentage: number;
}

export interface ProductRequestDto {
  sellerId: number;
  productCode: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  variants: VariantRequestDto[];
  imageUrls?: string[];
}

export interface ProductResponseDto {
  id: number;
  sellerId: number;
  productCode: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  active: boolean;
  variants: VariantResponseDto[];
  imageUrls: string[];
  // Optional compatibility aliases
  title?: string;
  images?: string[];
  imageUrl?: string;
  hsnCode?: string;
  gstRate?: number;
  minimumOrderQuantity?: number;
  packSize?: number;
  sellerName?: string;
  sellerBusinessName?: string;
  sellerGstin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockUpdateRequestDto {
  stock: number;
}

export interface CartItemRequestDto {
  variantId: number;
  quantity: number;
  itemNote?: string;
}

export interface CartItemDto {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  brand?: string;
  category?: string;
  sellerId: number;
  primaryImageUrl?: string;
  variantId: number;
  sku: string;
  size?: string;
  color?: string;
  hsnCode?: string;
  gstPercentage: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  minimumOrderQuantity: number;
  packSize: number;
  productActive: boolean;
  inStock: boolean;
  itemNote?: string;
  // Optional compatibility aliases
  variantSku?: string;
  productTitle?: string;
  totalPrice?: number;
  productImage?: string;
  sellerBusinessName?: string;
}

export type CartItemResponseDto = CartItemDto;

export interface CartResponseDto {
  cartId: number | null;
  customerId: number;
  totalDistinctItems: number;
  totalQuantity: number;
  estimatedTotalAmount: number;
  updatedAt: string | null;
  items: CartItemDto[];
  // Optional compatibility aliases
  id?: number;
  buyerId?: number;
  totalAmount?: number;
  itemCount?: number;
}

export interface CartCheckoutRequestDto {
  deliveryAddress: string;
}

export interface OrderItemRequestDto {
  variantId: number;
  quantity: number;
  unitPrice?: number;
  itemNote?: string;
}

export interface OrderRequestDto {
  customerId?: number;
  deliveryAddress: string;
  items: OrderItemRequestDto[];
}

export interface OrderItemDto {
  id: number;
  productId: number;
  productName: string;
  variantId: number;
  sku: string;
  size?: string;
  color?: string;
  hsnCode?: string;
  gstPercentage: number;
  taxAmount: number;
  quantity: number;
  price: number;
  itemNote?: string;
  // Optional compatibility aliases
  orderId?: number;
  variantSku?: string;
  productTitle?: string;
  unitPrice?: number;
  purchasePrice?: number;
  taxRate?: number;
  totalPrice?: number;
  sellerId?: number;
  sellerBusinessName?: string;
}

// Exported alias required by SellerPortal.tsx
export type OrderItemResponseDto = OrderItemDto;

export interface OrderResponseDto {
  id: number;
  sellerId: number;
  sellerBusinessName: string;
  sellerGstNumber: string;
  sellerPhone: string;
  sellerAddress: string;
  customerId: number;
  customerName: string;
  customerMobile: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  returnedAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  sellerRemarks?: string;
  orderDate: string;
  status: OrderStatus;
  deliveryAddress: string;
  items: OrderItemResponseDto[];
  // Optional compatibility aliases checked by GstInvoiceModal, BuyerPortal & SellerPortal
  orderNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  subtotal?: number;
  balanceDue?: number;
  orderItems?: OrderItemResponseDto[];
  buyerId?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerMobile?: string;
  buyerAddress?: string;
  buyerGstin?: string;
  sellerName?: string;
  sellerGstin?: string;
  shippingAddress?: string;
  notes?: string;
}

export interface SellerOrderUpdateRequestDto {
  deliveryAddress?: string;
  discountAmount?: number;
  sellerRemarks?: string;
  confirmImmediately?: boolean;
  items: OrderItemRequestDto[];
}

export interface CustomerRequestDto {
  name: string;
  mobile: string; // 10 digits
  email?: string;
}

export interface CustomerDto {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  active: boolean;
  // Optional compatibility aliases
  phone?: string;
  businessName?: string;
  gstin?: string;
  address?: string;
  outstandingBalance?: number;
}

// Exported alias required by SellerPortal.tsx
export type CustomerResponseDto = CustomerDto;

export interface SupplierRequestDto {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface SupplierDto {
  id: number;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  // Optional compatibility aliases
  companyName?: string;
  gstin?: string;
  balancePayable?: number;
}

// Exported alias required by SellerPortal.tsx
export type SupplierResponseDto = SupplierDto;

export interface SaleItemRequestDto {
  variantId: number;
  quantity: number;
}

export interface SaleRequestDto {
  saleNumber: string;
  customerId: number;
  saleDate: string; // YYYY-MM-DD
  items: SaleItemRequestDto[];
}

export interface SaleItemResponseDto {
  id: number;
  variantId: number;
  sku: string;
  hsnCode?: string;
  gstPercentage: number;
  taxAmount: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleResponseDto {
  id: number;
  saleNumber: string;
  customerId: number;
  customerName: string;
  saleDate: string;
  taxAmount: number;
  totalAmount: number;
  returnedAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  items: SaleItemResponseDto[];
  // Optional compatibility aliases
  invoiceNumber?: string;
  orderId?: number;
  sellerId?: number;
  discountAmount?: number;
  balanceDue?: number;
  status?: string;
}

export interface PurchaseItemRequestDto {
  variantId: number;
  quantity: number;
  unitCost: number;
}

export interface PurchaseRequestDto {
  purchaseNumber: string;
  supplierId: number;
  purchaseDate: string; // YYYY-MM-DD
  items: PurchaseItemRequestDto[];
}

export interface PurchaseItemResponseDto {
  id: number;
  variantId: number;
  sku: string;
  quantity: number;
  unitCost: number;
  totalPrice: number;
}

export interface PurchaseResponseDto {
  id: number;
  purchaseNumber: string;
  supplierId: number;
  supplierName: string;
  purchaseDate: string;
  totalAmount: number;
  items: PurchaseItemResponseDto[];
  // Optional compatibility aliases
  purchaseOrderNumber?: string;
  taxAmount?: number;
  status?: string;
  notes?: string;
}

export interface ReturnItemRequestDto {
  variantId: number;
  quantity: number;
}

export interface ReturnRequestDto {
  saleId?: number;
  orderId?: number;
  reason?: string;
  items: ReturnItemRequestDto[];
}

export interface ReturnItemResponseDto {
  id: number;
  variantId: number;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReturnResponseDto {
  id: number;
  saleId?: number;
  orderId?: number;
  returnDate: string;
  reason?: string;
  totalReturnAmount: number;
  items: ReturnItemResponseDto[];
  // Optional compatibility aliases
  customerName?: string;
  returnReason?: string;
  refundAmount?: number;
  status?: string;
}

export interface PaymentRequestDto {
  customerId: number;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMode | string;
  referenceType?: 'SALE' | 'ORDER' | 'GENERAL';
  referenceId?: number;
  notes?: string;
}

export interface PaymentResponseDto {
  id: number;
  customerId: number;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceType: string;
  referenceId?: number;
  notes?: string;
  // Optional compatibility aliases
  orderId?: number;
  sellerId?: number;
  paymentMode?: PaymentMode | string;
  referenceNumber?: string;
}

export interface ExpenseRequestDto {
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  category: string;
  description?: string;
}

export interface ExpenseResponseDto {
  id: number;
  amount: number;
  expenseDate: string;
  category: string;
  description?: string;
  // Optional compatibility aliases
  title?: string;
  paymentMode?: string;
  notes?: string;
}

export interface InventoryTransactionResponseDto {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  size?: string;
  color?: string;
  type: 'PURCHASE' | 'SALE' | 'ORDER_RESERVATION' | 'ORDER_RELEASE' | 'ADJUSTMENT' | 'RETURN' | string;
  quantity: number;
  referenceType?: string;
  referenceId?: number;
  previousStock: number;
  newStock: number;
  createdAt: string;
  // Optional compatibility aliases
  productTitle?: string;
  notes?: string;
  transactionDate?: string;
}

export interface DashboardSummaryDto {
  totalSalesAmount: number;
  posSalesAmount: number;
  onlineOrderSalesAmount: number;
  totalReturnsAmount: number;
  totalPurchaseAmount: number;
  totalExpensesAmount: number;
  totalCustomers: number;
  totalProducts: number;
  totalSuppliers: number;
  // Optional compatibility aliases
  totalRevenue?: number;
  totalSales?: number;
  totalOrders?: number;
  totalPendingOrders?: number;
  lowStockCount?: number;
  totalReceivables?: number;
  totalPayables?: number;
  monthlySales?: { month: string; amount: number }[];
  recentOrders?: OrderResponseDto[];
}

export interface PagedResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  // Optional compatibility aliases
  number?: number;
  first?: boolean;
}

export type PageResponse<T> = PagedResponseDto<T>;

export interface ApiErrorResponse {
  message?: string;
  fieldErrors?: Record<string, string> | { field: string; message: string }[];
  error?: string;
  status?: number;
  timestamp?: string;
}