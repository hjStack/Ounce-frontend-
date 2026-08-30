import type { Coupon } from "../types/api";
import { won } from "./products";

export function getCouponId(coupon: Coupon) {
    return Number(coupon.couponId ?? coupon.id ?? 0);
}

export function formatCouponBenefit(coupon: Coupon) {
    const discountAmount = Number(coupon.discountAmount || 0);

    if (coupon.discountType === "PERCENT") {
        const maxDiscount = coupon.maxDiscountAmount ? ` · 최대 ${won(coupon.maxDiscountAmount)}` : "";
        return `${discountAmount}% 할인${maxDiscount}`;
    }

    return `${won(discountAmount)} 할인`;
}

export function formatCouponCondition(coupon: Coupon) {
    const minOrderAmount = Number(coupon.minOrderAmount || 0);
    return minOrderAmount > 0 ? `최소 ${won(minOrderAmount)} 이상 구매` : "최소 주문 금액 없음";
}

export function formatCouponDate(value?: string | null) {
    if (!value) return "기한 없음";
    return value.slice(0, 10).replaceAll("-", ".");
}

export function couponStatusLabel(status?: string) {
    if (status === "AVAILABLE") return "사용 가능";
    if (status === "USED") return "사용 완료";
    if (status === "EXPIRED") return "기간 만료";
    return status || "상태 확인";
}

export function couponUnavailableReason(coupon: Coupon, orderAmount: number) {
    if (coupon.status === "USED") return "이미 사용한 쿠폰입니다";
    if (coupon.status === "EXPIRED") return "기간이 만료되었습니다";

    const minOrderAmount = Number(coupon.minOrderAmount || 0);
    if (minOrderAmount > orderAmount) {
        return `${won(minOrderAmount - orderAmount)} 더 구매 시 사용 가능`;
    }

    return "이번 주문에 사용할 수 없습니다";
}
