import type { SubscriptionResponse } from "../types/api";
import { clampMeals } from "./plan";

const LEGACY_SUBSCRIPTION_STORE_KEY = "ounce.subscription.mock.v1";
const CANCELED_STATUSES = new Set(["CANCELED", "CANCELLED", "ENDED", "DELETED", "INACTIVE"]);
const PAYMENT_FAILED_STATUSES = new Set(["PAYMENT_FAILED"]);

export function clearLegacySubscriptionStore() {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.removeItem(LEGACY_SUBSCRIPTION_STORE_KEY);
    } catch {
        // Ignore storage access errors in private browsing or restricted WebViews.
    }
}

export function subscriptionIdOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.subscriptionId ?? subscription?.id ?? subscription?.subscription_id ?? 0);
}

export function mealsPerWeekOf(subscription: SubscriptionResponse | null | undefined) {
    return clampMeals(
        subscription?.mealsPerWeek ??
            subscription?.meals_per_week ??
            subscription?.weeklyMeals ??
            subscription?.weeklyMealCount ??
            subscription?.planMeals ??
            subscription?.meals ??
            5,
    );
}

export function subscriptionStatus(subscription: SubscriptionResponse | null | undefined) {
    if (!subscription) return "ACTIVE";

    const normalized = (subscription.status || "").toUpperCase();
    if (CANCELED_STATUSES.has(normalized) || canceledAtOf(subscription)) return "CANCELED";
    if (PAYMENT_FAILED_STATUSES.has(normalized)) return "PAYMENT_FAILED";
    return normalized || "ACTIVE";
}

export function isActiveSubscription(subscription: SubscriptionResponse | null | undefined) {
    return subscriptionStatus(subscription) === "ACTIVE";
}

export function subscriptionStatusLabel(status?: string) {
    const normalized = (status || "ACTIVE").toUpperCase();
    if (normalized === "ACTIVE") return "이용 중";
    if (normalized === "PAYMENT_FAILED") return "결제 실패";
    if (normalized === "PAUSED") return "일시 중지";
    if (normalized === "CANCELED" || normalized === "CANCELLED") return "해지";
    if (normalized === "ENDED") return "종료";
    if (normalized === "PENDING") return "신청 대기";
    return status || "이용 중";
}

export function subscriptionStatusClass(status?: string) {
    const normalized = (status || "ACTIVE").toUpperCase();
    if (normalized === "ACTIVE") return "bg-primary-50 text-primary-700";
    if (normalized === "PAYMENT_FAILED" || normalized === "PAUSED" || normalized === "PENDING") return "bg-yellow-50 text-yellow-700";
    if (CANCELED_STATUSES.has(normalized)) return "bg-red-50 text-red-700";
    return "bg-background-100 text-foreground-700";
}

export function startedAtOf(subscription: SubscriptionResponse | null | undefined) {
    return (
        subscription?.startedAt ||
        subscription?.startDate ||
        subscription?.subscribedAt ||
        subscription?.createdAt ||
        subscription?.createdDate ||
        subscription?.created_at ||
        undefined
    );
}

export function canceledAtOf(subscription: SubscriptionResponse | null | undefined) {
    return subscription?.canceledAt || subscription?.cancelledAt || subscription?.cancelDate || undefined;
}

export function maintainedWeeksOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.maintainedWeeks ?? subscription?.continuousWeeks ?? 0);
}

export function subscriptionAmountOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.weeklyAmount ?? subscription?.subscriptionFee ?? subscription?.totalAmount ?? 0);
}
