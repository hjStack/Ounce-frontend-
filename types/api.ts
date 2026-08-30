export type RoleClaim = string | { authority?: string; role?: string; name?: string };

export interface Member {
    memberId?: number;
    email: string;
    name?: string;
    point?: number;
    grade?: string;
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

export type ProductStatus = "ON_SALE" | "SOLD_OUT" | "HIDDEN" | string;

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

export interface Order {
    orderId: number;
    totalAmount: number;
    status: string;
}
