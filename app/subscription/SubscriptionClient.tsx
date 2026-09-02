"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import { formatDate } from "../../lib/date";
import { MAX_MEALS, MIN_MEALS, clampMeals, planOf, storageDetail } from "../../lib/plan";
import { won } from "../../lib/products";
import {
    canceledAtOf,
    clearLegacySubscriptionStore,
    isActiveSubscription,
    maintainedWeeksOf,
    mealsPerWeekOf,
    startedAtOf,
    subscriptionAmountOf,
    subscriptionIdOf,
    subscriptionStatus,
    subscriptionStatusClass,
    subscriptionStatusLabel,
} from "../../lib/subscriptions";
import type { Member, SubscriptionResponse } from "../../types/api";

function nextSundayDeadline() {
    const now = new Date();
    const deadline = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    deadline.setDate(now.getDate() + daysUntilSunday);
    deadline.setHours(23, 0, 0, 0);
    if (deadline.getTime() <= now.getTime()) deadline.setDate(deadline.getDate() + 7);
    return deadline;
}

function formatDateLabel(value?: string | null) {
    return formatDate(value || undefined, true) || "-";
}

function couponLabel(subscription: SubscriptionResponse) {
    if (subscription.freeShippingCouponIssued === true) return "발급 완료";
    if (maintainedWeeksOf(subscription) >= 4) return "발급 대상";
    return "4주 유지 시 발급";
}

function memberLabel(subscription: SubscriptionResponse, user: Member | null) {
    const subscriptionMember = subscription.memberEmail?.trim() || subscription.email?.trim();
    if (subscriptionMember) return subscriptionMember;

    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    if (user?.memberId) return `회원 #${user.memberId}`;
    return "로그인 회원";
}

async function readSubscriptionHistory(response: Response) {
    if (!response.ok) return [];

    try {
        const data = (await response.json()) as SubscriptionResponse[] | { content?: SubscriptionResponse[]; items?: SubscriptionResponse[] };
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.content)) return data.content;
        if (Array.isArray(data.items)) return data.items;
        return [];
    } catch {
        return [];
    }
}

