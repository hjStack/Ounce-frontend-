"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/ToastContext";
import { formatDate } from "../../lib/date";
import { won } from "../../lib/products";
import type { Order, OrderItem, PageResponse, Qna } from "../../types/api";
import AdminShell from "./AdminShell";
import { apiFetch } from "@/lib/api";

const DASHBOARD_ORDER_SIZE = 100;
const DASHBOARD_QNA_SIZE = 100;

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

type DashboardOrders = {
  items: Order[];
  total: number;
  missing: boolean;
  failed: boolean;
  forbidden: boolean;
};

type DashboardQna = {
  total: number;
  items: Qna[];
  missing: boolean;
  failed: boolean;
  forbidden: boolean;
};

function emptyOrders(
  overrides: Partial<DashboardOrders> = {},
): DashboardOrders {
  return {
    items: [],
    total: 0,
    missing: false,
    failed: false,
    forbidden: false,
    ...overrides,
  };
}

function emptyQna(overrides: Partial<DashboardQna> = {}): DashboardQna {
  return {
    items: [],
    total: 0,
    missing: false,
    failed: false,
    forbidden: false,
    ...overrides,
  };
}

function readOrders(data: OrderListResponse | Order[]) {
  if (Array.isArray(data)) return data;
  return (
    data.content ?? data.orders ?? data.items ?? data.data ?? data.results ?? []
  );
}

function readTotalOrders(data: OrderListResponse | Order[], fallback: number) {
  if (Array.isArray(data)) return fallback;
  return data.totalElements ?? data.totalCount ?? data.total ?? fallback;
}

function orderItems(order: Order) {
  return order.orderItems ?? order.items ?? order.products ?? [];
}

function itemName(item: OrderItem) {
  return (
    item.productName ||
    item.name ||
    (item.productId ? `상품 ${item.productId}` : "상품 정보 없음")
  );
}

function summaryProduct(order: Order) {
  const items = orderItems(order);
  if (items.length === 0) return "상품 상세 정보 없음";
  const first = itemName(items[0]);
  return items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
}

function orderCode(order: Order) {
  return order.orderNumber || `ORD-${String(order.orderId).padStart(6, "0")}`;
}

function orderDateValue(order: Order) {
  return (
    order.createdAt ||
    order.createdDate ||
    order.created_at ||
    order.orderDate ||
    order.orderedAt ||
    order.ordered_at ||
    order.paidAt ||
    order.paid_at ||
    undefined
  );
}

function paymentDateValue(order: Order) {
  return (
    order.paidAt ||
    order.paid_at ||
    order.createdAt ||
    order.createdDate ||
    order.created_at ||
    order.orderDate ||
    order.orderedAt ||
    order.ordered_at ||
    undefined
  );
}

function orderAmount(order: Order) {
  return Number(
    order.paymentAmount ??
      order.finalAmount ??
      order.totalAmount ??
      order.orderAmount ??
      order.amount ??
      0,
  );
}

