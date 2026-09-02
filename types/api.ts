export type RoleClaim = string | { authority?: string; role?: string; name?: string };

export interface Member {
    memberId?: number;
    email: string;
    name?: string;
    point?: number;
    grade?: string;
    createdAt?: string;
    createdDate?: string;
    created_at?: string;
    joinedAt?: string;
    role?: string;
    authority?: string;
    authorities?: RoleClaim[];
    roles?: RoleClaim[];
}

export interface CartItem {
    cartId: number;
    productId: number;
    name: string;
    basePrice: number;
    finalPrice: number;
    timeDeal?: boolean;
    imageUrl?: string;
    quantity: number;
}

export type CouponStatus = "AVAILABLE" | "USED" | "EXPIRED" | string;
export type CouponDiscountType = "FIXED" | "PERCENT" | string;

export interface Coupon {
    couponId?: number;
    id?: number;
    name?: string;
    status?: CouponStatus;
    discountType?: CouponDiscountType;
    discountAmount?: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number;
    issuedAt?: string | null;
    expiresAt?: string | null;
    usedAt?: string | null;
}

export interface CouponValidation {
    couponId: number;
    available: boolean;
    discountAmount: number;
    finalAmount: number;
}

export interface Category {
    key: string;
    slug?: string;
    label: string;
    icon: string;
    desktop?: boolean;
}

export type ProductStatus = "PREPARING" | "VISIBLE" | "TIME_DEAL" | "SOLD_OUT" | "STOPPED" | "ON_SALE" | "HIDDEN" | string;

export interface Product {
    productId: number;
    name: string;
    basePrice: number;
    salePrice?: number | null;
    discountPercent?: number | null;
    description?: string | null;
    imageUrl?: string | null;
    stock: number;
    status: ProductStatus;
    category?: string | null;
    categoryCode?: string | null;
    unit?: string | null;
    origin?: string | null;
    storage?: string | null;
    shelfLife?: string | null;
    viewingCount?: number | null;
    lastPurchase?: string | null;
    isBest?: boolean | null;
    expirationDiscountText?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    expirationDiscountPercent?: number | null;
    priceBeforeExpiration?: number | null;
    detailImageUrl?: string | null;
}

export interface ProductSliceResponse {
    products?: Product[];
    content?: Product[];
    items?: Product[];
    page?: number;
    size?: number;
    hasNext?: boolean;
}

export interface Review {
    reviewId: number;
    productId: number;
    writerName: string;
    rating: number;
    content: string;
    createdAt?: string;
}

export type QnaStatus = "WAITING" | "ANSWERED" | string;

export interface Qna {
    qnaId: number;
    memberId?: number;
    memberName?: string;
    title: string;
    content: string;
    category: string;
    status: QnaStatus;
    answer?: string | null;
    createdAt?: string;
    answeredAt?: string | null;
}

export interface PageResponse<T> {
    content?: T[];
    items?: T[];
    totalElements?: number;
    totalPages?: number;
    number?: number;
    page?: number;
    size?: number;
    hasNext?: boolean;
    last?: boolean;
}

export interface OrderItem {
    orderItemId?: number;
    productId?: number;
    productName?: string;
    name?: string;
    quantity?: number;
    price?: number;
    unitPrice?: number;
    totalPrice?: number;
    imageUrl?: string | null;
}

export interface Order {
    orderId: number;
    orderNumber?: string;
    memberId?: number;
    memberName?: string;
    memberEmail?: string;
    email?: string;
    receiverName?: string;
    receiverPhone?: string;
    shippingAddress?: string;
    address?: string;
    memo?: string | null;
    shippingFee?: number | null;
    discountAmount?: number | null;
    amount?: number | null;
    orderAmount?: number | null;
    finalAmount?: number | null;
    productAmount?: number | null;
    paymentAmount?: number | null;
    totalAmount: number;
    status: string;
    createdAt?: string;
    createdDate?: string;
    created_at?: string;
    orderDate?: string;
    orderedAt?: string;
    ordered_at?: string;
    paidAt?: string | null;
    paid_at?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    updatedAt?: string | null;
    items?: OrderItem[];
    orderItems?: OrderItem[];
    products?: OrderItem[];
}

export interface AdminMember extends Member {
    phone?: string;
    nickname?: string;
    status?: string;
    provider?: string;
    address?: string | null;
    defaultAddress?: string | null;
    createdAt?: string;
    createdDate?: string;
    created_at?: string;
    joinedAt?: string;
    updatedAt?: string | null;
    lastLoginAt?: string | null;
    lastLoginDate?: string | null;
    orderCount?: number;
    totalOrderCount?: number;
    totalSpent?: number;
    totalSpentAmount?: number;
    totalPaymentAmount?: number;
    couponCount?: number;
    availableCouponCount?: number;
}

export interface SubscriptionCreateRequest {
    mealsPerWeek: number;
    startDate: string;
}

export interface SubscriptionResponse {
    subscriptionId?: number;
    id?: number;
    subscription_id?: number;
    memberId?: number;
    memberEmail?: string;
    email?: string;
    mealsPerWeek?: number;
    meals_per_week?: number;
    weeklyMeals?: number;
    weeklyMealCount?: number;
    planMeals?: number;
    meals?: number;
    status?: string;
    createdAt?: string;
    createdDate?: string;
    created_at?: string;
    startedAt?: string;
    startDate?: string;
    subscribedAt?: string;
    updatedAt?: string | null;
    canceledAt?: string | null;
    cancelledAt?: string | null;
    cancelDate?: string | null;
    nextDeliveryDate?: string | null;
    nextPaymentDate?: string | null;
    deliveryDay?: string | null;
    maintainedWeeks?: number | null;
    continuousWeeks?: number | null;
    freeShippingCouponIssued?: boolean | null;
    weeklyAmount?: number | null;
    subscriptionFee?: number | null;
    totalAmount?: number | null;
}
