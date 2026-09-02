"use client";

import { useEffect } from "react";
import { getCouponId } from "../lib/coupons";
import { SHIPPING_FEE } from "../lib/shipping";
import {
    SIGNUP_BENEFIT_TOAST_MESSAGE,
    clearSignupBenefitToastPending,
    hasSeenSignupBenefitToast,
    markSignupBenefitToastSeen,
    readSignupBenefitToastMode,
} from "../lib/signup-benefits";
import type { Coupon, Member } from "../types/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

function memberKey(user: Member) {
    return user.email?.trim().toLowerCase() || String(user.memberId || "unknown");
}

function hasSignupPoint(user: Member) {
    return Number(user.point || 0) >= 1000;
}

function isFreeShippingCoupon(coupon: Coupon) {
    const text = `${coupon.name || ""} ${coupon.discountType || ""}`.toLowerCase();
    const shippingAmount = Number(coupon.discountAmount || 0) >= SHIPPING_FEE;
    const available = !coupon.status || coupon.status === "AVAILABLE";
    return available && (text.includes("무료배송") || text.includes("배송비") || text.includes("free shipping") || shippingAmount);
}

async function fetchCoupons() {
    const response = await fetch("/api/coupons/me", { credentials: "include" });
    if (!response.ok) return [];
    return ((await response.json()) as Coupon[]).filter((coupon) => getCouponId(coupon) > 0 || coupon.name);
}

function benefitMessage(user: Member, coupons: Coupon[]) {
    const pointIssued = hasSignupPoint(user);
    const couponIssued = coupons.some(isFreeShippingCoupon);

    if (pointIssued && couponIssued) return SIGNUP_BENEFIT_TOAST_MESSAGE;
    if (pointIssued) return "가입 축하 1,000P가 지급되었습니다.";
    if (couponIssued) return "첫 구매 무료배송 쿠폰이 지급되었습니다.";
    return "";
}

export default function SignupBenefitToast() {
    const { user, loading } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (loading || !user) return;

        const mode = readSignupBenefitToastMode();
        if (!mode) return;

        const currentUser = user;
        const key = memberKey(currentUser);
        if (hasSeenSignupBenefitToast(key)) {
            clearSignupBenefitToastPending();
            return;
        }

        let cancelled = false;

        async function showToast() {
            let message = mode === "expected" ? SIGNUP_BENEFIT_TOAST_MESSAGE : "";

            try {
                const coupons = await fetchCoupons();
                message = benefitMessage(currentUser, coupons) || message;
            } catch {
                // expected 흐름은 회원가입 성공 직후라 기본 혜택 문구를 유지한다.
            }

            if (cancelled || !message) {
                if (!cancelled && mode === "check") clearSignupBenefitToastPending();
                return;
            }

            toast(message);
            markSignupBenefitToastSeen(key);
            clearSignupBenefitToastPending();
        }

        void showToast();

        return () => {
            cancelled = true;
        };
    }, [loading, toast, user]);

    return null;
}
