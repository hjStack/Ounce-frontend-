"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";
import { won } from "../../lib/products";
import type { Order } from "../../types/api";

const FILTERS = [
    { key: "all", label: "전체" },
    { key: "PAYMENT_WAITING", label: "결제 대기" },
    { key: "PAYMENT_COMPLETED", label: "결제 완료" },
    { key: "PREPARING", label: "준비중" },
    { key: "SHIPPED", label: "배송중" },
    { key: "DELIVERED", label: "배송완료" },
    { key: "CANCELED", label: "취소" },
];

const STATUS_LABELS: Record<string, string> = {
    PAYMENT_WAITING: "결제 대기",
    PAYMENT_COMPLETED: "결제 완료",
    PREPARING: "상품 준비중",
    SHIPPED: "배송 중",
    DELIVERED: "배송 완료",
    CANCELED: "주문 취소",
};

const BADGE_CLASS: Record<string, string> = {
    PAYMENT_WAITING: "bg-foreground-100 text-foreground-600",
    PAYMENT_COMPLETED: "bg-accent-100 text-accent-700",
    PREPARING: "bg-secondary-100 text-secondary-800",
    SHIPPED: "bg-primary-100 text-primary-700",
    DELIVERED: "bg-accent-100 text-accent-700",
    CANCELED: "bg-red-100 text-red-700",
};

export default function OrdersClient() {
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        apiFetch("/api/orders", { credentials: "include" })
            .then((res) => {
                if (res.status === 401) {
                    toast("로그인이 필요한 페이지입니다.", "error");
                    router.push("/login");
                    return null;
                }
                if (!res.ok) throw new Error("주문 조회 실패");
                return res.json();
            })
            .then((data: Order[] | null) => {
                if (data) setOrders(data);
            })
            .catch(() => {
                toast("주문 내역을 불러오지 못했습니다.", "error");
            })
            .finally(() => setLoading(false));
    }, [router, toast]);

    const visible = useMemo(() => (filter === "all" ? orders : orders.filter((order) => order.status === filter)), [filter, orders]);

    return (
        <div className="bg-background-cream">
            <main className="min-h-screen pb-20 pt-28">
                <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground-950">주문 내역</h1>
                        <p className="mt-1.5 text-sm text-foreground-500">Ounce에서 주문한 내역을 확인하세요.</p>
                    </div>

                    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                        {FILTERS.map((item) => {
                            const count = item.key === "all" ? orders.length : orders.filter((order) => order.status === item.key).length;
                            const active = item.key === filter;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        setFilter(item.key);
                                        setExpandedId(null);
                                    }}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                        active ? "bg-primary-500 text-white" : "bg-background-100 text-foreground-600 hover:bg-background-200"
                                    }`}
                                >
                                    {item.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-4">
                        {loading &&
                            Array.from({ length: 3 }, (_, index) => (
                                <div key={index} className="h-24 animate-pulse rounded-xl border border-background-200 bg-white" />
                            ))}

                        {!loading &&
                            visible.map((order) => {
                                const open = expandedId === order.orderId;
                                return (
                                    <article key={order.orderId} className="overflow-hidden rounded-xl border border-background-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(open ? null : order.orderId)}
                                            className="flex w-full items-center justify-between gap-4 p-4 text-left"
                                            aria-expanded={open}
                                        >
                                            <div className="min-w-0">
                                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold text-foreground-950">ORD-{String(order.orderId).padStart(6, "0")}</span>
                                                    <span
                                                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                            BADGE_CLASS[order.status] || "bg-foreground-100 text-foreground-600"
                                                        }`}
                                                    >
                                                        {STATUS_LABELS[order.status] || order.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground-600">주문 상세 상품 정보는 서버 응답 확장 후 표시됩니다.</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-4">
                                                <div className="hidden text-right sm:block">
                                                    <div className="text-sm font-bold text-foreground-950">{won(order.totalAmount)}</div>
                                                    <div className="text-xs text-foreground-500">포인트</div>
                                                </div>
                                                <i className={`ri-arrow-down-s-line text-xl text-foreground-400 transition-transform ${open ? "rotate-180" : ""}`} />
                                            </div>
                                        </button>

                                        {open && (
                                            <div className="border-t border-background-200 px-4 py-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-foreground-500">상품 금액</span>
                                                    <span className="text-foreground-800">{won(order.totalAmount)}</span>
                                                </div>
                                                <div className="mt-1 flex justify-between text-sm">
                                                    <span className="text-foreground-500">배송비</span>
                                                    <span className="text-primary-600">무료</span>
                                                </div>
                                                <div className="mt-3 flex justify-between border-t border-background-200 pt-3 text-sm font-bold">
                                                    <span>총 결제 금액</span>
                                                    <span className="text-accent-500">{won(order.totalAmount)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                    </div>

                    {!loading && visible.length === 0 && (
                        <div className="py-20 text-center">
                            <i className="ri-file-list-3-line mb-3 block text-4xl text-foreground-300" />
                            <p className="text-sm text-foreground-500">해당 상태의 주문이 없습니다.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
