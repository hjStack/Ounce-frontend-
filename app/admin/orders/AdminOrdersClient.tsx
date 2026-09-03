"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import AdminShell from "../AdminShell";
import { useToast } from "../../../components/ToastContext";
import { formatDate } from "../../../lib/date";
import { won } from "../../../lib/products";
import type { Order, OrderItem, PageResponse } from "../../../types/api";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
    { key: "ALL", label: "전체" },
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

const STATUS_BADGES: Record<string, string> = {
    PAYMENT_WAITING: "bg-gray-100 text-gray-600",
    PAYMENT_COMPLETED: "bg-green-50 text-green-700",
    PREPARING: "bg-yellow-50 text-yellow-700",
    SHIPPED: "bg-blue-50 text-blue-700",
    DELIVERED: "bg-primary-50 text-primary-700",
    CANCELED: "bg-red-50 text-red-700",
};

type OrderListResponse = PageResponse<Order> & {
    orders?: Order[];
    data?: Order[];
    results?: Order[];
    totalCount?: number;
    total?: number;
};

function readOrders(data: OrderListResponse | Order[]) {
    if (Array.isArray(data)) return data;
    return data.content ?? data.orders ?? data.items ?? data.data ?? data.results ?? [];
}

function readTotal(data: OrderListResponse | Order[], count: number) {
    if (Array.isArray(data)) return count;
    return data.totalElements ?? data.totalCount ?? data.total ?? count;
}

function readPage(data: OrderListResponse | Order[], fallback: number) {
    if (Array.isArray(data)) return fallback;
    return data.number ?? data.page ?? fallback;
}

function readTotalPages(data: OrderListResponse | Order[]) {
    if (Array.isArray(data)) return 1;
    return data.totalPages ?? 1;
}

function orderCode(order: Order) {
    return order.orderNumber || `ORD-${String(order.orderId).padStart(6, "0")}`;
}

function orderDate(order: Order) {
    return formatDate(order.createdAt || order.createdDate || order.created_at || order.orderDate || order.orderedAt || order.ordered_at || order.paidAt || order.paid_at || undefined, true) || "-";
}

function orderAmount(order: Order) {
    return Number(order.paymentAmount ?? order.finalAmount ?? order.totalAmount ?? order.orderAmount ?? order.amount ?? 0);
}

function customerName(order: Order) {
    return order.memberName || order.receiverName || (order.memberId ? `회원 ${order.memberId}` : "-");
}

function customerEmail(order: Order) {
    return order.memberEmail || order.email || "";
}

function orderItems(order: Order) {
    return order.orderItems ?? order.items ?? order.products ?? [];
}

function itemName(item: OrderItem) {
    return item.productName || item.name || (item.productId ? `상품 ${item.productId}` : "상품 정보 없음");
}

function itemAmount(item: OrderItem) {
    return item.totalPrice ?? Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1);
}

function summaryProduct(order: Order) {
    const items = orderItems(order);
    if (items.length === 0) return "상품 상세 정보 없음";
    const first = itemName(items[0]);
    return items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
}