export default function SubscriptionClient() {
    const router = useRouter();
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const { toast, confirm } = useToast();
    const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
    const [history, setHistory] = useState<SubscriptionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [nextPlanMeals, setNextPlanMeals] = useState(5);
    const [action, setAction] = useState<"meals" | "cancel" | null>(null);
    const [countdown, setCountdown] = useState("-");
    const [recentlyCanceledId, setRecentlyCanceledId] = useState<number | null>(null);

    useEffect(() => {
        clearLegacySubscriptionStore();
    }, []);

    const loadSubscription = useCallback(async () => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        try {
            const [subscriptionRes, historyRes] = await Promise.all([
                fetch("/api/subscriptions/me", { credentials: "include" }),
                fetch("/api/subscriptions/me/history", { credentials: "include" }),
            ]);

            if (subscriptionRes.status === 401 || subscriptionRes.status === 403 || historyRes.status === 401 || historyRes.status === 403) {
                toast("로그인이 필요한 페이지입니다.", "error");
                router.push("/login");
                return;
            }

            const historyData = await readSubscriptionHistory(historyRes);

            if (subscriptionRes.status === 404) {
                setSubscription(null);
                setHistory(historyData);
                return;
            }

            if (!subscriptionRes.ok) {
                setSubscription(null);
                setHistory(historyData);
                return;
            }

            const data = (await subscriptionRes.json()) as SubscriptionResponse;
            if (subscriptionStatus(data) === "CANCELED") {
                router.replace("/subscribe");
                return;
            }

            setSubscription(data);
            setNextPlanMeals(mealsPerWeekOf(data));
            setHistory(historyData);
        } catch {
            setError("구독 정보를 불러오지 못했습니다.");
            toast("구독 정보를 불러오지 못했습니다.", "error");
        } finally {
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, router, toast]);

    useEffect(() => {
        void loadSubscription();
    }, [loadSubscription]);

    useEffect(() => {
        const deadline = nextSundayDeadline();
        const tick = () => {
            const remain = deadline.getTime() - Date.now();
            if (remain <= 0) {
                setCountdown("마감");
                return;
            }
            const totalMinutes = Math.floor(remain / 60_000);
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor(totalMinutes / 60) % 24;
            const minutes = totalMinutes % 60;
            setCountdown(days > 0 ? `${days}일 ${hours}시간` : `${hours}시간 ${minutes}분`);
        };
        tick();
        const id = window.setInterval(tick, 20_000);
        return () => window.clearInterval(id);
    }, []);

    const meals = mealsPerWeekOf(subscription);
    const currentPlan = planOf(meals);
    const previewPlan = planOf(nextPlanMeals);
    const subscriptionId = subscriptionIdOf(subscription);
    const active = isActiveSubscription(subscription) && subscriptionId !== recentlyCanceledId;
    const status = recentlyCanceledId === subscriptionId ? "CANCELED" : subscriptionStatus(subscription);
    const changed = subscription ? nextPlanMeals !== meals : false;

    const sortedHistory = useMemo(
        () =>
            [...history].sort((a, b) => {
                const aTime = new Date(startedAtOf(a) || "").getTime();
                const bTime = new Date(startedAtOf(b) || "").getTime();
                if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
                return bTime - aTime;
            }),
        [history],
    );
    const hasSubscriptionHistory = sortedHistory.length > 0;

    const changeMeals = async () => {
        if (!subscription || subscriptionId <= 0 || !changed) return;

        setAction("meals");
        try {
            const params = new URLSearchParams({ mealsPerWeek: String(nextPlanMeals) });
            const response = await fetch(`/api/subscriptions/${subscriptionId}/meals?${params.toString()}`, {
                method: "PATCH",
                credentials: "include",
            });

            if (response.status === 401 || response.status === 403) {
                toast("로그인이 필요한 페이지입니다.", "error");
                router.push("/login");
                return;
            }
            if (!response.ok) {
                const message = await response.text().catch(() => "");
                toast(message || "끼니 수 변경에 실패했습니다.", "error");
                return;
            }

            toast(`주 ${nextPlanMeals}끼로 변경했습니다.`);
            await loadSubscription();
        } catch {
            toast("서버와 통신 중 문제가 발생했습니다.", "error");
        } finally {
            setAction(null);
        }
    };

    const cancelSubscription = async () => {
        if (!subscription || subscriptionId <= 0) return;

        const ok = await confirm("구독을 해지하시겠어요?", {
            kind: "delete",
            description: "해지하면 다음 결제부터 구독 배송이 중단됩니다.",
        });
        if (!ok) return;

        setAction("cancel");
        try {
            const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.status === 401 || response.status === 403) {
                toast("로그인이 필요한 페이지입니다.", "error");
                router.push("/login");
                return;
            }
            if (!response.ok && response.status !== 204) {
                const message = await response.text().catch(() => "");
                toast(message || "구독 해지에 실패했습니다.", "error");
                return;
            }

            const canceledAt = canceledAtOf(subscription) || new Date().toISOString();
            setRecentlyCanceledId(subscriptionId);
            setSubscription((current) => (current ? { ...current, status: "CANCELED", canceledAt } : current));
            setHistory((current) => {
                const nextItem = { ...subscription, status: "CANCELED", canceledAt };
                const exists = current.some((item) => subscriptionIdOf(item) === subscriptionId);
                return exists ? current.map((item) => (subscriptionIdOf(item) === subscriptionId ? { ...item, status: "CANCELED", canceledAt } : item)) : [nextItem, ...current];
            });
            toast("구독이 해지되었습니다.");
            router.replace("/subscribe");
        } catch {
            toast("서버와 통신 중 문제가 발생했습니다.", "error");
        } finally {
            setAction(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="bg-background-cream">
                <main className="min-h-screen pb-20 pt-24 md:pt-28">
                    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 lg:px-12">
                        <div className="h-40 animate-pulse rounded-xl border border-background-200 bg-white" />
                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                            {Array.from({ length: 4 }, (_, index) => (
                                <div key={index} className="h-24 animate-pulse rounded-xl border border-background-200 bg-white" />
                            ))}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <PageShell>
                <StatePanel
                    icon="ri-login-box-line"
                    title="로그인이 필요합니다"
                    description="내 구독 정보는 로그인한 계정 기준으로 조회됩니다."
                    action={<Link href="/login" className="rounded-lg bg-ink-500 px-5 py-3 text-sm font-semibold text-white">로그인하기</Link>}
                />
            </PageShell>
        );
    }

    if (error) {
        return (
            <PageShell>
                <StatePanel
                    icon="ri-error-warning-line"
                    title="구독 정보를 불러오지 못했습니다"
                    description={error}
                    action={
                        <button type="button" onClick={() => void loadSubscription()} className="rounded-lg bg-ink-500 px-5 py-3 text-sm font-semibold text-white">
                            다시 불러오기
                        </button>
                    }
                />
            </PageShell>
        );
    }

    if (!subscription) {
        return (
            <PageShell>
                <StatePanel
                    icon="ri-calendar-check-line"
                    title="현재 이용 중인 구독이 없습니다"
                    description={hasSubscriptionHistory ? "이전 구독 이력은 아래에서 확인하고, 새 구독을 다시 시작할 수 있습니다." : "주당 끼니 수를 고르고 정기 구독을 시작해보세요."}
                    action={
                        <Link href="/subscribe" className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-semibold text-white">
                            구독 갱신하기 <i className="ri-arrow-right-line" />
                        </Link>
                    }
                />
                <HistorySection history={sortedHistory} />
            </PageShell>
        );
    }

    return (
        <PageShell>
            <section className="mb-7 flex flex-col gap-4 rounded-xl border border-background-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between md:p-6">
                <div>
                    <div className="mb-3 flex items-center gap-3">
                        <div className="h-px w-8 bg-accent-500" />
                        <span className="text-xs font-bold text-accent-500">My Subscription</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground-950 md:text-3xl">내 구독</h1>
                    <p className="mt-1.5 text-sm text-foreground-500">계정에 연결된 구독 정보를 확인하고 주당 끼니 수를 변경할 수 있습니다.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${subscriptionStatusClass(status)}`}>
                        <i className={active ? "ri-checkbox-circle-line" : "ri-close-circle-line"} />
                        {subscriptionStatusLabel(status)}
                    </span>
                    {!active && (
                        <Link href="/subscribe" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600">
                            구독 갱신하기 <i className="ri-arrow-right-line" />
                        </Link>
                    )}
                </div>
            </section>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <SummaryCard label="플랜" value={`주 ${currentPlan.meals}끼`} />
                <SummaryCard label="보관" value={currentPlan.storage.label} icon={currentPlan.storage.icon} />
                <SummaryCard label="시작일" value={formatDateLabel(startedAtOf(subscription))} />
                <SummaryCard label="상태" value={subscriptionStatusLabel(status)} active={active} />
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3.5">
                <i className="ri-time-line text-lg text-primary-600" />
                <p className="text-sm text-primary-800">
                    <span className="font-semibold">이번 주 변경 마감까지 </span>
                    <span className="font-bold tabular-nums">{countdown}</span>
                </p>
                <p className="w-full text-xs text-primary-700/70 md:ml-auto md:w-auto">일요일 23:00 마감</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-xl border border-background-200 bg-white p-5 shadow-sm md:p-6">
                    <h2 className="text-lg font-bold text-foreground-950">구독 상세</h2>
                    <p className="mt-1 text-sm text-foreground-500">{storageDetail(currentPlan.meals)}</p>

                    <dl className="mt-6 grid gap-4 border-t border-background-200 pt-5 sm:grid-cols-2">
                        <DetailLine label="구독번호" value={subscriptionId > 0 ? `#${subscriptionId}` : "-"} />
                        <DetailLine label="주당 끼니 수" value={`${currentPlan.meals}끼`} strong />
                        <DetailLine label="회원" value={memberLabel(subscription, user)} />
                        <DetailLine label="다음 배송일" value={formatDateLabel(subscription.nextDeliveryDate)} />
                        <DetailLine label="다음 결제일" value={formatDateLabel(subscription.nextPaymentDate)} />
                        <DetailLine label="배송 요일" value={subscription.deliveryDay || "-"} />
                        <DetailLine label="유지 주차" value={`${maintainedWeeksOf(subscription).toLocaleString("ko-KR")}주`} />
                        <DetailLine label="무료배송 쿠폰" value={couponLabel(subscription)} strong />
                        <DetailLine label="예상 금액" value={subscriptionAmountOf(subscription) > 0 ? won(subscriptionAmountOf(subscription)) : "-"} />
                        <DetailLine label="해지일" value={formatDateLabel(canceledAtOf(subscription))} />
                    </dl>
                </section>

                <aside className="rounded-xl border border-background-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-foreground-950">구독 설정</h2>
                    <p className="mt-1 text-sm text-foreground-500">주당 끼니 수는 백엔드 API로 바로 변경됩니다.</p>

                    <div className="mt-5 rounded-xl bg-background-100/70 p-4">
                        <div className="mb-2 flex items-baseline justify-between">
                            <span className="text-sm text-foreground-600">다음 설정</span>
                            <span>
                                <span className="text-2xl font-bold tracking-tight text-primary-600">{previewPlan.meals}</span>
                                <span className="text-sm font-semibold text-foreground-600">끼</span>
                            </span>
                        </div>
                        <input
                            type="range"
                            min={MIN_MEALS}
                            max={MAX_MEALS}
                            step={1}
                            value={nextPlanMeals}
                            disabled={!active}
                            onChange={(event) => setNextPlanMeals(clampMeals(event.target.value))}
                            className="meal-range"
                            aria-label="주당 끼니 수"
                        />
                        <div className="mt-1 grid grid-cols-4">
                            {[4, 5, 6, 7].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    disabled={!active}
                                    onClick={() => setNextPlanMeals(value)}
                                    className={`text-center text-xs ${value === previewPlan.meals ? "font-bold text-primary-600" : "text-foreground-400"} disabled:opacity-40`}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => void changeMeals()}
                        disabled={!active || !changed || action !== null}
                        className="mt-4 w-full rounded-lg bg-ink-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-600 disabled:opacity-40"
                    >
                        {action === "meals" ? "변경 중..." : "끼니 수 변경"}
                    </button>

                    <hr className="my-6 border-background-200" />

                    {active ? (
                        <button
                            type="button"
                            onClick={() => void cancelSubscription()}
                            disabled={action !== null}
                            className="w-full rounded-lg border border-background-200 bg-white px-6 py-3 text-sm font-semibold text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-40"
                        >
                            {action === "cancel" ? "해지 중..." : "구독 해지"}
                        </button>
                    ) : (
                        <Link
                            href="/subscribe"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                        >
                            구독 갱신하기 <i className="ri-arrow-right-line" />
                        </Link>
                    )}
                </aside>
            </div>

            <HistorySection history={sortedHistory} currentId={subscriptionId} />
        </PageShell>
    );
}

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-background-cream">
            <main className="min-h-screen pb-20 pt-20 md:pt-24">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8 lg:px-12">{children}</div>
            </main>
            <Footer />
        </div>
    );
}

