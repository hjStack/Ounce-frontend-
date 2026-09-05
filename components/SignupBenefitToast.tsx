"use client";

import { useEffect } from "react";
import { getCouponId } from "../lib/coupons";
import { SHIPPING_FEE } from "../lib/shipping";
import {
  GOOGLE_LOGIN_SUCCESS_TOAST_MESSAGE,
  GOOGLE_SIGNUP_POINT_TOAST_MESSAGE,
  SIGNUP_BENEFIT_TOAST_MESSAGE,
  SIGNUP_POINT_TOAST_MESSAGE,
  clearSignupBenefitWithdrawal,
  clearSignupBenefitToastPending,
  hasRecentSignupBenefitWithdrawal,
  hasSeenSignupBenefitToast,
  markSignupBenefitToastSeen,
  readSignupBenefitToastPending,
  signupBenefitMemberKey,
} from "../lib/signup-benefits";
import type { Coupon, Member } from "../types/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { apiFetch } from "@/lib/api";

function hasSignupPoint(user: Member) {
  return Number(user.point || 0) >= 1000;
}

function memberCreatedAtMs(user: Member) {
  const raw =
    user.createdAt || user.createdDate || user.created_at || user.joinedAt || "";
  if (!raw || !/[tT\s]\d{1,2}:/.test(raw)) return null;

  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : null;
}

function wasCreatedAfterOAuthStart(user: Member, startedAt: number) {
  const createdAt = memberCreatedAtMs(user);
  if (!createdAt) return null;

  const clockSkewMs = 60 * 1000;
  return createdAt >= startedAt - clockSkewMs && createdAt <= Date.now() + clockSkewMs;
}

function isOAuthMode(mode: string) {
  return mode === "check" || mode === "oauth-login" || mode === "oauth-signup";
}

function isFreeShippingCoupon(coupon: Coupon) {
  const text =
    `${coupon.name || ""} ${coupon.discountType || ""}`.toLowerCase();
  const shippingAmount = Number(coupon.discountAmount || 0) >= SHIPPING_FEE;
  const available = !coupon.status || coupon.status === "AVAILABLE";
  return (
    available &&
    (text.includes("무료배송") ||
      text.includes("배송비") ||
      text.includes("free shipping") ||
      shippingAmount)
  );
}

async function fetchCoupons() {
  const response = await apiFetch("/api/coupons/me", {
    credentials: "include",
  });
  if (!response.ok) return [];
  return ((await response.json()) as Coupon[]).filter(
    (coupon) => getCouponId(coupon) > 0 || coupon.name,
  );
}

function benefitMessage(user: Member, coupons: Coupon[]) {
  const pointIssued = hasSignupPoint(user);
  const couponIssued = coupons.some(isFreeShippingCoupon);

  if (pointIssued && couponIssued) return SIGNUP_BENEFIT_TOAST_MESSAGE;
  if (pointIssued) return "가입 축하 1,000P가 지급되었습니다.";
  if (couponIssued) return "첫 구매 무료배송 쿠폰이 지급되었습니다.";
  return "";
}

function googleOAuthMessage(
  user: Member,
  mode: string,
  startedAt: number,
  benefitSeen: boolean,
  recentlyWithdrawn: boolean,
) {
  const newlyCreated = wasCreatedAfterOAuthStart(user, startedAt);
  const signupSourceWithoutCreationData =
    mode === "oauth-signup" && newlyCreated === null;
  const shouldShowSignupPoint =
    (recentlyWithdrawn && !benefitSeen) ||
    (hasSignupPoint(user) &&
      (newlyCreated === true ||
        (!benefitSeen && signupSourceWithoutCreationData)));

  return shouldShowSignupPoint
    ? GOOGLE_SIGNUP_POINT_TOAST_MESSAGE
    : GOOGLE_LOGIN_SUCCESS_TOAST_MESSAGE;
}

export default function SignupBenefitToast() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (loading || !user) return;

    const pending = readSignupBenefitToastPending();
    if (!pending) return;

    const currentPending = pending;
    const currentUser = user;
    const key = signupBenefitMemberKey(currentUser);
    const benefitSeen = hasSeenSignupBenefitToast(key);
    const recentlyWithdrawn = hasRecentSignupBenefitWithdrawal(currentUser);

    let cancelled = false;

    async function showToast() {
      if (isOAuthMode(currentPending.mode)) {
        const message = googleOAuthMessage(
          currentUser,
          currentPending.mode,
          currentPending.startedAt,
          benefitSeen,
          recentlyWithdrawn,
        );

        if (!cancelled) {
          toast(message);
          if (message === GOOGLE_SIGNUP_POINT_TOAST_MESSAGE) {
            markSignupBenefitToastSeen(key);
          }
          if (recentlyWithdrawn) clearSignupBenefitWithdrawal();
          clearSignupBenefitToastPending();
        }
        return;
      }

      if (benefitSeen) {
        clearSignupBenefitToastPending();
        return;
      }

      const mode = currentPending.mode;
      if (mode === "expected") {
        if (!cancelled) {
          toast(SIGNUP_POINT_TOAST_MESSAGE);
          markSignupBenefitToastSeen(key);
          clearSignupBenefitToastPending();
        }
        return;
      }

      let message = "";

      try {
        const coupons = await fetchCoupons();
        message = benefitMessage(currentUser, coupons) || message;
      } catch {
        // expected 흐름은 회원가입 성공 직후라 기본 혜택 문구를 유지한다.
      }

      if (cancelled || !message) {
        if (!cancelled) clearSignupBenefitToastPending();
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