function isToday(iso?: string) {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isPaidOrder(order: Order) {
  return !["PAYMENT_WAITING", "CANCELED"].includes(order.status);
}

function customerName(order: Order) {
  return (
    order.memberName ||
    order.receiverName ||
    (order.memberId ? `회원 ${order.memberId}` : "-")
  );
}

async function fetchDashboardOrders(): Promise<DashboardOrders> {
  try {
    const response = await apiFetch(
      `/api/admin/orders?page=0&size=${DASHBOARD_ORDER_SIZE}`,
      { credentials: "include" },
    );
    if (response.status === 401 || response.status === 403)
      return emptyOrders({ forbidden: true });
    if ([404, 405, 501].includes(response.status))
      return emptyOrders({ missing: true });
    if (!response.ok) return emptyOrders({ failed: true });

    const data = (await response.json()) as OrderListResponse | Order[];
    const items = readOrders(data);
    return {
      ...emptyOrders(),
      items,
      total: readTotalOrders(data, items.length),
    };
  } catch {
    return emptyOrders({ failed: true });
  }
}

async function fetchWaitingQna(): Promise<DashboardQna> {
  try {
    const params = new URLSearchParams({
      page: "0",
      size: String(DASHBOARD_QNA_SIZE),
      status: "WAITING",
    });
    const response = await apiFetch(`/api/admin/qna?${params.toString()}`, {
      credentials: "include",
    });
    if (response.status === 401 || response.status === 403)
      return emptyQna({ forbidden: true });
    if ([404, 405, 501].includes(response.status))
      return emptyQna({ missing: true });
    if (!response.ok) return emptyQna({ failed: true });

    const data = (await response.json()) as PageResponse<Qna>;
    const items = data.content ?? data.items ?? [];
    return { ...emptyQna(), items, total: data.totalElements ?? items.length };
  } catch {
    return emptyQna({ failed: true });
  }
}

export default function AdminDashboardClient() {
  const { toast } = useToast();
  const [ordersData, setOrdersData] = useState<DashboardOrders>(emptyOrders());
  const [qnaData, setQnaData] = useState<DashboardQna>(emptyQna());
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [orders, qna] = await Promise.all([
      fetchDashboardOrders(),
      fetchWaitingQna(),
    ]);
    setOrdersData(orders);
    setQnaData(qna);
    setForbidden(orders.forbidden || qna.forbidden);
    if (orders.failed) toast("주문 현황을 불러오지 못했습니다.", "error");
    if (qna.failed) toast("문의 현황을 불러오지 못했습니다.", "error");
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const recentOrders = useMemo(
    () =>
      [...ordersData.items]
        .sort((a, b) => {
          const aTime = new Date(orderDateValue(a) || "").getTime();
          const bTime = new Date(orderDateValue(b) || "").getTime();
          if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
          return bTime - aTime;
        })
        .slice(0, 5),
    [ordersData.items],
  );

  const stats = useMemo(() => {
    const datedOrders = ordersData.items.filter((order) =>
      Boolean(orderDateValue(order)),
    );
    const todayOrders = datedOrders.filter((order) =>
      isToday(orderDateValue(order)),
    );
    const paidDatedOrders = ordersData.items.filter((order) =>
      Boolean(paymentDateValue(order)),
    );
    const todayPaidOrders = paidDatedOrders.filter(
      (order) => isPaidOrder(order) && isToday(paymentDateValue(order)),
    );
    const todayRevenue = todayPaidOrders.reduce(
      (sum, order) => sum + orderAmount(order),
      0,
    );
    const paymentWaiting = ordersData.items.filter(
      (order) => order.status === "PAYMENT_WAITING",
    ).length;
    const preparing = ordersData.items.filter(
      (order) => order.status === "PREPARING",
    ).length;
    const shipped = ordersData.items.filter(
      (order) => order.status === "SHIPPED",
    ).length;

    return [
      {
        label: "오늘 매출",
        value: datedOrders.length > 0 ? won(todayRevenue) : "-",
        icon: "ri-money-dollar-circle-line",
        color: "blue",
        note:
          datedOrders.length > 0
            ? `결제 완료 ${todayPaidOrders.length.toLocaleString("ko-KR")}건 기준`
            : "주문일 응답 필드 필요",
      },
      {
        label: "신규 주문",
        value:
          datedOrders.length > 0
            ? `${todayOrders.length.toLocaleString("ko-KR")}건`
            : "-",
        icon: "ri-shopping-bag-3-line",
        color: "green",
        note: `전체 ${ordersData.total.toLocaleString("ko-KR")}건 · 결제대기 ${paymentWaiting.toLocaleString("ko-KR")}건`,
      },
      {
        label: "배송 준비중",
        value: `${preparing.toLocaleString("ko-KR")}건`,
        icon: "ri-truck-line",
        color: "orange",
        note: `배송중 ${shipped.toLocaleString("ko-KR")}건 포함 관리`,
      },
      {
        label: "미답변 문의",
        value: `${qnaData.total.toLocaleString("ko-KR")}건`,
        icon: "ri-question-answer-line",
        color: "red",
        note:
          qnaData.items.length > 0
            ? `최근 ${qnaData.items.length.toLocaleString("ko-KR")}건 조회`
            : "답변 대기 문의",
      },
    ];
  }, [ordersData.items, ordersData.total, qnaData.items.length, qnaData.total]);

  const missingApis = [
    ordersData.missing ? "관리자 주문 API" : "",
    qnaData.missing ? "관리자 문의 API" : "",
  ].filter(Boolean);

  return (
    <AdminShell active="/admin" title="대시보드">
      {forbidden ? (
        <ForbiddenState />
      ) : (
        <div className="space-y-6">
          <section className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
                Admin Overview
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                운영 현황을 확인하세요
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                주문, 배송, 고객 문의 데이터를 실시간으로 조회합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <i className="ri-refresh-line text-base" />
                새로고침
              </button>
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600"
              >
                <i className="ri-add-circle-line text-base" />
                상품 등록
              </Link>
            </div>
          </section>

          {missingApis.length > 0 && (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
              {missingApis.join(", ")}가 아직 연결되지 않아 해당 영역은 빈
              값으로 표시됩니다.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <StatCard key={item.label} item={item} loading={loading} />
            ))}
          </div>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 md:px-6">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  최근 들어온 주문
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  관리자 주문 API의 최신 조회 결과 기준입니다.
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="text-sm font-semibold text-primary-700 hover:underline"
              >
                전체보기
              </Link>
            </div>
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">
                최근 주문을 불러오는 중...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-16 text-center">
                <i className="ri-file-list-3-line mb-3 block text-4xl text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">
                  표시할 주문이 없습니다.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                    <tr>
                      <th className="px-5 py-3">주문번호</th>
                      <th className="px-5 py-3">주문자</th>
                      <th className="px-5 py-3">상품명</th>
                      <th className="px-5 py-3">결제금액</th>
                      <th className="px-5 py-3">주문일</th>
                      <th className="px-5 py-3">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {recentOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-gray-50/70">
                        <td className="px-5 py-4 font-bold text-gray-900">
                          {orderCode(order)}
                        </td>
                        <td className="px-5 py-4">{customerName(order)}</td>
                        <td className="max-w-[260px] truncate px-5 py-4">
                          {summaryProduct(order)}
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-900">
                          {won(orderAmount(order))}
                        </td>
                        <td className="px-5 py-4 text-gray-500">
                          {formatDate(orderDateValue(order), true) || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({
  item,
  loading,
}: {
  item: {
    label: string;
    value: string;
    icon: string;
    color: string;
    note: string;
  };
  loading: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-gray-500">{item.label}</h2>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[item.color]}`}
        >
          <i className={`${item.icon} text-xl`} />
        </div>
      </div>
      <p className="truncate text-2xl font-bold text-gray-900">
        {loading ? "..." : item.value}
      </p>
      <p className="mt-2 truncate text-xs text-gray-500">
        {loading ? "데이터 조회 중" : item.note}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-bold ${STATUS_BADGES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ForbiddenState() {
  return (
    <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
      <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
      <p className="text-sm font-semibold text-gray-800">
        관리자 권한이 필요한 화면입니다.
      </p>
      <p className="mt-1 text-xs text-gray-500">
        ADMIN 계정으로 로그인 후 다시 열어주세요.
      </p>
    </div>
  );
}