export default function AdminOrdersClient() {
    const { toast, confirm } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [status, setStatus] = useState("ALL");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const endpoint = useCallback((nextStatus: string, nextPage: number) => {
        const params = new URLSearchParams({ page: String(nextPage), size: String(PAGE_SIZE) });
        if (nextStatus !== "ALL") params.set("status", nextStatus);
        return `/api/admin/orders?${params.toString()}`;
    }, []);

    const loadOrders = useCallback(
        async (nextStatus: string, nextPage: number) => {
            setLoading(true);
            try {
                const response = await apiFetch(endpoint(nextStatus, nextPage), { credentials: "include" });
                if (response.status === 401 || response.status === 403) {
                    setForbidden(true);
                    return;
                }
                if (response.status === 404 || response.status === 405 || response.status === 501) {
                    toast("백엔드 관리자 주문 API가 아직 연결되지 않았습니다.", "error");
                    setOrders([]);
                    setTotalElements(0);
                    setTotalPages(1);
                    return;
                }
                if (!response.ok) throw new Error("ADMIN_ORDERS_FAILED");

                const data = (await response.json()) as OrderListResponse | Order[];
                const nextOrders = readOrders(data);
                setOrders(nextOrders);
                setPage(readPage(data, nextPage));
                setTotalPages(readTotalPages(data));
                setTotalElements(readTotal(data, nextOrders.length));
            } catch {
                toast("주문 목록을 불러오지 못했습니다.", "error");
            } finally {
                setLoading(false);
            }
        },
        [endpoint, toast],
    );

    useEffect(() => {
        setExpandedId(null);
        void loadOrders(status, 0);
    }, [loadOrders, status]);

    const visibleOrders = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter((order) =>
            [
                orderCode(order),
                customerName(order),
                customerEmail(order),
                summaryProduct(order),
                order.status,
                order.receiverPhone,
                order.shippingAddress,
                order.address,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [keyword, orders]);

    const stats = useMemo(() => {
        const paidTotal = orders
            .filter((order) => !["PAYMENT_WAITING", "CANCELED"].includes(order.status))
            .reduce((sum, order) => sum + orderAmount(order), 0);
        const preparing = orders.filter((order) => order.status === "PREPARING").length;
        const shipping = orders.filter((order) => order.status === "SHIPPED").length;
        const waiting = orders.filter((order) => order.status === "PAYMENT_WAITING").length;

        return [
            { label: "조회 주문", value: `${totalElements.toLocaleString("ko-KR")}건`, icon: "ri-file-list-3-line" },
            { label: "결제 대기", value: `${waiting.toLocaleString("ko-KR")}건`, icon: "ri-time-line" },
            { label: "출고 대상", value: `${(preparing + shipping).toLocaleString("ko-KR")}건`, icon: "ri-truck-line" },
            { label: "결제 금액", value: won(paidTotal), icon: "ri-wallet-3-line" },
        ];
    }, [orders, totalElements]);

    const updateStatus = async (order: Order, nextStatus: string) => {
        if (nextStatus === order.status) return;

        const ok = await confirm("주문 상태를 변경하시겠습니까?", {
            description: `${orderCode(order)} 상태를 ${STATUS_LABELS[nextStatus] || nextStatus}(으)로 변경합니다.`,
        });
        if (!ok) return;

        setUpdatingId(order.orderId);
        try {
            const response = await requestOrderStatusUpdate(order.orderId, nextStatus);
            if (response.ok) {
                toast("주문 상태가 변경되었습니다.");
                setOrders((current) => current.map((item) => (item.orderId === order.orderId ? { ...item, status: nextStatus } : item)));
                return;
            }

            const message = await readResponseMessage(response);
            toast(orderUpdateErrorMessage(response.status, message), "error");
        } catch {
            toast("서버와의 통신에 실패했습니다.", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <AdminShell active="/admin/orders" title="주문 관리">
            {forbidden ? (
                <ForbiddenState />
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {stats.map((item) => (
                            <StatCard key={item.label} {...item} />
                        ))}
                    </div>

                    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 p-4 md:p-5">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {STATUS_OPTIONS.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setStatus(item.key)}
                                            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                                                status === item.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <label className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                                        <i className="ri-search-line shrink-0 text-gray-400" />
                                        <input
                                            type="search"
                                            value={keyword}
                                            onChange={(event) => setKeyword(event.target.value)}
                                            placeholder="주문번호, 회원, 상품 검색"
                                            className="min-w-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => void loadOrders(status, page)}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                                    >
                                        <i className="ri-refresh-line text-base" />
                                        새로고침
                                    </button>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center text-sm text-gray-400">주문 목록을 불러오는 중...</div>
                        ) : visibleOrders.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1100px] text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">주문</th>
                                            <th className="px-5 py-3">주문자</th>
                                            <th className="px-5 py-3">상품</th>
                                            <th className="px-5 py-3">결제금액</th>
                                            <th className="px-5 py-3">주문일</th>
                                            <th className="px-5 py-3">상태</th>
                                            <th className="px-5 py-3 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {visibleOrders.map((order) => {
                                            const open = expandedId === order.orderId;
                                            return (
                                                <Fragment key={order.orderId}>
                                                    <tr className="hover:bg-gray-50/70">
                                                        <td className="px-5 py-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedId(open ? null : order.orderId)}
                                                                className="flex items-center gap-2 text-left font-bold text-gray-900"
                                                                aria-expanded={open}
                                                            >
                                                                <i className={`ri-arrow-down-s-line text-lg text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                                                                {orderCode(order)}
                                                            </button>
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <p className="font-semibold text-gray-900">{customerName(order)}</p>
                                                            <p className="mt-0.5 text-xs text-gray-400">{customerEmail(order) || "-"}</p>
                                                        </td>
                                                        <td className="max-w-[260px] px-5 py-3">
                                                            <p className="truncate font-medium text-gray-800">{summaryProduct(order)}</p>
                                                            <p className="mt-0.5 text-xs text-gray-400">{orderItems(order).length.toLocaleString("ko-KR")}개 품목</p>
                                                        </td>
                                                        <td className="px-5 py-3 font-bold text-gray-900">{won(orderAmount(order))}</td>
                                                        <td className="px-5 py-3 text-gray-500">{orderDate(order)}</td>
                                                        <td className="px-5 py-3">
                                                            <StatusBadge status={order.status} />
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <div className="flex justify-end">
                                                                <select
                                                                    value={order.status}
                                                                    disabled={updatingId === order.orderId}
                                                                    onChange={(event: ChangeEvent<HTMLSelectElement>) => void updateStatus(order, event.target.value)}
                                                                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none focus:border-primary-400 disabled:opacity-40"
                                                                    aria-label={`${orderCode(order)} 상태 변경`}
                                                                >
                                                                    {STATUS_OPTIONS.filter((item) => item.key !== "ALL").map((item) => (
                                                                        <option key={item.key} value={item.key}>
                                                                            {item.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {open && (
                                                        <tr className="bg-gray-50/80">
                                                            <td colSpan={7} className="px-5 py-4">
                                                                <OrderDetail order={order} />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                            <button
                                type="button"
                                onClick={() => void loadOrders(status, Math.max(0, page - 1))}
                                disabled={page <= 0 || loading}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
                            >
                                이전
                            </button>
                            <span className="text-xs text-gray-400">
                                {page + 1} / {Math.max(1, totalPages)}
                            </span>
                            <button
                                type="button"
                                onClick={() => void loadOrders(status, page + 1)}
                                disabled={page + 1 >= totalPages || loading}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
                            >
                                다음
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </AdminShell>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                    <i className={`${icon} text-lg`} />
                </span>
            </div>
            <p className="truncate text-xl font-bold text-gray-950">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGES[status] || "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function OrderDetail({ order }: { order: Order }) {
    const items = orderItems(order);

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-900">주문 상품</h3>
                <div className="mt-3 divide-y divide-gray-100">
                    {items.length > 0 ? (
                        items.map((item, index) => (
                            <div key={item.orderItemId ?? `${item.productId ?? "item"}-${index}`} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{itemName(item)}</p>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        수량 {Number(item.quantity || 1).toLocaleString("ko-KR")}개
                                        {item.productId ? ` · 상품 #${item.productId}` : ""}
                                    </p>
                                </div>
                                <p className="shrink-0 text-sm font-bold text-gray-900">{won(itemAmount(item))}</p>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-sm text-gray-400">상품 상세 정보가 없습니다.</div>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-900">배송 및 결제</h3>
                <dl className="mt-3 space-y-2 text-sm">
                    <DetailLine label="수령인" value={order.receiverName || customerName(order)} />
                    <DetailLine label="연락처" value={order.receiverPhone || "-"} />
                    <DetailLine label="주소" value={order.shippingAddress || order.address || "-"} />
                    <DetailLine label="배송비" value={order.shippingFee == null ? "-" : won(order.shippingFee)} />
                    <DetailLine label="할인" value={order.discountAmount == null ? "-" : won(order.discountAmount)} />
                    <DetailLine label="총 결제" value={won(orderAmount(order))} strong />
                </dl>
                {order.memo && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">{order.memo}</p>}
            </div>
        </div>
    );
}

function DetailLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-gray-500">{label}</dt>
            <dd className={`min-w-0 text-right ${strong ? "font-bold text-gray-950" : "font-semibold text-gray-700"}`}>{value}</dd>
        </div>
    );
}

function ForbiddenState() {
    return (
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
            <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
            <p className="text-sm font-semibold text-gray-800">관리자 권한이 필요한 화면입니다.</p>
            <p className="mt-1 text-xs text-gray-500">ADMIN 계정으로 로그인 후 다시 열어주세요.</p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="py-16 text-center">
            <i className="ri-file-list-3-line mb-3 block text-4xl text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">조건에 맞는 주문이 없습니다.</p>
            <p className="mt-1 text-xs text-gray-400">필터나 검색어를 조정해보세요.</p>
        </div>
    );
}

async function requestOrderStatusUpdate(orderId: number, status: string) {
    const body = JSON.stringify({ status });
    const requests = [
        { endpoint: `/api/admin/orders/${orderId}/status`, method: "PATCH" },
        { endpoint: `/api/admin/orders/${orderId}/status`, method: "PUT" },
        { endpoint: `/api/admin/orders/${orderId}`, method: "PATCH" },
        { endpoint: `/api/admin/orders/${orderId}`, method: "PUT" },
    ];
    let lastResponse: Response | null = null;

    for (const request of requests) {
        const response = await apiFetch(request.endpoint, {
            method: request.method,
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body,
        });

        if (response.ok || ![404, 405, 501].includes(response.status)) return response;
        lastResponse = response;
    }

    return lastResponse ?? new Response("", { status: 405 });
}

function orderUpdateErrorMessage(status: number, message: string) {
    if (status === 401 || status === 403) return "관리자 권한이 필요합니다.";
    if ([404, 405, 501].includes(status)) return "백엔드 주문 상태 변경 API가 아직 연결되지 않았습니다.";
    return message || "주문 상태 변경에 실패했습니다.";
}

async function readResponseMessage(response: Response) {
    try {
        return await response.text();
    } catch {
        return "";
    }
}
