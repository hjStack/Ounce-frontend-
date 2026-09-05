import type { SubscriptionResponse } from "../types/api";
import { clampMeals } from "./plan";

const LEGACY_SUBSCRIPTION_STORE_KEY = "ounce.subscription.mock.v1";
const SUBSCRIPTION_STORAGE_PREFIX = "ounce.subscription.";
const CANCELED_STATUSES = new Set([
    "CANCEL",
    "CANCELED",
    "CANCELLED",
    "ENDED",
    "DELETED",
    "INACTIVE",
    "TERMINATED",
    "해지",
    "해지됨",
    "해지완료",
    "취소",
    "취소됨",
    "취소완료",
]);
const ACTIVE_STATUSES = new Set(["ACTIVE", "구독중", "이용중"]);
const PAUSED_STATUSES = new Set(["PAUSED", "PAUSE", "SKIPPED", "SUSPENDED", "쉬어가는중", "쉬어가기", "일시중지", "이번주쉬어감"]);
const PAYMENT_FAILED_STATUSES = new Set(["PAYMENT_FAILED", "PAYMENT_RETRYING", "BILLING_FAILED", "PAYMENT_RETRY", "결제재시도중", "결제실패"]);

function normalizeStatus(value?: string | null) {
    return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function dateTimeOf(value?: string | null) {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function statusValuesOf(subscription: SubscriptionResponse) {
    return [
        subscription.status,
        subscription.statusDescription,
        subscription.statusLabel,
        subscription.description,
        subscription.paymentStatus,
        subscription.checkoutStatus,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function isDateOnly(value?: string | null) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function atCutoff(value?: string | null) {
    if (!value) return undefined;
    return isDateOnly(value) ? `${value}T23:00:00` : value;
}

export function clearLegacySubscriptionStore() {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.removeItem(LEGACY_SUBSCRIPTION_STORE_KEY);
        for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
            const key = window.localStorage.key(index);
            if (key?.startsWith(SUBSCRIPTION_STORAGE_PREFIX)) {
                window.localStorage.removeItem(key);
            }
        }
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
    if (!subscription) return "NONE";

    const normalizedStatuses = statusValuesOf(subscription).map(normalizeStatus);
    if (
        normalizedStatuses.some((status) => CANCELED_STATUSES.has(status)) ||
        canceledAtOf(subscription) ||
        subscription.terminal === true ||
        subscription.canceled === true ||
        subscription.cancelled === true ||
        subscription.deleted === true
    ) {
        return "CANCELED";
    }

    const normalized = normalizedStatuses[0] || "";
    if (ACTIVE_STATUSES.has(normalized)) return "ACTIVE";
    if (PAUSED_STATUSES.has(normalized)) return normalized === "SKIPPED" ? "SKIPPED" : "PAUSED";
    if (PAYMENT_FAILED_STATUSES.has(normalized)) return "PAYMENT_FAILED";
    return normalized || "ACTIVE";
}

export function withoutCanceledSchedule(subscription: SubscriptionResponse) {
    if (subscriptionStatus(subscription) !== "CANCELED") return subscription;

    return {
        ...subscription,
        status: "CANCELED",
        nextDeliveryDate: null,
        deliveryDate: null,
        nextPaymentDate: null,
        nextBillingDate: null,
        nextBillingAt: null,
        billingDate: null,
        billingDeadlineAt: null,
        cutoffAt: null,
        menuEditableUntil: null,
        pausedUntil: null,
        pauseUntil: null,
        resumeDate: null,
    };
}

export function isActiveSubscription(subscription: SubscriptionResponse | null | undefined) {
    return subscriptionStatus(subscription) === "ACTIVE";
}

export function isCurrentSubscription(subscription: SubscriptionResponse | null | undefined) {
    const status = subscriptionStatus(subscription);
    return status !== "NONE" && status !== "CANCELED";
}

export function hasSubscriptionFreeShippingBenefit(subscription: SubscriptionResponse | null | undefined) {
    return isCurrentSubscription(subscription);
}

export function subscriptionStatusLabel(status?: string) {
    const normalized = normalizeStatus(status || "ACTIVE");
    if (normalized === "NONE") return "없음";
    if (ACTIVE_STATUSES.has(normalized)) return "이용 중";
    if (normalized === "PAYMENT_FAILED" || normalized === "결제실패") return "결제 실패";
    if (normalized === "PAYMENT_RETRYING" || normalized === "결제재시도중") return "결제 재시도중";
    if (PAUSED_STATUSES.has(normalized)) return normalized === "SKIPPED" || normalized === "이번주쉬어감" ? "이번 주 쉬어감" : "일시 중지";
    if (CANCELED_STATUSES.has(normalized)) return "해지";
    if (normalized === "ENDED") return "종료";
    if (normalized === "PENDING") return "신청 대기";
    if (normalized === "DRAFT") return "구독 준비 중";
    return status || "이용 중";
}

export function subscriptionStatusClass(status?: string) {
    const normalized = normalizeStatus(status || "ACTIVE");
    if (ACTIVE_STATUSES.has(normalized)) return "bg-primary-50 text-primary-700";
    if (PAYMENT_FAILED_STATUSES.has(normalized) || normalized === "PAYMENT_FAILED") return "bg-red-50 text-red-700";
    if (PAUSED_STATUSES.has(normalized) || normalized === "PENDING" || normalized === "DRAFT") return "bg-yellow-50 text-yellow-700";
    if (CANCELED_STATUSES.has(normalized)) return "bg-red-50 text-red-700";
    return "bg-background-100 text-foreground-700";
}

export function startedAtOf(subscription: SubscriptionResponse | null | undefined) {
    return (
        subscription?.startedAt ||
        subscription?.startedDate ||
        subscription?.startedOn ||
        subscription?.startDate ||
        subscription?.startAt ||
        subscription?.subscriptionStartDate ||
        subscription?.subscribedAt ||
        subscription?.createdAt ||
        subscription?.createdDate ||
        subscription?.created_at ||
        undefined
    );
}

export function canceledAtOf(subscription: SubscriptionResponse | null | undefined) {
    return (
        subscription?.canceledAt ||
        subscription?.cancelledAt ||
        subscription?.canceledDate ||
        subscription?.cancelledDate ||
        subscription?.cancelDate ||
        subscription?.canceledOn ||
        subscription?.cancelledOn ||
        subscription?.endedAt ||
        subscription?.deletedAt ||
        undefined
    );
}

export function maintainedWeeksOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.maintainedWeeks ?? subscription?.continuousWeeks ?? subscription?.successfulPaymentStreak ?? subscription?.consecutiveSuccessPayments ?? 0);
}

export function subscriptionAmountOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.weeklyAmount ?? subscription?.subscriptionFee ?? subscription?.totalAmount ?? 0);
}