function SummaryCard({ label, value, icon, active = false }: { label: string; value: string; icon?: string; active?: boolean }) {
    return (
        <div className="rounded-xl border border-background-200 bg-white p-4 shadow-sm">
            <p className="mb-1.5 text-[10px] text-foreground-400">{label}</p>
            <p className={`flex items-center gap-1.5 text-lg font-bold leading-tight ${active ? "text-primary-600" : "text-foreground-950"}`}>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />}
                {icon && <i className={`${icon} text-lg text-primary-600`} />}
                {value}
            </p>
        </div>
    );
}

function DetailLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div>
            <dt className="text-xs font-semibold text-foreground-400">{label}</dt>
            <dd className={`mt-1 break-keep text-sm ${strong ? "font-bold text-foreground-950" : "font-medium text-foreground-700"}`}>{value}</dd>
        </div>
    );
}

function StatePanel({ icon, title, description, action }: { icon: string; title: string; description: string; action: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-background-200 bg-white px-6 py-16 text-center shadow-sm">
            <i className={`${icon} text-4xl text-primary-500`} />
            <h1 className="mt-4 text-2xl font-bold text-foreground-950">{title}</h1>
            <p className="mt-2 text-sm text-foreground-500">{description}</p>
            <div className="mt-6 flex justify-center">{action}</div>
        </section>
    );
}

