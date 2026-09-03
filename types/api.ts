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
    selection: SubscriptionSelection;
}

export type SubscriptionSelection = Record<string, number>;

export interface SubscriptionSelectionItem {
    productId: number;
    quantity: number;
}

export interface SubscriptionChangeMealsRequest {
    mealsPerWeek: number;
}

export interface SubscriptionChangeMenuRequest {
    selection: SubscriptionSelection;
}

export interface SubscriptionPauseRequest {
    resumeDate: string;
}

export interface SubscriptionCheckoutResponse {
    outcome?: string;
    message?: string;
    subscription?: SubscriptionResponse;
    detail?: SubscriptionResponse;
    data?: SubscriptionResponse;
}

export interface SubscriptionWeeklyMenuItem {
    productId?: number;
    product_id?: number;
    id?: number;
    quantity?: number;
    count?: number;
    product?: Product;
}

export interface SubscriptionWeeklyMenuResponse {
    deliveryDate?: string | null;
    productIds?: number[];
    menuProductIds?: number[];
    products?: Product[];
    items?: SubscriptionWeeklyMenuItem[];
    menuItems?: SubscriptionWeeklyMenuItem[];
}

export interface SubscriptionWeeklyMenuUpdateRequest {
    deliveryDate?: string | null;
    productIds?: number[];
    selection?: SubscriptionSelection;
}

export interface SubscriptionDeliveryDateUpdateRequest {
    nextDeliveryDate: string;
    deliveryDate: string;
}

export interface SubscriptionCycle {
    cycleId?: number;
    id?: number;
    subscriptionCycleId?: number;
    status?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    billingDate?: string | null;
    billingAt?: string | null;
    paidAt?: string | null;
    paymentTriedAt?: string | null;
    deliveryDate?: string | null;
    deliveredAt?: string | null;
    skippedAt?: string | null;
    failedAttempts?: number | null;
    retryCount?: number | null;
    amount?: number | null;
    totalAmount?: number | null;
    message?: string | null;
    selection?: SubscriptionSelection | SubscriptionSelectionItem[];
    menu?: SubscriptionWeeklyMenuItem[];
    menuItems?: SubscriptionWeeklyMenuItem[];
    products?: Product[];
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
    statusDescription?: string;
    statusLabel?: string;
    description?: string | null;
    paymentStatus?: string;
    checkoutStatus?: string;
    active?: boolean | null;
    chargeable?: boolean | null;
    terminal?: boolean | null;
    canceled?: boolean | null;
    cancelled?: boolean | null;
    deleted?: boolean | null;
    createdAt?: string;
    createdDate?: string;
    created_at?: string;
    startedAt?: string;
    startedDate?: string;
    startedOn?: string;
    startDate?: string;
    startAt?: string;
    subscriptionStartDate?: string;
    subscribedAt?: string;
    updatedAt?: string | null;
    canceledAt?: string | null;
    cancelledAt?: string | null;
    canceledDate?: string | null;
    cancelledDate?: string | null;
    cancelDate?: string | null;
    canceledOn?: string | null;
    cancelledOn?: string | null;
    endedAt?: string | null;
    deletedAt?: string | null;
    nextDeliveryDate?: string | null;
    deliveryDate?: string | null;
    nextPaymentDate?: string | null;
    nextBillingDate?: string | null;
    nextBillingAt?: string | null;
    billingDate?: string | null;
    billingDeadlineAt?: string | null;
    cutoffAt?: string | null;
    menuEditableUntil?: string | null;
    pausedUntil?: string | null;
    pauseUntil?: string | null;
    resumeDate?: string | null;
    skipCancelable?: boolean;
    deliveryDay?: string | null;
    maintainedWeeks?: number | null;
    continuousWeeks?: number | null;
    consecutiveSuccessPayments?: number | null;
    successfulPaymentStreak?: number | null;
    failedWeeks?: number | null;
    paymentRetryCount?: number | null;
    retryCount?: number | null;
    consecutivePaymentFailures?: number | null;
    freeShippingCouponIssued?: boolean | null;
    weeklyAmount?: number | null;
    subscriptionFee?: number | null;
    totalAmount?: number | null;
    selection?: SubscriptionSelection | SubscriptionSelectionItem[];
    menu?: SubscriptionWeeklyMenuItem[];
    menuItems?: SubscriptionWeeklyMenuItem[];
    products?: Product[];
    cycles?: SubscriptionCycle[];
}