export function nextPaymentDateOf(subscription: SubscriptionResponse | null | undefined) {
    if (subscriptionStatus(subscription) === "CANCELED") return undefined;
    // 백엔드의 nextBillingDate가 정기 결제 기준값이다. 이전 응답에 남은
    // nextPaymentDate가 있더라도 이를 먼저 사용하면 첫 결제 후에도 오늘로 보인다.
    return atCutoff(subscription?.nextBillingDate) || subscription?.nextPaymentDate || subscription?.nextBillingAt || atCutoff(subscription?.billingDate) || undefined;
}

export function nextDeliveryDateOf(subscription: SubscriptionResponse | null | undefined) {
    if (subscriptionStatus(subscription) === "CANCELED") return undefined;
    return subscription?.nextDeliveryDate || subscription?.deliveryDate || undefined;
}

export function cutoffDateOf(subscription: SubscriptionResponse | null | undefined) {
    if (subscriptionStatus(subscription) === "CANCELED") return undefined;
    return subscription?.billingDeadlineAt || subscription?.cutoffAt || subscription?.menuEditableUntil || undefined;
}

export function pausedUntilOf(subscription: SubscriptionResponse | null | undefined) {
    if (subscriptionStatus(subscription) === "CANCELED") return undefined;
    return subscription?.pausedUntil || subscription?.pauseUntil || subscription?.resumeDate || undefined;
}

export function paymentRetryCountOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.paymentRetryCount ?? subscription?.retryCount ?? 0);
}

export function failedWeeksOf(subscription: SubscriptionResponse | null | undefined) {
    return Number(subscription?.failedWeeks ?? subscription?.consecutivePaymentFailures ?? 0);
}

export function normalizeSubscriptionList(data: unknown): SubscriptionResponse[] {
    if (Array.isArray(data)) return (data as SubscriptionResponse[]).map(withoutCanceledSchedule);
    if (!isRecord(data)) return [];

    if (Array.isArray(data.content)) return (data.content as SubscriptionResponse[]).map(withoutCanceledSchedule);
    if (Array.isArray(data.items)) return (data.items as SubscriptionResponse[]).map(withoutCanceledSchedule);
    if (Array.isArray(data.subscriptions)) return (data.subscriptions as SubscriptionResponse[]).map(withoutCanceledSchedule);
    if (Array.isArray(data.data)) return (data.data as SubscriptionResponse[]).map(withoutCanceledSchedule);
    if (isRecord(data.subscription)) return [withoutCanceledSchedule(data.subscription as SubscriptionResponse)];
    if ("subscriptionId" in data || "id" in data || "status" in data) return [withoutCanceledSchedule(data as SubscriptionResponse)];
    return [];
}

export async function readSubscriptionList(response: Response) {
    if (response.status === 404 || response.status === 204) return [];
    const data = await response.json().catch(() => null);
    return normalizeSubscriptionList(data);
}

export function pickCurrentSubscription(subscriptions: SubscriptionResponse[]) {
    const current = subscriptions.filter(isCurrentSubscription);
    if (current.length === 0) return null;

    const priority = (subscription: SubscriptionResponse) => {
        const status = subscriptionStatus(subscription);
        if (status === "ACTIVE") return 5;
        if (status === "PAYMENT_FAILED") return 4;
        if (status === "PAUSED" || status === "SKIPPED") return 3;
        if (status === "PENDING") return 2;
        return 1;
    };

    return [...current].sort((a, b) => {
        const priorityGap = priority(b) - priority(a);
        if (priorityGap !== 0) return priorityGap;

        return (
            dateTimeOf(nextPaymentDateOf(b)) -
                dateTimeOf(nextPaymentDateOf(a)) ||
            dateTimeOf(startedAtOf(b)) -
                dateTimeOf(startedAtOf(a)) ||
            subscriptionIdOf(b) -
                subscriptionIdOf(a)
        );
    })[0];
}