function HistorySection({ history, currentId }: { history: SubscriptionResponse[]; currentId?: number }) {
    return (
        <section className="mt-8 overflow-hidden rounded-xl border border-background-200 bg-white shadow-sm">
            <div className="border-b border-background-200 px-5 py-4">
                <h2 className="text-lg font-bold text-foreground-950">구독 이력</h2>
                <p className="mt-1 text-sm text-foreground-500">해지된 구독까지 조회합니다.</p>
            </div>
            {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-foreground-400">표시할 구독 이력이 없습니다.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-background-100 text-xs font-semibold text-foreground-500">
                            <tr>
                                <th className="px-5 py-3">구독번호</th>
                                <th className="px-5 py-3">주당 끼니</th>
                                <th className="px-5 py-3">상태</th>
                                <th className="px-5 py-3">시작일</th>
                                <th className="px-5 py-3">해지일</th>
                                <th className="px-5 py-3">유지 주차</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-background-200 text-foreground-700">
                            {history.map((item, index) => {
                                const id = subscriptionIdOf(item);
                                const current = currentId && id === currentId;
                                const status = subscriptionStatus(item);
                                return (
                                    <tr key={id || index} className={current ? "bg-primary-50/60" : undefined}>
                                        <td className="px-5 py-3 font-bold text-foreground-950">{id > 0 ? `#${id}` : "-"}</td>
                                        <td className="px-5 py-3">{mealsPerWeekOf(item)}끼</td>
                                        <td className="px-5 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${subscriptionStatusClass(status)}`}>
                                                {subscriptionStatusLabel(status)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">{formatDateLabel(startedAtOf(item))}</td>
                                        <td className="px-5 py-3">{formatDateLabel(canceledAtOf(item))}</td>
                                        <td className="px-5 py-3">{maintainedWeeksOf(item).toLocaleString("ko-KR")}주</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
